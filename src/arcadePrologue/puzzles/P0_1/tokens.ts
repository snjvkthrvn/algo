/**
 * Visual system tokens.
 *
 * SCALE maps the imported 960x540 arcade-prologue layout onto Algorithmia's
 * 1280x720 logical stage. Real hi-DPI / 4K crispness is handled globally by
 * Phaser's render-resolution config so the rest of the game keeps its stable
 * coordinate system.
 */

export const SCALE = 1280 / 960;

export const s = (n: number): number => n * SCALE;
export const px = (n: number): string => `${Math.round(n * SCALE)}px`;

export const STAGE = { width: Math.round(960 * SCALE), height: Math.round(540 * SCALE) } as const;

export const HEX_RADIUS = 44 * SCALE;

// Cosmic-rune grid: 6×6 tiles, perspective-squashed for a 3/4 isometric feel.
export const GRID_COLS = 6;
export const GRID_ROWS = 6;
export const TILE_SIZE = 48 * SCALE;
export const TILE_GAP = 4 * SCALE;
export const PERSPECTIVE_Y = 0.82;

export const COLORS = {
  bg: {
    deep: 0x0a0420,
    fog: 0x1a0f3a,
  },
  surface: {
    glass: 0x0c1024,
    line: 0x2a3a6f,
  },
  text: {
    primary: '#e6ecff',
    muted: '#8896c4',
    accent: '#7dd3fc',
    warn: '#fca5a5',
  },
  accent: 0x7dd3fc,
  warn: 0xf87171,
  platform: {
    stone: 0x2a2a4a,
    stoneRim: 0x4a3a6a,
    runeEngrave: 0x6a5a9a,
  },
  tile: {
    dim: 0x1f1a35,
    dimEdge: 0x4a3a6a,
    lit: 0x06b6d4,
    litEdge: 0x67e8f9,
  },
  nebula: {
    purple: 0x6c52d6,
    magenta: 0xb04dd6,
    cyan: 0x2b8fd6,
  },
} as const;

const FAMILY_DISPLAY = '"Cinzel", Georgia, "Times New Roman", serif';
const FAMILY_BODY = '"Manrope", "Segoe UI", system-ui, sans-serif';

export const TYPE = {
  display: {
    fontFamily: FAMILY_DISPLAY,
    fontSize: px(22),
    fontStyle: 'bold',
    color: COLORS.text.primary,
  },
  eyebrow: {
    fontFamily: FAMILY_BODY,
    fontSize: px(11),
    fontStyle: 'bold',
    color: COLORS.text.accent,
    letterSpacing: 3 * SCALE,
  },
  body: {
    fontFamily: FAMILY_BODY,
    fontSize: px(13),
    fontStyle: 'normal',
    color: COLORS.text.muted,
  },
  micro: {
    fontFamily: FAMILY_BODY,
    fontSize: px(11),
    fontStyle: 'normal',
    color: COLORS.text.muted,
    letterSpacing: 1 * SCALE,
  },
} as const;

export const SPACING = {
  xs: 4 * SCALE,
  sm: 8 * SCALE,
  md: 12 * SCALE,
  lg: 16 * SCALE,
  xl: 24 * SCALE,
  xxl: 32 * SCALE,
  xxxl: 48 * SCALE,
} as const;
