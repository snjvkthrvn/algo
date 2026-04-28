import { describe, expect, it } from 'vitest';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../config/constants';
import {
  PROLOGUE_EMPTY_TILE,
  PROLOGUE_MAP_COLUMNS,
  PROLOGUE_MAP_ROWS,
  PROLOGUE_ROUTE_RECTS,
  PROLOGUE_TILE_FRAMES,
  PROLOGUE_TILE_SIZE,
  buildPrologueTileGrid,
  isPointBlockedByPrologueCollision,
  isNearPrologueTileRoute,
  isPointOnPrologueTileRoute,
  isPrologueStepWalkable,
} from './prologueTilemap';

const getRect = (id: string) => {
  const rect = PROLOGUE_ROUTE_RECTS.find((entry) => entry.id === id);
  if (!rect) throw new Error(`Missing route rect ${id}`);
  return rect;
};

const rectsTouch = (a: ReturnType<typeof getRect>, b: ReturnType<typeof getRect>): boolean => (
  a.x <= b.x + b.width &&
  a.x + a.width >= b.x &&
  a.y <= b.y + b.height &&
  a.y + a.height >= b.y
);

describe('prologue tilemap route', () => {
  it('covers the whole world with 32 pixel map cells', () => {
    expect(PROLOGUE_TILE_SIZE).toBe(32);
    expect(PROLOGUE_MAP_COLUMNS * PROLOGUE_TILE_SIZE).toBeGreaterThanOrEqual(WORLD_WIDTH);
    expect(PROLOGUE_MAP_ROWS * PROLOGUE_TILE_SIZE).toBeGreaterThanOrEqual(WORLD_HEIGHT);
  });

  it('connects every required route segment without visual gaps', () => {
    const requiredConnections: Array<[string, string]> = [
      ['spawn', 'bridge_spawn_hub'],
      ['bridge_spawn_hub', 'central_hub'],
      ['central_hub', 'bridge_hub_north'],
      ['bridge_hub_north', 'rune_branch'],
      ['central_hub', 'bridge_hub_south'],
      ['bridge_hub_south', 'console_branch'],
      ['central_hub', 'bridge_hub_east'],
      ['bridge_hub_east', 'gate_courtyard'],
    ];

    for (const [from, to] of requiredConnections) {
      expect(rectsTouch(getRect(from), getRect(to)), `${from} -> ${to}`).toBe(true);
    }
  });

  it('places important route points on walkable tile rectangles', () => {
    for (const point of [
      { x: 320, y: 400 },
      { x: 900, y: 395 },
      { x: 900, y: 165 },
      { x: 900, y: 625 },
      { x: 1830, y: 395 },
      { x: 2000, y: 395 },
    ]) {
      expect(isPointOnPrologueTileRoute(point), `${point.x},${point.y}`).toBe(true);
    }
  });

  it('keeps the audited gate-side void point off-route', () => {
    expect(isPointOnPrologueTileRoute({ x: 2002, y: 31 })).toBe(false);
    expect(isNearPrologueTileRoute({ x: 2002, y: 31 })).toBe(false);
  });

  it('treats a blocker as occupying its nearest logical movement tile', () => {
    expect(isPointBlockedByPrologueCollision(
      { x: 896, y: 400 },
      [{ x: 900, y: 395 }]
    )).toBe(true);
    expect(isPointBlockedByPrologueCollision(
      { x: 864, y: 400 },
      [{ x: 900, y: 395 }]
    )).toBe(false);
  });

  it('blocks larger objects across nearby movement tiles', () => {
    expect(isPointBlockedByPrologueCollision(
      { x: 1824, y: 400 },
      [{ x: 1830, y: 395, radiusTiles: 1 }]
    )).toBe(true);
    expect(isPointBlockedByPrologueCollision(
      { x: 1760, y: 400 },
      [{ x: 1830, y: 395, radiusTiles: 1 }]
    )).toBe(false);
  });

  it('lets the player stand close enough to gate and portal objects for prompts', () => {
    expect(isPrologueStepWalkable(
      { x: 1792, y: 395 },
      [{ x: 1830, y: 395 }]
    )).toBe(true);
    expect(isPrologueStepWalkable(
      { x: 1968, y: 395 },
      [{ x: 2000, y: 395 }]
    )).toBe(true);
  });

  it('requires a tile step target to be on-route and unblocked', () => {
    expect(isPrologueStepWalkable(
      { x: 896, y: 400 },
      [{ x: 900, y: 395 }]
    )).toBe(false);
    expect(isPrologueStepWalkable(
      { x: 864, y: 400 },
      [{ x: 900, y: 395 }]
    )).toBe(true);
    expect(isPrologueStepWalkable(
      { x: 2002, y: 31 },
      []
    )).toBe(false);
  });

  it('builds a rectangular grid while leaving off-route void cells empty', () => {
    const grid = buildPrologueTileGrid();

    expect(grid).toHaveLength(PROLOGUE_MAP_ROWS);
    for (const row of grid) {
      expect(row).toHaveLength(PROLOGUE_MAP_COLUMNS);
      expect(row.every((frame) => frame === PROLOGUE_EMPTY_TILE || (Number.isInteger(frame) && frame >= 0))).toBe(true);
    }
    expect(grid[0][0]).toBe(PROLOGUE_EMPTY_TILE);
  });

  it('maps exposed spawn boundaries to directional cliff and corner tiles', () => {
    const grid = buildPrologueTileGrid();
    const spawn = getRect('spawn');
    const startCol = spawn.x / PROLOGUE_TILE_SIZE;
    const startRow = spawn.y / PROLOGUE_TILE_SIZE;
    const bottomRow = startRow + 3;
    const rightCol = startCol + 7;

    expect(grid[startRow][startCol]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_NORTH_WEST_CORNER);
    expect(grid[startRow][rightCol]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_NORTH_EAST_CORNER);
    expect(grid[bottomRow][startCol]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_SOUTH_WEST_CORNER);
    expect(grid[bottomRow][rightCol]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_SOUTH_EAST_CORNER);
    expect(grid[startRow][startCol + 3]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_NORTH);
    expect(grid[startRow + 1][startCol]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_WEST);
    expect(grid[bottomRow][startCol + 3]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_SOUTH);
    expect([
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_PATCH,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_ORNAMENT,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED_ALT,
    ]).toContain(grid[startRow + 1][startCol + 2]);
    expect([
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_PATCH,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_ORNAMENT,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED_ALT,
    ]).toContain(grid[startRow + 1][rightCol]);
  });

  it('leaves off-route cells empty beneath south cliffs because the drop is baked into the edge tiles', () => {
    const grid = buildPrologueTileGrid();
    const spawn = getRect('spawn');
    const startCol = spawn.x / PROLOGUE_TILE_SIZE;
    const startRow = spawn.y / PROLOGUE_TILE_SIZE;
    const cliffFillRow = startRow + 4;
    const cliffFillCol = startCol + 1;
    const cliffFillPoint = {
      x: cliffFillCol * PROLOGUE_TILE_SIZE + PROLOGUE_TILE_SIZE / 2,
      y: cliffFillRow * PROLOGUE_TILE_SIZE + PROLOGUE_TILE_SIZE / 2,
    };

    expect(grid[cliffFillRow][cliffFillCol]).toBe(PROLOGUE_EMPTY_TILE);
    expect(isPointOnPrologueTileRoute(cliffFillPoint)).toBe(false);
  });

  it('keeps the southern hub connector readable by leaving its throat open and edging the wider hub floor', () => {
    const grid = buildPrologueTileGrid();

    expect(grid[15][26]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_SOUTH);
    expect(grid[15][30]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_SOUTH);
    expect(grid[16][27]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_WEST);
    expect(grid[16][29]).toBe(PROLOGUE_TILE_FRAMES.CLIFF_EAST);
    expect([
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_PATCH,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_ORNAMENT,
      PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED_ALT,
    ]).toContain(grid[15][28]);
  });

  it('adds varied floor detail and reserved accent tiles without reverting to old marker frames', () => {
    const grid = buildPrologueTileGrid();
    const centralHub = getRect('central_hub');
    const startCol = centralHub.x / PROLOGUE_TILE_SIZE;
    const startRow = centralHub.y / PROLOGUE_TILE_SIZE;
    const frames = new Set<number>();

    for (let row = startRow + 1; row < startRow + 6; row += 1) {
      for (let col = startCol + 1; col < startCol + 14; col += 1) {
        frames.add(grid[row][col]);
      }
    }

    expect(frames.has(PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED)).toBe(true);
    expect(frames.has(PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_PATCH)).toBe(true);
    expect(frames.has(PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_ORNAMENT)).toBe(true);
    expect(grid[12][10]).toBe(PROLOGUE_TILE_FRAMES.SHRINE_ACCENT);
    expect(grid[3][28]).toBe(PROLOGUE_TILE_FRAMES.RUNE_ACCENT);
    expect(grid[10][24]).toBe(PROLOGUE_TILE_FRAMES.RUBBLE_SCATTER);
  });
});
