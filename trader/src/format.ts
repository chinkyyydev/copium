import { EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { winRate } from './learning.js';
import { unrealizedPnl } from './paper.js';
import type {
  AccountState,
  Adjustment,
  ClosedTrade,
  LearningState,
  Position,
  Signal,
} from './types.js';

/** All Discord embed/card construction, kept apart from bot wiring. */

export const fmtPrice = (p: number): string =>
  p >= 1000 ? p.toFixed(2) : p >= 1 ? p.toFixed(4) : p.toPrecision(4);

export const fmtUsd = (v: number): string => `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`;

const COLOR = { green: 0x2ecc71, red: 0xe74c3c, blue: 0x3498db, gold: 0xf1c40f, purple: 0x9b59b6 };

export function signalEmbed(signal: Signal, equity: number): EmbedBuilder {
  const long = signal.direction === 'long';
  const confluences = signal.votes
    .filter((v) => v.direction !== 0)
    .map((v) => {
      const agrees = (v.direction === 1) === long;
      return `${agrees ? '✅' : '⚠️'} **${v.name}** — ${v.note}`;
    })
    .join('\n');
  return new EmbedBuilder()
    .setColor(long ? COLOR.green : COLOR.red)
    .setTitle(`${long ? '🟢 LONG' : '🔴 SHORT'} ${signal.symbol} · ${signal.leverage.toFixed(1)}x`)
    .setDescription(confluences || '_no directional confluences?_')
    .addFields(
      { name: 'Entry', value: fmtPrice(signal.entry), inline: true },
      { name: '🎯 Take Profit', value: fmtPrice(signal.takeProfit), inline: true },
      { name: '🛑 Stop Loss', value: fmtPrice(signal.stopLoss), inline: true },
      {
        name: 'Risk',
        value: `${fmtUsd(signal.riskAmount)} (${((signal.riskAmount / equity) * 100).toFixed(1)}% of equity)`,
        inline: true,
      },
      { name: 'R:R', value: `1:${signal.rr.toFixed(1)}`, inline: true },
      { name: 'Size', value: `${signal.qty.toPrecision(4)} (${fmtUsd(signal.notional)} notional)`, inline: true },
      {
        name: 'Confluence score',
        value: `${signal.score.toFixed(2)} (threshold ${signal.threshold.toFixed(2)})`,
        inline: true,
      },
    )
    .setFooter({ text: 'Paper trade · SL moves to breakeven at +1R · not financial advice' })
    .setTimestamp(signal.createdAt);
}

const EXIT_LABEL: Record<ClosedTrade['exitReason'], string> = {
  tp: '🎯 Take profit hit',
  sl: '🛑 Stopped out',
  breakeven: '⚖️ Breakeven stop',
  manual: '✋ Closed manually',
  liquidation: '💀 Liquidated',
};

export function closeEmbed(trade: ClosedTrade): EmbedBuilder {
  const p = trade.position;
  const won = trade.pnl > 0;
  const roi = (trade.pnl / (p.notional / p.leverage)) * 100;
  return new EmbedBuilder()
    .setColor(won ? COLOR.green : COLOR.red)
    .setTitle(
      `${EXIT_LABEL[trade.exitReason]} — ${p.direction.toUpperCase()} ${p.symbol} ${won ? '+' : ''}${fmtUsd(trade.pnl)}`,
    )
    .addFields(
      { name: 'Entry → Exit', value: `${fmtPrice(p.entry)} → ${fmtPrice(trade.exitPrice)}`, inline: true },
      { name: 'ROI (on margin)', value: `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`, inline: true },
      { name: 'Fees paid', value: fmtUsd(trade.fees), inline: true },
      {
        name: 'Account',
        value: `${fmtUsd(trade.equityAfter)} / target ${fmtUsd(config.targetBalance)}`,
        inline: true,
      },
      {
        name: 'Held',
        value: `${Math.max(1, Math.round((trade.closedAt - p.openedAt) / 60_000))} min`,
        inline: true,
      },
    )
    .setTimestamp(trade.closedAt);
}

export function lessonEmbed(adjustments: Adjustment[]): EmbedBuilder | null {
  if (adjustments.length === 0) return null;
  return new EmbedBuilder()
    .setColor(COLOR.purple)
    .setTitle('📚 Lesson learned — strategy adjusted')
    .setDescription(adjustments.map((a) => `• **${a.change}**\n  ↳ ${a.reason}`).join('\n'))
    .setTimestamp();
}

export function statsEmbed(
  account: AccountState,
  learning: LearningState,
  prices: Record<string, number>,
): EmbedBuilder {
  const open = account.openPositions.reduce(
    (sum, p) => sum + unrealizedPnl(p, prices[p.symbol] ?? p.entry),
    0,
  );
  const total = account.equity + open;
  const pct = ((total - account.startBalance) / account.startBalance) * 100;
  const progress = Math.min(total / config.targetBalance, 1);
  const bar = '█'.repeat(Math.round(progress * 16)).padEnd(16, '░');
  return new EmbedBuilder()
    .setColor(total >= account.startBalance ? COLOR.green : COLOR.red)
    .setTitle('📊 Account stats')
    .setDescription(`\`${bar}\` ${fmtUsd(total)} / ${fmtUsd(config.targetBalance)}`)
    .addFields(
      { name: 'Equity', value: fmtUsd(account.equity), inline: true },
      { name: 'Unrealized', value: fmtUsd(open), inline: true },
      { name: 'Return', value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, inline: true },
      { name: 'Peak equity', value: fmtUsd(account.peakEquity), inline: true },
      {
        name: 'Trades',
        value: `${learning.totalTrades} (${learning.wins}W / ${learning.losses}L, ${(winRate(learning) * 100).toFixed(0)}% WR)`,
        inline: true,
      },
      { name: 'Open positions', value: String(account.openPositions.length), inline: true },
    )
    .setTimestamp();
}

export function positionsEmbed(account: AccountState, prices: Record<string, number>): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(COLOR.blue).setTitle('📌 Open positions').setTimestamp();
  if (account.openPositions.length === 0) return embed.setDescription('Flat. Scanning for setups…');
  for (const p of account.openPositions) {
    const price = prices[p.symbol] ?? p.entry;
    const upnl = unrealizedPnl(p, price);
    embed.addFields({
      name: `${p.direction === 'long' ? '🟢' : '🔴'} ${p.symbol} ${p.leverage.toFixed(1)}x ${p.breakevenMoved ? '(risk-free)' : ''}`,
      value: [
        `Entry ${fmtPrice(p.entry)} · now ${fmtPrice(price)} · uPnL ${fmtUsd(upnl)}`,
        `TP ${fmtPrice(p.takeProfit)} · SL ${fmtPrice(p.stopLoss)}`,
      ].join('\n'),
    });
  }
  return embed;
}

