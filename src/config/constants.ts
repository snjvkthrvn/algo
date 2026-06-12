/**
 * Game-wide constants
 */

export const TILE_SIZE = 64;
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 720;
export const PLAYER_SPEED = 160;
export const INTERACTION_RANGE = 48;
export const VOID_RESPAWN_CHECK_INTERVAL = 500;

export const COLORS = {
  // Prologue palette
  VOID_BLACK: 0x0a0a1a,
  COSMIC_PURPLE: 0x1a1a3e,
  CYAN_GLOW: 0x06b6d4,
  PURPLE_CRYSTAL: 0x8b5cf6,
  ORANGE_ACCENT: 0xf97316,
  GOLD_ACCENT: 0xfbbf24,

  // UI colors (GameBoy theme from .impeccable.md)
  SUCCESS: 0x88c070, // GameBoy "light" accent
  ERROR: 0x081820, // Highest contrast dark
  WARNING: 0x346856, // Medium dark

  // Text colors
  TEXT_LIGHT: 0xe0f8d0, // GameBoy "lightest" / UI panel fill
  TEXT_MUTED: 0x88c070, // Accent / highlight
  TEXT_DARK: 0x081820, // GameBoy "darkest" primary text

  // Frame colors
  FRAME_BG: 0xe0f8d0, // Cream fill
  FRAME_BORDER: 0x081820, // Darkest
  FRAME_BORDER_LIGHT: 0x346856,
  FRAME_BORDER_DARK: 0x0a0a1a,
  OVERLAY_BG: 0x0a0a1a, // Void backdrop

  // Concept Bridge / shared nav chrome
  NAV_DOT_INACTIVE: 0x3a3a5a,
  BRIDGE_PATTERN: 0x22c55e,
  BRIDGE_WRONG: 0xef4444,
  PURE_BLACK: 0x000000,
} as const;

/** CSS hex strings for Phaser.Text `color` / `stroke` (paired with `COLORS`). */
export const COLOR_HEX = {
  TEXT_LIGHT: "#e0f8d0",
  TEXT_DARK: "#081820",
  TEXT_MUTED: "#88c070",
  WARNING: "#346856",
  SUCCESS: "#88c070",
  CYAN_GLOW: "#06b6d4",
  PURPLE_CRYSTAL: "#8b5cf6",
  GOLD: "#fbbf24",
  ORANGE: "#f97316",
  BRIDGE_PATTERN: "#22c55e",
  BRIDGE_WRONG: "#ef4444",
  FRAME_BG: "#e0f8d0",
  FRAME_BORDER: "#081820",
  FRAME_BORDER_LIGHT: "#346856",
  OVERLAY_BG: "#0a0a1a",
  PURE_BLACK: "#000000",
} as const;

export const REGIONS = {
  PROLOGUE: "prologue",
  ARRAY_PLAINS: "array_plains",
  TWIN_RIVERS: "twin_rivers",
  HASH_HIGHLANDS: "hash_highlands",
  STACK_SPIRES: "stack_spires",
  QUEUE_CANALS: "queue_canals",
  TREE_CANOPY: "tree_canopy",
  GRAPH_NEXUS: "graph_nexus",
  CORE: "core",
} as const;

