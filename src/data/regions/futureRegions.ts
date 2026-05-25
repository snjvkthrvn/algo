import { VISUAL_REVAMP_KEYS } from '../../config/assets';
import { REGIONS, SCENE_KEYS } from '../../config/constants';

export const FUTURE_REGION_WORLD_WIDTH = 1920;
export const FUTURE_REGION_WORLD_HEIGHT = 720;

export interface FutureRegionRouteRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FutureRegionRouteSurface =
  | 'highland'
  | 'spire'
  | 'canal'
  | 'root'
  | 'graph'
  | 'core';

export interface FutureRegionCollisionBlocker {
  x: number;
  y: number;
  radiusTiles?: number;
}

export interface FutureRegionSceneConfig {
  sceneKey: string;
  regionId: string;
  title: string;
  subtitle: string;
  backgroundKey: string;
  /** Audio cache key for this region's background music. Falls back to 'prologue-bgm' if missing. */
  backgroundMusic?: string;
  routeSurface: FutureRegionRouteSurface;
  routeRects?: FutureRegionRouteRect[];
  accentColor: number;
  panelColor: number;
  ambient: 'wind' | 'water' | 'canal' | 'leaves' | 'data' | 'core';
  back: {
    sceneKey: string;
    portalKey: string;
    label: string;
    spawnX: number;
    spawnY: number;
  };
  next?: {
    sceneKey: string;
    portalKey: string;
    label: string;
    spawnX: number;
    spawnY: number;
    requiresPuzzleId?: string;
    lockedLabel?: string;
  };
  guide: {
    assetKey: string;
    title: string;
    body: string;
  };
  guidePosition?: { x: number; y: number };
  shrinePosition?: { x: number; y: number };
  encounters?: FutureRegionEncounterConfig[];
}

export interface FutureRegionEncounterConfig {
  id: string;
  title: string;
  position: { x: number; y: number };
  sceneKey: string;
  prompt: string;
  kind?: 'puzzle' | 'boss';
  requiresPuzzleIds?: string[];
  lockedPrompt?: string;
}

export const FUTURE_REGION_ROUTE_RECTS: FutureRegionRouteRect[] = [
  { id: 'entry_lane', x: 80, y: 400, width: 360, height: 80 },
  { id: 'main_span', x: 392, y: 368, width: 1160, height: 112 },
  { id: 'upper_overlook', x: 704, y: 248, width: 456, height: 128 },
  { id: 'lower_clearing', x: 704, y: 464, width: 456, height: 136 },
  { id: 'exit_lane', x: 1488, y: 368, width: 344, height: 112 },
];

export const CORE_REGION_ROUTE_RECTS: FutureRegionRouteRect[] = [
  { id: 'entry_plaza', x: 48, y: 280, width: 208, height: 200 },
  { id: 'left_bridge', x: 224, y: 288, width: 360, height: 96 },
  { id: 'left_terminal_pad', x: 504, y: 344, width: 128, height: 112 },
  { id: 'center_bridge_left', x: 584, y: 328, width: 336, height: 112 },
  { id: 'upper_platform', x: 704, y: 232, width: 456, height: 144 },
  { id: 'central_hub', x: 824, y: 248, width: 304, height: 200 },
  { id: 'lower_lift', x: 888, y: 392, width: 144, height: 224 },
  { id: 'lower_terminal', x: 856, y: 536, width: 208, height: 104 },
  { id: 'center_bridge_right', x: 1072, y: 328, width: 456, height: 112 },
  { id: 'final_approach', x: 1504, y: 320, width: 344, height: 128 },
  { id: 'final_dais', x: 1664, y: 256, width: 224, height: 224 },
];

export const isPointOnFutureRegionRoute = (
  point: { x: number; y: number },
  padding = 0,
  routeRects = FUTURE_REGION_ROUTE_RECTS
): boolean => routeRects.some((rect) => pointInsideRect(point, rect, padding));

const pointInsideRect = (
  point: { x: number; y: number },
  rect: FutureRegionRouteRect,
  padding = 0
): boolean => (
  point.x >= rect.x - padding &&
  point.x <= rect.x + rect.width + padding &&
  point.y >= rect.y - padding &&
  point.y <= rect.y + rect.height + padding
);

