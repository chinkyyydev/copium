import { fetchFundingRate, fetchKlines } from './binance.js';
import { config } from './config.js';
import { loadLearning, winRate } from './learning.js';
import { loadAccount } from './paper.js';
import { computeVotes, evaluate, scoreVotes } from './strategy.js';

/** Headless CLI for poking the engine without Discord: scan | stats | brain. */

const [, , command = 'scan'] = process.argv;

async function scan(): Promise<void> {
  const account = loadAccount();
  const learning = loadLearning();
  for (const symbol of config.symbols) {
    const [candles5m, candles15m, fundingRate] = await Promise.all([
      fetchKlines(symbol, '5m', 250),
      fetchKlines(symbol, '15m', 250),
      fetchFundingRate(symbol),
    ]);
    const snap = { symbol, candles5m, candles15m, fundingRate };
    const votes = computeVotes(snap);
    const score = scoreVotes(votes, learning);
    console.log(`\n${symbol} — score ${score.toFixed(2)} (threshold ${learning.threshold.toFixed(2)})`);
    for (const v of votes) {
      const arrow = v.direction === 1 ? '↑' : v.direction === -1 ? '↓' : '·';
      console.log(`  ${arrow} ${v.name.padEnd(14)} ${v.note}`);
    }
    const signal = evaluate(snap, account.equity, learning, {
      riskPct: config.riskPct,
      maxLeverage: config.maxLeverage,
    });
    if (signal) {
      console.log(
        `  ➜ ${signal.direction.toUpperCase()} @ ${signal.entry} · TP ${signal.takeProfit.toFixed(2)} · SL ${signal.stopLoss.toFixed(2)} · ${signal.leverage.toFixed(1)}x`,
      );
    }
  }
}

function stats(): void {
  const account = loadAccount();
  const learning = loadLearning();
  console.log(`equity   $${account.equity.toFixed(2)} (start $${account.startBalance}, peak $${account.peakEquity.toFixed(2)})`);
  console.log(`trades   ${learning.totalTrades} · ${learning.wins}W/${learning.losses}L · ${(winRate(learning) * 100).toFixed(0)}% WR`);
  console.log(`open     ${account.openPositions.map((p) => `${p.direction} ${p.symbol}`).join(', ') || 'none'}`);
}

function brain(): void {
  const learning = loadLearning();
  console.log(`threshold ${learning.threshold.toFixed(2)} · SL ${learning.slAtrMult.toFixed(2)} ATR · R:R 1:${learning.rrRatio.toFixed(1)}`);
  for (const [name, s] of Object.entries(learning.confluences)) {
    console.log(`  ${s.weight.toFixed(2)}  ${name.padEnd(14)} ${s.wins}W/${s.losses}L`);
  }
  for (const a of learning.adjustments.slice(-10)) {
    console.log(`  ${new Date(a.at).toISOString()} ${a.change} — ${a.reason}`);
  }
}

if (command === 'scan') await scan();
else if (command === 'stats') stats();
else if (command === 'brain') brain();
else console.error(`unknown command: ${command} (use scan | stats | brain)`);
