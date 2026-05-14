import { REGIONS } from '../config/constants';

export interface RegionPresentation {
  id: string;
  title: string;
  shortTitle: string;
  actLabel: string;
  journeyRole: string;
  accentColor: number;
}

export interface RegionProgress {
  current: number;
  total: number;
  label: string;
}

export const REGION_PRESENTATION: readonly RegionPresentation[] = [
  {
    id: REGIONS.PROLOGUE,
    title: 'Chamber of Flow',
    shortTitle: 'Flow',
    actLabel: 'Awakening',
    journeyRole: 'sequence, mapping, and the first proof',
    accentColor: 0x06b6d4,
  },
  {
    id: REGIONS.ARRAY_PLAINS,
    title: 'Array Plains',
    shortTitle: 'Arrays',
    actLabel: 'Order',
    journeyRole: 'arrays, indices, hashing, and pairing',
    accentColor: 0xfbbf24,
  },
  {
    id: REGIONS.TWIN_RIVERS,
    title: 'Twin Rivers',
    shortTitle: 'Pointers',
    actLabel: 'Convergence',
    journeyRole: 'two pointers and sliding windows',
    accentColor: 0x5ab7d4,
  },
  {
    id: REGIONS.HASH_HIGHLANDS,
    title: 'Hash Highlands',
    shortTitle: 'Hash',
    actLabel: 'Keys',
    journeyRole: 'hash maps, buckets, and memoized memory',
    accentColor: 0xfbbf24,
  },
  {
    id: REGIONS.STACK_SPIRES,
    title: 'Stack Spires',
    shortTitle: 'Stacks',
    actLabel: 'Return',
    journeyRole: 'stacks, recursion, and backtracking',
    accentColor: 0x9be8ff,
  },
  {
    id: REGIONS.QUEUE_CANALS,
    title: 'Queue Canals',
    shortTitle: 'Queues',
    actLabel: 'Flow',
    journeyRole: 'queues, BFS, priority, and scheduling',
    accentColor: 0x5ab7d4,
  },
  {
    id: REGIONS.TREE_CANOPY,
    title: 'Tree Canopy',
    shortTitle: 'Trees',
    actLabel: 'Branches',
    journeyRole: 'trees, search, DFS, and balance',
    accentColor: 0x22c55e,
  },
  {
    id: REGIONS.GRAPH_NEXUS,
    title: 'Graph Nexus',
    shortTitle: 'Graphs',
    actLabel: 'Neighbors',
    journeyRole: 'graphs, paths, cycles, and components',
    accentColor: 0x38bdf8,
  },
  {
    id: REGIONS.CORE,
    title: 'The Core',
    shortTitle: 'Core',
    actLabel: 'Synthesis',
    journeyRole: 'dynamic programming and final synthesis',
    accentColor: 0xf97316,
  },
] as const;

export function getRegionPresentation(regionId: string | undefined): RegionPresentation | undefined {
  if (!regionId) return undefined;
  return REGION_PRESENTATION.find((region) => region.id === regionId);
}

export function getRegionPresentationByTitle(title: string): RegionPresentation | undefined {
  const normalized = normalizeTitle(title);
  return REGION_PRESENTATION.find((region) =>
    normalizeTitle(region.title) === normalized ||
    normalizeTitle(region.shortTitle) === normalized
  );
}

export function getRegionProgress(regionId: string | undefined): RegionProgress {
  const total = REGION_PRESENTATION.length;
  const index = REGION_PRESENTATION.findIndex((region) => region.id === regionId);
  const current = index >= 0 ? index + 1 : 0;

  return {
    current,
    total,
    label: current > 0 ? `${current}/${total}` : `?/${total}`,
  };
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}
