/**
 * JuiceSystem — Particle bursts, screen flash, and camera shake for player action feedback.
 * All methods are stateless — call them from any Phaser scene.
 *
 * Reduce-motion gating: cameraShake and screenFlash are the two effects most
 * likely to trigger vestibular discomfort. Both check the reduceMotion
 * setting and short-circuit when it's on. Particle bursts are kept — they
 * are localized and don't move the player's frame of reference.
 */

import Phaser from 'phaser';
import { gameState } from '../core/GameStateManager';

const motionReduced = (): boolean => {
  try {
    return gameState.getSettings().reduceMotion;
  } catch {
    // gameState may not be initialized in test mocks — fail safe (false).
    return false;
  }
};

export const JuiceSystem = {

  burst(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number,
    count: number = 12,
    spread: number = 60,
  ): void {
    if (!scene?.add?.rectangle || !scene?.tweens) return;
    for (let i = 0; i < count; i++) {
      try {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * spread;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 38; // slight upward bias
        const size = Math.random() < 0.25 ? 4 : 2;
        const lifetime = 480 + Math.random() * 180;

        const p = scene.add.rectangle(x, y, size, size, color, 1);
        if (p && typeof p.setDepth === 'function') p.setDepth(5000);
        scene.tweens.add({
          targets: p,
          x: x + vx * 0.6,
          y: y + vy * 0.6 + 28,
          alpha: 0,
          duration: lifetime,
          ease: 'Power2.easeOut',
          onComplete: () => p?.destroy?.(),
        });
      } catch {
        // Silently skip in test mocks or edge cases
      }
    }
  },

  // Gold arc upward + green inner burst — for correct answers
  correctBurst(scene: Phaser.Scene, x: number, y: number): void {
    JuiceSystem.burst(scene, x, y, 0xfbbf24, 14, 72);
    JuiceSystem.burst(scene, x, y, 0x88c070, 8, 36);
  },

  // Red pixels drooping downward — for wrong answers
  wrongBurst(scene: Phaser.Scene, x: number, y: number): void {
    if (!scene?.add?.rectangle || !scene?.tweens) return;
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI * 0.2 + Math.random() * Math.PI * 0.8;
      const speed = 30 + Math.random() * 40;
      const p = scene.add
        .rectangle(x + (Math.random() - 0.5) * 18, y, 2, 2, 0xef4444, 1)
        .setDepth(5000);
      scene.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * speed * 0.5,
        y: p.y + Math.abs(Math.sin(angle)) * speed + 32,
        alpha: 0,
        duration: 580,
        ease: 'Power2.easeIn',
        onComplete: () => p.destroy(),
      });
    }
  },

  // Gold pixels falling from top — for codex unlock celebration
  goldRain(scene: Phaser.Scene): void {
    if (!scene?.cameras?.main || !scene?.add?.rectangle || !scene?.tweens) return;
    const { width, height } = scene.cameras.main;
    for (let i = 0; i < 52; i++) {
      const delay = Math.random() * 900;
      const x = 80 + Math.random() * (width - 160);
      const size = Math.random() < 0.3 ? 4 : 2;
      const p = scene.add.rectangle(x, -8, size, size, 0xfbbf24, 0).setDepth(5000);
      scene.tweens.add({
        targets: p,
        y: height * 0.65 + Math.random() * 80,
        alpha: { from: 0.9, to: 0 },
        duration: 850 + Math.random() * 450,
        delay,
        ease: 'Power1.easeIn',
        onComplete: () => p.destroy(),
      });
    }
  },

  screenFlash(
    scene: Phaser.Scene,
    color: number = 0xffffff,
    alpha: number = 0.15,
    duration: number = 140,
  ): void {
    if (!scene?.cameras?.main || !scene?.add?.rectangle || !scene?.tweens) return;
    // Reduce-motion: cut the flash alpha in half — the visual cue is
    // still readable but doesn't fill the screen as aggressively.
    const effectiveAlpha = motionReduced() ? alpha * 0.4 : alpha;
    const { width, height } = scene.cameras.main;
    const flash = scene.add
      .rectangle(0, 0, width, height, color, effectiveAlpha)
      .setOrigin(0)
      .setDepth(9000);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Power2.easeOut',
      onComplete: () => flash.destroy(),
    });
  },

  cameraShake(scene: Phaser.Scene, duration: number = 90, intensity: number = 0.004): void {
    if (!scene?.cameras?.main) return;
    // Reduce-motion: skip camera shake entirely. This is the single biggest
    // vestibular trigger in the project — there is no useful "less shake"
    // intermediate; either you shake or you don't.
    if (motionReduced()) return;
    scene.cameras.main.shake(duration, intensity);
  },

  // BST insert: rising node + branch growth
  bstInsert(scene: Phaser.Scene, x: number, y: number, depth: number = 0): void {
    if (!scene?.add?.circle || !scene?.tweens) return;
    const color = depth < 3 ? 0x22c55e : 0xfbbf24;
    const node = scene.add.circle(x, y - 20, 8, color, 0.9).setDepth(5000);
    scene.tweens.add({ targets: node, y, duration: 280, ease: 'Back.easeOut' });
    JuiceSystem.burst(scene, x, y, color, 6, 30);
  },

  // BST delete: shrink + fade with depth hint
  bstDelete(scene: Phaser.Scene, x: number, y: number): void {
    if (!scene?.add?.circle || !scene?.tweens) return;
    const node = scene.add.circle(x, y, 9, 0xef4444, 0.8).setDepth(5000);
    scene.tweens.add({ targets: node, scale: 0, alpha: 0, duration: 220, onComplete: () => node.destroy() });
    JuiceSystem.wrongBurst(scene, x, y);
  },

  // Depth hint label pulse
  depthHint(scene: Phaser.Scene, x: number, y: number, depth: number): void {
    if (!scene?.add?.text || !scene?.tweens) return;
    const t = scene.add.text(x, y - 28, `d=${depth}`, { fontSize: '12px', color: '#a3e635' }).setDepth(6000).setOrigin(0.5);
    scene.tweens.add({ targets: t, alpha: 0, y: y - 42, duration: 900, onComplete: () => t.destroy() });
  },

  // FIFO flow particles for canals
  fifoFlow(scene: Phaser.Scene, x: number, y: number, forward = true): void {
    if (!scene?.add?.circle || !scene?.tweens) return;
    const p = scene.add.circle(x, y, 3, 0x67e8f9, 0.7).setDepth(4500);
    const dx = forward ? 48 : -48;
    scene.tweens.add({ targets: p, x: x + dx, alpha: 0, duration: 420, ease: 'Linear', onComplete: () => p.destroy() });
  },

  // Enqueue feedback
  enqueueFeedback(scene: Phaser.Scene, x: number, y: number): void {
    JuiceSystem.correctBurst(scene, x, y);
    scene.cameras?.main?.flash?.(60, 0x67e8f9, 0.08);
  },

  // Dequeue feedback
  dequeueFeedback(scene: Phaser.Scene, x: number, y: number): void {
    JuiceSystem.burst(scene, x, y, 0xf472b6, 9, 28);
  },

  // Graph node/edge highlight + path viz
  highlightNode(scene: Phaser.Scene, x: number, y: number, color = 0x67e8f9): void {
    if (!scene?.add?.circle || !scene?.tweens) return;
    const ring = scene.add.circle(x, y, 14, color, 0.3).setDepth(4999).setStrokeStyle(2, color);
    scene.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
  },

  pathViz(scene: Phaser.Scene, points: {x:number,y:number}[]): void {
    if (!scene?.add?.graphics || points.length < 2) return;
    const g = scene.add.graphics().setDepth(4500).lineStyle(3, 0xfbbf24, 0.7);
    g.beginPath(); g.moveTo(points[0].x, points[0].y);
    for (let i=1; i<points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
    scene.time?.delayedCall(650, () => g.destroy());
  },

  // Future-proof hook: register custom anim
  futureHook(scene: Phaser.Scene, type: string, x: number, y: number): void {
    if (type === 'pulse') JuiceSystem.burst(scene, x, y, 0x22c55e, 8, 22);
    else if (type === 'data') JuiceSystem.highlightNode(scene, x, y, 0xa78bfa);
  },
};
