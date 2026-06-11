import { describe, expect, it } from "vitest";
import {
  GRAIN_PER_TRADE,
  emptyLedger,
  recordTrade,
  grainSurviving,
  starsForTrades,
} from "./grainEconomy";

describe("grainEconomy", () => {
  it("starts with zero trades and full grain", () => {
    const ledger = emptyLedger(100);
    expect(ledger.trades).toBe(0);
    expect(ledger.grainStart).toBe(100);
    expect(grainSurviving(ledger)).toBe(100);
  });

  it("recordTrade returns a NEW ledger and never mutates", () => {
    const a = emptyLedger(100);
    const b = recordTrade(a);
    expect(a.trades).toBe(0);
    expect(b.trades).toBe(1);
    expect(grainSurviving(b)).toBe(100 - GRAIN_PER_TRADE);
  });

  it("grain never goes below zero", () => {
    let ledger = emptyLedger(GRAIN_PER_TRADE * 2);
    for (let i = 0; i < 10; i++) ledger = recordTrade(ledger);
    expect(grainSurviving(ledger)).toBe(0);
  });

  it("maps trades vs par to stars: ≤par+1 → 3, ≤par+4 → 2, else 1", () => {
    expect(starsForTrades(12, 12)).toBe(3);
    expect(starsForTrades(13, 12)).toBe(3);
    expect(starsForTrades(14, 12)).toBe(2);
    expect(starsForTrades(16, 12)).toBe(2);
    expect(starsForTrades(17, 12)).toBe(1);
  });
});
