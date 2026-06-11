/**
 * ChickenFlock — the chamber's living score display.
 * Wander/peck around the room edges during play; scatter when the player
 * sprints through; at the clear, swarm the surviving grain decals.
 * Texture-guarded: ellipse chickens until the sheet lands.
 */

import Phaser from "phaser";
import { GRAIN_CHAMBER_KEYS } from "../../config/assets";

const FLOCK_SIZE = 5;

interface Hen {
  readonly body: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Ellipse) &
    Phaser.GameObjects.Components.Transform;
  readonly homeX: number;
  readonly homeY: number;
}

export class ChickenFlock {
  private scene: Phaser.Scene;
  private hens: Hen[] = [];

  constructor(scene: Phaser.Scene, floor: Phaser.Geom.Rectangle) {
    this.scene = scene;
    for (let i = 0; i < FLOCK_SIZE; i++) {
      const x = Phaser.Math.Between(floor.left + 20, floor.right - 20);
      const y = Phaser.Math.Between(floor.bottom - 60, floor.bottom - 16);
      const body = scene.textures.exists(GRAIN_CHAMBER_KEYS.CHICKEN_SHEET)
        ? scene.add
            .sprite(x, y, GRAIN_CHAMBER_KEYS.CHICKEN_SHEET, 0)
            .setDepth(8)
        : scene.add.ellipse(x, y, 14, 11, 0xe8e0d0, 1).setDepth(8);
      const hen: Hen = { body, homeX: x, homeY: y };
      this.hens.push(hen);
      this.wander(hen);
    }
  }

  private wander(hen: Hen): void {
    this.scene.tweens.add({
      targets: hen.body,
      x: hen.homeX + Phaser.Math.Between(-26, 26),
      y: hen.homeY + Phaser.Math.Between(-10, 10),
      duration: Phaser.Math.Between(900, 1700),
      ease: "Sine.easeInOut",
      onComplete: () => this.wander(hen),
    });
  }

  /** Hens within radius of (x, y) hop away from it. */
  scatterFrom(x: number, y: number): void {
    for (const hen of this.hens) {
      const dist = Phaser.Math.Distance.Between(x, y, hen.body.x, hen.body.y);
      if (dist > 48) continue;
      this.scene.tweens.killTweensOf(hen.body);
      const angle = Math.atan2(hen.body.y - y, hen.body.x - x);
      this.scene.tweens.add({
        targets: hen.body,
        x: hen.body.x + Math.cos(angle) * 42,
        y: hen.body.y + Math.sin(angle) * 24,
        duration: 240,
        ease: "Quad.easeOut",
        onComplete: () => this.wander(hen),
      });
    }
  }

  /** The clear payoff: every hen beelines to a grain decal and pecks. */
  feast(decals: Array<{ x: number; y: number }>): void {
    this.hens.forEach((hen, i) => {
      const target = decals[i % Math.max(1, decals.length)];
      if (!target) return;
      this.scene.tweens.killTweensOf(hen.body);
      this.scene.tweens.add({
        targets: hen.body,
        x: target.x,
        y: target.y,
        duration: 600 + i * 120,
        ease: "Quad.easeInOut",
      });
    });
  }
}
