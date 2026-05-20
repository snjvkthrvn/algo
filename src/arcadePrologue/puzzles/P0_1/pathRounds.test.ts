import { describe, expect, it } from 'vitest';
import { PATH_ROUNDS } from './pathRounds';
import { cellKey, GRID_COLS, GRID_ROWS } from './isogrid';

describe('P0-1 isometric path rounds', () => {
  it('combines the Epic arena with the full four-round prologue lesson arc', () => {
    expect(PATH_ROUNDS).toHaveLength(4);
    expect(PATH_ROUNDS.map((round) => round.title)).toEqual([
      'I. Trace',
      'II. Branch',
      'III. Revisit',
      'IV. Long Walk',
    ]);
  });

  it('renders every round on the full 8 by 6 isometric arena field', () => {
    for (const round of PATH_ROUNDS) {
      expect(round.field).toHaveLength(GRID_COLS * GRID_ROWS);
      const field = new Set(round.field.map((cell) => cellKey(cell.row, cell.col)));
      for (let row = 0; row < GRID_ROWS; row += 1) {
        for (let col = 0; col < GRID_COLS; col += 1) {
          expect(field.has(cellKey(row, col)), `${round.title} missing ${row},${col}`).toBe(true);
        }
      }
    }
  });

  it('keeps every path step inside the rendered field and adjacent to the previous step', () => {
    for (const round of PATH_ROUNDS) {
      const field = new Set(round.field.map((cell) => cellKey(cell.row, cell.col)));
      for (let i = 0; i < round.path.length; i += 1) {
        const step = round.path[i]!;
        expect(step.row).toBeGreaterThanOrEqual(0);
        expect(step.row).toBeLessThan(GRID_ROWS);
        expect(step.col).toBeGreaterThanOrEqual(0);
        expect(step.col).toBeLessThan(GRID_COLS);
        expect(field.has(cellKey(step.row, step.col))).toBe(true);

        if (i > 0) {
          const prev = round.path[i - 1]!;
          const distance = Math.abs(step.row - prev.row) + Math.abs(step.col - prev.col);
          expect(distance, `${round.title} step ${i - 1} to ${i}`).toBe(1);
        }
      }
    }
  });

  it('keeps the revisit and long-walk rounds as sequence-not-set tests', () => {
    for (const index of [2, 3]) {
      const counts = new Map<string, number>();
      for (const step of PATH_ROUNDS[index]!.path) {
        const key = cellKey(step.row, step.col);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      expect([...counts.values()].some((count) => count > 1)).toBe(true);
    }
  });
});
