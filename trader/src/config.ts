import 'dotenv/config';
import path from 'node:path';

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** All runtime configuration, resolved from environment (.env). */
export const config = {
  // Discord — falls back to the shared COPIUM bot credentials so one bot user
  // can serve both apps (point TRADER_DISCORD_CHANNEL_ID at a #trades channel).
  discordBotToken: process.env.TRADER_DISCORD_BOT_TOKEN ?? process.env.DISCORD_BOT_TOKEN ?? '',
  discordChannelId: process.env.TRADER_DISCORD_CHANNEL_ID ?? process.env.DISCORD_CHANNEL_ID ?? '',

  // Market data (Binance USDⓈ-M perpetual futures public REST — no API key needed).
  binanceBase: process.env.TRADER_BINANCE_BASE ?? 'https://fapi.binance.com',
  symbols: (process.env.TRADER_SYMBOLS ?? 'BTCUSDT,ETHUSDT,SOLUSDT')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),

  // Cadence. tickSec drives price checks / TP-SL management of open positions;
  // scanSec drives the full indicator scan for new signals. Both in seconds.
  tickSec: Math.max(2, num(process.env.TRADER_TICK_SEC, 5)),
  scanSec: Math.max(5, num(process.env.TRADER_SCAN_SEC, 15)),

  // The challenge: paper account balance and target.
  startBalance: num(process.env.TRADER_START_BALANCE, 100),
  targetBalance: num(process.env.TRADER_TARGET_BALANCE, 500),

  // Risk management.
  riskPct: num(process.env.TRADER_RISK_PCT, 2), // % of equity risked per trade
  maxLeverage: num(process.env.TRADER_MAX_LEVERAGE, 10),
  maxPositions: num(process.env.TRADER_MAX_POSITIONS, 2),
  takerFeeRate: 0.0005, // 0.05% per side, Binance futures taker
  slippageRate: 0.0002, // 0.02% adverse fill assumption per side

  // Where account/trades/learning JSON state lives. On Render this should sit
  // on the persistent disk (COPIUM_DATA_DIR=/data).
  dataDir:
    process.env.TRADER_DATA_DIR ??
    (process.env.COPIUM_DATA_DIR
      ? path.join(process.env.COPIUM_DATA_DIR, 'trader')
      : path.join(process.cwd(), 'data')),
} as const;

export const hasDiscordBot = () => Boolean(config.discordBotToken && config.discordChannelId);
