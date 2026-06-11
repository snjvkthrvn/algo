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

const BASE = "assets/prologue";
const REWORK_BASE = "assets/prologue_rework";
const SHEET_BASE = "assets/prologue_sheets";
const ARRAY_PLAINS_BASE = "assets/array_plains";
const TWIN_RIVERS_BASE = "assets/twin_rivers";
const VISUAL_REVAMP_BASE = "assets/visual_revamp";

export const VISUAL_REVAMP_KEYS = {
  TITLE_BG: "visual-revamp-title-bg",
  PROLOGUE_BG: "visual-revamp-prologue-bg",
  ARRAY_PLAINS_BG: "visual-revamp-array-plains-bg",
  TWIN_RIVERS_BG: "visual-revamp-twin-rivers-bg",
  HASH_HIGHLANDS_BG: "visual-revamp-hash-highlands-bg",
  STACK_SPIRES_BG: "visual-revamp-stack-spires-bg",
  QUEUE_CANALS_BG: "visual-revamp-queue-canals-bg",
  TREE_CANOPY_BG: "visual-revamp-tree-canopy-bg",
  GRAPH_NEXUS_BG: "visual-revamp-graph-nexus-bg",
  CORE_BG: "visual-revamp-core-bg",
  ROUTE_MATERIALS: "visual-revamp-route-materials",
  PLAYER: "visual-revamp-player",
  PROFESSOR_NODE: "visual-revamp-professor-node",
  RUNE_KEEPER: "visual-revamp-rune-keeper",
  CONSOLE_KEEPER: "visual-revamp-console-keeper",
  VILLAGE_ELDER: "visual-revamp-village-elder",
  HASH_KEEPER: "visual-revamp-hash-keeper",
  SORTING_FARMER: "visual-revamp-sorting-farmer",
  BASKET_KEEPER: "visual-revamp-basket-keeper",
  CROP_SORTER: "visual-revamp-crop-sorter",
  TILE_WORKER: "visual-revamp-tile-worker",
  MIRROR_WALKER: "visual-revamp-mirror-walker",
  BRIDGE_KEEPER: "visual-revamp-bridge-keeper",
  WINDOW_FISHER: "visual-revamp-window-fisher",
  CURRENT_RIDER: "visual-revamp-current-rider",
  GLITCH: "visual-revamp-glitch",
  WATCHER: "visual-revamp-watcher",
  BIT_SPARK: "visual-revamp-bit-spark",
  BIT_BYTE: "visual-revamp-bit-byte",
  BIT_FRAME: "visual-revamp-bit-frame",
  PORTAL_VOID: "visual-revamp-portal-void",
  PORTAL_FIELD: "visual-revamp-portal-field",
  PORTAL_WATER: "visual-revamp-portal-water",
  PORTAL_MOUNTAIN: "visual-revamp-portal-mountain",
  PORTAL_CANAL: "visual-revamp-portal-canal",
  PORTAL_FOREST: "visual-revamp-portal-forest",
  PORTAL_GRAPH: "visual-revamp-portal-graph",
  PORTAL_CORE: "visual-revamp-portal-core",
  PROP_FIELD_SIGN: "visual-revamp-prop-field-sign",
  PROP_PUZZLE_SHRINE: "visual-revamp-prop-puzzle-shrine",
  PROP_BOSS_GATE_LOCKED: "visual-revamp-prop-boss-gate-locked",
  PROP_BOSS_GATE_OPEN: "visual-revamp-prop-boss-gate-open",
  PROP_SAVE_OBELISK: "visual-revamp-prop-save-obelisk",
  PROP_ARRAY_MARKER: "visual-revamp-prop-array-marker",
  PROP_WATER_BUOY: "visual-revamp-prop-water-buoy",
  PROP_CORE_TERMINAL: "visual-revamp-prop-core-terminal",
  // Region environmental props (Phase 7 — generated via art_sources/generate_props.py).
  // Single-frame static props use scene.add.image; sprite-sheet props use
  // scene.add.sprite + scene.anims.create with the frame counts noted in
  // REGION_PROP_SPRITE_ASSETS below.
  PROP_RUNE_CRYSTAL: "visual-revamp-prop-rune-crystal", // 4-frame pulse
  PROP_FLOATING_ORB: "visual-revamp-prop-floating-orb",
  PROP_RUNE_TOTEM: "visual-revamp-prop-rune-totem",
  PROP_ENERGY_BEAM: "visual-revamp-prop-energy-beam",
  PROP_CHICKEN: "visual-revamp-prop-chicken", // 8-frame pecking
  PROP_SCARECROW: "visual-revamp-prop-scarecrow",
  PROP_HAY_BALE: "visual-revamp-prop-hay-bale",
  PROP_WATERING_CAN: "visual-revamp-prop-watering-can",
  PROP_SMALL_BOAT: "visual-revamp-prop-small-boat",
  PROP_LANTERN_POST: "visual-revamp-prop-lantern-post", // 6-frame flicker
  PROP_LILY_PAD_CLUSTER: "visual-revamp-prop-lily-pad-cluster",
  PROP_DRAGONFLY: "visual-revamp-prop-dragonfly", // 6-frame wings
  // Speaker portraits (Phase 11) — 64x64 head-and-shoulders crops generated
  // by art_sources/generate_portraits.py from the existing character sprites.
  // DialogueBox.show() swaps PORTRAIT_FRAME texture based on speaker name.
  PORTRAIT_PROFESSOR_NODE: "visual-revamp-portrait-professor-node",
  PORTRAIT_RUNE_KEEPER: "visual-revamp-portrait-rune-keeper",
  PORTRAIT_CONSOLE_KEEPER: "visual-revamp-portrait-console-keeper",
  PORTRAIT_WATCHER: "visual-revamp-portrait-watcher",
  PORTRAIT_GLITCH: "visual-revamp-portrait-glitch",
  PORTRAIT_SORTING_FARMER: "visual-revamp-portrait-sorting-farmer",
  PORTRAIT_BASKET_KEEPER: "visual-revamp-portrait-basket-keeper",
  PORTRAIT_CROP_SORTER: "visual-revamp-portrait-crop-sorter",
  PORTRAIT_TILE_WORKER: "visual-revamp-portrait-tile-worker",
  PORTRAIT_VILLAGE_ELDER: "visual-revamp-portrait-village-elder",
  PORTRAIT_MIRROR_WALKER: "visual-revamp-portrait-mirror-walker",
  PORTRAIT_BRIDGE_KEEPER: "visual-revamp-portrait-bridge-keeper",
  PORTRAIT_WINDOW_FISHER: "visual-revamp-portrait-window-fisher",
  PORTRAIT_CURRENT_RIDER: "visual-revamp-portrait-current-rider",
  // Visible boss silhouettes (Phase 16) — the audit flagged that bosses
  // had no actual boss figure on screen. Placed behind the play area as
  // a watching presence; doesn't block input.
  BOSS_SENTINEL_FIGURE: "visual-revamp-boss-sentinel-figure",
  BOSS_SHUFFLER_FIGURE: "visual-revamp-boss-shuffler-figure",
  BOSS_MIRROR_SERPENT_FIGURE: "visual-revamp-boss-mirror-serpent-figure",
  // Round 4 art-pass — pixel-art puzzle props for Array Plains. Replace flat
  // `add.rectangle` programmer-art with hand-pixeled wood/iron/crop sprites
  // so the puzzle pieces visibly belong inside the painted region backdrop.
  // See .tmp/audit_in_context_fit.txt for the round-4 audit that found these.
  AP_WOODEN_CRATE: "visual-revamp-ap-wooden-crate",
  AP_CORRUPTED_CRATE: "visual-revamp-ap-corrupted-crate",
  AP_GRAIN_BUCKET: "visual-revamp-ap-grain-bucket",
  AP_CROP_WHEAT: "visual-revamp-ap-crop-wheat",
  AP_CROP_BEAN: "visual-revamp-ap-crop-bean",
  // Round 4b art-pass — pixel-art puzzle props for Twin Rivers.
  // river_marker = glowing rune-stone for the player's position on stepping
  // stones / bridge crossings. dock_node = wood-ringed stone disc with a
  // carved cyan rune, replacing the prior glowing-cyan-square dock nodes
  // that Gemini's in-context audit flagged as "sci-fi screens in a fantasy
  // river setting."
  TR_RIVER_MARKER: "visual-revamp-tr-river-marker",
  TR_DOCK_NODE: "visual-revamp-tr-dock-node",
  // Physical-board art-pass: weathered driftwood dock crate used as the
  // RiverRow tile body in the Twin Rivers puzzle rooms (+ Mirror Serpent),
  // replacing the flat dark-navy value slabs the VISION §2/§5 audit flagged
  // as "website widgets floating over room art."
  TR_DOCK_CRATE: "visual-revamp-tr-dock-crate",
  PUZZLE_FRAME: "visual-revamp-puzzle-frame",
  // Diegetic lesson-card backgrounds (9-slice). Round-7 de-modal: the lesson
  // intro card was a flat light rounded-rect ("beige web modal"); these are
  // region-themed in-world props — a wooden barn sign (Array Plains) and a
  // carved river-stone tablet (Twin Rivers) — rendered via Phaser NineSlice.
  LESSON_CARD_AP: "visual-revamp-lesson-card-ap",
  LESSON_CARD_TR: "visual-revamp-lesson-card-tr",
  CODEX_ARTIFACT_BG: "visual-revamp-codex-artifact-bg",
  PUZZLE_PROLOGUE_ACTION_ARENA_BG:
    "visual-revamp-puzzle-prologue-action-arena-bg",
  PUZZLE_ARRAY_ACTION_ARENA_BG: "visual-revamp-puzzle-array-action-arena-bg",
  PUZZLE_TWIN_ACTION_ARENA_BG: "visual-revamp-puzzle-twin-action-arena-bg",
  PUZZLE_RUNE_MEMORY_BG: "visual-revamp-puzzle-rune-memory-bg",
  PUZZLE_FLOW_CONSOLES_BG: "visual-revamp-puzzle-flow-consoles-bg",
  PUZZLE_LITANY_TRIAL_BG: "visual-revamp-puzzle-litany-trial-bg",
  PUZZLE_SORTING_SHED_BG: "visual-revamp-puzzle-sorting-shed-bg",
  PUZZLE_INDEXING_BARN_BG: "visual-revamp-puzzle-indexing-barn-bg",
  PUZZLE_GRAIN_HOPPER_BG: "visual-revamp-puzzle-grain-hopper-bg",
  PUZZLE_PAIRING_GROUNDS_BG: "visual-revamp-puzzle-pairing-grounds-bg",
  PUZZLE_SHUFFLER_DOMAIN_BG: "visual-revamp-puzzle-shuffler-domain-bg",
  PUZZLE_TWIN_MIRROR_WALK_BG: "visual-revamp-puzzle-twin-mirror-walk-bg",
  PUZZLE_TWIN_POINTER_BRIDGE_BG: "visual-revamp-puzzle-twin-pointer-bridge-bg",
  PUZZLE_TWIN_FIXED_WINDOW_BG: "visual-revamp-puzzle-twin-fixed-window-bg",
  PUZZLE_TWIN_VARIABLE_WINDOW_BG:
    "visual-revamp-puzzle-twin-variable-window-bg",
  PUZZLE_MIRROR_SERPENT_BG: "visual-revamp-puzzle-mirror-serpent-bg",
  PUZZLE_HASH_NAMEPLATE_GATES_BG:
    "visual-revamp-puzzle-hash-nameplate-gates-bg",
  PUZZLE_HASH_FREQUENCY_FORGE_BG:
    "visual-revamp-puzzle-hash-frequency-forge-bg",
  PUZZLE_HASH_ANAGRAM_GARDENS_BG:
    "visual-revamp-puzzle-hash-anagram-gardens-bg",
  PUZZLE_HASH_CACHE_CAVERN_BG: "visual-revamp-puzzle-hash-cache-cavern-bg",
  PUZZLE_HASH_ARCHIVIST_BG: "visual-revamp-puzzle-hash-archivist-bg",
  PUZZLE_STACK_SCROLL_STACK_BG: "visual-revamp-puzzle-stack-scroll-stack-bg",
  PUZZLE_STACK_MIRROR_STAIRCASE_BG:
    "visual-revamp-puzzle-stack-mirror-staircase-bg",
  PUZZLE_STACK_MAZE_OF_FORKS_BG: "visual-revamp-puzzle-stack-maze-of-forks-bg",
  PUZZLE_STACK_TOWER_OF_MEMORY_BG:
    "visual-revamp-puzzle-stack-tower-of-memory-bg",
  PUZZLE_STACK_RECURSION_BG: "visual-revamp-puzzle-stack-recursion-bg",
  PUZZLE_QUEUE_FERRY_DOCK_BG: "visual-revamp-puzzle-queue-ferry-dock-bg",
  PUZZLE_QUEUE_RIPPLE_MAP_BG: "visual-revamp-puzzle-queue-ripple-map-bg",
  PUZZLE_QUEUE_PRIORITY_DOCK_BG: "visual-revamp-puzzle-queue-priority-dock-bg",
  PUZZLE_QUEUE_SCHEDULER_LOTTERY_BG:
    "visual-revamp-puzzle-queue-scheduler-lottery-bg",
  PUZZLE_QUEUE_RECONCILER_BG: "visual-revamp-puzzle-queue-reconciler-bg",
  PUZZLE_TREE_FIRST_FORK_BG: "visual-revamp-puzzle-tree-first-fork-bg",
  PUZZLE_TREE_SORTED_GROVE_BG: "visual-revamp-puzzle-tree-sorted-grove-bg",
  PUZZLE_TREE_DEEP_ROOT_BG: "visual-revamp-puzzle-tree-deep-root-bg",
  PUZZLE_TREE_BENT_BOUGH_BG: "visual-revamp-puzzle-tree-bent-bough-bg",
  PUZZLE_TREE_PATTERN_BG: "visual-revamp-puzzle-tree-pattern-bg",
  PUZZLE_GRAPH_BRIDGE_MAP_BG: "visual-revamp-puzzle-graph-bridge-map-bg",
  PUZZLE_GRAPH_COURIER_DILEMMA_BG:
    "visual-revamp-puzzle-graph-courier-dilemma-bg",
  PUZZLE_GRAPH_CYCLE_BAZAAR_BG: "visual-revamp-puzzle-graph-cycle-bazaar-bg",
  PUZZLE_GRAPH_ISLAND_CENSUS_BG: "visual-revamp-puzzle-graph-island-census-bg",
  PUZZLE_GRAPH_ECHO_BG: "visual-revamp-puzzle-graph-echo-bg",
  PUZZLE_CORE_ECHO_CHAMBER_BG: "visual-revamp-puzzle-core-echo-chamber-bg",
  PUZZLE_CORE_WEIGHTED_STAIRCASE_BG:
    "visual-revamp-puzzle-core-weighted-staircase-bg",
  PUZZLE_CORE_GRAND_ARCHIVE_BG: "visual-revamp-puzzle-core-grand-archive-bg",
  PUZZLE_CORE_HALL_OF_PATTERNS_BG:
    "visual-revamp-puzzle-core-hall-of-patterns-bg",
  PUZZLE_CORE_PROTOCOL_OMEGA_BG: "visual-revamp-puzzle-core-protocol-omega-bg",
} as const;

