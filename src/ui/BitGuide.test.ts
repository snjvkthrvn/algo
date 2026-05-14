import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  BitGuide,
  BIT_GUIDE_COLORS,
  colorableFromFillStyle,
  colorableFromTint,
  type BitGuideTarget,
  type ColorableTarget,
} from './BitGuide';
import { gameState } from '../core/GameStateManager';
import { BitMood } from '../data/types';

const makeColorable = (): ColorableTarget & { applied: number[]; reset: number } => {
  const state = { applied: [] as number[], reset: 0 };
  return {
    applyColor: (color: number) => { state.applied.push(color); },
    resetColor: () => { state.reset += 1; },
    get applied() { return state.applied; },
    get reset() { return state.reset; },
  };
};

interface FakeTween {
  stop: () => void;
  stopped: boolean;
}

const makeFakeScene = () => {
  const tweens: FakeTween[] = [];
  const timers: { delay: number; fn: () => void; destroyed: boolean }[] = [];
  return {
    tweens: tweens,
    timers: timers,
    fakeScene: {
      tweens: {
        add: (cfg: Record<string, unknown>) => {
          const tween: FakeTween = {
            stopped: false,
            stop() { this.stopped = true; },
          };
          tweens.push(tween);
          // Apply final-value props to targets so subsequent steps see the
          // post-tween state (mirrors what Phaser does at tween completion).
          const targets = Array.isArray(cfg.targets) ? cfg.targets : [cfg.targets];
          const propKeys = ['x', 'y', 'alpha', 'scaleX', 'scaleY'];
          for (const t of targets as Record<string, unknown>[]) {
            for (const key of propKeys) {
              if (key in cfg) t[key] = cfg[key];
            }
          }
          (cfg.onUpdate as ((t: { progress: number }) => void) | undefined)?.({ progress: 1 });
          (cfg.onComplete as (() => void) | undefined)?.();
          return tween;
        },
      },
      time: {
        delayedCall: (delay: number, fn: () => void) => {
          const t = { delay, fn, destroyed: false, destroy() { this.destroyed = true; } };
          timers.push(t);
          fn(); // synchronous fire for deterministic test
          return t;
        },
      },
    },
  };
};

const makeAnchor = () => {
  const state = { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, scrollFactorX: 1, scrollFactorY: 1 };
  return Object.assign(state, {
    setAlpha(a: number) { state.alpha = a; return this; },
    setScrollFactor() { return this; },
    setScale(s: number) { state.scaleX = s; state.scaleY = s; return this; },
    setPosition(x: number, y: number) { state.x = x; state.y = y; return this; },
  });
};

const last = <T>(arr: readonly T[]): T | undefined => arr[arr.length - 1];

