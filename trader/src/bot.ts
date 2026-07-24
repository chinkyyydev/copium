import {
  ChannelType,
  Client,
  GatewayIntentBits,
  type Message,
  type TextChannel,
} from 'discord.js';
import { fetchFundingRate, fetchKlines, fetchPrices } from './binance.js';
import { config, hasDiscordBot } from './config.js';
import {
  brainEmbed,
  closeEmbed,
  fmtUsd,
  lessonEmbed,
  milestoneEmbed,
  positionsEmbed,
  signalEmbed,
  statsEmbed,
} from './format.js';
import { loadLearning, recordTrade } from './learning.js';
import { closeManually, loadAccount, onPrice, openPosition, saveAccount, defaultAccount } from './paper.js';
import { readJsonl } from './store.js';
import { evaluate } from './strategy.js';
import type { ClosedTrade, LearningState, AccountState } from './types.js';

/**
 * copium-trader — Discord perps signal bot.
 *
 * Two loops:
 *  - tick loop (every tickSec): one cheap all-symbols price call, manages open
 *    positions (TP / SL / breakeven / liquidation).
 *  - scan loop (every scanSec): full indicator pass per symbol, opens new paper
 *    positions when the confluence score clears the (self-tuned) threshold.
 *
 * Every closed trade feeds the learning module, which re-weights confluences
 * and adapts threshold / SL width / R:R — the bot literally trades itself
 * into (hopefully) a better trader.
 */

const account: AccountState = loadAccount();
const learning: LearningState = loadLearning();
let channel: TextChannel | null = null;
let lastPrices: Record<string, number> = {};
let ticking = false;
let scanning = false;

const log = (msg: string) => console.log(`[trader] ${new Date().toISOString()} ${msg}`);

async function post(payload: Parameters<TextChannel['send']>[0]): Promise<void> {
  if (!channel) return;
  try {
    await channel.send(payload);
  } catch (err) {
    console.error('[trader] discord send failed:', err);
  }
}

function tradingBlocked(): string | null {
  if (account.busted) return 'busted';
  if (account.manuallyPaused) return 'paused';
  if (Date.now() < account.pausedUntil) return 'cooling off';
  return null;
}

async function handleClosedTrade(trade: ClosedTrade): Promise<void> {
  await post({ embeds: [closeEmbed(trade)] });

  const adjustments = recordTrade(learning, trade);
  const lesson = lessonEmbed(adjustments);
  if (lesson) await post({ embeds: [lesson] });

  // Loss-streak circuit breaker: stand down for an hour after 3 straight losses.
  if (learning.consecutiveLosses >= 3 && Date.now() >= account.pausedUntil) {
    account.pausedUntil = Date.now() + 60 * 60_000;
    saveAccount(account);
    await post({
      embeds: [
        milestoneEmbed(
          '🧊 Cooling off',
          `${learning.consecutiveLosses} losses in a row. No new entries for 1 hour while the market and I both calm down. Strategy weights have been adjusted.`,
          'blue',
        ),
      ],
    });
  }

  // Milestones.
  if (!account.targetHitAnnounced && account.equity >= config.targetBalance) {
    account.targetHitAnnounced = true;
    saveAccount(account);
    await post({
      embeds: [
        milestoneEmbed(
          '🏆 TARGET HIT',
          `${fmtUsd(account.startBalance)} → ${fmtUsd(account.equity)}. The ${fmtUsd(config.targetBalance)} challenge is complete. Compounding continues — new peak tracking from here.`,
        ),
      ],
    });
  }
  if (!account.busted && account.equity <= account.startBalance * 0.1) {
    account.busted = true;
    saveAccount(account);
    await post({
      embeds: [
        milestoneEmbed(
          '💀 Account busted',
          `Equity down to ${fmtUsd(account.equity)}. Trading halted. Review \`!brain\` for what was learned, then \`!reset\` to run it back with the lessons kept.`,
          'red',
        ),
      ],
    });
  }
}

/** Price tick: manage open positions. */
async function tick(): Promise<void> {
  if (ticking || account.openPositions.length === 0) return;
  ticking = true;
  try {
    lastPrices = await fetchPrices();
    for (const symbol of [...new Set(account.openPositions.map((p) => p.symbol))]) {
      const price = lastPrices[symbol];
      if (!price) continue;
      for (const event of onPrice(account, symbol, price)) {
        if (event.kind === 'breakeven') {
          await post({
            embeds: [
              milestoneEmbed(
                `⚖️ ${event.position.symbol} risk-free`,
                `+1R reached — stop loss moved to entry. Worst case is now breakeven.`,
                'blue',
              ),
            ],
          });
        } else if (event.trade) {
          await handleClosedTrade(event.trade);
        }
      }
    }
  } catch (err) {
    console.error('[trader] tick failed:', err);
  } finally {
    ticking = false;
  }
}