/**
 * Grain Chamber (P1_1 rebuild) — see
 * docs/superpowers/specs/2026-06-11-p1-1-grain-chamber-design.md.
 * Keys are declared ahead of the art batch; chamber modules guard on
 * textures.exists and fall back to procedural shapes until the manifest
 * entries land alongside the generated art.
 */
export const GRAIN_CHAMBER_KEYS = {
  BACKDROP: "grain-chamber-backdrop",
  CRATE_SHEET: "grain-chamber-crate",
  GRAIN_DECALS: "grain-chamber-grain-decals",
  CHICKEN_SHEET: "grain-chamber-chicken",
  CART: "grain-chamber-cart",
  DOOR_PLANKS: "grain-chamber-door-planks",
  PAR_PLAQUE: "grain-chamber-par-plaque",
} as const;

const GRAIN_CHAMBER_BASE = `${VISUAL_REVAMP_BASE}/grain_chamber`;

/**
 * Plain images load via IMAGE_ASSETS/getImageAssetPath; the two sprite
 * sheets (4 even cells per row) carry frame sizes and are loaded with
 * load.spritesheet by P1_1's preload.
 */
export const GRAIN_CHAMBER_IMAGE_ASSETS: AssetEntry[] = [
  { key: GRAIN_CHAMBER_KEYS.BACKDROP, path: `${GRAIN_CHAMBER_BASE}/backdrop.png` },
  { key: GRAIN_CHAMBER_KEYS.CRATE_SHEET, path: `${GRAIN_CHAMBER_BASE}/crate.png` },
  { key: GRAIN_CHAMBER_KEYS.CART, path: `${GRAIN_CHAMBER_BASE}/cart.png` },
  { key: GRAIN_CHAMBER_KEYS.DOOR_PLANKS, path: `${GRAIN_CHAMBER_BASE}/door_planks.png` },
  { key: GRAIN_CHAMBER_KEYS.PAR_PLAQUE, path: `${GRAIN_CHAMBER_BASE}/par_plaque.png` },
];