const movementTile = (point: { x: number; y: number }): { col: number; row: number } => ({
  col: Math.floor(point.x / 32),
  row: Math.floor(point.y / 32),
});

export const isPointBlockedByFutureRegionCollision = (
  point: { x: number; y: number },
  blockers: FutureRegionCollisionBlocker[]
): boolean => {
  const target = movementTile(point);

  return blockers.some((blocker) => {
    const origin = movementTile(blocker);
    const radiusTiles = blocker.radiusTiles ?? 0;

    return (
      Math.abs(target.col - origin.col) <= radiusTiles &&
      Math.abs(target.row - origin.row) <= radiusTiles
    );
  });
};

export const isFutureRegionStepWalkable = (
  point: { x: number; y: number },
  blockers: FutureRegionCollisionBlocker[],
  routePadding = 0,
  routeRects = FUTURE_REGION_ROUTE_RECTS
): boolean => (
  isPointOnFutureRegionRoute(point, routePadding, routeRects) &&
  !isPointBlockedByFutureRegionCollision(point, blockers)
);

export const FUTURE_REGION_SCENE_CONFIGS: Record<string, FutureRegionSceneConfig> = {
  [SCENE_KEYS.HASH_HIGHLANDS]: {
    sceneKey: SCENE_KEYS.HASH_HIGHLANDS,
    regionId: REGIONS.HASH_HIGHLANDS,
    title: 'Hash Highlands',
    subtitle: 'Where keys climb into buckets.',
    backgroundKey: VISUAL_REVAMP_KEYS.HASH_HIGHLANDS_BG,
    backgroundMusic: 'hash-highlands-bgm',
    routeSurface: 'highland',
    accentColor: 0xfbbf24,
    panelColor: 0x4a3821,
    ambient: 'wind',
    back: {
      sceneKey: SCENE_KEYS.TWIN_RIVERS,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_WATER,
      label: '[SPACE] Twin Rivers',
      spawnX: 1712,
      spawnY: 416,
    },
    next: {
      sceneKey: SCENE_KEYS.STACK_SPIRES,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      label: '[SPACE] Stack Spires',
      spawnX: 192,
      spawnY: 448,
      requiresPuzzleId: 'boss_archivist',
      lockedLabel: '[LOCKED] Face Archivist',
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_ARRAY_MARKER,
      title: 'Hash Marker',
      body: 'Each key seeks a bucket. The high road only opens when the address and value agree.',
    },
    encounters: [
      {
        id: 'hh_1',
        title: 'Nameplate Gates',
        position: { x: 480, y: 416 },
        sceneKey: SCENE_KEYS.PUZZLE_HH_1,
        prompt: '[SPACE] Name',
      },
      {
        id: 'hh_2',
        title: 'Frequency Forge',
        position: { x: 720, y: 552 },
        sceneKey: SCENE_KEYS.PUZZLE_HH_2,
        prompt: '[SPACE] Count',
      },
      {
        id: 'hh_3',
        title: 'Anagram Gardens',
        position: { x: 960, y: 552 },
        sceneKey: SCENE_KEYS.PUZZLE_HH_3,
        prompt: '[SPACE] Group',
      },
      {
        id: 'hh_4',
        title: 'Cache Cavern',
        position: { x: 1120, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_HH_4,
        prompt: '[SPACE] Cache',
      },
      {
        id: 'boss_archivist',
        title: 'The Archivist',
        position: { x: 1456, y: 416 },
        sceneKey: SCENE_KEYS.BOSS_ARCHIVIST,
        prompt: '[SPACE] Challenge',
        kind: 'boss',
        requiresPuzzleIds: ['hh_1', 'hh_2', 'hh_3', 'hh_4'],
        lockedPrompt: '[LOCKED] Four teachings',
      },
    ],
  },
  [SCENE_KEYS.STACK_SPIRES]: {
    sceneKey: SCENE_KEYS.STACK_SPIRES,
    regionId: REGIONS.STACK_SPIRES,
    title: 'Stack Spires',
    subtitle: 'Where last-in paths rise and return.',
    backgroundKey: VISUAL_REVAMP_KEYS.STACK_SPIRES_BG,
    backgroundMusic: 'stack-spires-bgm',
    routeSurface: 'spire',
    accentColor: 0x9be8ff,
    panelColor: 0x263247,
    ambient: 'wind',
    back: {
      sceneKey: SCENE_KEYS.HASH_HIGHLANDS,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      label: '[SPACE] Hash Highlands',
      spawnX: 1712,
      spawnY: 416,
    },
    next: {
      sceneKey: SCENE_KEYS.QUEUE_CANALS,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_CANAL,
      label: '[SPACE] Queue Canals',
      spawnX: 192,
      spawnY: 448,
      requiresPuzzleId: 'boss_recursion',
      lockedLabel: '[LOCKED] Face Recursion',
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_SAVE_OBELISK,
      title: 'Spire Obelisk',
      body: 'The last stone placed is the first stone lifted. The spires remember in reverse.',
    },
    encounters: [
      {
        id: 'ss_1',
        title: 'Scroll Stack',
        position: { x: 544, y: 416 },
        sceneKey: SCENE_KEYS.PUZZLE_SS_1,
        prompt: '[SPACE] Push',
      },
      {
        id: 'ss_2',
        title: 'Mirror Staircase',
        position: { x: 760, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_SS_2,
        prompt: '[SPACE] Recur',
      },
      {
        id: 'ss_3',
        title: 'Maze of Forks',
        position: { x: 960, y: 552 },
        sceneKey: SCENE_KEYS.PUZZLE_SS_3,
        prompt: '[SPACE] Fork',
      },
      {
        id: 'ss_4',
        title: 'Tower of Memory',
        position: { x: 1120, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_SS_4,
        prompt: '[SPACE] Climb',
      },
      {
        id: 'boss_recursion',
        title: 'The Recursion',
        position: { x: 1456, y: 416 },
        sceneKey: SCENE_KEYS.BOSS_RECURSION,
        prompt: '[SPACE] Challenge',
        kind: 'boss',
        requiresPuzzleIds: ['ss_1', 'ss_2', 'ss_3', 'ss_4'],
        lockedPrompt: '[LOCKED] Four climbs',
      },
    ],
  },
  [SCENE_KEYS.QUEUE_CANALS]: {
    sceneKey: SCENE_KEYS.QUEUE_CANALS,
    regionId: REGIONS.QUEUE_CANALS,
    title: 'Queue Canals',
    subtitle: 'Where the first current leaves first.',
    backgroundKey: VISUAL_REVAMP_KEYS.QUEUE_CANALS_BG,
    backgroundMusic: 'queue-canals-bgm',
    routeSurface: 'canal',
    accentColor: 0x5ab7d4,
    panelColor: 0x16465c,
    ambient: 'canal',
    back: {
      sceneKey: SCENE_KEYS.STACK_SPIRES,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      label: '[SPACE] Stack Spires',
      spawnX: 1712,
      spawnY: 416,
    },
    next: {
      sceneKey: SCENE_KEYS.TREE_CANOPY,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_FOREST,
      label: '[SPACE] Tree Canopy',
      spawnX: 192,
      spawnY: 448,
      requiresPuzzleId: 'boss_reconciler',
      lockedLabel: '[LOCKED] Face Reconciler',
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_WATER_BUOY,
      title: 'Canal Buoy',
      body: 'The oldest current leaves first. The canal will not skip what arrived before it.',
    },
    encounters: [
      {
        id: 'qc_1',
        title: 'Ferry Dock',
        position: { x: 544, y: 416 },
        sceneKey: SCENE_KEYS.PUZZLE_QC_1,
        prompt: '[SPACE] Queue',
      },
      {
        id: 'qc_2',
        title: 'Ripple Map',
        position: { x: 760, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_QC_2,
        prompt: '[SPACE] Ripple',
      },
      {
        id: 'qc_3',
        title: 'Priority Dock',
        position: { x: 960, y: 552 },
        sceneKey: SCENE_KEYS.PUZZLE_QC_3,
        prompt: '[SPACE] Priority',
      },
      {
        id: 'qc_4',
        title: 'Scheduler Lottery',
        position: { x: 1120, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_QC_4,
        prompt: '[SPACE] Schedule',
      },
      {
        id: 'boss_reconciler',
        title: 'The Reconciler',
        position: { x: 1456, y: 416 },
        sceneKey: SCENE_KEYS.BOSS_RECONCILER,
        prompt: '[SPACE] Challenge',
        kind: 'boss',
        requiresPuzzleIds: ['qc_1', 'qc_2', 'qc_3', 'qc_4'],
        lockedPrompt: '[LOCKED] Four currents',
      },
    ],
  },
  [SCENE_KEYS.TREE_CANOPY]: {
    sceneKey: SCENE_KEYS.TREE_CANOPY,
    regionId: REGIONS.TREE_CANOPY,
    title: 'Tree Canopy',
    subtitle: 'Where branches split into structure.',
    backgroundKey: VISUAL_REVAMP_KEYS.TREE_CANOPY_BG,
    backgroundMusic: 'tree-canopy-bgm',
    routeSurface: 'root',
    accentColor: 0x22c55e,
    panelColor: 0x1f4b32,
    ambient: 'leaves',
    back: {
      sceneKey: SCENE_KEYS.QUEUE_CANALS,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_CANAL,
      label: '[SPACE] Queue Canals',
      spawnX: 1712,
      spawnY: 416,
    },
    next: {
      sceneKey: SCENE_KEYS.GRAPH_NEXUS,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_GRAPH,
      label: '[SPACE] Graph Nexus',
      spawnX: 192,
      spawnY: 448,
      requiresPuzzleId: 'boss_pattern',
      lockedLabel: '[LOCKED] Face Pattern',
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_FIELD_SIGN,
      title: 'Canopy Sign',
      body: 'Every branch has a parent. Every leaf carries the memory of the path above it.',
    },
    encounters: [
      {
        id: 'tc_1',
        title: 'The First Fork',
        position: { x: 544, y: 416 },
        sceneKey: SCENE_KEYS.PUZZLE_TC_1,
        prompt: '[SPACE] Traverse',
      },
      {
        id: 'tc_2',
        title: 'Sorted Grove',
        position: { x: 760, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_TC_2,
        prompt: '[SPACE] Search',
      },
      {
        id: 'tc_3',
        title: 'The Deep Root',
        position: { x: 960, y: 552 },
        sceneKey: SCENE_KEYS.PUZZLE_TC_3,
        prompt: '[SPACE] DFS',
      },
      {
        id: 'tc_4',
        title: 'The Bent Bough',
        position: { x: 1120, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_TC_4,
        prompt: '[SPACE] Balance',
      },
      {
        id: 'boss_pattern',
        title: 'The Pattern',
        position: { x: 1456, y: 416 },
        sceneKey: SCENE_KEYS.BOSS_PATTERN,
        prompt: '[SPACE] Challenge',
        kind: 'boss',
        requiresPuzzleIds: ['tc_1', 'tc_2', 'tc_3', 'tc_4'],
        lockedPrompt: '[LOCKED] Four branches',
      },
    ],
  },
  [SCENE_KEYS.GRAPH_NEXUS]: {
    sceneKey: SCENE_KEYS.GRAPH_NEXUS,
    regionId: REGIONS.GRAPH_NEXUS,
    title: 'Graph Nexus',
    subtitle: 'Where every node knows its neighbor.',
    backgroundKey: VISUAL_REVAMP_KEYS.GRAPH_NEXUS_BG,
    backgroundMusic: 'graph-nexus-bgm',
    routeSurface: 'graph',
    accentColor: 0x38bdf8,
    panelColor: 0x203457,
    ambient: 'data',
    back: {
      sceneKey: SCENE_KEYS.TREE_CANOPY,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_FOREST,
      label: '[SPACE] Tree Canopy',
      spawnX: 1712,
      spawnY: 416,
    },
    next: {
      sceneKey: SCENE_KEYS.CORE,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_CORE,
      label: '[SPACE] The Core',
      spawnX: 192,
      spawnY: 448,
      requiresPuzzleId: 'boss_echo',
      lockedLabel: '[LOCKED] Face Echo',
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_CORE_TERMINAL,
      title: 'Nexus Terminal',
      body: 'A path is only one story. The Nexus listens for every neighbor at once.',
    },
    encounters: [
      {
        id: 'gn_1',
        title: 'Bridge Map',
        position: { x: 544, y: 416 },
        sceneKey: SCENE_KEYS.PUZZLE_GN_1,
        prompt: '[SPACE] Nodes',
      },
      {
        id: 'gn_2',
        title: 'Courier Dilemma',
        position: { x: 760, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_GN_2,
        prompt: '[SPACE] Weights',
      },
      {
        id: 'gn_3',
        title: 'Cycle Bazaar',
        position: { x: 960, y: 552 },
        sceneKey: SCENE_KEYS.PUZZLE_GN_3,
        prompt: '[SPACE] Cycles',
      },
      {
        id: 'gn_4',
        title: 'Island Census',
        position: { x: 1120, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_GN_4,
        prompt: '[SPACE] Islands',
      },
      {
        id: 'boss_echo',
        title: 'The Echo',
        position: { x: 1456, y: 416 },
        sceneKey: SCENE_KEYS.BOSS_ECHO,
        prompt: '[SPACE] Challenge',
        kind: 'boss',
        requiresPuzzleIds: ['gn_1', 'gn_2', 'gn_3', 'gn_4'],
        lockedPrompt: '[LOCKED] Four bridges',
      },
    ],
  },
  [SCENE_KEYS.CORE]: {
    sceneKey: SCENE_KEYS.CORE,
    regionId: REGIONS.CORE,
    title: 'The Core',
    subtitle: 'Where the path resolves.',
    backgroundKey: VISUAL_REVAMP_KEYS.CORE_BG,
    backgroundMusic: 'core-bgm',
    routeSurface: 'core',
    routeRects: CORE_REGION_ROUTE_RECTS,
    accentColor: 0xf97316,
    panelColor: 0x3b2520,
    ambient: 'core',
    back: {
      sceneKey: SCENE_KEYS.GRAPH_NEXUS,
      portalKey: VISUAL_REVAMP_KEYS.PORTAL_GRAPH,
      label: '[SPACE] Graph Nexus',
      spawnX: 1712,
      spawnY: 416,
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_CORE_TERMINAL,
      title: 'Core Terminal',
      body: 'All patterns return here. The Core waits for the proof that the whole path holds.',
    },
    shrinePosition: { x: 1024, y: 584 },
    encounters: [
      {
        id: 'core_1',
        title: 'Echo Chamber',
        position: { x: 544, y: 416 },
        sceneKey: SCENE_KEYS.PUZZLE_CORE_1,
        prompt: '[SPACE] Memoize',
      },
      {
        id: 'core_2',
        title: 'Weighted Staircase',
        position: { x: 760, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_CORE_2,
        prompt: '[SPACE] Table',
      },
      {
        id: 'core_3',
        title: 'Grand Archive',
        position: { x: 960, y: 552 },
        sceneKey: SCENE_KEYS.PUZZLE_CORE_3,
        prompt: '[SPACE] Grid',
      },
      {
        id: 'core_4',
        title: 'Hall of Patterns',
        position: { x: 1120, y: 304 },
        sceneKey: SCENE_KEYS.PUZZLE_CORE_4,
        prompt: '[SPACE] Combine',
      },
      {
        id: 'boss_protocol_omega',
        title: 'Protocol Omega',
        position: { x: 1456, y: 416 },
        sceneKey: SCENE_KEYS.BOSS_PROTOCOL_OMEGA,
        prompt: '[SPACE] Final',
        kind: 'boss',
        requiresPuzzleIds: ['core_1', 'core_2', 'core_3', 'core_4'],
        lockedPrompt: '[LOCKED] Four proofs',
      },
    ],
  },
};
