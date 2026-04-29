/**
 * Asset manifest - maps keys to file paths.
 * All game assets are registered here for BootScene preloading.
 */

export interface AssetEntry {
  key: string;
  path: string;
  frameWidth?: number;
  frameHeight?: number;
}

const BASE = 'assets/prologue';
const REWORK_BASE = 'assets/prologue_rework';
const SHEET_BASE = 'assets/prologue_sheets';
const ARRAY_PLAINS_BASE = 'assets/array_plains';
const TWIN_RIVERS_BASE = 'assets/twin_rivers';
const VISUAL_REVAMP_BASE = 'assets/visual_revamp';

export const VISUAL_REVAMP_KEYS = {
  PROLOGUE_BG: 'visual-revamp-prologue-bg',
  ARRAY_PLAINS_BG: 'visual-revamp-array-plains-bg',
  TWIN_RIVERS_BG: 'visual-revamp-twin-rivers-bg',
  HASH_HIGHLANDS_BG: 'visual-revamp-hash-highlands-bg',
  STACK_SPIRES_BG: 'visual-revamp-stack-spires-bg',
  QUEUE_CANALS_BG: 'visual-revamp-queue-canals-bg',
  TREE_CANOPY_BG: 'visual-revamp-tree-canopy-bg',
  GRAPH_NEXUS_BG: 'visual-revamp-graph-nexus-bg',
  CORE_BG: 'visual-revamp-core-bg',
  PLAYER: 'visual-revamp-player',
  PROFESSOR_NODE: 'visual-revamp-professor-node',
  RUNE_KEEPER: 'visual-revamp-rune-keeper',
  CONSOLE_KEEPER: 'visual-revamp-console-keeper',
  GLITCH: 'visual-revamp-glitch',
  WATCHER: 'visual-revamp-watcher',
  BIT_SPARK: 'visual-revamp-bit-spark',
  BIT_BYTE: 'visual-revamp-bit-byte',
  BIT_FRAME: 'visual-revamp-bit-frame',
  PORTAL_VOID: 'visual-revamp-portal-void',
  PORTAL_FIELD: 'visual-revamp-portal-field',
  PORTAL_WATER: 'visual-revamp-portal-water',
  PORTAL_MOUNTAIN: 'visual-revamp-portal-mountain',
  PORTAL_CANAL: 'visual-revamp-portal-canal',
  PORTAL_FOREST: 'visual-revamp-portal-forest',
  PORTAL_GRAPH: 'visual-revamp-portal-graph',
  PORTAL_CORE: 'visual-revamp-portal-core',
  PROP_FIELD_SIGN: 'visual-revamp-prop-field-sign',
  PROP_PUZZLE_SHRINE: 'visual-revamp-prop-puzzle-shrine',
  PROP_BOSS_GATE_LOCKED: 'visual-revamp-prop-boss-gate-locked',
  PROP_BOSS_GATE_OPEN: 'visual-revamp-prop-boss-gate-open',
  PROP_SAVE_OBELISK: 'visual-revamp-prop-save-obelisk',
  PROP_ARRAY_MARKER: 'visual-revamp-prop-array-marker',
  PROP_WATER_BUOY: 'visual-revamp-prop-water-buoy',
  PROP_CORE_TERMINAL: 'visual-revamp-prop-core-terminal',
} as const;

