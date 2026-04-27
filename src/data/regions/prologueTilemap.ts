import { WORLD_HEIGHT, WORLD_WIDTH } from '../../config/constants';

export const PROLOGUE_TILE_SIZE = 32;
export const PROLOGUE_EMPTY_TILE = -1;
export const PROLOGUE_MAP_COLUMNS = Math.ceil(WORLD_WIDTH / PROLOGUE_TILE_SIZE);
export const PROLOGUE_MAP_ROWS = Math.ceil(WORLD_HEIGHT / PROLOGUE_TILE_SIZE);

export const PROLOGUE_TILE_FRAMES = {
  ROUTE_FLOOR: 0,
  ROUTE_FLOOR_CRACKED: 1,
  ROUTE_FLOOR_PATCH: 2,
  ROUTE_FLOOR_ORNAMENT: 3,
  CLIFF_NORTH: 4,
  CLIFF_WEST: 5,
  CLIFF_EAST: 6,
  CLIFF_SOUTH: 7,
  CLIFF_NORTH_WEST_CORNER: 8,
  CLIFF_NORTH_EAST_CORNER: 9,
  CLIFF_SOUTH_WEST_CORNER: 10,
  CLIFF_SOUTH_EAST_CORNER: 11,
  SHRINE_ACCENT: 12,
  RUNE_ACCENT: 13,
  RUBBLE_SCATTER: 14,
  ROUTE_FLOOR_CRACKED_ALT: 15,
} as const;

export interface PrologueRouteRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frame: number;
}

const rect = (
  id: string,
  col: number,
  row: number,
  width: number,
  height: number,
  frame: number
): PrologueRouteRect => ({
  id,
  x: col * PROLOGUE_TILE_SIZE,
  y: row * PROLOGUE_TILE_SIZE,
  width: width * PROLOGUE_TILE_SIZE,
  height: height * PROLOGUE_TILE_SIZE,
  frame,
});

