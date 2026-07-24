export type Direction = 'long' | 'short';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

/** One confluence's opinion on a symbol: which way it points and how strongly. */
export interface ConfluenceVote {
  name: string;
  /** +1 = long, -1 = short, 0 = no opinion. */
  direction: 1 | -1 | 0;
  /** 0..2 multiplier for how emphatic the vote is. */
  strength: number;
  note: string;
}

export interface Signal {
  id: string;
  symbol: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  qty: number;
  notional: number;
  leverage: number;
  riskAmount: number;
  rr: number;
  score: number;
  threshold: number;
  atr: number;
  votes: ConfluenceVote[];
  createdAt: number;
}

export interface Position extends Signal {
  /** SL has been moved to entry after price reached +1R. */
  breakevenMoved: boolean;
  entryFee: number;
  openedAt: number;
}

export type ExitReason = 'tp' | 'sl' | 'breakeven' | 'manual' | 'liquidation';

export interface ClosedTrade {
  position: Position;
  exitPrice: number;
  exitReason: ExitReason;
  /** Net PnL after fees + slippage. */
  pnl: number;
  fees: number;
  equityAfter: number;
  closedAt: number;
}

export interface AccountState {
  equity: number;
  startBalance: number;
  peakEquity: number;
  openPositions: Position[];
  /** Per-symbol timestamp before which no new entry is allowed (anti revenge-trading). */
  symbolCooldownUntil: Record<string, number>;
  /** Global pause (loss-streak cool-off or manual !pause). 0 = not paused. */
  pausedUntil: number;
  manuallyPaused: boolean;
  targetHitAnnounced: boolean;
  busted: boolean;
}

export interface ConfluenceStats {
  weight: number;
  wins: number;
  losses: number;
  pnl: number;
}

export interface Adjustment {
  at: number;
  change: string;
  reason: string;
}

export interface LearningState {
  confluences: Record<string, ConfluenceStats>;
  /** Minimum |score| required to take a trade. */
  threshold: number;
  /** ATR multiplier for stop-loss distance. */
  slAtrMult: number;
  /** Reward:risk ratio for take-profit placement. */
  rrRatio: number;
  recentResults: ('win' | 'loss')[];
  consecutiveLosses: number;
  totalTrades: number;
  wins: number;
  losses: number;
  adjustments: Adjustment[];
}