export const VISUAL_REVAMP_IMAGE_ASSETS: AssetEntry[] = [
  { key: VISUAL_REVAMP_KEYS.PROLOGUE_BG, path: `${VISUAL_REVAMP_BASE}/regions/prologue_chamber.png` },
  { key: VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG, path: `${VISUAL_REVAMP_BASE}/regions/array_plains.png` },
  { key: VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG, path: `${VISUAL_REVAMP_BASE}/regions/twin_rivers.png` },
  { key: VISUAL_REVAMP_KEYS.HASH_HIGHLANDS_BG, path: `${VISUAL_REVAMP_BASE}/regions/hash_highlands.png` },
  { key: VISUAL_REVAMP_KEYS.STACK_SPIRES_BG, path: `${VISUAL_REVAMP_BASE}/regions/stack_spires.png` },
  { key: VISUAL_REVAMP_KEYS.QUEUE_CANALS_BG, path: `${VISUAL_REVAMP_BASE}/regions/queue_canals.png` },
  { key: VISUAL_REVAMP_KEYS.TREE_CANOPY_BG, path: `${VISUAL_REVAMP_BASE}/regions/tree_canopy.png` },
  { key: VISUAL_REVAMP_KEYS.GRAPH_NEXUS_BG, path: `${VISUAL_REVAMP_BASE}/regions/graph_nexus.png` },
  { key: VISUAL_REVAMP_KEYS.CORE_BG, path: `${VISUAL_REVAMP_BASE}/regions/core.png` },
  { key: VISUAL_REVAMP_KEYS.PLAYER, path: `${VISUAL_REVAMP_BASE}/characters/player.png` },
  { key: VISUAL_REVAMP_KEYS.PROFESSOR_NODE, path: `${VISUAL_REVAMP_BASE}/characters/professor_node.png` },
  { key: VISUAL_REVAMP_KEYS.RUNE_KEEPER, path: `${VISUAL_REVAMP_BASE}/characters/rune_keeper.png` },
  { key: VISUAL_REVAMP_KEYS.CONSOLE_KEEPER, path: `${VISUAL_REVAMP_BASE}/characters/console_keeper.png` },
  { key: VISUAL_REVAMP_KEYS.GLITCH, path: `${VISUAL_REVAMP_BASE}/characters/glitch.png` },
  { key: VISUAL_REVAMP_KEYS.WATCHER, path: `${VISUAL_REVAMP_BASE}/characters/watcher.png` },
  { key: VISUAL_REVAMP_KEYS.BIT_SPARK, path: `${VISUAL_REVAMP_BASE}/characters/bit_spark.png` },
  { key: VISUAL_REVAMP_KEYS.BIT_BYTE, path: `${VISUAL_REVAMP_BASE}/characters/bit_byte.png` },
  { key: VISUAL_REVAMP_KEYS.BIT_FRAME, path: `${VISUAL_REVAMP_BASE}/characters/bit_frame.png` },
  { key: VISUAL_REVAMP_KEYS.PORTAL_VOID, path: `${VISUAL_REVAMP_BASE}/objects/portals/void.png` },
  { key: VISUAL_REVAMP_KEYS.PORTAL_FIELD, path: `${VISUAL_REVAMP_BASE}/objects/portals/field.png` },
  { key: VISUAL_REVAMP_KEYS.PORTAL_WATER, path: `${VISUAL_REVAMP_BASE}/objects/portals/water.png` },
  { key: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN, path: `${VISUAL_REVAMP_BASE}/objects/portals/mountain.png` },
  { key: VISUAL_REVAMP_KEYS.PORTAL_CANAL, path: `${VISUAL_REVAMP_BASE}/objects/portals/canal.png` },
  { key: VISUAL_REVAMP_KEYS.PORTAL_FOREST, path: `${VISUAL_REVAMP_BASE}/objects/portals/forest.png` },
  { key: VISUAL_REVAMP_KEYS.PORTAL_GRAPH, path: `${VISUAL_REVAMP_BASE}/objects/portals/graph.png` },
  { key: VISUAL_REVAMP_KEYS.PORTAL_CORE, path: `${VISUAL_REVAMP_BASE}/objects/portals/core.png` },
  { key: VISUAL_REVAMP_KEYS.PROP_FIELD_SIGN, path: `${VISUAL_REVAMP_BASE}/objects/props/field_sign.png` },
  { key: VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE, path: `${VISUAL_REVAMP_BASE}/objects/props/puzzle_shrine.png` },
  { key: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED, path: `${VISUAL_REVAMP_BASE}/objects/props/boss_gate_locked.png` },
  { key: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN, path: `${VISUAL_REVAMP_BASE}/objects/props/boss_gate_open.png` },
  { key: VISUAL_REVAMP_KEYS.PROP_SAVE_OBELISK, path: `${VISUAL_REVAMP_BASE}/objects/props/save_obelisk.png` },
  { key: VISUAL_REVAMP_KEYS.PROP_ARRAY_MARKER, path: `${VISUAL_REVAMP_BASE}/objects/props/array_marker.png` },
  { key: VISUAL_REVAMP_KEYS.PROP_WATER_BUOY, path: `${VISUAL_REVAMP_BASE}/objects/props/water_buoy.png` },
  { key: VISUAL_REVAMP_KEYS.PROP_CORE_TERMINAL, path: `${VISUAL_REVAMP_BASE}/objects/props/core_terminal.png` },
];

