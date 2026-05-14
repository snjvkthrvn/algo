import { describe, expect, it } from 'vitest';
import {
  CHAMBER_PUZZLE_THEME,
  PARCHMENT_PUZZLE_THEME,
  type PuzzleTheme,
} from './puzzleTheme';

describe('PuzzleTheme', () => {
  it('parchment preserves the legacy cream-on-dark chrome literal values', () => {
    // These exact bytes were the BasePuzzleScene defaults before themes were
    // introduced. If a refactor changes them, every later-region puzzle's
    // chrome shifts — this test catches that regression.
    expect(PARCHMENT_PUZZLE_THEME.frameFill).toBe(0xe0f8d0);
    expect(PARCHMENT_PUZZLE_THEME.frameOuterStroke).toBe(0x081820);
    expect(PARCHMENT_PUZZLE_THEME.frameOuterStrokeAlpha).toBe(0.9);
    expect(PARCHMENT_PUZZLE_THEME.frameInnerStroke).toBe(0x346856);
    expect(PARCHMENT_PUZZLE_THEME.titleColor).toBe('#081820');
    expect(PARCHMENT_PUZZLE_THEME.titlePanelFill).toBe(0xe0f8d0);
    expect(PARCHMENT_PUZZLE_THEME.scanlineAlpha).toBe(0.08);
  });

  it('chamber uses a darker play surface and a cyan-led palette', () => {
    expect(CHAMBER_PUZZLE_THEME.frameFill).not.toBe(PARCHMENT_PUZZLE_THEME.frameFill);
    expect(CHAMBER_PUZZLE_THEME.frameFillAlpha).toBeLessThan(PARCHMENT_PUZZLE_THEME.frameFillAlpha);
    expect(CHAMBER_PUZZLE_THEME.cornerAccent).toBe(0x06b6d4);
    expect(CHAMBER_PUZZLE_THEME.titleColor).toBe('#e0f8d0');
    // Surface is darker, so scanline overlay is reduced — preserves CRT cue
    // without mudding contrast.
    expect(CHAMBER_PUZZLE_THEME.scanlineAlpha).toBeLessThan(PARCHMENT_PUZZLE_THEME.scanlineAlpha);
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
