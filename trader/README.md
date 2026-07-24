# copium-trader — Discord Perps Signal Bot

A Discord bot that scans crypto **perpetual futures** for leveraged long/short setups, alerts them with full risk parameters (entry, take-profit, stop-loss, size, leverage), paper-trades a **$100 → $500 challenge**, and **tunes its own strategy** from every closed trade.

> ⚠️ **This is a paper-trading simulator, not financial advice.** It places no real orders and holds no funds. Market data is live (Binance USDⓈ-M futures public API); fills are simulated with taker fees and slippage. Leveraged crypto trading can lose your entire stake — treat the signals as an educational toy, not a money printer. (Copium-brand disclaimer: statistically, one of its predictions has to be right eventually.)

## How it trades

**Confluence engine.** Every scan, eight independent confluences vote long/short on each symbol:

| Confluence | What it reads |
|---|---|
| `htf-trend` | 15m EMA50 vs EMA200 trend filter |
| `ema-momentum` | 5m EMA9/EMA21 cross + slope |
| `rsi` | RSI(14) exhaustion + turn (oversold bounce / overbought fade) |
| `macd` | Histogram sign + expansion |
| `bollinger` | Band sweep + reclaim (mean reversion) |
| `volume` | Expansion ≥1.5× the 20-bar average, in candle direction |
| `funding` | Extreme funding = crowded side → contrarian fade |
| `structure` | Entry located at swing support/resistance |

Votes are weighted (weights are learned — see below) and summed into a score. A trade only fires when the score clears the entry threshold; counter-trend trades need an extra-strong score.

**Risk management.** Stop-loss is ATR-sized and snapped behind the nearest swing level (invalidation behind structure, capped at 3×ATR). Take-profit is a fixed R:R multiple (default 1:2, learned). Position size is derived from risk — default **2% of equity per trade** — with effective leverage capped (default 10×). At **+1R the stop moves to entry** so the trade becomes risk-free. Fees (0.05%/side) and slippage (0.02%/side) are charged on every fill.

**Self-tuning.** After each closed trade the bot:
- re-weights every confluence by whether its vote helped or hurt (bounded, small steps),
- raises the entry threshold when the rolling win rate sags, lowers it when it runs hot,
- widens stops after consecutive stop-outs, tightens after clean TP hits, and trims R:R when trades die at breakeven,
- posts a **📚 Lesson learned** card to Discord for every adjustment,
- after 3 straight losses, pauses new entries for an hour (anti-tilt circuit breaker),
- after a close, blocks re-entry on that symbol for 10 minutes (anti revenge-trading).

The learned state survives restarts (and even a busted account — `!reset` keeps the brain).

## Setup

```bash
cd trader
npm install
cp ../.env .env   # or create one
```

`.env`:

```ini
# Discord (falls back to DISCORD_BOT_TOKEN / DISCORD_CHANNEL_ID from the poster)
TRADER_DISCORD_BOT_TOKEN=...
TRADER_DISCORD_CHANNEL_ID=...   # point at a #trades channel

# Optional tuning (defaults shown)
TRADER_SYMBOLS=BTCUSDT,ETHUSDT,SOLUSDT
TRADER_SCAN_SEC=15        # full indicator scan interval (seconds)
TRADER_TICK_SEC=5         # price/TP/SL management interval (seconds)
TRADER_START_BALANCE=100
TRADER_TARGET_BALANCE=500
TRADER_RISK_PCT=2
TRADER_MAX_LEVERAGE=10
TRADER_MAX_POSITIONS=2
```

The bot needs the **Message Content** intent enabled in the Discord developer portal (for `!commands`).

```bash
npm start        # run the bot (headless without Discord creds — signals log to console)
npm run scan     # one-off CLI scan: votes, score, and any signal per symbol
npm run stats    # account state
npm run brain    # learned weights + recent adjustments
```

## Discord commands

| Command | Does |
|---|---|
| `!stats` | Equity, challenge progress bar, win rate |
| `!positions` | Open trades with live uPnL, TP/SL |
| `!history` | Last 10 closed trades |
| `!brain` | Learned confluence weights, threshold, SL width, R:R, recent lessons |
| `!scan` | Force a scan right now |
| `!close [symbol]` | Close a position at market |
| `!pause` / `!resume` | Halt / restart new entries |
| `!reset` | After a bust: fresh $100, learning retained |

## Deploy (Render)

`render.yaml` at the repo root defines a `copium-trader` worker alongside the poster. State lives in `$COPIUM_DATA_DIR/trader` on the persistent disk, so the account and the learned brain survive redeploys.