export const PROLOGUE_REWORK_KEYS = {
  VOID_BG: 'prologue-rework-void-bg',
  AWAKENING_PLATFORM: 'prologue-rework-awakening-platform',
  ROUTE_BRIDGE: 'prologue-rework-route-bridge',
  CENTRAL_HUB: 'prologue-rework-central-hub',
  RUNE_BRANCH: 'prologue-rework-rune-branch',
  CONSOLE_BRANCH: 'prologue-rework-console-branch',
  GATE_COURTYARD: 'prologue-rework-gate-courtyard',
  SPAWN_SHRINE: 'prologue-rework-spawn-shrine',
  CENTRAL_HUB_SHRINE: 'prologue-rework-central-hub-shrine',
  MOTE: 'prologue-rework-mote',
  PLAYER: 'prologue-rework-player',
  PROFESSOR_NODE: 'prologue-rework-professor-node',
  RUNE_KEEPER: 'prologue-rework-rune-keeper',
  CONSOLE_KEEPER: 'prologue-rework-console-keeper',
  GLITCH: 'prologue-rework-glitch',
  BIT_SPARK: 'prologue-rework-bit-spark',
  WATCHER: 'prologue-rework-watcher',
  BOSS_GATE_LOCKED: 'prologue-rework-boss-gate-locked',
  BOSS_GATE_OPEN: 'prologue-rework-boss-gate-open',
  ARRAY_PORTAL_LOCKED: 'prologue-rework-array-portal-locked',
  ARRAY_PORTAL_ACTIVE: 'prologue-rework-array-portal-active',
  RUNE_TILES: 'prologue-rework-rune-tiles',
  FLOW_CONSOLES: 'prologue-rework-flow-consoles',
  PUZZLE_CHAMBER_FRAME: 'prologue-rework-puzzle-chamber-frame',
  DIALOGUE_BOX: 'prologue-rework-dialogue-box',
  PROMPT: 'prologue-rework-prompt',
} as const;