/**
 * Basket Cellar (P1_2 rebuild) — see
 * docs/superpowers/specs/2026-06-11-p1-2-basket-cellar-design.md.
 * Same convention as the Grain Chamber: keys declared ahead of the art,
 * modules guard on textures.exists with procedural fallbacks.
 */
export const BASKET_CELLAR_KEYS = {
  BACKDROP: "basket-cellar-backdrop",
  BASKET: "basket-cellar-basket",
  BASKET_OPEN: "basket-cellar-basket-open",
  ORDER_TAG: "basket-cellar-order-tag",
  LANTERN_SHEET: "basket-cellar-lantern",
  TOOL_SHEET: "basket-cellar-tools",
} as const;

const BASKET_CELLAR_BASE = `${VISUAL_REVAMP_BASE}/basket_cellar`;

export const BASKET_CELLAR_IMAGE_ASSETS: AssetEntry[] = [
  { key: BASKET_CELLAR_KEYS.BACKDROP, path: `${BASKET_CELLAR_BASE}/backdrop.png` },
  { key: BASKET_CELLAR_KEYS.BASKET, path: `${BASKET_CELLAR_BASE}/basket.png` },
  { key: BASKET_CELLAR_KEYS.BASKET_OPEN, path: `${BASKET_CELLAR_BASE}/basket_open.png` },
  { key: BASKET_CELLAR_KEYS.ORDER_TAG, path: `${BASKET_CELLAR_BASE}/order_tag.png` },
];

export const BASKET_CELLAR_SHEET_ASSETS: AssetEntry[] = [
  {
    key: BASKET_CELLAR_KEYS.LANTERN_SHEET,
    path: `${BASKET_CELLAR_BASE}/lantern.png`,
    frameWidth: 24,
    frameHeight: 24,
  },
  {
    key: BASKET_CELLAR_KEYS.TOOL_SHEET,
    path: `${BASKET_CELLAR_BASE}/tools.png`,
    frameWidth: 24,
    frameHeight: 24,
  },
];

export const GRAIN_CHAMBER_SHEET_ASSETS: AssetEntry[] = [
  {
    key: GRAIN_CHAMBER_KEYS.GRAIN_DECALS,
    path: `${GRAIN_CHAMBER_BASE}/grain_decals.png`,
    frameWidth: 16,
    frameHeight: 16,
  },
  {
    key: GRAIN_CHAMBER_KEYS.CHICKEN_SHEET,
    path: `${GRAIN_CHAMBER_BASE}/chicken.png`,
    frameWidth: 24,
    frameHeight: 24,
  },
];

