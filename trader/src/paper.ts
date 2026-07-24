import { config } from './config.js';
import { appendJsonl, loadJson, saveJson } from './store.js';
import type { AccountState, ClosedTrade, ExitReason, Position, Signal } from './types.js';

/**
 * Paper trading engine. Simulates a cross-margin USDⓈ-M perp account with
 * taker fees and adverse slippage on both sides, TP/SL exits, a move to
 * breakeven at +1R, and an equity-wipe liquidation check.
 */

export function defaultAccount(): AccountState {
  return {
    equity: config.startBalance,
    startBalance: config.startBalance,
    peakEquity: config.startBalance,
    openPositions: [],
    symbolCooldownUntil: {},
    pausedUntil: 0,
    manuallyPaused: false,
    targetHitAnnounced: false,
    busted: false,
  };
}

export const loadAccount = (): AccountState => loadJson('account', defaultAccount());
export const saveAccount = (state: AccountState): void => saveJson('account', state);

const slip = (price: number, side: 'buy' | 'sell'): number =>
  side === 'buy' ? price * (1 + config.slippageRate) : price * (1 - config.slippageRate);

export function openPosition(account: AccountState, signal: Signal): Position {
  const fillEntry = slip(signal.entry, signal.direction === 'long' ? 'buy' : 'sell');
  const entryFee = signal.qty * fillEntry * config.takerFeeRate;
  const position: Position = {
    ...signal,
    entry: fillEntry,
    entryFee,
    breakevenMoved: false,
    openedAt: Date.now(),
  };
  account.openPositions.push(position);
  saveAccount(account);
  return position;
}

export function unrealizedPnl(position: Position, price: number): number {
  const sign = position.direction === 'long' ? 1 : -1;
  return sign * (price - position.entry) * position.qty;
}

function close(
  account: AccountState,
  position: Position,
  rawExit: number,
  exitReason: ExitReason,
): ClosedTrade {
  const fillExit = slip(rawExit, position.direction === 'long' ? 'sell' : 'buy');
  const exitFee = position.qty * fillExit * config.takerFeeRate;
  const fees = position.entryFee + exitFee;
  const pnl = unrealizedPnl(position, fillExit) - fees;
  account.equity = Math.max(account.equity + pnl, 0);
  account.peakEquity = Math.max(account.peakEquity, account.equity);
  account.openPositions = account.openPositions.filter((p) => p.id !== position.id);
  // Anti revenge-trading: no re-entry on this symbol for 10 minutes.
  account.symbolCooldownUntil[position.symbol] = Date.now() + 10 * 60_000;
  const trade: ClosedTrade = {
    position,
    exitPrice: fillExit,
    exitReason,
    pnl,
    fees,
    equityAfter: account.equity,
    closedAt: Date.now(),
  };
  appendJsonl('trades', trade);
  saveAccount(account);
  return trade;
}

export const closeManually = (account: AccountState, position: Position, price: number): ClosedTrade =>
  close(account, position, price, 'manual');

export interface TickEvent {
  kind: 'closed' | 'breakeven';
  position: Position;
  trade?: ClosedTrade;
}

/** Run TP/SL/breakeven/liquidation management for one price update. */
export function onPrice(account: AccountState, symbol: string, price: number): TickEvent[] {
  const events: TickEvent[] = [];
  for (const position of [...account.openPositions]) {
    if (position.symbol !== symbol) continue;
    const long = position.direction === 'long';

    // Liquidation: cross-margin equity wiped out by this position's drawdown.
    if (account.equity + unrealizedPnl(position, price) <= 0) {
      events.push({ kind: 'closed', position, trade: close(account, position, price, 'liquidation') });
      continue;
    }

    const hitSl = long ? price <= position.stopLoss : price >= position.stopLoss;
    const hitTp = long ? price >= position.takeProfit : price <= position.takeProfit;
    if (hitSl) {
      const reason: ExitReason = position.breakevenMoved ? 'breakeven' : 'sl';
      events.push({ kind: 'closed', position, trade: close(account, position, position.stopLoss, reason) });
      continue;
    }
    if (hitTp) {
      events.push({ kind: 'closed', position, trade: close(account, position, position.takeProfit, 'tp') });
      continue;
    }

    // Risk-free at +1R: slide the stop to entry once price has travelled one
    // full risk unit in our favour.
    if (!position.breakevenMoved) {
      const risk = Math.abs(position.entry - position.stopLoss);
      const progress = long ? price - position.entry : position.entry - price;
      if (progress >= risk) {
        position.stopLoss = position.entry;
        position.breakevenMoved = true;
        saveAccount(account);
        events.push({ kind: 'breakeven', position });
      }
    }
  }
  return events;
}