export const PROLOGUE_REWORK_IMAGE_ASSETS: AssetEntry[] = [
  { key: PROLOGUE_REWORK_KEYS.VOID_BG, path: `${REWORK_BASE}/environment/void_bg.png` },
  { key: PROLOGUE_REWORK_KEYS.AWAKENING_PLATFORM, path: `${REWORK_BASE}/environment/awakening_platform_v2.png` },
  { key: PROLOGUE_REWORK_KEYS.ROUTE_BRIDGE, path: `${REWORK_BASE}/environment/route_bridge.png` },
  { key: PROLOGUE_REWORK_KEYS.CENTRAL_HUB, path: `${REWORK_BASE}/environment/central_hub_v2.png` },
  { key: PROLOGUE_REWORK_KEYS.RUNE_BRANCH, path: `${REWORK_BASE}/environment/rune_branch_v2.png` },
  { key: PROLOGUE_REWORK_KEYS.CONSOLE_BRANCH, path: `${REWORK_BASE}/environment/console_branch_v2.png` },
  { key: PROLOGUE_REWORK_KEYS.GATE_COURTYARD, path: `${REWORK_BASE}/environment/gate_courtyard_v2.png` },
  { key: PROLOGUE_REWORK_KEYS.SPAWN_SHRINE, path: `${REWORK_BASE}/environment/spawn_shrine_v2.png` },
  { key: PROLOGUE_REWORK_KEYS.CENTRAL_HUB_SHRINE, path: `${REWORK_BASE}/environment/central_hub_shrine_v2.png` },
  { key: PROLOGUE_REWORK_KEYS.MOTE, path: `${REWORK_BASE}/environment/mote.png` },
  { key: PROLOGUE_REWORK_KEYS.PLAYER, path: `${REWORK_BASE}/characters/player.png` },
  { key: PROLOGUE_REWORK_KEYS.PROFESSOR_NODE, path: `${REWORK_BASE}/characters/professor_node.png` },
  { key: PROLOGUE_REWORK_KEYS.RUNE_KEEPER, path: `${REWORK_BASE}/characters/rune_keeper.png` },
  { key: PROLOGUE_REWORK_KEYS.CONSOLE_KEEPER, path: `${REWORK_BASE}/characters/console_keeper.png` },
  { key: PROLOGUE_REWORK_KEYS.GLITCH, path: `${REWORK_BASE}/characters/glitch.png` },
  { key: PROLOGUE_REWORK_KEYS.BIT_SPARK, path: `${REWORK_BASE}/characters/bit_spark.png` },
  { key: PROLOGUE_REWORK_KEYS.WATCHER, path: `${REWORK_BASE}/characters/watcher.png` },
  { key: PROLOGUE_REWORK_KEYS.BOSS_GATE_LOCKED, path: `${REWORK_BASE}/objects/boss_gate_locked.png` },
  { key: PROLOGUE_REWORK_KEYS.BOSS_GATE_OPEN, path: `${REWORK_BASE}/objects/boss_gate_open.png` },
  { key: PROLOGUE_REWORK_KEYS.ARRAY_PORTAL_LOCKED, path: `${REWORK_BASE}/objects/array_portal_locked.png` },
  { key: PROLOGUE_REWORK_KEYS.ARRAY_PORTAL_ACTIVE, path: `${REWORK_BASE}/objects/array_portal_active.png` },
  { key: PROLOGUE_REWORK_KEYS.RUNE_TILES, path: `${REWORK_BASE}/objects/rune_tiles.png` },
  { key: PROLOGUE_REWORK_KEYS.FLOW_CONSOLES, path: `${REWORK_BASE}/objects/flow_consoles.png` },
  { key: PROLOGUE_REWORK_KEYS.PUZZLE_CHAMBER_FRAME, path: `${REWORK_BASE}/ui/puzzle_chamber_frame.png` },
  { key: PROLOGUE_REWORK_KEYS.DIALOGUE_BOX, path: `${REWORK_BASE}/ui/dialogue_box.png` },
  { key: PROLOGUE_REWORK_KEYS.PROMPT, path: `${REWORK_BASE}/ui/prompt.png` },
];

export const ARRAY_PLAINS_KEYS = {
  FIELD_BACKGROUND: 'array-plains-field-background',
} as const;

export const ARRAY_PLAINS_IMAGE_ASSETS: AssetEntry[] = [
  { key: ARRAY_PLAINS_KEYS.FIELD_BACKGROUND, path: `${ARRAY_PLAINS_BASE}/environment/array_plains_field.png` },
];

export const TWIN_RIVERS_KEYS = {
  FIELD_BACKGROUND: 'twin-rivers-field-background',
} as const;

export const TWIN_RIVERS_IMAGE_ASSETS: AssetEntry[] = [
  { key: TWIN_RIVERS_KEYS.FIELD_BACKGROUND, path: `${TWIN_RIVERS_BASE}/environment/twin_rivers_field.png` },
];

export const PROLOGUE_SHEET_KEYS = {
  ROUTE_TILESET: 'prologue-sheet-route-tileset',
  PLAYER: 'prologue-sheet-player-walk',
  NPCS: 'prologue-sheet-npc-idle',
  COMPANIONS: 'prologue-sheet-companions',
  OBJECTS: 'prologue-sheet-objects',
  UI: 'prologue-sheet-ui',
} as const;

