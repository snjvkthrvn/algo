/**
 * grainEconomy — pure move-economy ledger for the Grain Chamber (P1_1).
 *
 * The room physicalizes move count: each adjacent trade spills a fixed
 * amount of grain. Stars derive from total trades vs the field's par
 * (par = total inversion count across all deliveries — the minimum number
 * of adjacent swaps that can sort them). No timers, no fail states.
 *
 * Pure data + functions, no Phaser. All updates immutable.
 */

export const GRAIN_PER_TRADE = 6;

export interface GrainLedger {
  readonly trades: number;
  readonly grainStart: number;
}

export function emptyLedger(grainStart: number): GrainLedger {
  return { trades: 0, grainStart };
}

export function recordTrade(ledger: GrainLedger): GrainLedger {
  return { ...ledger, trades: ledger.trades + 1 };
}

export function grainSurviving(ledger: GrainLedger): number {
  return Math.max(0, ledger.grainStart - ledger.trades * GRAIN_PER_TRADE);
}

/** 3★ ≤ par+1, 2★ ≤ par+4, 1★ otherwise (spec "Move economy"). */
export function starsForTrades(trades: number, par: number): 1 | 2 | 3 {
  if (trades <= par + 1) return 3;
  if (trades <= par + 4) return 2;
  return 1;
}