export const PROLOGUE_ROUTE_RECTS: PrologueRouteRect[] = [
  rect('spawn', 6, 11, 8, 4, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
  rect('bridge_spawn_hub', 13, 12, 9, 2, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
  rect('central_hub', 21, 9, 15, 7, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
  rect('bridge_hub_north', 27, 5, 3, 5, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
  rect('rune_branch', 23, 1, 11, 5, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
  rect('bridge_hub_south', 27, 15, 3, 4, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
  rect('console_branch', 23, 18, 11, 5, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
  rect('bridge_hub_east', 35, 12, 19, 2, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
  rect('gate_courtyard', 53, 9, 15, 7, PROLOGUE_TILE_FRAMES.ROUTE_FLOOR),
];

export interface PrologueDecorationTile {
  col: number;
  row: number;
  frame: number;
}

export interface PrologueCollisionBlocker {
  x: number;
  y: number;
  radiusTiles?: number;
}

export const PROLOGUE_DECORATION_TILES: PrologueDecorationTile[] = [
  { col: 10, row: 12, frame: PROLOGUE_TILE_FRAMES.SHRINE_ACCENT },
  { col: 24, row: 10, frame: PROLOGUE_TILE_FRAMES.RUBBLE_SCATTER },
  { col: 28, row: 3, frame: PROLOGUE_TILE_FRAMES.RUNE_ACCENT },
  { col: 28, row: 12, frame: PROLOGUE_TILE_FRAMES.SHRINE_ACCENT },
  { col: 28, row: 20, frame: PROLOGUE_TILE_FRAMES.RUNE_ACCENT },
  { col: 60, row: 12, frame: PROLOGUE_TILE_FRAMES.RUNE_ACCENT },
  { col: 66, row: 14, frame: PROLOGUE_TILE_FRAMES.RUBBLE_SCATTER },
];

const pointInsideRect = (
  point: { x: number; y: number },
  routeRect: PrologueRouteRect,
  padding = 0
): boolean => (
  point.x >= routeRect.x - padding &&
  point.x <= routeRect.x + routeRect.width + padding &&
  point.y >= routeRect.y - padding &&
  point.y <= routeRect.y + routeRect.height + padding
);

export const isPointOnPrologueTileRoute = (
  point: { x: number; y: number },
  padding = 0
): boolean => PROLOGUE_ROUTE_RECTS.some((routeRect) => pointInsideRect(point, routeRect, padding));

export const isNearPrologueTileRoute = (
  point: { x: number; y: number },
  padding = 64
): boolean => isPointOnPrologueTileRoute(point, padding);

const toMovementTile = (point: { x: number; y: number }): { col: number; row: number } => ({
  col: Math.floor(point.x / PROLOGUE_TILE_SIZE),
  row: Math.floor(point.y / PROLOGUE_TILE_SIZE),
});

export const isPointBlockedByPrologueCollision = (
  point: { x: number; y: number },
  blockers: PrologueCollisionBlocker[]
): boolean => {
  const targetTile = toMovementTile(point);

  return blockers.some((blocker) => {
    const blockerTile = toMovementTile(blocker);
    const radiusTiles = blocker.radiusTiles ?? 0;

    return (
      Math.abs(targetTile.col - blockerTile.col) <= radiusTiles &&
      Math.abs(targetTile.row - blockerTile.row) <= radiusTiles
    );
  });
};

export const isPrologueStepWalkable = (
  point: { x: number; y: number },
  blockers: PrologueCollisionBlocker[],
  routePadding = 10
): boolean => (
  isPointOnPrologueTileRoute(point, routePadding) &&
  !isPointBlockedByPrologueCollision(point, blockers)
);

const makeEmptyRouteMask = (): boolean[][] => (
  Array.from({ length: PROLOGUE_MAP_ROWS }, () =>
    Array.from({ length: PROLOGUE_MAP_COLUMNS }, () => false)
  )
);

const chooseRouteFloorFrame = (routeFrame: number, row: number, col: number): number => {
  if (routeFrame !== PROLOGUE_TILE_FRAMES.ROUTE_FLOOR) {
    return routeFrame;
  }

  const detailSeed = (row * 13 + col * 7) % 19;

  if (detailSeed === 0 || detailSeed === 11) {
    return PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED;
  }
  if (detailSeed === 4) {
    return PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_PATCH;
  }
  if (detailSeed === 8) {
    return PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_ORNAMENT;
  }
  if (detailSeed === 15) {
    return PROLOGUE_TILE_FRAMES.ROUTE_FLOOR_CRACKED_ALT;
  }

  return PROLOGUE_TILE_FRAMES.ROUTE_FLOOR;
};

const isRouteCell = (routeMask: boolean[][], row: number, col: number): boolean => (
  routeMask[row]?.[col] === true
);

const applyRouteEdges = (grid: number[][], routeMask: boolean[][]): void => {
  for (let row = 0; row < PROLOGUE_MAP_ROWS; row += 1) {
    for (let col = 0; col < PROLOGUE_MAP_COLUMNS; col += 1) {
      if (!isRouteCell(routeMask, row, col)) continue;

      const hasTop = isRouteCell(routeMask, row - 1, col);
      const hasBottom = isRouteCell(routeMask, row + 1, col);
      const hasLeft = isRouteCell(routeMask, row, col - 1);
      const hasRight = isRouteCell(routeMask, row, col + 1);

      if (!hasTop && !hasLeft) {
        grid[row][col] = PROLOGUE_TILE_FRAMES.CLIFF_NORTH_WEST_CORNER;
        continue;
      }
      if (!hasTop && !hasRight) {
        grid[row][col] = PROLOGUE_TILE_FRAMES.CLIFF_NORTH_EAST_CORNER;
        continue;
      }
      if (!hasBottom && !hasLeft) {
        grid[row][col] = PROLOGUE_TILE_FRAMES.CLIFF_SOUTH_WEST_CORNER;
        continue;
      }
      if (!hasBottom && !hasRight) {
        grid[row][col] = PROLOGUE_TILE_FRAMES.CLIFF_SOUTH_EAST_CORNER;
        continue;
      }
      if (!hasTop) {
        grid[row][col] = PROLOGUE_TILE_FRAMES.CLIFF_NORTH;
        continue;
      }
      if (!hasBottom) {
        grid[row][col] = PROLOGUE_TILE_FRAMES.CLIFF_SOUTH;
        continue;
      }
      if (!hasLeft) {
        grid[row][col] = PROLOGUE_TILE_FRAMES.CLIFF_WEST;
        continue;
      }
      if (!hasRight) {
        grid[row][col] = PROLOGUE_TILE_FRAMES.CLIFF_EAST;
      }
    }
  }
};

export const buildPrologueTileGrid = (): number[][] => {
  const grid: number[][] = Array.from({ length: PROLOGUE_MAP_ROWS }, () =>
    Array.from({ length: PROLOGUE_MAP_COLUMNS }, () => PROLOGUE_EMPTY_TILE)
  );
  const routeMask = makeEmptyRouteMask();

  for (const routeRect of PROLOGUE_ROUTE_RECTS) {
    const startCol = Math.floor(routeRect.x / PROLOGUE_TILE_SIZE);
    const startRow = Math.floor(routeRect.y / PROLOGUE_TILE_SIZE);
    const endCol = Math.ceil((routeRect.x + routeRect.width) / PROLOGUE_TILE_SIZE);
    const endRow = Math.ceil((routeRect.y + routeRect.height) / PROLOGUE_TILE_SIZE);

    for (let row = startRow; row < endRow; row += 1) {
      for (let col = startCol; col < endCol; col += 1) {
        if (grid[row]?.[col] === undefined) continue;
        routeMask[row][col] = true;
        grid[row][col] = chooseRouteFloorFrame(routeRect.frame, row, col);
      }
    }
  }

  applyRouteEdges(grid, routeMask);

  for (const decoration of PROLOGUE_DECORATION_TILES) {
    if (grid[decoration.row]?.[decoration.col] === undefined) continue;
    grid[decoration.row][decoration.col] = decoration.frame;
  }

  return grid;
};