export const PROLOGUE_SHEET_SPRITE_ASSETS: AssetEntry[] = [
  { key: PROLOGUE_SHEET_KEYS.ROUTE_TILESET, path: `${SHEET_BASE}/environment/prologue_route_tileset_v3.png`, frameWidth: 32, frameHeight: 32 },
  { key: PROLOGUE_SHEET_KEYS.PLAYER, path: `${SHEET_BASE}/characters/imagegen_player_walk_v2.png`, frameWidth: 256, frameHeight: 256 },
  { key: PROLOGUE_SHEET_KEYS.NPCS, path: `${SHEET_BASE}/characters/imagegen_npc_idle.png`, frameWidth: 256, frameHeight: 256 },
  { key: PROLOGUE_SHEET_KEYS.COMPANIONS, path: `${SHEET_BASE}/characters/companion_sheet.png`, frameWidth: 256, frameHeight: 256 },
  { key: PROLOGUE_SHEET_KEYS.OBJECTS, path: `${SHEET_BASE}/objects/object_sheet.png`, frameWidth: 256, frameHeight: 256 },
  { key: PROLOGUE_SHEET_KEYS.UI, path: `${SHEET_BASE}/ui/ui_sheet.png`, frameWidth: 256, frameHeight: 256 },
];

export const SPRITE_ASSETS: AssetEntry[] = [
  { key: 'prologue-tileset', path: `${BASE}/tileset/sheet.png`, frameWidth: 469, frameHeight: 384 },
  { key: 'prologue-mc', path: `${BASE}/mc/sheet.png`, frameWidth: 469, frameHeight: 512 },
  { key: 'prologue-mc-extra', path: `${BASE}/mcmore/sheet.png`, frameWidth: 469, frameHeight: 512 },
  { key: 'prologue-node', path: `${BASE}/node/sheet.png`, frameWidth: 352, frameHeight: 384 },
  { key: 'prologue-rune-keeper', path: `${BASE}/rune-keeper/sheet.png`, frameWidth: 704, frameHeight: 768 },
  { key: 'prologue-console-keeper', path: `${BASE}/console-keeper/sheet.png`, frameWidth: 704, frameHeight: 768 },
  { key: 'prologue-gates', path: `${BASE}/gates/sheet.png`, frameWidth: 704, frameHeight: 768 },
  { key: 'prologue-p01-tiles', path: `${BASE}/p01-tiles/sheet.png`, frameWidth: 704, frameHeight: 512 },
  { key: 'prologue-atmosphere', path: `${BASE}/atmosphere/sheet.png`, frameWidth: 313, frameHeight: 384 },
  ...PROLOGUE_SHEET_SPRITE_ASSETS,
];

const COMPOSITE_IMAGE = (sub: string, name: string): AssetEntry => ({
  key: `prologue-${sub}-${name}`,
  path: `${BASE}/${sub}/${name}.png`,
});

export const IMAGE_ASSETS: AssetEntry[] = [
  COMPOSITE_IMAGE('portal', 'locked'),
  COMPOSITE_IMAGE('portal', 'active_0'),
  COMPOSITE_IMAGE('portal', 'swirl_0'),
  COMPOSITE_IMAGE('portal', 'swirl_1'),
  COMPOSITE_IMAGE('portal', 'swirl_2'),
  COMPOSITE_IMAGE('portal', 'swirl_3'),
  COMPOSITE_IMAGE('ui', 'dialogue_box'),
  COMPOSITE_IMAGE('ui', 'portrait_inactive'),
  COMPOSITE_IMAGE('ui', 'portrait_active'),
  COMPOSITE_IMAGE('ui', 'prompt'),
  COMPOSITE_IMAGE('moretiles', 'bridge_straight_h'),
  COMPOSITE_IMAGE('moretiles', 'bridge_straight_v'),
  COMPOSITE_IMAGE('moretiles', 'bridge_corner_ne'),
  COMPOSITE_IMAGE('moretiles', 'bridge_corner_nw'),
  ...PROLOGUE_REWORK_IMAGE_ASSETS,
  ...VISUAL_REVAMP_IMAGE_ASSETS,
  ...ARRAY_PLAINS_IMAGE_ASSETS,
  ...TWIN_RIVERS_IMAGE_ASSETS,
];

export const TILEMAP_ASSETS: AssetEntry[] = [];

export const AUDIO_ASSETS: AssetEntry[] = [];
