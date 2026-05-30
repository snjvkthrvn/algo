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

  // ── Round-5 chrome unification ──────────────────────────────────────
  // The HUD buttons + status badge + bottom hint bar were previously
  // hardcoded to global COLORS.GOLD_ACCENT / .ERROR / .FRAME_BORDER_LIGHT
  // — so AP and TR both got the same cyan-and-gold sci-fi corners
  // regardless of region. These fields let each region's chrome cohere
  // with its backdrop palette so the whole scene flows.

  /** HINT button background colour (was always COLORS.GOLD_ACCENT). */
  readonly hudHintButton: number;
  /** EXIT button background colour (was always COLORS.ERROR red). */
  readonly hudExitButton: number;
  /** READY status badge — fill / frame / inner / accent-dot. */
  readonly hudStatusFill: number;
  readonly hudStatusFrame: number;
  readonly hudStatusInner: number;
  readonly hudStatusDot: number;
  /** Bottom keyboard-hint strip — fill / frame / inner / top accent. */
  readonly hudHintStripFill: number;
  readonly hudHintStripFrame: number;
  readonly hudHintStripInner: number;
  readonly hudHintStripAccent: number;
  /** Title panel top-edge accent (was hardcoded COLORS.CYAN_GLOW). */
  readonly titlePanelAccent: number;

  // ── Round-6 backdrop treatment ──────────────────────────────────────
  // The painted region backdrops render at full brightness + full detail,
  // so gameplay tiles/cards sat on top of them like stickers on a photo
  // ("looks like a kid just put things together"). A gentle flat darken
  // (region-tinted) + a shared radial vignette pushes the painted scene
  // BACK so the central playfield reads as the focal layer — the single
  // atmospheric move that unifies every puzzle screen so it flows as one
  // composition rather than backdrop + foreground stickers.

  /** Flat darken overlay colour laid over the whole backdrop. */
  readonly backdropDarken: number;
  /** Flat darken alpha. 0 disables the darken (later regions opt out). */
  readonly backdropDarkenAlpha: number;
  /** Radial vignette opacity (0 disables; 1 = full texture alpha). */
  readonly backdropVignetteAlpha: number;
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
  // Backward-compat: legacy default chrome (cyan/gold sci-fi look).
  hudHintButton: COLORS.GOLD_ACCENT,
  hudExitButton: COLORS.ERROR,
  hudStatusFill: COLORS.ERROR,
  hudStatusFrame: COLORS.FRAME_BORDER_LIGHT,
  hudStatusInner: COLORS.WARNING,
  hudStatusDot: COLORS.SUCCESS,
  hudHintStripFill: COLORS.ERROR,
  hudHintStripFrame: COLORS.FRAME_BORDER_LIGHT,
  hudHintStripInner: COLORS.SUCCESS,
  hudHintStripAccent: COLORS.CYAN_GLOW,
  titlePanelAccent: COLORS.CYAN_GLOW,
  // Later regions keep the raw frame backdrop (no painted region scene to
  // push back), so the treatment is a no-op here.
  backdropDarken: 0x05070e,
  backdropDarkenAlpha: 0,
  backdropVignetteAlpha: 0,
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
  // Chamber chrome: cyan-on-deep-navy (legacy chamber feel).
  hudHintButton: 0x06b6d4,
  hudExitButton: 0xa03830,
  hudStatusFill: 0x0a1620,
  hudStatusFrame: 0x06b6d4,
  hudStatusInner: 0x346856,
  hudStatusDot: 0x88c070,
  hudHintStripFill: 0x0a1620,
  hudHintStripFrame: 0x06b6d4,
  hudHintStripInner: 0x346856,
  hudHintStripAccent: 0x06b6d4,
  titlePanelAccent: 0x06b6d4,
  backdropDarken: 0x05070e,
  backdropDarkenAlpha: 0,
  backdropVignetteAlpha: 0,
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
  // Round-5 cosmic chrome: cyan primary, purple accent. Status dot stays
  // cyan-pulse to match the chamber's mandala glow.
  hudHintButton: 0xa78bfa,
  hudExitButton: 0x4a2e8c,
  hudStatusFill: 0x0d0a2a,
  hudStatusFrame: 0x22d3ee,
  hudStatusInner: 0xa78bfa,
  hudStatusDot: 0x22d3ee,
  hudHintStripFill: 0x0d0a2a,
  hudHintStripFrame: 0x22d3ee,
  hudHintStripInner: 0xa78bfa,
  hudHintStripAccent: 0x22d3ee,
  titlePanelAccent: 0x22d3ee,
  // Cosmic void benefits from the strongest vignette — it reads as the
  // dark of space closing in around the lit chamber.
  backdropDarken: 0x06061a,
  backdropDarkenAlpha: 0.18,
  backdropVignetteAlpha: 1.0,
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
  // Round-5: frame fill 0.30 → 0.10. The painted farm backdrop now dominates;
  // the frame is a quiet "this is the puzzle area" hint, not a chrome slab.
  frameFillAlpha: 0.10,
  frameOuterStroke: 0x6a4220,
  // Stroke alphas softened so the play area blends into the painted scene
  // instead of being rectangle-fenced.
  frameOuterStrokeAlpha: 0.45,
  frameInnerStroke: 0xf5b820,
  frameInnerStrokeAlpha: 0.25,
  cornerAccent: 0xf5b820,
  titleColor: '#f0e4c2',
  titleStroke: '#2a1c0a',
  bodyColor: '#f0e4c2',
  titlePanelFill: 0x6a4220,
  titlePanelFrame: 0x2a1c0a,
  titlePanelInner: 0xf5b820,
  // Round-5: title panel alpha dropped 0.92 → 0.68 so the painted farm
  // backdrop bleeds through. The user critiqued the prior solid brown slab
  // as "kid put things together" — making the chrome translucent dissolves
  // the panel-as-separate-object feel and lets the scene flow as one
  // composition (backdrop + crates + quiet chrome).
  titlePanelAlpha: 0.68,
  // Round-5: scanlines dropped to 0 — the painted farm backdrop doesn't
  // benefit from a CRT-overlay, and the scanlines dampened the wood grain
  // + sun-lit crop colours the round-4 backdrop fix unlocked.
  scanlineAlpha: 0,
  // Round-5 farmstead chrome: wood + brass everywhere. Replaces the prior
  // hardcoded cyan-gold corners that made AP look like sci-fi-farm chimera.
  // Status indicator + bottom hint strip both inherit the same wood tones
  // as the title panel so the chrome reads as one carved sign system.
  hudHintButton: 0xf5b820,   // brass/gold — hint as a "treasure" tone
  hudExitButton: 0xa03830,   // barn-red — exit as the "danger" tone
  hudStatusFill: 0x6a4220,
  hudStatusFrame: 0x2a1c0a,
  hudStatusInner: 0xf5b820,
  hudStatusDot: 0xc89858,    // warm-wood pulse instead of cyan
  hudHintStripFill: 0x6a4220,
  hudHintStripFrame: 0x2a1c0a,
  hudHintStripInner: 0xf5b820,
  hudHintStripAccent: 0xf5b820,
  titlePanelAccent: 0xf5b820,
  // Warm-dark darken keeps the sun-lit farm cheerful while pushing it back;
  // the vignette funnels the eye to the central crates/buckets/tiles.
  backdropDarken: 0x140f06,
  backdropDarkenAlpha: 0.22,
  backdropVignetteAlpha: 0.9,
};

