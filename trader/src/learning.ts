import { CONFLUENCE_NAMES } from './strategy.js';
import { loadJson, saveJson } from './store.js';
import type { Adjustment, ClosedTrade, LearningState } from './types.js';

/**
 * The bot's self-improvement loop. After every closed trade it:
 *  - re-weights each confluence by whether its vote helped or hurt,
 *  - tightens/loosens the entry threshold from the rolling win rate,
 *  - widens/narrows the stop and adapts R:R from how trades actually exit.
 * All parameters move in small bounded steps so one bad trade never
 * lobotomises the strategy.
 */

const BOUNDS = {
  weight: [0.25, 2.5],
  threshold: [1.5, 4.5],
  slAtrMult: [1.0, 2.5],
  rrRatio: [1.5, 3.0],
} as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(Math.max(v, lo), hi);

const WEIGHT_LR = 0.08; // per-trade weight nudge
const ROLLING_WINDOW = 20;

export function defaultLearning(): LearningState {
  return {
    confluences: Object.fromEntries(
      CONFLUENCE_NAMES.map((n) => [n, { weight: 1, wins: 0, losses: 0, pnl: 0 }]),
    ),
    threshold: 2.5,
    slAtrMult: 1.5,
    rrRatio: 2.0,
    recentResults: [],
    consecutiveLosses: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    adjustments: [],
  };
}

export function loadLearning(): LearningState {
  const state = loadJson('learning', defaultLearning());
  // Ensure newly added confluences get a default entry.
  for (const n of CONFLUENCE_NAMES) {
    state.confluences[n] ??= { weight: 1, wins: 0, losses: 0, pnl: 0 };
  }
  return state;
}

export function saveLearning(state: LearningState): void {
  saveJson('learning', state);
}

/** Digest a closed trade, mutate the learning state, return the human-readable
 *  adjustments made (for the "lesson learned" Discord card). */
export function recordTrade(state: LearningState, trade: ClosedTrade): Adjustment[] {
  const made: Adjustment[] = [];
  const note = (change: string, reason: string) => {
    const adj = { at: trade.closedAt, change, reason };
    made.push(adj);
    state.adjustments.push(adj);
  };
  const won = trade.pnl > 0;
  const tradeDir = trade.position.direction === 'long' ? 1 : -1;

  state.totalTrades += 1;
  won ? (state.wins += 1) : (state.losses += 1);
  state.consecutiveLosses = won ? 0 : state.consecutiveLosses + 1;
  state.recentResults.push(won ? 'win' : 'loss');
  if (state.recentResults.length > ROLLING_WINDOW) state.recentResults.shift();

  // 1. Confluence re-weighting: a vote that agreed with the trade direction is
  //    credited on a win and blamed on a loss; a dissenting vote gets the inverse.
  for (const v of trade.position.votes) {
    if (v.direction === 0) continue;
    const stats = state.confluences[v.name];
    if (!stats) continue;
    const agreed = v.direction === tradeDir;
    if (agreed) {
      won ? (stats.wins += 1) : (stats.losses += 1);
      stats.pnl += trade.pnl;
    }
    const delta = WEIGHT_LR * v.strength * (agreed === won ? 1 : -1);
    const before = stats.weight;
    stats.weight = clamp(stats.weight * (1 + delta), BOUNDS.weight);
    if (Math.abs(stats.weight - before) > 0.01) {
      note(
        `${v.name} weight ${before.toFixed(2)} → ${stats.weight.toFixed(2)}`,
        agreed === won
          ? `${v.name} ${agreed ? 'called' : 'warned against'} this ${won ? 'winner' : 'loser'} correctly`
          : `${v.name} was on the wrong side of this ${won ? 'winner' : 'loser'}`,
      );
    }
  }

  // 2. Entry selectivity from the rolling win rate.
  if (state.recentResults.length >= 10) {
    const winRate = state.recentResults.filter((r) => r === 'win').length / state.recentResults.length;
    const before = state.threshold;
    if (winRate < 0.4) state.threshold = clamp(state.threshold + 0.15, BOUNDS.threshold);
    else if (winRate > 0.6) state.threshold = clamp(state.threshold - 0.1, BOUNDS.threshold);
    if (state.threshold !== before) {
      note(
        `entry threshold ${before.toFixed(2)} → ${state.threshold.toFixed(2)}`,
        `rolling win rate ${(winRate * 100).toFixed(0)}% over last ${state.recentResults.length} trades`,
      );
    }
  }

  // 3. Exit tuning from how trades actually resolve. Frequent stop-outs mean
  //    the stop sits inside the market's noise — widen it. Winners that stop
  //    at breakeven after nearly tagging TP suggest R:R is too greedy.
  if (trade.exitReason === 'sl' && state.consecutiveLosses >= 2) {
    const before = state.slAtrMult;
    state.slAtrMult = clamp(state.slAtrMult + 0.1, BOUNDS.slAtrMult);
    if (state.slAtrMult !== before) {
      note(
        `SL width ${before.toFixed(2)} → ${state.slAtrMult.toFixed(2)} ATR`,
        'consecutive stop-outs — stops were inside the noise',
      );
    }
  } else if (trade.exitReason === 'tp') {
    const beforeSl = state.slAtrMult;
    state.slAtrMult = clamp(state.slAtrMult - 0.05, BOUNDS.slAtrMult);
    if (Math.abs(state.slAtrMult - beforeSl) > 0.001) {
      note(
        `SL width ${beforeSl.toFixed(2)} → ${state.slAtrMult.toFixed(2)} ATR`,
        'clean TP hit — tightening risk slightly',
      );
    }
  } else if (trade.exitReason === 'breakeven') {
    const before = state.rrRatio;
    state.rrRatio = clamp(state.rrRatio - 0.1, BOUNDS.rrRatio);
    if (state.rrRatio !== before) {
      note(
        `R:R ${before.toFixed(2)} → ${state.rrRatio.toFixed(2)}`,
        'trade retraced to breakeven before reaching TP — target was too far',
      );
    }
  }

  if (state.adjustments.length > 200) state.adjustments = state.adjustments.slice(-200);
  saveLearning(state);
  return made;
}

export const winRate = (state: LearningState): number =>
  state.totalTrades === 0 ? 0 : state.wins / state.totalTrades;
