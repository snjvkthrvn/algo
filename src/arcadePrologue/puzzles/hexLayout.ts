/**
 * Flat-top hex layout helpers (vectors from center to neighbor centers).
 */

const SQRT3 = Math.sqrt(3);

export function axialToPxFlatTop(q: number, r: number, hexRadius: number): { x: number; y: number } {
  const x = hexRadius * SQRT3 * (q + r / 2);
  const y = hexRadius * (3 / 2) * r;
  return { x, y };
}

export function buildAxialNeighbors(): Array<{ dq: number; dr: number }> {
  return [
    { dq: 1, dr: 0 },
    { dq: 1, dr: -1 },
    { dq: 0, dr: -1 },
    { dq: -1, dr: 0 },
    { dq: -1, dr: 1 },
    { dq: 0, dr: 1 },
  ];
}

export function axialKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function parseAxial(key: string): { q: number; r: number } {
  const [q, r] = key.split(',').map((n) => Number(n));
  return { q, r };
}