describe('BitGuide', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setBitMoodSpy: any;

  beforeEach(() => {
    setBitMoodSpy = vi.spyOn(gameState, 'setBitMood').mockImplementation(() => {});
  });

  afterEach(() => {
    setBitMoodSpy.mockRestore();
  });

  const setup = () => {
    const sceneEnv = makeFakeScene();
    const colorable = makeColorable();
    const anchor = makeAnchor();
    const target: BitGuideTarget = {
      scene: sceneEnv.fakeScene as unknown as Phaser.Scene,
      tweenAnchor: anchor as unknown as BitGuideTarget['tweenAnchor'],
      colorables: [colorable],
      baseColor: BIT_GUIDE_COLORS.neutral,
    };
    const guide = new BitGuide(target);
    return { guide, colorable, anchor, sceneEnv };
  };

  it('warm signal applies the warm color and emits HINT_WARM', () => {
    const { guide, colorable } = setup();
    guide.warm();
    expect(last(colorable.applied)).toBe(BIT_GUIDE_COLORS.warm);
    expect(setBitMoodSpy).toHaveBeenCalledWith(BitMood.HINT_WARM);
  });

  it('cold signal applies the cold color and emits HINT_COLD', () => {
    const { guide, colorable } = setup();
    guide.cold();
    expect(last(colorable.applied)).toBe(BIT_GUIDE_COLORS.cold);
    expect(setBitMoodSpy).toHaveBeenCalledWith(BitMood.HINT_COLD);
  });

  it('scared signal applies the scared color and reverts to neutral after the delay', () => {
    const { guide, colorable } = setup();
    guide.scared();
    expect(setBitMoodSpy).toHaveBeenCalledWith(BitMood.SCARED);
    // Fake scene fires delayedCall synchronously; revert should have run.
    expect(setBitMoodSpy).toHaveBeenLastCalledWith(BitMood.NEUTRAL);
    expect(colorable.reset).toBeGreaterThan(0);
  });

  it('celebrate signal applies the celebrate color and emits EXCITED', () => {
    const { guide, colorable } = setup();
    guide.celebrate();
    expect(colorable.applied).toContain(BIT_GUIDE_COLORS.celebrate);
    expect(setBitMoodSpy).toHaveBeenCalledWith(BitMood.EXCITED);
  });

  it('neutral resets the color and emits NEUTRAL', () => {
    const { guide, colorable } = setup();
    guide.warm();
    guide.neutral();
    expect(colorable.reset).toBeGreaterThan(0);
    expect(setBitMoodSpy).toHaveBeenLastCalledWith(BitMood.NEUTRAL);
  });

  it('switching from warm to cold cancels the prior tween', () => {
    const { guide, sceneEnv } = setup();
    guide.warm();
    const warmTween = last(sceneEnv.tweens)!;
    expect(warmTween.stopped).toBe(false);
    guide.cold();
    expect(warmTween.stopped).toBe(true);
  });

  it('sequenceGuide visits every waypoint and reports each via onArrive', () => {
    const { guide, anchor } = setup();
    const arrivals: number[] = [];
    const waypoints = [
      { x: 100, y: 50 },
      { x: 200, y: 50 },
      { x: 300, y: 50 },
    ];
    guide.sequenceGuide(waypoints, { onArrive: (i) => arrivals.push(i) });
    expect(arrivals).toEqual([0, 1, 2]);
    expect(anchor.x).toBe(300);
  });

  it('mappingGuide tweens from the source to the destination', () => {
    const { guide, anchor } = setup();
    let arrived = false;
    guide.mappingGuide({ x: 50, y: 100 }, { x: 250, y: 100 }, { onArrive: () => { arrived = true; } });
    expect(anchor.x).toBe(250);
    expect(arrived).toBe(true);
  });

  it('destroy cancels active tweens', () => {
    const { guide, sceneEnv } = setup();
    guide.warm();
    const tween = last(sceneEnv.tweens)!;
    guide.destroy();
    expect(tween.stopped).toBe(true);
  });
});

describe('colorable adapters', () => {
  it('colorableFromFillStyle forwards applyColor and resetColor with base color', () => {
    const calls: Array<{ color: number; alpha: number | undefined }> = [];
    const obj = { setFillStyle: (color: number, alpha?: number) => { calls.push({ color, alpha }); } };
    const c = colorableFromFillStyle(obj, 0x111111, 0.5);
    c.applyColor(0xff0000);
    c.applyColor(0x00ff00, 0.9);
    c.resetColor();
    expect(calls).toEqual([
      { color: 0xff0000, alpha: 0.5 },
      { color: 0x00ff00, alpha: 0.9 },
      { color: 0x111111, alpha: 0.5 },
    ]);
  });

  it('colorableFromTint forwards applyColor as setTint and resetColor as clearTint', () => {
    const ops: string[] = [];
    const obj = {
      setTint: (color: number) => { ops.push(`tint:${color.toString(16)}`); },
      clearTint: () => { ops.push('clear'); },
    };
    const c = colorableFromTint(obj);
    c.applyColor(0xfbbf24);
    c.resetColor();
    expect(ops).toEqual(['tint:fbbf24', 'clear']);
  });
});