export const VISUAL_REVAMP_IMAGE_ASSETS: AssetEntry[] = [
  {
    key: VISUAL_REVAMP_KEYS.TITLE_BG,
    path: `${VISUAL_REVAMP_BASE}/title/title_first_three_overhaul_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROLOGUE_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/prologue_chamber.png`,
  },
  // Living explorable maps (docs/VISION.md §2) — 1920x1440, multi-route,
  // secrets + mastery-gated crossings baked into the art.
  {
    key: VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/array_plains_living_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/twin_rivers_living_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.HASH_HIGHLANDS_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/hash_highlands_grounded_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.STACK_SPIRES_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/stack_spires_grounded_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.QUEUE_CANALS_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/queue_canals_grounded_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.TREE_CANOPY_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/tree_canopy_grounded_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.GRAPH_NEXUS_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/graph_nexus_grounded_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.CORE_BG,
    path: `${VISUAL_REVAMP_BASE}/regions/core_grounded_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.ROUTE_MATERIALS,
    path: `${VISUAL_REVAMP_BASE}/regions/grounded_route_material_reference.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PLAYER,
    path: `${VISUAL_REVAMP_BASE}/characters/player.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROFESSOR_NODE,
    path: `${VISUAL_REVAMP_BASE}/characters/professor_node.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.RUNE_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/characters/rune_keeper.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.CONSOLE_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/characters/console_keeper.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.VILLAGE_ELDER,
    path: `${VISUAL_REVAMP_BASE}/characters/village_elder.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.HASH_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/characters/hash_keeper_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTAL_VOID,
    path: `${VISUAL_REVAMP_BASE}/objects/portals/void.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTAL_FIELD,
    path: `${VISUAL_REVAMP_BASE}/objects/portals/field.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTAL_WATER,
    path: `${VISUAL_REVAMP_BASE}/objects/portals/water.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
    path: `${VISUAL_REVAMP_BASE}/objects/portals/mountain.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTAL_CANAL,
    path: `${VISUAL_REVAMP_BASE}/objects/portals/canal.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTAL_FOREST,
    path: `${VISUAL_REVAMP_BASE}/objects/portals/forest.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTAL_GRAPH,
    path: `${VISUAL_REVAMP_BASE}/objects/portals/graph.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTAL_CORE,
    path: `${VISUAL_REVAMP_BASE}/objects/portals/core.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_FIELD_SIGN,
    path: `${VISUAL_REVAMP_BASE}/objects/props/field_sign.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE,
    path: `${VISUAL_REVAMP_BASE}/objects/props/puzzle_shrine.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
    path: `${VISUAL_REVAMP_BASE}/objects/props/boss_gate_locked.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN,
    path: `${VISUAL_REVAMP_BASE}/objects/props/boss_gate_open.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_SAVE_OBELISK,
    path: `${VISUAL_REVAMP_BASE}/objects/props/save_obelisk.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_ARRAY_MARKER,
    path: `${VISUAL_REVAMP_BASE}/objects/props/array_marker.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_WATER_BUOY,
    path: `${VISUAL_REVAMP_BASE}/objects/props/water_buoy.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_CORE_TERMINAL,
    path: `${VISUAL_REVAMP_BASE}/objects/props/core_terminal.png`,
  },
  // Static region props (Phase 7) — sprite-sheet props live in
  // REGION_PROP_SPRITE_ASSETS below (they need frameWidth/frameHeight).
  {
    key: VISUAL_REVAMP_KEYS.PROP_FLOATING_ORB,
    path: `${VISUAL_REVAMP_BASE}/props/prologue/floating_orb.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_RUNE_TOTEM,
    path: `${VISUAL_REVAMP_BASE}/props/prologue/rune_totem.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_ENERGY_BEAM,
    path: `${VISUAL_REVAMP_BASE}/props/prologue/energy_beam.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_SCARECROW,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/scarecrow.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_HAY_BALE,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/hay_bale.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_WATERING_CAN,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/watering_can.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_SMALL_BOAT,
    path: `${VISUAL_REVAMP_BASE}/props/twin_rivers/small_boat.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_LILY_PAD_CLUSTER,
    path: `${VISUAL_REVAMP_BASE}/props/twin_rivers/lily_pad_cluster.png`,
  },
  // Speaker portraits (Phase 11) — 64x64 each, loaded by BootScene as
  // part of VISUAL_REVAMP_IMAGE_ASSETS so DialogueBox can swap textures
  // synchronously. Total weight: ~40 KB across all 14 portraits.
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_PROFESSOR_NODE,
    path: `${VISUAL_REVAMP_BASE}/portraits/professor_node.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_RUNE_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/portraits/rune_keeper.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_CONSOLE_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/portraits/console_keeper.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_WATCHER,
    path: `${VISUAL_REVAMP_BASE}/portraits/watcher.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_GLITCH,
    path: `${VISUAL_REVAMP_BASE}/portraits/glitch.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_SORTING_FARMER,
    path: `${VISUAL_REVAMP_BASE}/portraits/sorting_farmer.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_BASKET_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/portraits/basket_keeper.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_CROP_SORTER,
    path: `${VISUAL_REVAMP_BASE}/portraits/crop_sorter.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_TILE_WORKER,
    path: `${VISUAL_REVAMP_BASE}/portraits/tile_worker.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_VILLAGE_ELDER,
    path: `${VISUAL_REVAMP_BASE}/portraits/village_elder.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_MIRROR_WALKER,
    path: `${VISUAL_REVAMP_BASE}/portraits/mirror_walker.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_BRIDGE_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/portraits/bridge_keeper.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_WINDOW_FISHER,
    path: `${VISUAL_REVAMP_BASE}/portraits/window_fisher.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PORTRAIT_CURRENT_RIDER,
    path: `${VISUAL_REVAMP_BASE}/portraits/current_rider.png`,
  },
  // Phase 16 — visible boss silhouettes (procedural PIL, ~2 KB each).
  // Round 3 art-pass adds the Sentinel (Prologue boss) — codex+imagegen
  // produced a "Fractured Sentinel" matching the cosmic-cyan register
  // (cracked stone body, glowing crack seams, body fragmenting at base).
  {
    key: VISUAL_REVAMP_KEYS.BOSS_SENTINEL_FIGURE,
    path: `${VISUAL_REVAMP_BASE}/bosses/sentinel.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.BOSS_SHUFFLER_FIGURE,
    path: `${VISUAL_REVAMP_BASE}/bosses/shuffler.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.BOSS_MIRROR_SERPENT_FIGURE,
    path: `${VISUAL_REVAMP_BASE}/bosses/mirror_serpent.png`,
  },
  // Round 4 art-pass — pixel-art Array Plains puzzle props (codex+imagegen).
  {
    key: VISUAL_REVAMP_KEYS.AP_WOODEN_CRATE,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/wooden_crate.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.AP_CORRUPTED_CRATE,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/corrupted_crate.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.AP_GRAIN_BUCKET,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/grain_bucket.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.AP_CROP_WHEAT,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/crop_wheat.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.AP_CROP_BEAN,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/crop_bean.png`,
  },
  // Round 4b art-pass — pixel-art Twin Rivers props.
  {
    key: VISUAL_REVAMP_KEYS.TR_RIVER_MARKER,
    path: `${VISUAL_REVAMP_BASE}/props/twin_rivers/river_marker.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.TR_DOCK_NODE,
    path: `${VISUAL_REVAMP_BASE}/props/twin_rivers/dock_node.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.TR_DOCK_CRATE,
    path: `${VISUAL_REVAMP_BASE}/props/twin_rivers/dock_crate.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.TR_DOCK_CRATE,
    path: `${VISUAL_REVAMP_BASE}/props/twin_rivers/dock_crate.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_FRAME,
    path: `${VISUAL_REVAMP_BASE}/ui/puzzle_encounter_frame_v2.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.LESSON_CARD_AP,
    path: `${VISUAL_REVAMP_BASE}/ui/lesson_card_ap_wood_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.LESSON_CARD_TR,
    path: `${VISUAL_REVAMP_BASE}/ui/lesson_card_tr_stone_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.CODEX_ARTIFACT_BG,
    path: `${VISUAL_REVAMP_BASE}/ui/codex_artifact_bg_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/action_arena_prologue_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_ARRAY_ACTION_ARENA_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/action_arena_array_plains_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_ACTION_ARENA_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/action_arena_twin_rivers_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_RUNE_MEMORY_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/rune_memory_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_FLOW_CONSOLES_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/flow_consoles_backdrop_v4.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_LITANY_TRIAL_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/litany_trial_backdrop_v2.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_SORTING_SHED_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/sorting_shed_backdrop_v2.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_INDEXING_BARN_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/indexing_barn_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_GRAIN_HOPPER_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/grain_hopper_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_PAIRING_GROUNDS_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/pairing_grounds_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_SHUFFLER_DOMAIN_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/shuffler_domain_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_MIRROR_WALK_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/twin_mirror_walk_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_POINTER_BRIDGE_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/twin_pointer_bridge_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_FIXED_WINDOW_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/twin_fixed_window_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_VARIABLE_WINDOW_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/twin_variable_window_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_MIRROR_SERPENT_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/mirror_serpent_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_NAMEPLATE_GATES_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/hash_nameplate_gates_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_FREQUENCY_FORGE_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/hash_frequency_forge_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_ANAGRAM_GARDENS_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/hash_anagram_gardens_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_CACHE_CAVERN_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/hash_cache_cavern_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_ARCHIVIST_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/hash_archivist_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_SCROLL_STACK_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/stack_scroll_stack_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_MIRROR_STAIRCASE_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/stack_mirror_staircase_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_MAZE_OF_FORKS_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/stack_maze_of_forks_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_TOWER_OF_MEMORY_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/stack_tower_of_memory_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_RECURSION_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/stack_recursion_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_FERRY_DOCK_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/queue_ferry_dock_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_RIPPLE_MAP_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/queue_ripple_map_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_PRIORITY_DOCK_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/queue_priority_dock_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_SCHEDULER_LOTTERY_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/queue_scheduler_lottery_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_RECONCILER_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/queue_reconciler_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_FIRST_FORK_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/tree_first_fork_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_SORTED_GROVE_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/tree_sorted_grove_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_DEEP_ROOT_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/tree_deep_root_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_BENT_BOUGH_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/tree_bent_bough_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_PATTERN_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/tree_pattern_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_BRIDGE_MAP_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/graph_bridge_map_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_COURIER_DILEMMA_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/graph_courier_dilemma_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_CYCLE_BAZAAR_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/graph_cycle_bazaar_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_ISLAND_CENSUS_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/graph_island_census_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_ECHO_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/graph_echo_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_ECHO_CHAMBER_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/core_echo_chamber_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_WEIGHTED_STAIRCASE_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/core_weighted_staircase_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_GRAND_ARCHIVE_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/core_grand_archive_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_HALL_OF_PATTERNS_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/core_hall_of_patterns_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_PROTOCOL_OMEGA_BG,
    path: `${VISUAL_REVAMP_BASE}/puzzles/core_protocol_omega_backdrop_v1.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.AP_CROP_WHEAT,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/crop_wheat.png`,
  },
  {
    key: VISUAL_REVAMP_KEYS.AP_CROP_BEAN,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/crop_bean.png`,
  },
];

/**
 * Prologue asset audit notes (Task 1 - Setup & Asset Audit)
 * Current state: Most rework assets exist and are substantial (>1MB sprites).
 * Identified gaps / low-quality items needing regeneration:
 * - Player spritesheet: missing idle breathe animation frames + foot dust particle variants.
 * - No dedicated hint bubble UI elements for educational tooltips.
 * - NPC emotes (rune-keeper, console-keeper, professor-node) lack expression variants.
 * - Array element icons (for sorting/ordering puzzles) not yet extracted as reusable sprites.
 * Planned files: player_improved.png, hint_bubble.png, npc_emote.png, array_element_icon.png
 * Register these only after external image generation produces real project files.
 * Legacy SPRITE_ASSETS (old prologue/ sheets) should be phased out once improved versions land.
 */
export const PROLOGUE_REWORK_KEYS = {
  VOID_BG: "prologue-rework-void-bg",
  AWAKENING_PLATFORM: "prologue-rework-awakening-platform",
  ROUTE_BRIDGE: "prologue-rework-route-bridge",
  CENTRAL_HUB: "prologue-rework-central-hub",
  RUNE_BRANCH: "prologue-rework-rune-branch",
  CONSOLE_BRANCH: "prologue-rework-console-branch",
  GATE_COURTYARD: "prologue-rework-gate-courtyard",
  SPAWN_SHRINE: "prologue-rework-spawn-shrine",
  CENTRAL_HUB_SHRINE: "prologue-rework-central-hub-shrine",
  MOTE: "prologue-rework-mote",
  PLAYER: "prologue-rework-player",
  PROFESSOR_NODE: "prologue-rework-professor-node",
  RUNE_KEEPER: "prologue-rework-rune-keeper",
  CONSOLE_KEEPER: "prologue-rework-console-keeper",
  GLITCH: "prologue-rework-glitch",
  BIT_SPARK: "prologue-rework-bit-spark",
  WATCHER: "prologue-rework-watcher",
  BOSS_GATE_LOCKED: "prologue-rework-boss-gate-locked",
  BOSS_GATE_OPEN: "prologue-rework-boss-gate-open",
  ARRAY_PORTAL_LOCKED: "prologue-rework-array-portal-locked",
  ARRAY_PORTAL_ACTIVE: "prologue-rework-array-portal-active",
  RUNE_TILES: "prologue-rework-rune-tiles",
  FLOW_CONSOLES: "prologue-rework-flow-consoles",
  FLOW_CONSOLE_DAMAGED: "prologue-rework-flow-console-damaged",
  ROUTE_BRIDGE_BROKEN: "prologue-rework-route-bridge-broken",
  PUZZLE_CHAMBER_FRAME: "prologue-rework-puzzle-chamber-frame",
  DIALOGUE_BOX: "prologue-rework-dialogue-box",
  PROMPT: "prologue-rework-prompt",
} as const;

export const PROLOGUE_REWORK_IMAGE_ASSETS: AssetEntry[] = [
  {
    key: PROLOGUE_REWORK_KEYS.VOID_BG,
    path: `${REWORK_BASE}/environment/void_bg.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.AWAKENING_PLATFORM,
    path: `${REWORK_BASE}/environment/awakening_platform_v2.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.ROUTE_BRIDGE,
    path: `${REWORK_BASE}/environment/route_bridge.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.CENTRAL_HUB,
    path: `${REWORK_BASE}/environment/central_hub_v2.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.RUNE_BRANCH,
    path: `${REWORK_BASE}/environment/rune_branch_v2.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.CONSOLE_BRANCH,
    path: `${REWORK_BASE}/environment/console_branch_v2.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.GATE_COURTYARD,
    path: `${REWORK_BASE}/environment/gate_courtyard_v2.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.SPAWN_SHRINE,
    path: `${REWORK_BASE}/environment/spawn_shrine_v2.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.CENTRAL_HUB_SHRINE,
    path: `${REWORK_BASE}/environment/central_hub_shrine_v2.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.MOTE,
    path: `${REWORK_BASE}/environment/mote.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.PLAYER,
    path: `${REWORK_BASE}/characters/player.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.PROFESSOR_NODE,
    path: `${REWORK_BASE}/characters/professor_node.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.RUNE_KEEPER,
    path: `${REWORK_BASE}/characters/rune_keeper.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.CONSOLE_KEEPER,
    path: `${REWORK_BASE}/characters/console_keeper.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.GLITCH,
    path: `${REWORK_BASE}/characters/glitch.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.BIT_SPARK,
    path: `${REWORK_BASE}/characters/bit_spark.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.WATCHER,
    path: `${REWORK_BASE}/characters/watcher.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.BOSS_GATE_LOCKED,
    path: `${REWORK_BASE}/objects/boss_gate_locked.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.BOSS_GATE_OPEN,
    path: `${REWORK_BASE}/objects/boss_gate_open.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.ARRAY_PORTAL_LOCKED,
    path: `${REWORK_BASE}/objects/array_portal_locked.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.ARRAY_PORTAL_ACTIVE,
    path: `${REWORK_BASE}/objects/array_portal_active.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.RUNE_TILES,
    path: `${REWORK_BASE}/objects/rune_tiles.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.FLOW_CONSOLES,
    path: `${REWORK_BASE}/objects/flow_consoles.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.FLOW_CONSOLE_DAMAGED,
    path: `${REWORK_BASE}/objects/flow_console_damaged_v1.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.ROUTE_BRIDGE_BROKEN,
    path: `${REWORK_BASE}/environment/route_bridge_broken_v1.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.PUZZLE_CHAMBER_FRAME,
    path: `${REWORK_BASE}/ui/puzzle_chamber_frame.png`,
  },
  {
    key: PROLOGUE_REWORK_KEYS.DIALOGUE_BOX,
    path: `${REWORK_BASE}/ui/dialogue_box.png`,
  },
  { key: PROLOGUE_REWORK_KEYS.PROMPT, path: `${REWORK_BASE}/ui/prompt.png` },
];

