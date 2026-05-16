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
  TITLE_BG: 'visual-revamp-title-bg',
  PROLOGUE_BG: 'visual-revamp-prologue-bg',
  ARRAY_PLAINS_BG: 'visual-revamp-array-plains-bg',
  TWIN_RIVERS_BG: 'visual-revamp-twin-rivers-bg',
  HASH_HIGHLANDS_BG: 'visual-revamp-hash-highlands-bg',
  STACK_SPIRES_BG: 'visual-revamp-stack-spires-bg',
  QUEUE_CANALS_BG: 'visual-revamp-queue-canals-bg',
  TREE_CANOPY_BG: 'visual-revamp-tree-canopy-bg',
  GRAPH_NEXUS_BG: 'visual-revamp-graph-nexus-bg',
  CORE_BG: 'visual-revamp-core-bg',
  ROUTE_MATERIALS: 'visual-revamp-route-materials',
  PLAYER: 'visual-revamp-player',
  PROFESSOR_NODE: 'visual-revamp-professor-node',
  RUNE_KEEPER: 'visual-revamp-rune-keeper',
  CONSOLE_KEEPER: 'visual-revamp-console-keeper',
  VILLAGE_ELDER: 'visual-revamp-village-elder',
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
  PUZZLE_FRAME: 'visual-revamp-puzzle-frame',
  PUZZLE_RUNE_MEMORY_BG: 'visual-revamp-puzzle-rune-memory-bg',
  PUZZLE_FLOW_CONSOLES_BG: 'visual-revamp-puzzle-flow-consoles-bg',
  PUZZLE_LITANY_TRIAL_BG: 'visual-revamp-puzzle-litany-trial-bg',
  PUZZLE_SORTING_SHED_BG: 'visual-revamp-puzzle-sorting-shed-bg',
  PUZZLE_INDEXING_BARN_BG: 'visual-revamp-puzzle-indexing-barn-bg',
  PUZZLE_GRAIN_HOPPER_BG: 'visual-revamp-puzzle-grain-hopper-bg',
  PUZZLE_PAIRING_GROUNDS_BG: 'visual-revamp-puzzle-pairing-grounds-bg',
  PUZZLE_SHUFFLER_DOMAIN_BG: 'visual-revamp-puzzle-shuffler-domain-bg',
  PUZZLE_TWIN_MIRROR_WALK_BG: 'visual-revamp-puzzle-twin-mirror-walk-bg',
  PUZZLE_TWIN_POINTER_BRIDGE_BG: 'visual-revamp-puzzle-twin-pointer-bridge-bg',
  PUZZLE_TWIN_FIXED_WINDOW_BG: 'visual-revamp-puzzle-twin-fixed-window-bg',
  PUZZLE_TWIN_VARIABLE_WINDOW_BG: 'visual-revamp-puzzle-twin-variable-window-bg',
  PUZZLE_MIRROR_SERPENT_BG: 'visual-revamp-puzzle-mirror-serpent-bg',
  PUZZLE_HASH_NAMEPLATE_GATES_BG: 'visual-revamp-puzzle-hash-nameplate-gates-bg',
  PUZZLE_HASH_FREQUENCY_FORGE_BG: 'visual-revamp-puzzle-hash-frequency-forge-bg',
  PUZZLE_HASH_ANAGRAM_GARDENS_BG: 'visual-revamp-puzzle-hash-anagram-gardens-bg',
  PUZZLE_HASH_CACHE_CAVERN_BG: 'visual-revamp-puzzle-hash-cache-cavern-bg',
  PUZZLE_HASH_ARCHIVIST_BG: 'visual-revamp-puzzle-hash-archivist-bg',
  PUZZLE_STACK_SCROLL_STACK_BG: 'visual-revamp-puzzle-stack-scroll-stack-bg',
  PUZZLE_STACK_MIRROR_STAIRCASE_BG: 'visual-revamp-puzzle-stack-mirror-staircase-bg',
  PUZZLE_STACK_MAZE_OF_FORKS_BG: 'visual-revamp-puzzle-stack-maze-of-forks-bg',
  PUZZLE_STACK_TOWER_OF_MEMORY_BG: 'visual-revamp-puzzle-stack-tower-of-memory-bg',
  PUZZLE_STACK_RECURSION_BG: 'visual-revamp-puzzle-stack-recursion-bg',
  PUZZLE_QUEUE_FERRY_DOCK_BG: 'visual-revamp-puzzle-queue-ferry-dock-bg',
  PUZZLE_QUEUE_RIPPLE_MAP_BG: 'visual-revamp-puzzle-queue-ripple-map-bg',
  PUZZLE_QUEUE_PRIORITY_DOCK_BG: 'visual-revamp-puzzle-queue-priority-dock-bg',
  PUZZLE_QUEUE_SCHEDULER_LOTTERY_BG: 'visual-revamp-puzzle-queue-scheduler-lottery-bg',
  PUZZLE_QUEUE_RECONCILER_BG: 'visual-revamp-puzzle-queue-reconciler-bg',
  PUZZLE_TREE_FIRST_FORK_BG: 'visual-revamp-puzzle-tree-first-fork-bg',
  PUZZLE_TREE_SORTED_GROVE_BG: 'visual-revamp-puzzle-tree-sorted-grove-bg',
  PUZZLE_TREE_DEEP_ROOT_BG: 'visual-revamp-puzzle-tree-deep-root-bg',
  PUZZLE_TREE_BENT_BOUGH_BG: 'visual-revamp-puzzle-tree-bent-bough-bg',
  PUZZLE_TREE_PATTERN_BG: 'visual-revamp-puzzle-tree-pattern-bg',
  PUZZLE_GRAPH_BRIDGE_MAP_BG: 'visual-revamp-puzzle-graph-bridge-map-bg',
  PUZZLE_GRAPH_COURIER_DILEMMA_BG: 'visual-revamp-puzzle-graph-courier-dilemma-bg',
  PUZZLE_GRAPH_CYCLE_BAZAAR_BG: 'visual-revamp-puzzle-graph-cycle-bazaar-bg',
  PUZZLE_GRAPH_ISLAND_CENSUS_BG: 'visual-revamp-puzzle-graph-island-census-bg',
  PUZZLE_GRAPH_ECHO_BG: 'visual-revamp-puzzle-graph-echo-bg',
  PUZZLE_CORE_ECHO_CHAMBER_BG: 'visual-revamp-puzzle-core-echo-chamber-bg',
  PUZZLE_CORE_WEIGHTED_STAIRCASE_BG: 'visual-revamp-puzzle-core-weighted-staircase-bg',
  PUZZLE_CORE_GRAND_ARCHIVE_BG: 'visual-revamp-puzzle-core-grand-archive-bg',
  PUZZLE_CORE_HALL_OF_PATTERNS_BG: 'visual-revamp-puzzle-core-hall-of-patterns-bg',
  PUZZLE_CORE_PROTOCOL_OMEGA_BG: 'visual-revamp-puzzle-core-protocol-omega-bg',
} as const;