export const SCENE_KEYS = {
  BOOT: "BootScene",
  MENU: "MenuScene",
  DEBUG_SELECT: "DebugSelectScene",
  MOVEMENT_GYM: "MovementGymScene",
  PROLOGUE_TRIAL: "PrologueTrialScene",
  PROLOGUE: "PrologueScene",
  ARRAY_PLAINS: "ArrayPlainsScene",
  TWIN_RIVERS: "TwinRiversScene",
  HASH_HIGHLANDS: "HashHighlandsScene",
  STACK_SPIRES: "StackSpiresScene",
  QUEUE_CANALS: "QueueCanalsScene",
  TREE_CANOPY: "TreeCanopyScene",
  GRAPH_NEXUS: "GraphNexusScene",
  CORE: "CoreScene",
  PUZZLE_P0_1: "P0_1_FollowThePath",
  PUZZLE_P0_2: "P0_2_FlowConsoles",
  BOSS_SENTINEL: "Boss_Sentinel",
  PUZZLE_AP_1: "P1_1_BubbleSort",
  PUZZLE_AP_2: "P1_2_BasketIndexing",
  PUZZLE_AP_3: "P1_3_HashHopper",
  PUZZLE_AP_4: "P1_4_TwoSum",
  BOSS_SHUFFLER: "Boss_Shuffler",
  PUZZLE_TR_1: "P2_1_MirrorWalk",
  PUZZLE_TR_2: "P2_2_PointerBridge",
  PUZZLE_TR_3: "P2_3_FixedWindowDock",
  PUZZLE_TR_4: "P2_4_CurrentRider",
  BOSS_MIRROR_SERPENT: "Boss_MirrorSerpent",
  PUZZLE_HH_1: "P3_1_NameplateGates",
  PUZZLE_HH_2: "P3_2_FrequencyForge",
  PUZZLE_HH_3: "P3_3_AnagramGardens",
  PUZZLE_HH_4: "P3_4_CacheCavern",
  BOSS_ARCHIVIST: "Boss_Archivist",
  PUZZLE_SS_1: "P4_1_ScrollStack",
  PUZZLE_SS_2: "P4_2_MirrorStaircase",
  PUZZLE_SS_3: "P4_3_MazeOfForks",
  PUZZLE_SS_4: "P4_4_TowerOfMemory",
  BOSS_RECURSION: "Boss_Recursion",
  PUZZLE_QC_1: "P5_1_FerryQueue",
  PUZZLE_QC_2: "P5_2_BfsLocks",
  PUZZLE_QC_3: "P5_3_PriorityHarbor",
  PUZZLE_QC_4: "P5_4_SchedulerOffice",
  BOSS_RECONCILER: "Boss_Reconciler",
  PUZZLE_TC_1: "P6_1_RootWalk",
  PUZZLE_TC_2: "P6_2_BstGrove",
  PUZZLE_TC_3: "P6_3_DfsBranches",
  PUZZLE_TC_4: "P6_4_BalanceCanopy",
  BOSS_PATTERN: "Boss_Pattern",
  PUZZLE_GN_1: "P7_1_NodeLinks",
  PUZZLE_GN_2: "P7_2_ShortestPath",
  PUZZLE_GN_3: "P7_3_CycleCourt",
  PUZZLE_GN_4: "P7_4_ComponentFields",
  BOSS_ECHO: "Boss_Echo",
  PUZZLE_CORE_1: "P8_1_EchoChamber",
  PUZZLE_CORE_2: "P8_2_WeightedStaircase",
  PUZZLE_CORE_3: "P8_3_GrandArchive",
  PUZZLE_CORE_4: "P8_4_HallOfPatterns",
  BOSS_PROTOCOL_OMEGA: "Boss_ProtocolOmega",
  CONCEPT_BRIDGE: "ConceptBridgeScene",
  CODEX: "CodexScene",
  PAUSE_OVERLAY: "PauseOverlayScene",
  END_GAME: "EndGameScene",
  CRT_OVERLAY: "CRTScene",
} as const;

export const REGION_ORDER = [
  REGIONS.PROLOGUE,
  REGIONS.ARRAY_PLAINS,
  REGIONS.TWIN_RIVERS,
  REGIONS.HASH_HIGHLANDS,
  REGIONS.STACK_SPIRES,
  REGIONS.QUEUE_CANALS,
  REGIONS.TREE_CANOPY,
  REGIONS.GRAPH_NEXUS,
  REGIONS.CORE,
] as const;

export const REGION_DISPLAY_NAMES: Record<string, string> = {
  [REGIONS.PROLOGUE]: "Prologue",
  [REGIONS.ARRAY_PLAINS]: "Array Plains",
  [REGIONS.TWIN_RIVERS]: "Twin Rivers",
  [REGIONS.HASH_HIGHLANDS]: "Hash Highlands",
  [REGIONS.STACK_SPIRES]: "Stack Spires",
  [REGIONS.QUEUE_CANALS]: "Queue Canals",
  [REGIONS.TREE_CANOPY]: "Tree Canopy",
  [REGIONS.GRAPH_NEXUS]: "Graph Nexus",
  [REGIONS.CORE]: "The Core",
};

/** Maps persisted `player.region` to Phaser scene key (Continue / routing). */
export const SCENE_BY_REGION: Record<string, string> = {
  [REGIONS.PROLOGUE]: SCENE_KEYS.PROLOGUE,
  [REGIONS.ARRAY_PLAINS]: SCENE_KEYS.ARRAY_PLAINS,
  [REGIONS.TWIN_RIVERS]: SCENE_KEYS.TWIN_RIVERS,
  [REGIONS.HASH_HIGHLANDS]: SCENE_KEYS.HASH_HIGHLANDS,
  [REGIONS.STACK_SPIRES]: SCENE_KEYS.STACK_SPIRES,
  [REGIONS.QUEUE_CANALS]: SCENE_KEYS.QUEUE_CANALS,
  [REGIONS.TREE_CANOPY]: SCENE_KEYS.TREE_CANOPY,
  [REGIONS.GRAPH_NEXUS]: SCENE_KEYS.GRAPH_NEXUS,
  [REGIONS.CORE]: SCENE_KEYS.CORE,
};

export const FONTS = {
  RETRO: '"Press Start 2P", monospace',
  MONO: "monospace",
} as const;

/**
 * Unified camera tuning for consistent, responsive feel across all regions.
 * Lerp ~0.18 gives tight follow without jitter for 32px grid steps at 60fps.
 * Deadzone sized to ~1-1.5 tiles so small movements don't shake camera.
 */
export const CAMERA_TUNING = {
  // Bumped from 2.0 to 2.5 (Phase 13) after the brutal audit flagged the
  // player sprite as too small in overworld shots — old zoom read the
  // protagonist as ~16px tall in a 1280×800 frame. 2.5 = 25% bigger in
  // screen space; trade-off is 27% less visible world per camera, which
  // is fine for narrative overworlds with NPCs every 200-400 world-px.
  ZOOM: 2.5,
  FOLLOW_LERP: 0.18,
  DEADZONE_WIDTH: 80,
  DEADZONE_HEIGHT: 48,
} as const;
