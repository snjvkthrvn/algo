import Phaser from 'phaser';
import { PROLOGUE_SHEET_KEYS, VISUAL_REVAMP_KEYS } from '../../../../config/assets';
import { COLORS, s, STAGE } from '../tokens';
import { cellToWorld, gridOrigin, GRID_BOUNDS } from '../gridLayout';
import type { Cell } from '../rounds';

/**
 * Actors that stand on or around the cosmic-rune platform:
 *  - the player pawn (walks the path)
 *  - their wisp companion (Bit-equivalent, drifts behind them)
 *  - the Rune Keeper NPC (hooded sentinel beside the platform)
 *
 * Phase 1 reuses the overworld player walk sheet at a smaller scale. Phase 2
 * may introduce a puzzle-scale variant; this module is the seam where those
 * texture keys would swap.
 */

const PAWN_SCALE = 0.18;
const PAWN_STEP_MS = 220;

const FRAME_RATE = 16;
const ANIMS = {
  idle: { down: 'p0_1_pawn_idle_down', left: 'p0_1_pawn_idle_left', right: 'p0_1_pawn_idle_right', up: 'p0_1_pawn_idle_up' },
  walk: { down: 'p0_1_pawn_walk_down', left: 'p0_1_pawn_walk_left', right: 'p0_1_pawn_walk_right', up: 'p0_1_pawn_walk_up' },
} as const;

type Direction = 'up' | 'down' | 'left' | 'right';

export type Pawn = {
  sprite: Phaser.GameObjects.Sprite;
  setCell(col: number, row: number): void;
  stepTo(col: number, row: number, onArrive?: () => void): void;
  face(direction: Direction): void;
  destroy(): void;
};

export function createPlayerPawn(scene: Phaser.Scene, start: Cell): Pawn {
  ensureAnimations(scene);

  const startPos = cellToWorld(start.col, start.row);

  const shadow = scene.add
    .ellipse(startPos.x, startPos.y + s(8), s(18), s(6), 0x000000, 0.45)
    .setDepth(8.5);

  const sprite = scene.add
    .sprite(startPos.x, startPos.y - s(2), PROLOGUE_SHEET_KEYS.PLAYER, 0)
    .setDepth(9)
    .setScale(PAWN_SCALE);
  sprite.anims.play(ANIMS.idle.down);

  let activeTween: Phaser.Tweens.Tween | null = null;

  function setCell(col: number, row: number): void {
    const pos = cellToWorld(col, row);
    sprite.setPosition(pos.x, pos.y - s(2));
    shadow.setPosition(pos.x, pos.y + s(8));
  }

  function face(direction: Direction): void {
    sprite.anims.play(ANIMS.idle[direction], true);
  }

  function stepTo(col: number, row: number, onArrive?: () => void): void {
    const target = cellToWorld(col, row);
    const dx = target.x - sprite.x;
    const dy = target.y - (sprite.y + s(2));
    const direction: Direction =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    sprite.anims.play(ANIMS.walk[direction], true);

    activeTween?.stop();
    activeTween = scene.tweens.add({
      targets: [sprite, shadow],
      x: (target_: Phaser.GameObjects.Sprite) => target_ === sprite ? target.x : target.x,
      y: (target_: Phaser.GameObjects.Sprite) => target_ === sprite ? target.y - s(2) : target.y + s(8),
      duration: PAWN_STEP_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        activeTween = null;
        face(direction);
        onArrive?.();
      },
    });
  }

  function destroy(): void {
    activeTween?.stop();
    shadow.destroy();
    sprite.destroy();
  }

  return { sprite, setCell, stepTo, face, destroy };
}

/** A small cyan wisp that drifts beside the player. Placeholder for the Bit companion. */
export function createWisp(scene: Phaser.Scene, follow: Pawn): { update(time: number): void; destroy(): void } {
  const wisp = scene.add.graphics().setDepth(8.8);
  let x = follow.sprite.x - s(20);
  let y = follow.sprite.y - s(2);

  function update(time: number): void {
    // Lazy follow with sinusoidal drift.
    const targetX = follow.sprite.x - s(22);
    const targetY = follow.sprite.y - s(8) + Math.sin(time / 320) * s(3);
    x += (targetX - x) * 0.12;
    y += (targetY - y) * 0.12;

    wisp.clear();
    // Outer halo
    wisp.fillStyle(COLORS.tile.lit, 0.25);
    wisp.fillCircle(x, y, s(7));
    // Inner core
    wisp.fillStyle(COLORS.tile.litEdge, 0.95);
    wisp.fillCircle(x, y, s(3));
    // Bright pinpoint
    wisp.fillStyle(0xffffff, 1);
    wisp.fillCircle(x, y, s(1));
  }

  function destroy(): void {
    wisp.destroy();
  }

  return { update, destroy };
}

/**
 * Rune Keeper NPC + the floating runestone artifact beside them.
 *
 * Both sprites are generated pixel-art assets from the cosmic-rune art pass.
 * The runestone bobs vertically with a sine wave to suggest levitation.
 */
export function createRuneKeeper(scene: Phaser.Scene): { update(time: number): void; destroy(): void } {
  const origin = gridOrigin();
  const baseX = origin.x + GRID_BOUNDS.width + s(60);
  const baseY = origin.y + GRID_BOUNDS.height / 2 + s(4);
  // Keep within the visible stage even at small SCALE.
  const x = Math.min(baseX, STAGE.width - s(80));
  const y = baseY;

  const sprite = scene.add
    .image(x, y, VISUAL_REVAMP_KEYS.RUNE_KEEPER)
    .setOrigin(0.5, 0.7)
    .setDepth(8.5);
  // Down-scale the portrait to fit beside the platform — the source asset
  // is ~220 px tall and reads best at puzzle scale around 80-90 px.
  const targetHeight = s(90);
  const scaleFactor = targetHeight / Math.max(sprite.height, 1);
  sprite.setScale(scaleFactor);

  // Floating runestone artifact beside the keeper.
  const stoneX = x + s(40);
  const stoneY = y - s(8);
  const stone = scene.add
    .image(stoneX, stoneY, VISUAL_REVAMP_KEYS.P0_1_COSMIC_RUNESTONE)
    .setOrigin(0.5)
    .setDepth(8.6);
  // Scale to puzzle-side proportions (source is 120×180, we want ~60×90).
  stone.setScale(s(0.18));

  function update(time: number): void {
    const bob = Math.sin(time / 480) * s(2);
    stone.setY(stoneY + bob);
  }

  function destroy(): void {
    sprite.destroy();
    stone.destroy();
  }

  return { update, destroy };
}

function ensureAnimations(scene: Phaser.Scene): void {
  if (scene.anims.exists(ANIMS.walk.down)) return;

  const create = (key: string, start: number, end: number, repeat = -1): void => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(PROLOGUE_SHEET_KEYS.PLAYER, { start, end }),
      frameRate: FRAME_RATE,
      repeat,
    });
  };

  // Match the 4-frames-per-row layout of the v2 player walk sheet (post-revert).
  create(ANIMS.idle.down, 0, 0, 0);
  create(ANIMS.idle.left, 4, 4, 0);
  create(ANIMS.idle.right, 8, 8, 0);
  create(ANIMS.idle.up, 12, 12, 0);
  create(ANIMS.walk.down, 0, 3);
  create(ANIMS.walk.left, 4, 7);
  create(ANIMS.walk.right, 8, 11);
  create(ANIMS.walk.up, 12, 15);
}