export const VISUAL_REVAMP_IMAGE_ASSETS: AssetEntry[] = [
  { key: VISUAL_REVAMP_KEYS.TITLE_BG, path: `${VISUAL_REVAMP_BASE}/title/title_first_three_overhaul_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PROLOGUE_BG, path: `${VISUAL_REVAMP_BASE}/regions/prologue_chamber.png` },
  { key: VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG, path: `${VISUAL_REVAMP_BASE}/regions/array_plains_grounded_v1.png` },
  { key: VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG, path: `${VISUAL_REVAMP_BASE}/regions/twin_rivers_grounded_v1.png` },
  { key: VISUAL_REVAMP_KEYS.HASH_HIGHLANDS_BG, path: `${VISUAL_REVAMP_BASE}/regions/hash_highlands_grounded_v1.png` },
  { key: VISUAL_REVAMP_KEYS.STACK_SPIRES_BG, path: `${VISUAL_REVAMP_BASE}/regions/stack_spires_grounded_v1.png` },
  { key: VISUAL_REVAMP_KEYS.QUEUE_CANALS_BG, path: `${VISUAL_REVAMP_BASE}/regions/queue_canals_grounded_v1.png` },
  { key: VISUAL_REVAMP_KEYS.TREE_CANOPY_BG, path: `${VISUAL_REVAMP_BASE}/regions/tree_canopy_grounded_v1.png` },
  { key: VISUAL_REVAMP_KEYS.GRAPH_NEXUS_BG, path: `${VISUAL_REVAMP_BASE}/regions/graph_nexus_grounded_v1.png` },
  { key: VISUAL_REVAMP_KEYS.CORE_BG, path: `${VISUAL_REVAMP_BASE}/regions/core_grounded_v1.png` },
  { key: VISUAL_REVAMP_KEYS.ROUTE_MATERIALS, path: `${VISUAL_REVAMP_BASE}/regions/grounded_route_material_reference.png` },
  { key: VISUAL_REVAMP_KEYS.PLAYER, path: `${VISUAL_REVAMP_BASE}/characters/player.png` },
  { key: VISUAL_REVAMP_KEYS.PROFESSOR_NODE, path: `${VISUAL_REVAMP_BASE}/characters/professor_node.png` },
  { key: VISUAL_REVAMP_KEYS.RUNE_KEEPER, path: `${VISUAL_REVAMP_BASE}/characters/rune_keeper.png` },
  { key: VISUAL_REVAMP_KEYS.CONSOLE_KEEPER, path: `${VISUAL_REVAMP_BASE}/characters/console_keeper.png` },
  { key: VISUAL_REVAMP_KEYS.VILLAGE_ELDER, path: `${VISUAL_REVAMP_BASE}/characters/village_elder.png` },
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
  { key: VISUAL_REVAMP_KEYS.PUZZLE_FRAME, path: `${VISUAL_REVAMP_BASE}/ui/puzzle_encounter_frame_v2.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_RUNE_MEMORY_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/rune_memory_backdrop_v2.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_FLOW_CONSOLES_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/flow_consoles_backdrop_v2.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_LITANY_TRIAL_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/litany_trial_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_SORTING_SHED_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/sorting_shed_backdrop_v2.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_INDEXING_BARN_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/indexing_barn_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_GRAIN_HOPPER_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/grain_hopper_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_PAIRING_GROUNDS_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/pairing_grounds_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_SHUFFLER_DOMAIN_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/shuffler_domain_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_MIRROR_WALK_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/twin_mirror_walk_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_POINTER_BRIDGE_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/twin_pointer_bridge_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_FIXED_WINDOW_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/twin_fixed_window_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TWIN_VARIABLE_WINDOW_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/twin_variable_window_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_MIRROR_SERPENT_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/mirror_serpent_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_NAMEPLATE_GATES_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/hash_nameplate_gates_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_FREQUENCY_FORGE_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/hash_frequency_forge_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_ANAGRAM_GARDENS_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/hash_anagram_gardens_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_CACHE_CAVERN_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/hash_cache_cavern_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_HASH_ARCHIVIST_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/hash_archivist_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_SCROLL_STACK_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/stack_scroll_stack_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_MIRROR_STAIRCASE_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/stack_mirror_staircase_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_MAZE_OF_FORKS_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/stack_maze_of_forks_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_TOWER_OF_MEMORY_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/stack_tower_of_memory_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_STACK_RECURSION_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/stack_recursion_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_FERRY_DOCK_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/queue_ferry_dock_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_RIPPLE_MAP_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/queue_ripple_map_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_PRIORITY_DOCK_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/queue_priority_dock_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_SCHEDULER_LOTTERY_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/queue_scheduler_lottery_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_QUEUE_RECONCILER_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/queue_reconciler_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_FIRST_FORK_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/tree_first_fork_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_SORTED_GROVE_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/tree_sorted_grove_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_DEEP_ROOT_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/tree_deep_root_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_BENT_BOUGH_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/tree_bent_bough_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_TREE_PATTERN_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/tree_pattern_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_BRIDGE_MAP_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/graph_bridge_map_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_COURIER_DILEMMA_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/graph_courier_dilemma_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_CYCLE_BAZAAR_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/graph_cycle_bazaar_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_ISLAND_CENSUS_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/graph_island_census_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_GRAPH_ECHO_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/graph_echo_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_ECHO_CHAMBER_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/core_echo_chamber_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_WEIGHTED_STAIRCASE_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/core_weighted_staircase_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_GRAND_ARCHIVE_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/core_grand_archive_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_HALL_OF_PATTERNS_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/core_hall_of_patterns_backdrop_v1.png` },
  { key: VISUAL_REVAMP_KEYS.PUZZLE_CORE_PROTOCOL_OMEGA_BG, path: `${VISUAL_REVAMP_BASE}/puzzles/core_protocol_omega_backdrop_v1.png` },
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
  { key: PROLOGUE_SHEET_KEYS.PLAYER, path: `${SHEET_BASE}/characters/imagegen_player_walk_smooth_v6.png`, frameWidth: 256, frameHeight: 256 },
  { key: PROLOGUE_SHEET_KEYS.NPCS, path: `${SHEET_BASE}/characters/imagegen_npc_idle.png`, frameWidth: 256, frameHeight: 256 },
  { key: PROLOGUE_SHEET_KEYS.COMPANIONS, path: `${SHEET_BASE}/characters/companion_sheet.png`, frameWidth: 256, frameHeight: 256 },
  { key: PROLOGUE_SHEET_KEYS.OBJECTS, path: `${SHEET_BASE}/objects/object_sheet.png`, frameWidth: 256, frameHeight: 256 },
  { key: PROLOGUE_SHEET_KEYS.UI, path: `${SHEET_BASE}/ui/ui_sheet.png`, frameWidth: 256, frameHeight: 256 },
];

const LEGACY_PROLOGUE_TILESET_ASSET: AssetEntry = {
  key: 'prologue-tileset',
  path: `${BASE}/tileset/sheet.png`,
  frameWidth: 469,
  frameHeight: 384,
};

export const SPRITE_ASSETS: AssetEntry[] = [
  LEGACY_PROLOGUE_TILESET_ASSET,
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

export const BOOT_SPRITE_ASSETS: AssetEntry[] = [];

const PROLOGUE_SCENE_SPRITE_KEYS = new Set<string>([
  PROLOGUE_SHEET_KEYS.ROUTE_TILESET,
  PROLOGUE_SHEET_KEYS.PLAYER,
  PROLOGUE_SHEET_KEYS.COMPANIONS,
]);

export const PROLOGUE_SCENE_SPRITE_ASSETS: AssetEntry[] = PROLOGUE_SHEET_SPRITE_ASSETS.filter((asset) =>
  PROLOGUE_SCENE_SPRITE_KEYS.has(asset.key),
);

export const OVERWORLD_PLAYER_SPRITE_ASSETS: AssetEntry[] = PROLOGUE_SHEET_SPRITE_ASSETS.filter(
  (asset) => asset.key === PROLOGUE_SHEET_KEYS.PLAYER,
);

const COMPOSITE_IMAGE = (sub: string, name: string): AssetEntry => ({
  key: `prologue-${sub}-${name}`,
  path: `${BASE}/${sub}/${name}.png`,
});

const LEGACY_PROLOGUE_COMPOSITE_IMAGE_ASSETS: AssetEntry[] = [
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
];

export const IMAGE_ASSETS: AssetEntry[] = [
  ...LEGACY_PROLOGUE_COMPOSITE_IMAGE_ASSETS,
  ...PROLOGUE_REWORK_IMAGE_ASSETS,
  ...VISUAL_REVAMP_IMAGE_ASSETS,
  ...ARRAY_PLAINS_IMAGE_ASSETS,
  ...TWIN_RIVERS_IMAGE_ASSETS,
];

export const BOOT_IMAGE_ASSETS: AssetEntry[] = [
  ...VISUAL_REVAMP_IMAGE_ASSETS.filter((asset) => asset.key === VISUAL_REVAMP_KEYS.TITLE_BG),
  // portrait_active is the only legacy composite still rendered — by DialogueBox.
  // dialogue_box, portrait_inactive, and prompt were replaced by drawPanel + glyphs.
  COMPOSITE_IMAGE('ui', 'portrait_active'),
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
]);

export const PROLOGUE_SCENE_IMAGE_ASSETS: AssetEntry[] = [
  ...PROLOGUE_REWORK_IMAGE_ASSETS.filter((asset) => PROLOGUE_SCENE_REWORK_KEYS.has(asset.key)),
  ...VISUAL_REVAMP_IMAGE_ASSETS.filter((asset) => PROLOGUE_SCENE_VISUAL_KEYS.has(asset.key)),
];

const ARRAY_PLAINS_SCENE_VISUAL_KEYS = new Set<string>([
  VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG,
  VISUAL_REVAMP_KEYS.ROUTE_MATERIALS,
  VISUAL_REVAMP_KEYS.VILLAGE_ELDER,
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
]);

export const ARRAY_PLAINS_SCENE_IMAGE_ASSETS: AssetEntry[] = [
  ...ARRAY_PLAINS_IMAGE_ASSETS,
  ...VISUAL_REVAMP_IMAGE_ASSETS.filter((asset) => ARRAY_PLAINS_SCENE_VISUAL_KEYS.has(asset.key)),
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
]);

export const TWIN_RIVERS_SCENE_IMAGE_ASSETS: AssetEntry[] = [
  ...TWIN_RIVERS_IMAGE_ASSETS,
  ...VISUAL_REVAMP_IMAGE_ASSETS.filter((asset) => TWIN_RIVERS_SCENE_VISUAL_KEYS.has(asset.key)),
];

export function getImageAssetPath(key: string): string | undefined {
  return IMAGE_ASSETS.find((asset) => asset.key === key)?.path;
}

export const TILEMAP_ASSETS: AssetEntry[] = [];

export const AUDIO_ASSETS: AssetEntry[] = [];
