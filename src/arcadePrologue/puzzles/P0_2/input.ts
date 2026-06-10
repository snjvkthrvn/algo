import Phaser from 'phaser';
import type { FlowBoard } from './board';
import { GamepadActionBridge } from '../../../input/GamepadActionBridge';

export type FlowInputHandlers = {
  onReplay: () => void;
  onToggleReduceMotion: () => void;
};

export function bindFlowInput(scene: Phaser.Scene, h: FlowInputHandlers): () => void {
  const kb = scene.input.keyboard!;
  const codes = Phaser.Input.Keyboard.KeyCodes;
  const r = kb.addKey(codes.R);
  const m = kb.addKey(codes.M);
  r.on('down', h.onReplay);
  m.on('down', h.onToggleReduceMotion);
  return (): void => {
    r.removeAllListeners();
    m.removeAllListeners();
  };
}

type DirectionBinding = readonly [eventName: string, x: number, y: number];

const DIRECTION_BINDINGS: DirectionBinding[] = [
  ['keydown-LEFT', -1, 0],
  ['keydown-A', -1, 0],
  ['keydown-RIGHT', 1, 0],
  ['keydown-D', 1, 0],
  ['keydown-UP', 0, -1],
  ['keydown-W', 0, -1],
  ['keydown-DOWN', 0, 1],
  ['keydown-S', 0, 1],
];

export function bindDirectionalChoiceInput(
  scene: Phaser.Scene,
  board: FlowBoard,
  currentKey: string,
  choices: readonly string[],
  onChoose: (key: string) => void,
): () => void {
  const kb = scene.input.keyboard;
  const current = board.glyphs.get(currentKey);
  if (!kb || !current) return () => {};

  const chooseToward = (dirX: number, dirY: number): void => {
    let bestKey: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const key of choices) {
      const glyph = board.glyphs.get(key);
      if (!glyph) continue;
      const dx = glyph.x - current.x;
      const dy = glyph.y - current.y;
      const distance = Math.hypot(dx, dy) || 1;
      const score = (dx / distance) * dirX + (dy / distance) * dirY;
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    if (bestKey && bestScore > 0.25) onChoose(bestKey);
  };

  const handlers = DIRECTION_BINDINGS.map(([eventName, x, y]) => {
    const handler = (): void => chooseToward(x, y);
    kb.on(eventName, handler);
    return [eventName, handler] as const;
  });
  const gamepad = new GamepadActionBridge(scene, {
    left: () => chooseToward(-1, 0),
    right: () => chooseToward(1, 0),
    up: () => chooseToward(0, -1),
    down: () => chooseToward(0, 1),
  });

  return (): void => {
    handlers.forEach(([eventName, handler]) => kb.off(eventName, handler));
    gamepad.destroy();
  };
}
