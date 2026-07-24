import crypto from 'node:crypto';
import { atr, bollinger, ema, last, macd, rsi, sma, swingLevels } from './indicators.js';
import type { Candle, ConfluenceVote, Direction, LearningState, Signal } from './types.js';

/** Names of every confluence the engine votes with. The learning module keeps a
 *  tunable weight per name, so this list is the strategy's "genome". */
export const CONFLUENCE_NAMES = [
  'htf-trend',
  'ema-momentum',
  'rsi',
  'macd',
  'bollinger',
  'volume',
  'funding',
  'structure',
] as const;

export interface MarketSnapshot {
  symbol: string;
  candles5m: Candle[];
  candles15m: Candle[];
  fundingRate: number;
}

const vote = (
  name: string,
  direction: 1 | -1 | 0,
  strength: number,
  note: string,
): ConfluenceVote => ({ name, direction, strength: Math.min(Math.max(strength, 0), 2), note });

/** Compute every confluence's vote for a symbol. Pure function of market data. */
export function computeVotes(snap: MarketSnapshot): ConfluenceVote[] {
  const { candles5m, candles15m, fundingRate } = snap;
  const closes5 = candles5m.map((c) => c.close);
  const closes15 = candles15m.map((c) => c.close);
  const price = last(closes5);
  const votes: ConfluenceVote[] = [];

  // 1. Higher-timeframe trend: EMA50 vs EMA200 on 15m, price on the right side.
  const ema50 = last(ema(closes15, 50));
  const ema200 = last(ema(closes15, 200));
  if (ema50 > ema200 && price > ema50) {
    votes.push(vote('htf-trend', 1, 1, '15m uptrend (EMA50 > EMA200, price above)'));
  } else if (ema50 < ema200 && price < ema50) {
    votes.push(vote('htf-trend', -1, 1, '15m downtrend (EMA50 < EMA200, price below)'));
  } else {
    votes.push(vote('htf-trend', 0, 0, '15m trend mixed'));
  }

  // 2. Short-term momentum: EMA9 vs EMA21 on 5m, with slope agreement.
  const ema9 = ema(closes5, 9);
  const ema21 = ema(closes5, 21);
  const sep = (last(ema9) - last(ema21)) / price;
  const rising = last(ema9) > last(ema9, 2);
  if (sep > 0 && rising) votes.push(vote('ema-momentum', 1, Math.min(Math.abs(sep) * 2000, 2), 'EMA9 above EMA21 and rising'));
  else if (sep < 0 && !rising) votes.push(vote('ema-momentum', -1, Math.min(Math.abs(sep) * 2000, 2), 'EMA9 below EMA21 and falling'));
  else votes.push(vote('ema-momentum', 0, 0, 'momentum indecisive'));

  // 3. RSI(14) on 5m: exhaustion + turn. Oversold turning up = long.
  const r = rsi(closes5, 14);
  const rNow = last(r);
  const turningUp = rNow > last(r, 1);
  if (rNow < 30 && turningUp) votes.push(vote('rsi', 1, 1.5, `RSI ${rNow.toFixed(1)} oversold, turning up`));
  else if (rNow < 40 && turningUp) votes.push(vote('rsi', 1, 0.5, `RSI ${rNow.toFixed(1)} recovering`));
  else if (rNow > 70 && !turningUp) votes.push(vote('rsi', -1, 1.5, `RSI ${rNow.toFixed(1)} overbought, turning down`));
  else if (rNow > 60 && !turningUp) votes.push(vote('rsi', -1, 0.5, `RSI ${rNow.toFixed(1)} rolling over`));
  else votes.push(vote('rsi', 0, 0, `RSI ${rNow.toFixed(1)} neutral`));

  // 4. MACD histogram on 5m: sign + slope must agree.
  const { histogram } = macd(closes5);
  const h = last(histogram);
  const hSlope = h - last(histogram, 1);
  if (h > 0 && hSlope > 0) votes.push(vote('macd', 1, 1, 'MACD histogram positive and expanding'));
  else if (h < 0 && hSlope < 0) votes.push(vote('macd', -1, 1, 'MACD histogram negative and expanding'));
  else votes.push(vote('macd', 0, 0, 'MACD flat/contracting'));

  // 5. Bollinger reversion: pierced a band in the last 3 candles, closed back inside.
  const bb = bollinger(closes5, 20, 2);
  const piercedLower = candles5m.slice(-3).some((c, i) => c.low < bb.lower[closes5.length - 3 + i]);
  const piercedUpper = candles5m.slice(-3).some((c, i) => c.high > bb.upper[closes5.length - 3 + i]);
  if (piercedLower && price > last(bb.lower)) votes.push(vote('bollinger', 1, 1, 'lower band sweep, closed back inside'));
  else if (piercedUpper && price < last(bb.upper)) votes.push(vote('bollinger', -1, 1, 'upper band sweep, closed back inside'));
  else votes.push(vote('bollinger', 0, 0, 'inside bands'));

  // 6. Volume confirmation: expansion beyond 1.5x the 20-bar average, in the
  //    direction of the expanding candle.
  const vols = candles5m.map((c) => c.volume);
  const avgVol = last(sma(vols, 20), 1);
  const lastCandle = candles5m[candles5m.length - 1];
  const volRatio = avgVol > 0 ? lastCandle.volume / avgVol : 0;
  if (volRatio >= 1.5) {
    const dir = lastCandle.close >= lastCandle.open ? 1 : -1;
    votes.push(vote('volume', dir, Math.min(volRatio / 1.5, 2), `volume ${volRatio.toFixed(1)}x average`));
  } else {
    votes.push(vote('volume', 0, 0, 'volume unremarkable'));
  }

  // 7. Funding rate contrarian: extreme funding = crowded side, fade it.
  const f = fundingRate;
  if (f >= 0.0005) votes.push(vote('funding', -1, Math.min(f / 0.0005, 2), `funding ${(f * 100).toFixed(3)}% — longs crowded`));
  else if (f <= -0.0005) votes.push(vote('funding', 1, Math.min(-f / 0.0005, 2), `funding ${(f * 100).toFixed(3)}% — shorts crowded`));
  else votes.push(vote('funding', 0, 0, 'funding neutral'));

  // 8. Structure: entering near a swing level is a good location (tight invalidation).
  const atr5 = last(atr(candles5m, 14));
  const { lows, highs } = swingLevels(candles5m.slice(-80), 2);
  const nearestLowBelow = Math.max(...lows.filter((l) => l < price), -Infinity);
  const nearestHighAbove = Math.min(...highs.filter((h2) => h2 > price), Infinity);
  const nearSupport = Number.isFinite(nearestLowBelow) && price - nearestLowBelow <= 0.6 * atr5;
  const nearResistance = Number.isFinite(nearestHighAbove) && nearestHighAbove - price <= 0.6 * atr5;
  if (nearSupport && !nearResistance) votes.push(vote('structure', 1, 1, 'sitting on swing support'));
  else if (nearResistance && !nearSupport) votes.push(vote('structure', -1, 1, 'pressed under swing resistance'));
  else votes.push(vote('structure', 0, 0, 'mid-range'));

  return votes;
}

