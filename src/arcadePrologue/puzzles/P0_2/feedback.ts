import Phaser from 'phaser';
import { COLORS } from './tokens';

/**
 * Feedback primitives for the Flow Consoles puzzle.
 *
 * Every effect is one-shot: it creates throw-away GameObjects, tweens them
 * out, and destroys them on completion. Safe to fire from anywhere.
 */

export function pickupPulse(scene: Phaser.Scene, x: number, y: number, color: number): void {
  const ring = scene.add
    .circle(x, y, 16, 0, 0)
    .setStrokeStyle(2.4, color, 0.85)
    .setDepth(60);
  scene.tweens.add({
    targets: ring,
    scale: 2.4,
    alpha: 0,
    duration: 360,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });

  // Sparkle motes that drift up
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;
    const dist = 12 + Math.random() * 18;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const mote = scene.add
      .circle(x, y, 2 + Math.random() * 1.5, color, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(60);
    scene.tweens.add({
      targets: mote,
      x: x + dx,
      y: y + dy - 12,
      alpha: 0,
      duration: 480 + Math.random() * 160,
      ease: 'Sine.easeOut',
      onComplete: () => mote.destroy(),
    });
  }
}

export function placeRing(scene: Phaser.Scene, x: number, y: number, color: number): void {
  // Filled flash
  const flash = scene.add
    .circle(x, y, 28, color, 0.55)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(55);
  scene.tweens.add({
    targets: flash,
    scale: 1.8,
    alpha: 0,
    duration: 420,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
  // Outer echo ring
  const ring = scene.add
    .circle(x, y, 30, 0, 0)
    .setStrokeStyle(2, color, 0.85)
    .setDepth(56);
  scene.tweens.add({
    targets: ring,
    scale: 2.8,
    alpha: 0,
    duration: 620,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
}

export function wrongShimmer(scene: Phaser.Scene, x: number, y: number): void {
  const ring = scene.add
    .circle(x, y, 22, 0, 0)
    .setStrokeStyle(2.5, 0xff3a4a, 0.75)
    .setDepth(58);
  scene.tweens.add({
    targets: ring,
    scale: 1.7,
    alpha: 0,
    duration: 360,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
}

export function winCascade(
  scene: Phaser.Scene,
  consolePoses: Array<{ x: number; y: number }>,
  reduceMotion: boolean,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const stagger = reduceMotion ? 60 : 110;
    consolePoses.forEach((p, i) => {
      scene.time.delayedCall(i * stagger, () => {
        const ring = scene.add
          .circle(p.x, p.y - 40, 36, 0, 0)
          .setStrokeStyle(2.5, COLORS.accent, 0.9)
          .setDepth(60);
        scene.tweens.add({
          targets: ring,
          scale: 1.8,
          alpha: 0,
          duration: 620,
          ease: 'Back.easeOut',
          onComplete: () => ring.destroy(),
        });
        const fill = scene.add
          .circle(p.x, p.y - 40, 18, COLORS.accent, 0.6)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(59);
        scene.tweens.add({
          targets: fill,
          scale: 2.2,
          alpha: 0,
          duration: 540,
          ease: 'Cubic.easeOut',
          onComplete: () => fill.destroy(),
        });
      });
    });
    const totalMs = consolePoses.length * stagger + 640;
    scene.time.delayedCall(totalMs, () => resolve());
  });
}

export function carryAura(
  scene: Phaser.Scene,
  follow: () => { x: number; y: number },
  color: number,
): { destroy: () => void } {
  // Floor disc only — sits under the player's feet, not around the player's
  // sprite. Previously this was a large cyan-ish glow at chest height that
  // overlapped and erased the Bit companion's silhouette.
  const aura = scene.add
    .ellipse(follow().x, follow().y + 4, 38, 14, color, 0.45)
    .setDepth(48);
  const pulse = scene.tweens.add({
    targets: aura,
    scaleX: 1.18,
    scaleY: 1.18,
    alpha: 0.25,
    duration: 720,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  const onUpdate = (): void => {
    const p = follow();
    aura.setPosition(p.x, p.y);
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);

  return {
    destroy(): void {
      scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      pulse.stop();
      aura.destroy();
    },
  };
}