/**
 * Twin Rivers — dual blue/orange rivers + wooden bridge.
 * Pairs with `RegionBackdrop.twinRivers` which paints sky, the two flowing
 * rivers (or a single converged river depending on puzzle), banks with willow
 * and palm, drifting leaves.
 */
export const TWIN_RIVERS_PUZZLE_THEME: PuzzleTheme = {
  id: 'twin-rivers',
  // Round-5: stone-and-cyan chrome to match the riverside LessonCard
  // variant + the painted twin_rivers backdrop. The prior wood-brown +
  // gold values were a hand-me-down from Array Plains and made TR feel
  // like Array Plains with a swap-in backdrop.
  frameFill: 0x132028,
  // Round-5: frame fill 0.20 → 0.08 + stroke alphas softened. The painted
  // river dominates, the puzzle frame is now a barely-there hint.
  frameFillAlpha: 0.08,
  frameOuterStroke: 0x355168,
  frameOuterStrokeAlpha: 0.42,
  frameInnerStroke: 0x22d3ee,
  frameInnerStrokeAlpha: 0.22,
  cornerAccent: 0x22d3ee,
  titleColor: '#d6e1e8',
  titleStroke: '#132028',
  bodyColor: '#d6e1e8',
  titlePanelFill: 0x132028,
  titlePanelFrame: 0x355168,
  titlePanelInner: 0x22d3ee,
  // Round-5: same translucency treatment as Array Plains — the painted
  // river breathes through the chrome instead of being slabbed over.
  titlePanelAlpha: 0.62,
  // Round-5: scanlines off on the painted river — same reasoning as AP.
  scanlineAlpha: 0,
  // Riverside chrome: weathered stone panels + cyan rune accents. Matches
  // the riverside LessonCard variant + the dock_node sprite's wood-ring +
  // cyan rune motif.
  hudHintButton: 0x22d3ee,   // river-cyan — hint as the "guiding glow" tone
  hudExitButton: 0x8c5a2e,   // weathered bridge wood — exit as the "step back to land" tone
  hudStatusFill: 0x132028,
  hudStatusFrame: 0x355168,
  hudStatusInner: 0x22d3ee,
  hudStatusDot: 0x22d3ee,
  hudHintStripFill: 0x132028,
  hudHintStripFrame: 0x355168,
  hudHintStripInner: 0x22d3ee,
  hudHintStripAccent: 0x22d3ee,
  titlePanelAccent: 0x22d3ee,
  // Cool-dark darken deepens the river; the vignette frames the central
  // crossing/dock so the bridge gameplay reads as the focal layer.
  backdropDarken: 0x08121a,
  backdropDarkenAlpha: 0.20,
  backdropVignetteAlpha: 0.9,
};