export function scoreVotes(votes: ConfluenceVote[], learning: LearningState): number {
  return votes.reduce((sum, v) => {
    const weight = learning.confluences[v.name]?.weight ?? 1;
    return sum + weight * v.direction * v.strength;
  }, 0);
}

const fmtId = () => crypto.randomBytes(4).toString('hex');

/**
 * Evaluate a symbol and return a fully-sized Signal when confluences align,
 * or null when there is no trade. `equity` sizes the position; learning state
 * supplies the entry threshold, SL width and R:R.
 */
export function evaluate(
  snap: MarketSnapshot,
  equity: number,
  learning: LearningState,
  opts: { riskPct: number; maxLeverage: number },
): Signal | null {
  const votes = computeVotes(snap);
  const score = scoreVotes(votes, learning);
  const threshold = learning.threshold;
  if (Math.abs(score) < threshold) return null;

  const direction: Direction = score > 0 ? 'long' : 'short';

  // Counter-trend veto: fading the 15m trend needs an extra-strong score.
  const htf = votes.find((v) => v.name === 'htf-trend');
  const againstTrend = htf && htf.direction !== 0 && (htf.direction === 1) !== (direction === 'long');
  if (againstTrend && Math.abs(score) < threshold + 1.5) return null;

  const candles = snap.candles5m;
  const price = candles[candles.length - 1].close;
  const atr5 = last(atr(candles, 14));
  if (!Number.isFinite(atr5) || atr5 <= 0) return null;

  // Stop-loss: ATR-based, but snapped behind a nearby swing level when one
  // exists — invalidation belongs behind structure, not at an arbitrary price.
  const { lows, highs } = swingLevels(candles.slice(-80), 2);
  let sl: number;
  if (direction === 'long') {
    const atrStop = price - learning.slAtrMult * atr5;
    const swing = Math.max(...lows.filter((l) => l < price && price - l <= learning.slAtrMult * atr5 * 1.5), -Infinity);
    sl = Number.isFinite(swing) ? Math.min(swing - 0.15 * atr5, price - 0.5 * atr5) : atrStop;
  } else {
    const atrStop = price + learning.slAtrMult * atr5;
    const swing = Math.min(...highs.filter((h) => h > price && h - price <= learning.slAtrMult * atr5 * 1.5), Infinity);
    sl = Number.isFinite(swing) ? Math.max(swing + 0.15 * atr5, price + 0.5 * atr5) : atrStop;
  }
  const slDistance = Math.min(Math.abs(price - sl), 3 * atr5);
  sl = direction === 'long' ? price - slDistance : price + slDistance;
  const tp = direction === 'long' ? price + learning.rrRatio * slDistance : price - learning.rrRatio * slDistance;

  // Size from risk: risk a fixed % of equity between entry and stop, then cap
  // notional at maxLeverage x equity (which caps effective leverage).
  const riskAmount = (equity * opts.riskPct) / 100;
  let qty = riskAmount / slDistance;
  const maxNotional = equity * opts.maxLeverage;
  if (qty * price > maxNotional) qty = maxNotional / price;
  const notional = qty * price;
  const leverage = notional / equity;

  return {
    id: fmtId(),
    symbol: snap.symbol,
    direction,
    entry: price,
    stopLoss: sl,
    takeProfit: tp,
    qty,
    notional,
    leverage,
    riskAmount: qty * slDistance,
    rr: learning.rrRatio,
    score,
    threshold,
    atr: atr5,
    votes,
    createdAt: Date.now(),
  };
}
