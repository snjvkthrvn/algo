/**
 * Puzzle visual themes.
 *
 * BasePuzzleScene draws a uniform retro panel for every puzzle. Themes let a
 * subclass swap the chrome palette without overriding `createPuzzleFrame` or
 * `createTitleArea`. Two themes exist today:
 *
 *   - `parchment` — the default cream-on-dark frame all later regions use.
 *   - `chamber`   — a darker teal frame used by the prologue chamber puzzles
 *                   (P0-1 / P0-2) so they read as on-stage encounters in the
 *                   Chamber of Flow rather than as separate cream-paper boards.
 */

import { COLORS } from '../../config/constants';

export interface PuzzleTheme {
  readonly id: 'parchment' | 'chamber';
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
  frameFill: 0xe0f8d0,
  frameFillAlpha: 1,
  frameOuterStroke: 0x081820,
  frameOuterStrokeAlpha: 0.9,
  frameInnerStroke: 0x346856,
  frameInnerStrokeAlpha: 0.78,
  cornerAccent: COLORS.SUCCESS,
  titleColor: '#081820',
  titleStroke: '#e0f8d0',
  bodyColor: '#081820',
  titlePanelFill: 0xe0f8d0,
  titlePanelFrame: 0x081820,
  titlePanelInner: 0x346856,
  titlePanelAlpha: 0.94,
  scanlineAlpha: 0.08,
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