export const ARRAY_PLAINS_KEYS = {
  FIELD_BACKGROUND: "array-plains-field-background",
} as const;

export const ARRAY_PLAINS_IMAGE_ASSETS: AssetEntry[] = [
  {
    key: ARRAY_PLAINS_KEYS.FIELD_BACKGROUND,
    path: `${ARRAY_PLAINS_BASE}/environment/array_plains_field.png`,
  },
];

export const TWIN_RIVERS_KEYS = {
  FIELD_BACKGROUND: "twin-rivers-field-background",
} as const;

export const TWIN_RIVERS_IMAGE_ASSETS: AssetEntry[] = [
  {
    key: TWIN_RIVERS_KEYS.FIELD_BACKGROUND,
    path: `${TWIN_RIVERS_BASE}/environment/twin_rivers_field.png`,
  },
];

const P0_1_BASE = `${VISUAL_REVAMP_BASE}/puzzles/p0_1`;

export const P0_1_PUZZLE_KEYS = {
  COSMIC_VOID: "p0-1-cosmic-void",
  STONE_ARENA: "p0-1-stone-arena",
  RUNE_TILES: "p0-1-rune-tiles",
} as const;

export const P0_1_PUZZLE_ASSETS: AssetEntry[] = [
  { key: P0_1_PUZZLE_KEYS.COSMIC_VOID, path: `${P0_1_BASE}/cosmic_void.png` },
  { key: P0_1_PUZZLE_KEYS.STONE_ARENA, path: `${P0_1_BASE}/stone_arena.png` },
  {
    key: P0_1_PUZZLE_KEYS.RUNE_TILES,
    path: `${P0_1_BASE}/rune_tiles.png`,
    frameWidth: 512,
    frameHeight: 512,
  },
];

