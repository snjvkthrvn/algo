import { describe, expect, it } from 'vitest';
import { PROLOGUE_CAMERA_TUNING } from './cameraTuning';

describe('prologue camera tuning', () => {
  it('uses smooth follow settings for smooth movement tracking', () => {
    // Zoom is intentionally Pokemon-style (roughly 2×) so the player reads as
    // the focal point; stay under 2.5 to avoid losing surrounding context.
    expect(PROLOGUE_CAMERA_TUNING.zoom).toBeGreaterThanOrEqual(1.5);
    expect(PROLOGUE_CAMERA_TUNING.zoom).toBeLessThanOrEqual(2.5);
    expect(PROLOGUE_CAMERA_TUNING.followLerpX).toBeLessThanOrEqual(0.2);
    expect(PROLOGUE_CAMERA_TUNING.followLerpY).toBeLessThanOrEqual(0.2);
    expect(PROLOGUE_CAMERA_TUNING.deadzoneWidth).toBeGreaterThan(0);
    expect(PROLOGUE_CAMERA_TUNING.deadzoneHeight).toBeGreaterThan(0);
  });

  it('keeps atmospheric redraws cheaper than one repaint per frame', () => {
    expect(PROLOGUE_CAMERA_TUNING.starCount).toBeLessThan(120);
    expect(PROLOGUE_CAMERA_TUNING.starRedrawIntervalMs).toBeGreaterThanOrEqual(80);
    expect(PROLOGUE_CAMERA_TUNING.moteFrequencyMs).toBeGreaterThan(200);
  });
});
