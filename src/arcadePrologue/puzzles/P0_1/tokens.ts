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

export const COLORS = {
  bg: {
    deep: 0x05060c,
    fog: 0x10132a,
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
