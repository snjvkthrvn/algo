import { describe, expect, it } from 'vitest';
import {
  CHAMBER_PUZZLE_THEME,
  PARCHMENT_PUZZLE_THEME,
  type PuzzleTheme,
} from './puzzleTheme';

describe('PuzzleTheme', () => {
  it('parchment now owns the default dark console chrome literal values', () => {
    // These exact bytes are the BasePuzzleScene defaults for later-region
    // puzzles. If a refactor changes them, the shared puzzle HUD shifts.
    expect(PARCHMENT_PUZZLE_THEME.frameFill).toBe(0x081820);
    expect(PARCHMENT_PUZZLE_THEME.frameOuterStroke).toBe(0x346856);
    expect(PARCHMENT_PUZZLE_THEME.frameOuterStrokeAlpha).toBe(0.9);
    expect(PARCHMENT_PUZZLE_THEME.frameInnerStroke).toBe(0x88c070);
    expect(PARCHMENT_PUZZLE_THEME.titleColor).toBe('#e0f8d0');
    expect(PARCHMENT_PUZZLE_THEME.titlePanelFill).toBe(0x081820);
    expect(PARCHMENT_PUZZLE_THEME.scanlineAlpha).toBe(0.04);
  });

  it('chamber uses a darker play surface and a cyan-led palette', () => {
    expect(CHAMBER_PUZZLE_THEME.frameFill).not.toBe(PARCHMENT_PUZZLE_THEME.frameFill);
    expect(CHAMBER_PUZZLE_THEME.frameFillAlpha).toBeLessThan(PARCHMENT_PUZZLE_THEME.frameFillAlpha);
    expect(CHAMBER_PUZZLE_THEME.cornerAccent).toBe(0x06b6d4);
    expect(CHAMBER_PUZZLE_THEME.titleColor).toBe('#e0f8d0');
    // Both dark themes keep scanlines low enough to preserve text contrast.
    expect(CHAMBER_PUZZLE_THEME.scanlineAlpha).toBe(PARCHMENT_PUZZLE_THEME.scanlineAlpha);
  });

  it('exposes a stable id discriminant per theme', () => {
    expect(PARCHMENT_PUZZLE_THEME.id).toBe('parchment');
    expect(CHAMBER_PUZZLE_THEME.id).toBe('chamber');
  });

  it('every PuzzleTheme key is populated for both themes', () => {
    const requiredKeys: Array<keyof PuzzleTheme> = [
      'id',
      'frameFill',
      'frameFillAlpha',
      'frameOuterStroke',
      'frameOuterStrokeAlpha',
      'frameInnerStroke',
      'frameInnerStrokeAlpha',
      'cornerAccent',
      'titleColor',
      'titleStroke',
      'bodyColor',
      'titlePanelFill',
      'titlePanelFrame',
      'titlePanelInner',
      'titlePanelAlpha',
      'scanlineAlpha',
    ];
    for (const key of requiredKeys) {
      expect(PARCHMENT_PUZZLE_THEME[key], `parchment.${key}`).toBeDefined();
      expect(CHAMBER_PUZZLE_THEME[key], `chamber.${key}`).toBeDefined();
    }
  });
});