export const PROLOGUE_SHEET_KEYS = {
  ROUTE_TILESET: "prologue-sheet-route-tileset",
  PLAYER: "prologue-sheet-player-walk",
  NPCS: "prologue-sheet-npc-idle",
  COMPANIONS: "prologue-sheet-companions",
  OBJECTS: "prologue-sheet-objects",
  UI: "prologue-sheet-ui",
  GLITCH_ATTACK: "prologue-sheet-glitch-attack",
} as const;

export const PROLOGUE_SHEET_SPRITE_ASSETS: AssetEntry[] = [
  {
    key: PROLOGUE_SHEET_KEYS.ROUTE_TILESET,
    path: `${SHEET_BASE}/environment/prologue_route_tileset_v3.png`,
    frameWidth: 32,
    frameHeight: 32,
  },
  {
    key: PROLOGUE_SHEET_KEYS.PLAYER,
    path: `${SHEET_BASE}/characters/imagegen_player_walk_smooth_v10.png`,
    frameWidth: 256,
    frameHeight: 256,
  },
  {
    key: PROLOGUE_SHEET_KEYS.NPCS,
    path: `${SHEET_BASE}/characters/imagegen_npc_idle.png`,
    frameWidth: 256,
    frameHeight: 256,
  },
  {
    key: PROLOGUE_SHEET_KEYS.COMPANIONS,
    path: `${SHEET_BASE}/characters/companion_sheet.png`,
    frameWidth: 256,
    frameHeight: 256,
  },
  {
    key: PROLOGUE_SHEET_KEYS.OBJECTS,
    path: `${SHEET_BASE}/objects/object_sheet.png`,
    frameWidth: 256,
    frameHeight: 256,
  },
  {
    key: PROLOGUE_SHEET_KEYS.UI,
    path: `${SHEET_BASE}/ui/ui_sheet.png`,
    frameWidth: 256,
    frameHeight: 256,
  },
  {
    key: PROLOGUE_SHEET_KEYS.GLITCH_ATTACK,
    path: `${SHEET_BASE}/characters/glitch_attack_v1.png`,
    frameWidth: 256,
    frameHeight: 256,
  },
];

/**
 * Movement Gym (dev-only test region) tileset — 8x3 grid of 32px tiles
 * generated procedurally via codex exec (art_sources/generate_gym_tileset.py).
 * Tile-index layout is documented in src/scenes/dev/gymTiles.ts.
 */
export const DEV_GYM_KEYS = {
  TILESET: "dev-gym-tileset",
} as const;

export const DEV_GYM_SPRITE_ASSETS: AssetEntry[] = [
  {
    key: DEV_GYM_KEYS.TILESET,
    path: "assets/dev_gym/gym_tileset_v1.png",
    frameWidth: 32,
    frameHeight: 32,
  },
];

/**
 * Animated region props (Phase 7). Each entry's frameWidth × frame count
 * must match the on-disk PNG width — codex's generate_props.py validates
 * this on output, so any mismatch here is a registration typo rather than
 * an art problem.
 *
 * Loading note: these sheets are NOT loaded by BootScene. Each region
 * scene preloads its own subset via the `PROLOGUE_PROP_SPRITE_ASSETS` /
 * `ARRAY_PLAINS_PROP_SPRITE_ASSETS` / `TWIN_RIVERS_PROP_SPRITE_ASSETS`
 * exports below, matching the lazy-per-scene asset pattern used for
 * other region art. Adding a prop here without wiring it into the
 * region's preload list causes `placeRegionProps` to spawn the
 * `__MISSING` magenta marker, and the resulting empty animation
 * crashes with `Cannot read properties of undefined (reading 'duration')`
 * the first time `anims.play()` runs.
 */
export const REGION_PROP_SPRITE_ASSETS: AssetEntry[] = [
  {
    key: VISUAL_REVAMP_KEYS.PROP_RUNE_CRYSTAL,
    path: `${VISUAL_REVAMP_BASE}/props/prologue/rune_crystal.png`,
    frameWidth: 48,
    frameHeight: 48,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_CHICKEN,
    path: `${VISUAL_REVAMP_BASE}/props/array_plains/chicken.png`,
    frameWidth: 32,
    frameHeight: 32,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_LANTERN_POST,
    path: `${VISUAL_REVAMP_BASE}/props/twin_rivers/lantern_post.png`,
    frameWidth: 24,
    frameHeight: 64,
  },
  {
    key: VISUAL_REVAMP_KEYS.PROP_DRAGONFLY,
    path: `${VISUAL_REVAMP_BASE}/props/twin_rivers/dragonfly.png`,
    frameWidth: 24,
    frameHeight: 16,
  },
];

export const OVERWORLD_SHARED_CHARACTER_SPRITE_ASSETS: AssetEntry[] = [
  {
    key: VISUAL_REVAMP_KEYS.GLITCH,
    path: `${VISUAL_REVAMP_BASE}/characters/glitch_idle_v1.png`,
    frameWidth: 128,
    frameHeight: 128,
  },
  {
    key: VISUAL_REVAMP_KEYS.WATCHER,
    path: `${VISUAL_REVAMP_BASE}/characters/watcher_idle_v1.png`,
    frameWidth: 128,
    frameHeight: 160,
  },
  {
    key: VISUAL_REVAMP_KEYS.BIT_SPARK,
    path: `${VISUAL_REVAMP_BASE}/characters/bit_spark_idle_v1.png`,
    frameWidth: 96,
    frameHeight: 96,
  },
  {
    key: VISUAL_REVAMP_KEYS.BIT_BYTE,
    path: `${VISUAL_REVAMP_BASE}/characters/bit_byte_idle_v1.png`,
    frameWidth: 96,
    frameHeight: 96,
  },
  {
    key: VISUAL_REVAMP_KEYS.BIT_FRAME,
    path: `${VISUAL_REVAMP_BASE}/characters/bit_frame_idle_v1.png`,
    frameWidth: 96,
    frameHeight: 96,
  },
];

