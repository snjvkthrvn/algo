import Phaser from 'phaser';
import { COLORS, HEX_RADIUS, s } from '../../P0_1/tokens';
import { coordsOf, type FlowBoard } from '../board';

/**
 * Reactive pulse runner.
 *
 * Fires a pulse from `sourceKey` and traverses outgoing edges one at a time.
 * At a fork node, calls `decideAtFork` and awaits the player's choice.
 * If `decideAtFork` returns null (timeout), the pulse fizzles in place.
 * Returns the outcome and the full visited node sequence (source first).
 */

const STEP_MS = 320;
const FADE_MS = 240;

export type ReactiveOutcome = {
  outcome: 'reached' | 'dead-end' | 'timeout';
  finalKey: string;
  visited: string[];
};

export type ReactiveOptions = {
  sourceKey: string;
  sinkKey: string;
  /** outgoing edges per node */
  outMap: Map<string, string[]>;
  /** nodes that should pause and await a choice */
  forkKeys: Set<string>;
  decideAtFork: (currentKey: string, choices: string[]) => Promise<string | null>;
  onArrive?: (key: string) => void;
};

export type Pulse = {
  fireReactive(board: FlowBoard, options: ReactiveOptions): Promise<ReactiveOutcome>;
};

/** Optional dressing — the ghost replay runs a spectral, faded pulse. */
export type PulseStyle = { color?: number; alpha?: number };

export function createPulse(scene: Phaser.Scene, style: PulseStyle = {}): Pulse {
  const color = style.color ?? COLORS.accent;
  const alpha = style.alpha ?? 1;
  async function fireReactive(
    board: FlowBoard,
    options: ReactiveOptions,
  ): Promise<ReactiveOutcome> {
    const start = coordsOf(board, options.sourceKey);
    const dot = scene.add
      .circle(start.x, start.y, s(6), color, alpha)
      .setStrokeStyle(s(2), color, 0.35 * alpha)
      .setDepth(11);
    const halo = scene.add
      .circle(start.x, start.y, s(13), color, 0.18 * alpha)
      .setDepth(10);

    let waitTween: Phaser.Tweens.Tween | undefined;
    const startWait = (): void => {
      waitTween?.stop();
      waitTween = scene.tweens.add({
        targets: dot,
        scale: { from: 1, to: 1.22 },
        duration: 320,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };
    const stopWait = (): void => {
      waitTween?.stop();
      waitTween = undefined;
      dot.setScale(1);
    };

    const moveTo = (target: Phaser.Math.Vector2): Promise<void> =>
      new Promise((resolve) => {
        scene.tweens.add({
          targets: [dot, halo],
          x: target.x,
          y: target.y,
          duration: STEP_MS,
          ease: 'Cubic.easeInOut',
          onComplete: () => resolve(),
        });
      });

    const cleanup = (): Promise<void> =>
      new Promise((resolve) => {
        stopWait();
        scene.tweens.add({
          targets: [dot, halo],
          alpha: 0,
          duration: FADE_MS,
          ease: 'Sine.easeIn',
          onComplete: () => {
            dot.destroy();
            halo.destroy();
            resolve();
          },
        });
      });

    const visited: string[] = [options.sourceKey];
    let current = options.sourceKey;

    while (current !== options.sinkKey) {
      const outs = options.outMap.get(current) ?? [];
      if (outs.length === 0) {
        await cleanup();
        return { outcome: 'dead-end', finalKey: current, visited };
      }

      let next: string | null;
      if (outs.length === 1 || !options.forkKeys.has(current)) {
        next = outs[0]!;
      } else {
        startWait();
        next = await options.decideAtFork(current, outs);
        stopWait();
        if (next === null) {
          await cleanup();
          return { outcome: 'timeout', finalKey: current, visited };
        }
      }

      await moveTo(coordsOf(board, next));
      visited.push(next);
      options.onArrive?.(next);
      current = next;
    }

    await cleanup();
    return { outcome: 'reached', finalKey: current, visited };
  }

  return { fireReactive };
}

/** Choice highlight rings around legal fork choices. Caller destroys them. */
export function highlightChoices(
  scene: Phaser.Scene,
  board: FlowBoard,
  choiceKeys: string[],
): Phaser.GameObjects.GameObject[] {
  return choiceKeys.map((key) => {
    const at = coordsOf(board, key);
    const ring = scene.add
      .circle(at.x, at.y, HEX_RADIUS + s(6), 0, 0)
      .setStrokeStyle(s(2.6), COLORS.accent, 0.95)
      .setDepth(11);
    scene.tweens.add({
      targets: ring,
      scale: { from: 1, to: 1.08 },
      alpha: { from: 0.95, to: 0.55 },
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return ring;
  });
}

export function clearHighlights(
  scene: Phaser.Scene,
  rings: Phaser.GameObjects.GameObject[],
): void {
  rings.forEach((r) => {
    scene.tweens.killTweensOf(r);
    r.destroy();
  });
}
