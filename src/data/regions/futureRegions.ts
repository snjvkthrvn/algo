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

export interface FutureRegionSceneConfig {
  sceneKey: string;
  regionId: string;
  title: string;
  subtitle: string;
  backgroundKey: string;
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
  };
  guide: {
    assetKey: string;
    title: string;
    body: string;
  };
}

export const FUTURE_REGION_ROUTE_RECTS: FutureRegionRouteRect[] = [
  { id: 'entry_lane', x: 80, y: 392, width: 360, height: 112 },
  { id: 'main_span', x: 392, y: 352, width: 1160, height: 160 },
  { id: 'upper_overlook', x: 704, y: 248, width: 456, height: 128 },
  { id: 'lower_clearing', x: 704, y: 504, width: 456, height: 96 },
  { id: 'exit_lane', x: 1488, y: 352, width: 344, height: 144 },
];

export const isPointOnFutureRegionRoute = (
  point: { x: number; y: number },
  padding = 0
): boolean => FUTURE_REGION_ROUTE_RECTS.some((rect) => (
  point.x >= rect.x - padding &&
  point.x <= rect.x + rect.width + padding &&
  point.y >= rect.y - padding &&
  point.y <= rect.y + rect.height + padding
));

export const FUTURE_REGION_SCENE_CONFIGS: Record<string, FutureRegionSceneConfig> = {
  [SCENE_KEYS.HASH_HIGHLANDS]: {
    sceneKey: SCENE_KEYS.HASH_HIGHLANDS,
    regionId: REGIONS.HASH_HIGHLANDS,
    title: 'Hash Highlands',
    subtitle: 'Where keys climb into buckets.',
    backgroundKey: VISUAL_REVAMP_KEYS.HASH_HIGHLANDS_BG,
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
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_ARRAY_MARKER,
      title: 'Hash Marker',
      body: 'Each key seeks a bucket. The high road only opens when the address and value agree.',
    },
  },
  [SCENE_KEYS.STACK_SPIRES]: {
    sceneKey: SCENE_KEYS.STACK_SPIRES,
    regionId: REGIONS.STACK_SPIRES,
    title: 'Stack Spires',
    subtitle: 'Where last-in paths rise and return.',
    backgroundKey: VISUAL_REVAMP_KEYS.STACK_SPIRES_BG,
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
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_SAVE_OBELISK,
      title: 'Spire Obelisk',
      body: 'The last stone placed is the first stone lifted. The spires remember in reverse.',
    },
  },
  [SCENE_KEYS.QUEUE_CANALS]: {
    sceneKey: SCENE_KEYS.QUEUE_CANALS,
    regionId: REGIONS.QUEUE_CANALS,
    title: 'Queue Canals',
    subtitle: 'Where the first current leaves first.',
    backgroundKey: VISUAL_REVAMP_KEYS.QUEUE_CANALS_BG,
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
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_WATER_BUOY,
      title: 'Canal Buoy',
      body: 'The oldest current leaves first. The canal will not skip what arrived before it.',
    },
  },
  [SCENE_KEYS.TREE_CANOPY]: {
    sceneKey: SCENE_KEYS.TREE_CANOPY,
    regionId: REGIONS.TREE_CANOPY,
    title: 'Tree Canopy',
    subtitle: 'Where branches split into structure.',
    backgroundKey: VISUAL_REVAMP_KEYS.TREE_CANOPY_BG,
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
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_FIELD_SIGN,
      title: 'Canopy Sign',
      body: 'Every branch has a parent. Every leaf carries the memory of the path above it.',
    },
  },
  [SCENE_KEYS.GRAPH_NEXUS]: {
    sceneKey: SCENE_KEYS.GRAPH_NEXUS,
    regionId: REGIONS.GRAPH_NEXUS,
    title: 'Graph Nexus',
    subtitle: 'Where every node knows its neighbor.',
    backgroundKey: VISUAL_REVAMP_KEYS.GRAPH_NEXUS_BG,
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
    },
    guide: {
      assetKey: VISUAL_REVAMP_KEYS.PROP_CORE_TERMINAL,
      title: 'Nexus Terminal',
      body: 'A path is only one story. The Nexus listens for every neighbor at once.',
    },
  },
  [SCENE_KEYS.CORE]: {
    sceneKey: SCENE_KEYS.CORE,
    regionId: REGIONS.CORE,
    title: 'The Core',
    subtitle: 'Where the path resolves.',
    backgroundKey: VISUAL_REVAMP_KEYS.CORE_BG,
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
  },
};
