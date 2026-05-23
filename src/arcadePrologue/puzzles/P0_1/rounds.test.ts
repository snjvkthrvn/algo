import { describe, expect, it } from 'vitest';
import { ROUNDS } from './rounds';
import { GRID_COLS, GRID_ROWS } from './tokens';
import { neighborSteps } from './gridLayout';

describe('P0-1 rounds', () => {
  it('ships exactly three rounds (Trace / Branch / Revisit)', () => {
    expect(ROUNDS).toHaveLength(3);
    expect(ROUNDS.map((r) => r.title)).toEqual(['I. Trace', 'II. Branch', 'III. Revisit']);
  });

  it('every walk cell appears in its round field', () => {
    for (const round of ROUNDS) {
      const field = new Set(round.field.map((c) => `${c.col},${c.row}`));
      for (const step of round.walk) {
        expect(field.has(`${step.col},${step.row}`), `walk cell ${step.col},${step.row} of "${round.title}" must be in field`).toBe(true);
      }
    }
  });

  it('every walk cell is within the 6×6 grid', () => {
    for (const round of ROUNDS) {
      for (const c of round.walk) {
        expect(c.col).toBeGreaterThanOrEqual(0);
        expect(c.col).toBeLessThan(GRID_COLS);
        expect(c.row).toBeGreaterThanOrEqual(0);
        expect(c.row).toBeLessThan(GRID_ROWS);
      }
    }
  });

  it('every consecutive pair of walk cells is orthogonally adjacent (walkable in one tile step)', () => {
    const valid = new Set(neighborSteps().map((s) => `${s.dc},${s.dr}`));
    for (const round of ROUNDS) {
      for (let i = 1; i < round.walk.length; i += 1) {
        const a = round.walk[i - 1]!;
        const b = round.walk[i]!;
        const delta = `${b.col - a.col},${b.row - a.row}`;
        expect(valid.has(delta), `${round.title}: step ${i - 1} → ${i} (${delta}) must be orthogonal`).toBe(true);
      }
    }
  });

  it('revisit round actually revisits — the same cell appears twice in the walk', () => {
    const revisit = ROUNDS[2]!;
    const counts = new Map<string, number>();
    for (const c of revisit.walk) {
      const k = `${c.col},${c.row}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const repeats = [...counts.values()].filter((n) => n > 1);
    expect(repeats.length, 'revisit round should contain at least one repeated cell').toBeGreaterThan(0);
  });
});