/** Full scan: look for new setups on every symbol without an open position. */
async function scan(announce = false): Promise<void> {
  if (scanning) return;
  scanning = true;
  try {
    const blocked = tradingBlocked();
    if (blocked) {
      if (announce) await post(`Not scanning — ${blocked}.`);
      return;
    }
    if (account.openPositions.length >= config.maxPositions) return;
    lastPrices = await fetchPrices();

    for (const symbol of config.symbols) {
      if (account.openPositions.length >= config.maxPositions) break;
      if (account.openPositions.some((p) => p.symbol === symbol)) continue;
      if (Date.now() < (account.symbolCooldownUntil[symbol] ?? 0)) continue;

      const [candles5m, candles15m, fundingRate] = await Promise.all([
        fetchKlines(symbol, '5m', 250),
        fetchKlines(symbol, '15m', 250),
        fetchFundingRate(symbol),
      ]);
      const signal = evaluate({ symbol, candles5m, candles15m, fundingRate }, account.equity, learning, {
        riskPct: config.riskPct,
        maxLeverage: config.maxLeverage,
      });
      if (!signal) {
        if (announce) await post(`No setup on ${symbol} — score below threshold.`);
        continue;
      }
      const position = openPosition(account, signal);
      log(`opened ${position.direction} ${symbol} @ ${position.entry}`);
      await post({ embeds: [signalEmbed(signal, account.equity)] });
    }
  } catch (err) {
    console.error('[trader] scan failed:', err);
  } finally {
    scanning = false;
  }
}

async function handleCommand(message: Message): Promise<void> {
  const cmd = message.content.trim().toLowerCase();
  if (!cmd.startsWith('!')) return;
  const [name, arg] = cmd.slice(1).split(/\s+/);
  switch (name) {
    case 'help':
      await message.reply(
        [
          '**copium-trader commands**',
          '`!stats` account + challenge progress · `!positions` open trades',
          '`!history` last 10 closed trades · `!brain` strategy weights & lessons',
          '`!scan` force a scan now · `!close <symbol>` close a position at market',
          '`!pause` / `!resume` halt or restart new entries · `!reset` restart a busted account',
        ].join('\n'),
      );
      break;
    case 'stats':
      await message.reply({ embeds: [statsEmbed(account, learning, lastPrices)] });
      break;
    case 'positions':
      await message.reply({ embeds: [positionsEmbed(account, lastPrices)] });
      break;
    case 'brain':
      await message.reply({ embeds: [brainEmbed(learning)] });
      break;
    case 'history': {
      const trades = readJsonl<ClosedTrade>('trades', 10);
      await message.reply(
        trades.length === 0
          ? 'No closed trades yet.'
          : trades
              .map(
                (t) =>
                  `${t.pnl > 0 ? '🟢' : '🔴'} ${t.position.direction.toUpperCase()} ${t.position.symbol} · ${t.exitReason} · ${fmtUsd(t.pnl)} → ${fmtUsd(t.equityAfter)}`,
              )
              .join('\n'),
      );
      break;
    }
    case 'scan':
      await message.reply('Scanning now…');
      await scan(true);
      break;
    case 'close': {
      const symbol = arg?.toUpperCase();
      const position = account.openPositions.find((p) => !symbol || p.symbol === symbol);
      if (!position) {
        await message.reply(symbol ? `No open position on ${symbol}.` : 'No open positions.');
        break;
      }
      const price = lastPrices[position.symbol] ?? (await fetchPrices())[position.symbol];
      await handleClosedTrade(closeManually(account, position, price ?? position.entry));
      break;
    }
    case 'pause':
      account.manuallyPaused = true;
      saveAccount(account);
      await message.reply('⏸️ Paused — no new entries. Open positions are still managed. `!resume` to restart.');
      break;
    case 'resume':
      account.manuallyPaused = false;
      account.pausedUntil = 0;
      saveAccount(account);
      await message.reply('▶️ Resumed — scanning for setups.');
      break;
    case 'reset': {
      if (!account.busted) {
        await message.reply('Account is not busted — `!reset` only works after a bust (learning is kept either way).');
        break;
      }
      const fresh = defaultAccount();
      Object.assign(account, fresh);
      saveAccount(account);
      await message.reply(
        `🔄 Fresh ${fmtUsd(config.startBalance)}, same brain — ${learning.totalTrades} trades of lessons carried over. Run it back.`,
      );
      break;
    }
  }
}

async function main(): Promise<void> {
  log(
    `starting — ${config.symbols.join(', ')} · scan every ${config.scanSec}s, tick every ${config.tickSec}s · ` +
      `equity ${fmtUsd(account.equity)} → target ${fmtUsd(config.targetBalance)}`,
  );

  if (hasDiscordBot()) {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });
    client.on('messageCreate', (message) => {
      if (message.author.bot || message.channelId !== config.discordChannelId) return;
      handleCommand(message).catch((err) => console.error('[trader] command failed:', err));
    });
    await client.login(config.discordBotToken);
    const fetched = await client.channels.fetch(config.discordChannelId);
    if (fetched?.type === ChannelType.GuildText) channel = fetched as TextChannel;
    log(`discord connected${channel ? ` — posting to #${channel.name}` : ' (channel not found!)'}`);
    await post({
      embeds: [
        milestoneEmbed(
          '🤖 copium-trader online',
          [
            `Paper-trading **${fmtUsd(account.equity)}** toward **${fmtUsd(config.targetBalance)}** on ${config.symbols.map((s) => `\`${s}\``).join(' ')}.`,
            `Scanning every ${config.scanSec}s · risk ${config.riskPct}%/trade · max ${config.maxLeverage}x · SL→BE at +1R.`,
            'Type `!help` for commands. Signals are simulated — not financial advice.',
          ].join('\n'),
          'blue',
        ),
      ],
    });
  } else {
    log('no Discord credentials — running headless (signals logged to console only)');
  }

  setInterval(() => void tick(), config.tickSec * 1000);
  setInterval(() => void scan(), config.scanSec * 1000);
  void scan();
}

main().catch((err) => {
  console.error('[trader] fatal:', err);
  process.exit(1);
});
