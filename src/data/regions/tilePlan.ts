/**
 * Shared mechanics for the region tile plans (the gym pattern): the
 * deterministic variant hash, rect→cell coverage, and the 12-slot
 * marching-squares transition ordinal used by every material family.
 * arrayPlainsTilemap.ts and twinRiversTilemap.ts consume these so the
 * two regions cannot drift on core autotile behavior.
 */

/** Transition ordinal layout shared by every 12-tile family. */
export const TILE_EDGE_N = 0;
export const TILE_EDGE_E = 1;
export const TILE_EDGE_S = 2;
export const TILE_EDGE_W = 3;
export const TILE_CORNER_NW = 4;
export const TILE_CORNER_NE = 5;
export const TILE_CORNER_SE = 6;
export const TILE_CORNER_SW = 7;
export const TILE_INNER_NW = 8;
export const TILE_INNER_NE = 9;
export const TILE_INNER_SE = 10;
export const TILE_INNER_SW = 11;

/** Deterministic per-tile hash for variant sprinkling (no RNG). */
export function tileHash(tx: number, ty: number): number {
  return (tx * 73856093 + ty * 19349663) % 97;
}

/** True when the rect covers at least half of cell (tx, ty). */
export function cellCoveredByRect(
  tx: number,
  ty: number,
  tileSize: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const x0 = tx * tileSize;
  const y0 = ty * tileSize;
  const overlapX = Math.max(
    0,
    Math.min(x0 + tileSize, rect.x + rect.width) - Math.max(x0, rect.x)
  );
  const overlapY = Math.max(
    0,
    Math.min(y0 + tileSize, rect.y + rect.height) - Math.max(y0, rect.y)
  );
  return overlapX * overlapY >= (tileSize * tileSize) / 2;
}

/**
 * Transition ordinal for a cell given a boundary probe over neighbor
 * offsets, or -1 for interior. `isBoundary(dx, dy)` answers whether the
 * neighbor at that offset counts as this material's boundary (each region
 * decides what counts — grass only, or any land, etc.). Opposite pairs and
 * 3+ boundary sides return -1 (render interior); the region builders erode
 * such cells out of shipped grids, so -1 is purely defensive there.
 */
export function transitionOrdinal12(
  isBoundary: (dx: number, dy: number) => boolean
): number {
  const gN = isBoundary(0, -1);
  const gE = isBoundary(1, 0);
  const gS = isBoundary(0, 1);
  const gW = isBoundary(-1, 0);
  const count = Number(gN) + Number(gE) + Number(gS) + Number(gW);

  if (count === 0) {
    if (isBoundary(-1, -1)) return TILE_INNER_NW;
    if (isBoundary(1, -1)) return TILE_INNER_NE;
    if (isBoundary(1, 1)) return TILE_INNER_SE;
    if (isBoundary(-1, 1)) return TILE_INNER_SW;
    return -1;
  }
  if (count === 1) {
    if (gN) return TILE_EDGE_N;
    if (gE) return TILE_EDGE_E;
    if (gS) return TILE_EDGE_S;
    return TILE_EDGE_W;
  }
  if (count === 2) {
    if (gN && gW) return TILE_CORNER_NW;
    if (gN && gE) return TILE_CORNER_NE;
    if (gS && gE) return TILE_CORNER_SE;
    if (gS && gW) return TILE_CORNER_SW;
  }
  return -1;
}