export const ARRAY_PLAINS_CHARACTER_SPRITE_ASSETS: AssetEntry[] = [
  {
    key: VISUAL_REVAMP_KEYS.SORTING_FARMER,
    path: `${VISUAL_REVAMP_BASE}/characters/sorting_farmer_idle_v1.png`,
    frameWidth: 192,
    frameHeight: 192,
  },
  {
    key: VISUAL_REVAMP_KEYS.BASKET_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/characters/basket_keeper_idle_v1.png`,
    frameWidth: 192,
    frameHeight: 192,
  },
  {
    key: VISUAL_REVAMP_KEYS.CROP_SORTER,
    path: `${VISUAL_REVAMP_BASE}/characters/crop_sorter_idle_v1.png`,
    frameWidth: 192,
    frameHeight: 192,
  },
  {
    key: VISUAL_REVAMP_KEYS.TILE_WORKER,
    path: `${VISUAL_REVAMP_BASE}/characters/tile_worker_idle_v1.png`,
    frameWidth: 192,
    frameHeight: 192,
  },
];

export const TWIN_RIVERS_CHARACTER_SPRITE_ASSETS: AssetEntry[] = [
  {
    key: VISUAL_REVAMP_KEYS.MIRROR_WALKER,
    path: `${VISUAL_REVAMP_BASE}/characters/mirror_walker_idle_v1.png`,
    frameWidth: 192,
    frameHeight: 192,
  },
  {
    key: VISUAL_REVAMP_KEYS.BRIDGE_KEEPER,
    path: `${VISUAL_REVAMP_BASE}/characters/bridge_keeper_idle_v1.png`,
    frameWidth: 192,
    frameHeight: 192,
  },
  {
    key: VISUAL_REVAMP_KEYS.WINDOW_FISHER,
    path: `${VISUAL_REVAMP_BASE}/characters/window_fisher_idle_v1.png`,
    frameWidth: 192,
    frameHeight: 192,
  },
  {
    key: VISUAL_REVAMP_KEYS.CURRENT_RIDER,
    path: `${VISUAL_REVAMP_BASE}/characters/current_rider_idle_v1.png`,
    frameWidth: 192,
    frameHeight: 192,
  },
];

export const OVERWORLD_CHARACTER_SPRITE_ASSETS: AssetEntry[] = [
  ...OVERWORLD_SHARED_CHARACTER_SPRITE_ASSETS,
  ...ARRAY_PLAINS_CHARACTER_SPRITE_ASSETS,
  ...TWIN_RIVERS_CHARACTER_SPRITE_ASSETS,
];

/** Per-region animated-prop preload bundles. Keep in sync with PLACEMENTS in src/ui/RegionProps.ts. */
const PROLOGUE_PROP_SPRITE_KEYS = new Set<string>([
  VISUAL_REVAMP_KEYS.PROP_RUNE_CRYSTAL,
]);
const ARRAY_PLAINS_PROP_SPRITE_KEYS = new Set<string>([
  VISUAL_REVAMP_KEYS.PROP_CHICKEN,
]);
const TWIN_RIVERS_PROP_SPRITE_KEYS = new Set<string>([
  VISUAL_REVAMP_KEYS.PROP_LANTERN_POST,
  VISUAL_REVAMP_KEYS.PROP_DRAGONFLY,
]);

export const PROLOGUE_PROP_SPRITE_ASSETS: AssetEntry[] =
  REGION_PROP_SPRITE_ASSETS.filter((asset) =>
    PROLOGUE_PROP_SPRITE_KEYS.has(asset.key),
  );
export const ARRAY_PLAINS_PROP_SPRITE_ASSETS: AssetEntry[] =
  REGION_PROP_SPRITE_ASSETS.filter((asset) =>
    ARRAY_PLAINS_PROP_SPRITE_KEYS.has(asset.key),
  );
export const TWIN_RIVERS_PROP_SPRITE_ASSETS: AssetEntry[] =
  REGION_PROP_SPRITE_ASSETS.filter((asset) =>
    TWIN_RIVERS_PROP_SPRITE_KEYS.has(asset.key),
  );

export const ARRAY_PLAINS_SCENE_SPRITE_ASSETS: AssetEntry[] = [
  ...ARRAY_PLAINS_CHARACTER_SPRITE_ASSETS,
  ...ARRAY_PLAINS_PROP_SPRITE_ASSETS,
];
export const TWIN_RIVERS_SCENE_SPRITE_ASSETS: AssetEntry[] = [
  ...TWIN_RIVERS_CHARACTER_SPRITE_ASSETS,
  ...TWIN_RIVERS_PROP_SPRITE_ASSETS,
];

const LEGACY_PROLOGUE_TILESET_ASSET: AssetEntry = {
  key: "prologue-tileset",
  path: `${BASE}/tileset/sheet.png`,
  frameWidth: 469,
  frameHeight: 384,
};

export const SPRITE_ASSETS: AssetEntry[] = [
  LEGACY_PROLOGUE_TILESET_ASSET,
  {
    key: "prologue-mc",
    path: `${BASE}/mc/sheet.png`,
    frameWidth: 469,
    frameHeight: 512,
  },
  {
    key: "prologue-mc-extra",
    path: `${BASE}/mcmore/sheet.png`,
    frameWidth: 469,
    frameHeight: 512,
  },
  {
    key: "prologue-node",
    path: `${BASE}/node/sheet.png`,
    frameWidth: 352,
    frameHeight: 384,
  },
  {
    key: "prologue-rune-keeper",
    path: `${BASE}/rune-keeper/sheet.png`,
    frameWidth: 704,
    frameHeight: 768,
  },
  {
    key: "prologue-console-keeper",
    path: `${BASE}/console-keeper/sheet.png`,
    frameWidth: 704,
    frameHeight: 768,
  },
  {
    key: "prologue-gates",
    path: `${BASE}/gates/sheet.png`,
    frameWidth: 704,
    frameHeight: 768,
  },
  {
    key: "prologue-p01-tiles",
    path: `${BASE}/p01-tiles/sheet.png`,
    frameWidth: 704,
    frameHeight: 512,
  },
  {
    key: "prologue-atmosphere",
    path: `${BASE}/atmosphere/sheet.png`,
    frameWidth: 313,
    frameHeight: 384,
  },
  ...PROLOGUE_SHEET_SPRITE_ASSETS,
  ...DEV_GYM_SPRITE_ASSETS,
  ...OVERWORLD_CHARACTER_SPRITE_ASSETS,
  ...REGION_PROP_SPRITE_ASSETS,
];

export const BOOT_SPRITE_ASSETS: AssetEntry[] = [];

const PROLOGUE_SCENE_SPRITE_KEYS = new Set<string>([
  PROLOGUE_SHEET_KEYS.ROUTE_TILESET,
  PROLOGUE_SHEET_KEYS.PLAYER,
  PROLOGUE_SHEET_KEYS.COMPANIONS,
]);

export const PROLOGUE_SCENE_SPRITE_ASSETS: AssetEntry[] = [
  ...PROLOGUE_SHEET_SPRITE_ASSETS.filter((asset) =>
    PROLOGUE_SCENE_SPRITE_KEYS.has(asset.key),
  ),
  // Region prop sprite-sheets needed by placeRegionProps('prologue').
  ...PROLOGUE_PROP_SPRITE_ASSETS,
  ...OVERWORLD_SHARED_CHARACTER_SPRITE_ASSETS,
];

export const OVERWORLD_PLAYER_SPRITE_ASSETS: AssetEntry[] =
  PROLOGUE_SHEET_SPRITE_ASSETS.filter(
    (asset) => asset.key === PROLOGUE_SHEET_KEYS.PLAYER,
  );

const COMPOSITE_IMAGE = (sub: string, name: string): AssetEntry => ({
  key: `prologue-${sub}-${name}`,
  path: `${BASE}/${sub}/${name}.png`,
});

const LEGACY_PROLOGUE_COMPOSITE_IMAGE_ASSETS: AssetEntry[] = [
  COMPOSITE_IMAGE("portal", "locked"),
  COMPOSITE_IMAGE("portal", "active_0"),
  COMPOSITE_IMAGE("portal", "swirl_0"),
  COMPOSITE_IMAGE("portal", "swirl_1"),
  COMPOSITE_IMAGE("portal", "swirl_2"),
  COMPOSITE_IMAGE("portal", "swirl_3"),
  COMPOSITE_IMAGE("ui", "dialogue_box"),
  COMPOSITE_IMAGE("ui", "portrait_inactive"),
  COMPOSITE_IMAGE("ui", "portrait_active"),
  COMPOSITE_IMAGE("ui", "prompt"),
  COMPOSITE_IMAGE("moretiles", "bridge_straight_h"),
  COMPOSITE_IMAGE("moretiles", "bridge_straight_v"),
  COMPOSITE_IMAGE("moretiles", "bridge_corner_ne"),
  COMPOSITE_IMAGE("moretiles", "bridge_corner_nw"),
];

export const IMAGE_ASSETS: AssetEntry[] = [
  ...LEGACY_PROLOGUE_COMPOSITE_IMAGE_ASSETS,
  ...PROLOGUE_REWORK_IMAGE_ASSETS,
  ...VISUAL_REVAMP_IMAGE_ASSETS,
  ...ARRAY_PLAINS_IMAGE_ASSETS,
  ...TWIN_RIVERS_IMAGE_ASSETS,
  ...P0_1_PUZZLE_ASSETS,
  ...GRAIN_CHAMBER_IMAGE_ASSETS,
];

export const BOOT_IMAGE_ASSETS: AssetEntry[] = [
  ...VISUAL_REVAMP_IMAGE_ASSETS.filter(
    (asset) => asset.key === VISUAL_REVAMP_KEYS.TITLE_BG,
  ),
  // portrait_active is the only legacy composite still rendered — by DialogueBox.
  // dialogue_box, portrait_inactive, and prompt were replaced by drawPanel + glyphs.
  COMPOSITE_IMAGE("ui", "portrait_active"),
];

const PROLOGUE_SCENE_REWORK_KEYS = new Set<string>([
  PROLOGUE_REWORK_KEYS.SPAWN_SHRINE,
  PROLOGUE_REWORK_KEYS.CENTRAL_HUB_SHRINE,
  PROLOGUE_REWORK_KEYS.RUNE_BRANCH,
  PROLOGUE_REWORK_KEYS.CONSOLE_BRANCH,
  PROLOGUE_REWORK_KEYS.GATE_COURTYARD,
]);

const PROLOGUE_SCENE_VISUAL_KEYS = new Set<string>([
  VISUAL_REVAMP_KEYS.PROLOGUE_BG,
  VISUAL_REVAMP_KEYS.PLAYER,
  VISUAL_REVAMP_KEYS.PROFESSOR_NODE,
  VISUAL_REVAMP_KEYS.RUNE_KEEPER,
  VISUAL_REVAMP_KEYS.CONSOLE_KEEPER,
  VISUAL_REVAMP_KEYS.GLITCH,
  VISUAL_REVAMP_KEYS.WATCHER,
  VISUAL_REVAMP_KEYS.BIT_SPARK,
  VISUAL_REVAMP_KEYS.BIT_BYTE,
  VISUAL_REVAMP_KEYS.BIT_FRAME,
  VISUAL_REVAMP_KEYS.PORTAL_FIELD,
  VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
  VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN,
  // Phase 7 cosmic props
  VISUAL_REVAMP_KEYS.PROP_FLOATING_ORB,
  VISUAL_REVAMP_KEYS.PROP_RUNE_TOTEM,
  VISUAL_REVAMP_KEYS.PROP_ENERGY_BEAM,
]);

export const PROLOGUE_SCENE_IMAGE_ASSETS: AssetEntry[] = [
  ...PROLOGUE_REWORK_IMAGE_ASSETS.filter((asset) =>
    PROLOGUE_SCENE_REWORK_KEYS.has(asset.key),
  ),
  ...VISUAL_REVAMP_IMAGE_ASSETS.filter((asset) =>
    PROLOGUE_SCENE_VISUAL_KEYS.has(asset.key),
  ),
];

const ARRAY_PLAINS_SCENE_VISUAL_KEYS = new Set<string>([
  VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG,
  VISUAL_REVAMP_KEYS.ROUTE_MATERIALS,
  VISUAL_REVAMP_KEYS.VILLAGE_ELDER,
  VISUAL_REVAMP_KEYS.SORTING_FARMER,
  VISUAL_REVAMP_KEYS.BASKET_KEEPER,
  VISUAL_REVAMP_KEYS.CROP_SORTER,
  VISUAL_REVAMP_KEYS.TILE_WORKER,
  VISUAL_REVAMP_KEYS.GLITCH,
  VISUAL_REVAMP_KEYS.BIT_SPARK,
  VISUAL_REVAMP_KEYS.BIT_BYTE,
  VISUAL_REVAMP_KEYS.BIT_FRAME,
  VISUAL_REVAMP_KEYS.PORTAL_VOID,
  VISUAL_REVAMP_KEYS.PORTAL_WATER,
  VISUAL_REVAMP_KEYS.PROP_FIELD_SIGN,
  VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE,
  VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
  VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN,
  VISUAL_REVAMP_KEYS.PROP_ARRAY_MARKER,
  // Phase 7 farmland props
  VISUAL_REVAMP_KEYS.PROP_SCARECROW,
  VISUAL_REVAMP_KEYS.PROP_HAY_BALE,
  VISUAL_REVAMP_KEYS.PROP_WATERING_CAN,
]);

export const ARRAY_PLAINS_SCENE_IMAGE_ASSETS: AssetEntry[] = [
  ...ARRAY_PLAINS_IMAGE_ASSETS,
  ...VISUAL_REVAMP_IMAGE_ASSETS.filter((asset) =>
    ARRAY_PLAINS_SCENE_VISUAL_KEYS.has(asset.key),
  ),
];

const TWIN_RIVERS_SCENE_VISUAL_KEYS = new Set<string>([
  VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG,
  VISUAL_REVAMP_KEYS.ROUTE_MATERIALS,
  VISUAL_REVAMP_KEYS.BIT_SPARK,
  VISUAL_REVAMP_KEYS.BIT_BYTE,
  VISUAL_REVAMP_KEYS.BIT_FRAME,
  VISUAL_REVAMP_KEYS.PORTAL_FIELD,
  VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
  VISUAL_REVAMP_KEYS.PORTAL_WATER,
  VISUAL_REVAMP_KEYS.PROP_WATER_BUOY,
  VISUAL_REVAMP_KEYS.PROP_SMALL_BOAT,
  VISUAL_REVAMP_KEYS.PROP_LILY_PAD_CLUSTER,
  VISUAL_REVAMP_KEYS.MIRROR_WALKER,
  VISUAL_REVAMP_KEYS.BRIDGE_KEEPER,
  VISUAL_REVAMP_KEYS.WINDOW_FISHER,
  VISUAL_REVAMP_KEYS.CURRENT_RIDER,
  VISUAL_REVAMP_KEYS.GLITCH,
]);

export const TWIN_RIVERS_SCENE_IMAGE_ASSETS: AssetEntry[] = [
  ...TWIN_RIVERS_IMAGE_ASSETS,
  ...VISUAL_REVAMP_IMAGE_ASSETS.filter((asset) =>
    TWIN_RIVERS_SCENE_VISUAL_KEYS.has(asset.key),
  ),
];

const HASH_HIGHLANDS_SCENE_VISUAL_KEYS = new Set<string>([
  VISUAL_REVAMP_KEYS.HASH_HIGHLANDS_BG,
  VISUAL_REVAMP_KEYS.ROUTE_MATERIALS,
  VISUAL_REVAMP_KEYS.HASH_KEEPER,
  VISUAL_REVAMP_KEYS.GLITCH,
  VISUAL_REVAMP_KEYS.BIT_SPARK,
  VISUAL_REVAMP_KEYS.BIT_BYTE,
  VISUAL_REVAMP_KEYS.BIT_FRAME,
  VISUAL_REVAMP_KEYS.PORTAL_WATER,
  VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
  VISUAL_REVAMP_KEYS.PROP_ARRAY_MARKER,
  VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE,
  VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
  VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN,
]);

export const HASH_HIGHLANDS_SCENE_IMAGE_ASSETS: AssetEntry[] =
  VISUAL_REVAMP_IMAGE_ASSETS.filter((asset) =>
    HASH_HIGHLANDS_SCENE_VISUAL_KEYS.has(asset.key),
  );

export function getImageAssetPath(key: string): string | undefined {
  return IMAGE_ASSETS.find((asset) => asset.key === key)?.path;
}

export const TILEMAP_ASSETS: AssetEntry[] = [];

export const AUDIO_ASSETS: AssetEntry[] = [];
