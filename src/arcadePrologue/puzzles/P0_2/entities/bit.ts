import Phaser from 'phaser';
import { P0_2_PUZZLE_KEYS } from '../../../../config/assets';
import { COLORS } from '../tokens';

/**
 * The little Bit companion — a floating cyan orb that hovers near the player.
 *
 * Motion: smooth lag-follow with an idle bob. When the player picks up a shard,
 * Bit gets visibly excited (faster bob, brighter glow).
 */

export type BitCompanion = {
  update(playerX: number, playerY: number, deltaMs: number): void;
  setExcited(on: boolean): void;
  destroy(): void;
};

const FOLLOW_OFFSET_X = 56; // sits further to the right so it doesn't merge with the player sprite
const FOLLOW_OFFSET_Y = -68; // floats above shoulder height
const LAG_SPEED = 6.0;

const DISPLAY_W = 60;
const DISPLAY_H = 60;

export function createBitCompanion(scene: Phaser.Scene): BitCompanion {
  // Outer aura — kept narrow so it doesn't bloom over the player. Bit's own
  // sprite already has its baked-in glow; this is just a soft pulsing halo.
  const aura = scene.add
    .circle(0, 0, 18, COLORS.accent, 0.35)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(46);
  scene.tweens.add({
    targets: aura,
    scale: 1.22,
    alpha: 0.18,
    duration: 980,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Either the generated sprite, or a procedural fallback
  let body: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  if (scene.textures.exists(P0_2_PUZZLE_KEYS.BIT_COMPANION)) {
    const img = scene.add
      .image(0, 0, P0_2_PUZZLE_KEYS.BIT_COMPANION)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(DISPLAY_W, DISPLAY_H)
      .setDepth(47);
    if (img.texture) img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    body = img;
  } else {
    body = scene.add
      .circle(0, 0, 8, COLORS.accent, 1)
      .setStrokeStyle(1.2, 0xe6ecff, 0.9)
      .setDepth(47);
  }

  // Subtle idle rotation for the orbiting particles
  let bobPhase = Math.random() * Math.PI * 2;
  let curX = 0;
  let curY = 0;
  let excited = false;

  function update(playerX: number, playerY: number, deltaMs: number): void {
    const targetX = playerX + FOLLOW_OFFSET_X;
    const targetY = playerY + FOLLOW_OFFSET_Y;
    // Exponential smoothing → curX moves toward targetX with t = LAG_SPEED * dt
    const t = Math.min(1, (LAG_SPEED * deltaMs) / 1000);
    curX += (targetX - curX) * t;
    curY += (targetY - curY) * t;

    // Idle bob
    bobPhase += (excited ? 0.012 : 0.005) * deltaMs;
    const bob = Math.sin(bobPhase) * 4;

    body.setPosition(curX, curY + bob);
    aura.setPosition(curX, curY + bob);
  }

  function setExcited(on: boolean): void {
    excited = on;
    // Aura color jumps to a stronger cyan when excited
    aura.setFillStyle(COLORS.accent, on ? 0.4 : 0.22);
  }

  function destroy(): void {
    scene.tweens.killTweensOf(aura);
    aura.destroy();
    body.destroy();
  }

  return { update, setExcited, destroy };
}
