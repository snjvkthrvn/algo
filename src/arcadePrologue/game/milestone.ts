/**
 * Combo milestone callouts.
 *
 * Returns a label + display color for combo values that hit a threshold.
 * Caller is responsible for spawning the popup at the action site.
 */

export type Milestone = { label: string; color: string };

export function comboMilestone(combo: number): Milestone | null {
  if (combo === 3) return { label: 'STREAK', color: '#fde68a' };
  if (combo === 6) return { label: 'ON FIRE', color: '#fbbf24' };
  if (combo === 9) return { label: 'BLAZING', color: '#fb923c' };
  if (combo === 12) return { label: 'UNSTOPPABLE', color: '#f87171' };
  if (combo > 12 && (combo - 12) % 3 === 0) {
    return { label: 'INCREDIBLE', color: '#f472b6' };
  }
  return null;
}
