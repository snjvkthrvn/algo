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

  // UI colors
  SUCCESS: 0x22c55e,
  ERROR: 0xef4444,
  WARNING: 0xf97316,

  // Text colors
  TEXT_LIGHT: 0xffffff,
  TEXT_MUTED: 0x9ca3af,
  TEXT_DARK: 0x4a5568,

  // Frame colors
  FRAME_BG: 0x1a1a2e,
  FRAME_BORDER: 0x4a4a6a,
  FRAME_BORDER_LIGHT: 0x7a7aaa,
  FRAME_BORDER_DARK: 0x2a2a4a,
  OVERLAY_BG: 0x0a0a14,
} as const;

export const REGIONS = {
  PROLOGUE: 'prologue',
  ARRAY_PLAINS: 'array_plains',
  TWIN_RIVERS: 'twin_rivers',
} as const;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  PROLOGUE: 'PrologueScene',
  PUZZLE_P0_1: 'P0_1_FollowThePath',
  PUZZLE_P0_2: 'P0_2_FlowConsoles',
  BOSS_SENTINEL: 'Boss_Sentinel',
  CONCEPT_BRIDGE: 'ConceptBridgeScene',
  CODEX: 'CodexScene',
} as const;

export const FONTS = {
  RETRO: '"Press Start 2P", monospace',
  MONO: 'monospace',
} as const;