export function brainEmbed(learning: LearningState): EmbedBuilder {
  const rows = Object.entries(learning.confluences)
    .sort(([, a], [, b]) => b.weight - a.weight)
    .map(([name, s]) => {
      const total = s.wins + s.losses;
      const wr = total ? ` · ${((s.wins / total) * 100).toFixed(0)}% WR (${total})` : '';
      return `\`${s.weight.toFixed(2)}\` **${name}**${wr}`;
    })
    .join('\n');
  const recent = learning.adjustments
    .slice(-5)
    .map((a) => `• ${a.change}`)
    .join('\n');
  return new EmbedBuilder()
    .setColor(COLOR.purple)
    .setTitle('🧠 Strategy brain')
    .setDescription(rows)
    .addFields(
      { name: 'Entry threshold', value: learning.threshold.toFixed(2), inline: true },
      { name: 'SL width', value: `${learning.slAtrMult.toFixed(2)} ATR`, inline: true },
      { name: 'R:R target', value: `1:${learning.rrRatio.toFixed(1)}`, inline: true },
      ...(recent ? [{ name: 'Recent adjustments', value: recent }] : []),
    )
    .setTimestamp();
}

export function milestoneEmbed(title: string, body: string, color: keyof typeof COLOR = 'gold'): EmbedBuilder {
  return new EmbedBuilder().setColor(COLOR[color]).setTitle(title).setDescription(body).setTimestamp();
}
