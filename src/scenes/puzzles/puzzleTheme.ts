/**
 * Puzzle visual themes.
 *
 * BasePuzzleScene draws a uniform retro panel for every puzzle. Themes let a
 * subclass swap the chrome palette without overriding `createPuzzleFrame` or
 * `createTitleArea`. Themes:
 *
 *   - `parchment`    — the default dark console frame all later regions use.
 *   - `chamber`      — a darker teal frame used by the prologue chamber puzzles
 *                      (P0-1 / P0-2) so they read as on-stage encounters in the
 *                      Chamber of Flow rather than as separate cream-paper boards.
 *   - `prologue`     — full cosmic-void region theme (deep purple + cyan).
 *   - `array-plains` — pastoral farmstead region theme (warm wood + barn red + gold).
 *   - `twin-rivers`  — dual blue/orange rivers region theme.
 *
 * The three region themes drive the region-specific procedural backdrops
 * (`RegionBackdrop`), the BitCompanion stage (spark / byte / frame), and the
 * GlitchCorner palette.
 */

import { COLORS } from '../../config/constants';

export type PuzzleThemeId =
  | 'parchment'
  | 'chamber'
  | 'prologue'
  | 'array-plains'
  | 'twin-rivers';

export interface PuzzleTheme {
  readonly id: PuzzleThemeId;
  /** Inner play surface — drawn behind puzzle objects. */
  readonly frameFill: number;
  readonly frameFillAlpha: number;
  /** Outer 3px stroke. */
  readonly frameOuterStroke: number;
  readonly frameOuterStrokeAlpha: number;
  /** Inner 1px stroke. */
  readonly frameInnerStroke: number;
  readonly frameInnerStrokeAlpha: number;
  /** Color for the title-area panel + L-shaped corner accents. */
  readonly cornerAccent: number;
  /** Title text + body color. */
  readonly titleColor: string;
  readonly titleStroke: string;
  readonly bodyColor: string;
  readonly titlePanelFill: number;
  readonly titlePanelFrame: number;
  readonly titlePanelInner: number;
  readonly titlePanelAlpha: number;
  /** Scanline density alpha. Chamber lowers this since the surface is darker. */
  readonly scanlineAlpha: number;
}

export const PARCHMENT_PUZZLE_THEME: PuzzleTheme = {
  id: 'parchment',
  frameFill: 0x081820,
  frameFillAlpha: 0.64,
  frameOuterStroke: 0x346856,
  frameOuterStrokeAlpha: 0.9,
  frameInnerStroke: 0x88c070,
  frameInnerStrokeAlpha: 0.78,
  cornerAccent: COLORS.CYAN_GLOW,
  titleColor: '#e0f8d0',
  titleStroke: '#081820',
  bodyColor: '#88c070',
  titlePanelFill: 0x081820,
  titlePanelFrame: 0x346856,
  titlePanelInner: 0x88c070,
  titlePanelAlpha: 0.94,
  scanlineAlpha: 0.04,
};

export const CHAMBER_PUZZLE_THEME: PuzzleTheme = {
  id: 'chamber',
  frameFill: 0x0a1620,
  frameFillAlpha: 0.62,
  frameOuterStroke: 0x06b6d4,
  frameOuterStrokeAlpha: 0.85,
  frameInnerStroke: 0x346856,
  frameInnerStrokeAlpha: 0.55,
  cornerAccent: 0x06b6d4,
  titleColor: '#e0f8d0',
  titleStroke: '#0a1620',
  bodyColor: '#88c070',
  titlePanelFill: 0x0a1620,
  titlePanelFrame: 0x06b6d4,
  titlePanelInner: 0x346856,
  titlePanelAlpha: 0.86,
  scanlineAlpha: 0.04,
};

/**
 * Cosmic void — Prologue chamber.
 * Deep navy surface with cyan/purple accents. Used by P0-1 & P0-2.
 * Pairs with `RegionBackdrop.prologue` which paints drifting stars, the faint
 * hex grid, and a distant Watcher prism.
 */
export const PROLOGUE_PUZZLE_THEME: PuzzleTheme = {
  id: 'prologue',
  frameFill: 0x06061a,
  frameFillAlpha: 0.38,
  frameOuterStroke: 0x22d3ee,
  frameOuterStrokeAlpha: 0.7,
  frameInnerStroke: 0xa78bfa,
  frameInnerStrokeAlpha: 0.45,
  cornerAccent: 0x22d3ee,
  titleColor: '#e0f8d0',
  titleStroke: '#06061a',
  bodyColor: '#a7b8d9',
  titlePanelFill: 0x0d0a2a,
  titlePanelFrame: 0x22d3ee,
  titlePanelInner: 0xa78bfa,
  titlePanelAlpha: 0.82,
  scanlineAlpha: 0.08,
};

/**
 * Pastoral farmland — Array Plains.
 * Warm wood-tone chrome with barn-red + gold accents. Used by all AP puzzles.
 * Pairs with `RegionBackdrop.arrayPlains` which paints sky, sun, distant
 * windmill, barn, swaying wheat, drifting motes.
 */
export const ARRAY_PLAINS_PUZZLE_THEME: PuzzleTheme = {
  id: 'array-plains',
  frameFill: 0x2a1c0a,
  frameFillAlpha: 0.30,
  frameOuterStroke: 0x6a4220,
  frameOuterStrokeAlpha: 0.85,
  frameInnerStroke: 0xf5b820,
  frameInnerStrokeAlpha: 0.55,
  cornerAccent: 0xf5b820,
  titleColor: '#f0e4c2',
  titleStroke: '#2a1c0a',
  bodyColor: '#f0e4c2',
  titlePanelFill: 0x6a4220,
  titlePanelFrame: 0x2a1c0a,
  titlePanelInner: 0xf5b820,
  titlePanelAlpha: 0.92,
  scanlineAlpha: 0.03,
};

/**
 * Twin Rivers — dual blue/orange rivers + wooden bridge.
 * Pairs with `RegionBackdrop.twinRivers` which paints sky, the two flowing
 * rivers (or a single converged river depending on puzzle), banks with willow
 * and palm, drifting leaves.
 */
export const TWIN_RIVERS_PUZZLE_THEME: PuzzleTheme = {
  id: 'twin-rivers',
  frameFill: 0x1a1208,
  frameFillAlpha: 0.20,
  frameOuterStroke: 0x5a3a1a,
  frameOuterStrokeAlpha: 0.85,
  frameInnerStroke: 0xf5b820,
  frameInnerStrokeAlpha: 0.55,
  cornerAccent: 0xf5b820,
  titleColor: '#f0e4c2',
  titleStroke: '#1a1208',
  bodyColor: '#f0e4c2',
  titlePanelFill: 0x1a1208,
  titlePanelFrame: 0x5a3a1a,
  titlePanelInner: 0xf5b820,
  titlePanelAlpha: 0.92,
  scanlineAlpha: 0.03,
};
