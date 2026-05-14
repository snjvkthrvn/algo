/**
 * End-of-run rank from final score.
 *
 * Thresholds tuned for a clean run topping out around ~14k; an average run
 * lands around 6-8k. S requires near-perfect time + no mistakes.
 */

export type Rank = { letter: string; color: string; label: string };

const TABLE: Array<Rank & { min: number }> = [
  { min: 12000, letter: 'S', color: '#fde68a', label: 'Adept' },
  { min: 9000, letter: 'A', color: '#7dd3fc', label: 'Polished' },
  { min: 6000, letter: 'B', color: '#a3e635', label: 'Solid' },
  { min: 3000, letter: 'C', color: '#fca5a5', label: 'Initiate' },
  { min: 0, letter: 'D', color: '#8896c4', label: 'Apprentice' },
];

export function rankFor(score: number): Rank {
  for (const row of TABLE) {
    if (score >= row.min) {
      return { letter: row.letter, color: row.color, label: row.label };
    }
  }
  return TABLE[TABLE.length - 1]!;
}
