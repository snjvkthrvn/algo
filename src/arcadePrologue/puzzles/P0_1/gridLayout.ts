import { GRID_COLS, GRID_ROWS, PERSPECTIVE_Y, STAGE, TILE_GAP, TILE_SIZE, s } from './tokens';

/**
 * 6×6 grid coordinate system for the cosmic-rune board.
 *
 * Coordinates are integer (col, row). Tiles are square in world space but
 * compressed vertically by PERSPECTIVE_Y to suggest a tilted-camera 3/4 view
 * without committing to true isometric rendering (a Phase 2 art decision).
 *
 * Neighbors are 4-directional (orthogonal); the player walks one tile per step.
 */

export type Cell = { col: number; row: number };

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function parseCell(key: string): Cell {
  const [c, r] = key.split(',').map(Number);
  return { col: c!, row: r! };
}

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
}

const STEPS: ReadonlyArray<{ dc: number; dr: number }> = [
  { dc: 0, dr: -1 },
  { dc: 1, dr: 0 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
];

export function neighborSteps(): ReadonlyArray<{ dc: number; dr: number }> {
  return STEPS;
}

const GRID_PIXEL_WIDTH = GRID_COLS * TILE_SIZE + (GRID_COLS - 1) * TILE_GAP;
const GRID_PIXEL_HEIGHT = (GRID_ROWS * TILE_SIZE + (GRID_ROWS - 1) * TILE_GAP) * PERSPECTIVE_Y;

export const GRID_BOUNDS = {
  width: GRID_PIXEL_WIDTH,
  height: GRID_PIXEL_HEIGHT,
} as const;

export type Point = { x: number; y: number };

/** World position of the top-left corner of the grid. */
export function gridOrigin(): Point {
  // Anchor the grid slightly left of center so the Rune Keeper has space on the right.
  const cx = STAGE.width / 2 - s(60);
  const cy = STAGE.height / 2 + s(20);
  return { x: cx - GRID_PIXEL_WIDTH / 2, y: cy - GRID_PIXEL_HEIGHT / 2 };
}

/** Convert grid coords to world coords (center of the tile). */
export function cellToWorld(col: number, row: number): Point {
  const origin = gridOrigin();
  const x = origin.x + col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
  const y = origin.y + row * (TILE_SIZE + TILE_GAP) * PERSPECTIVE_Y + (TILE_SIZE * PERSPECTIVE_Y) / 2;
  return { x, y };
}

/** Inverse: world coords → nearest grid cell (or null if outside the grid). */
export function worldToCell(worldX: number, worldY: number): Cell | null {
  const origin = gridOrigin();
  const localX = worldX - origin.x;
  const localY = worldY - origin.y;
  if (localX < 0 || localY < 0) return null;
  if (localX > GRID_PIXEL_WIDTH || localY > GRID_PIXEL_HEIGHT) return null;
  const col = Math.floor(localX / (TILE_SIZE + TILE_GAP));
  const row = Math.floor(localY / ((TILE_SIZE + TILE_GAP) * PERSPECTIVE_Y));
  if (!inBounds(col, row)) return null;
  return { col, row };
}
