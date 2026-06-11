/**
 * GlitchShelf — Glitch as a live co-actor at his own corner mini-shelf.
 *
 * He fills the SAME orders the player gets, his way: opening every basket
 * from the left at a constant pace. On a 5-basket shelf he keeps up; by 10
 * he's drowning in his own tumbled mess. The player's flat trip cost vs his
 * growing scan IS the indexing lesson — pure theatre, zero interference.
 *
 * Texture-guarded: maroon rect Glitch + mini wicker rects until art lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { VISUAL_REVAMP_KEYS } from "../../config/assets";
import { GLITCH_FAILURE_TAUNTS } from "../../data/dialogue/glitch_dialogue";

const MINI_W = 26;
const MINI_H = 20;
const MINI_GAP = 8;
const SCAN_MS_PER_BASKET = 900;

function pick(lines: ReadonlyArray<string>): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

export class GlitchShelf {
  private scene: Phaser.Scene;
  private originX: number;
  private originY: number;
  private baskets: Phaser.GameObjects.Rectangle[] = [];
  private glitch: Phaser.GameObjects.GameObject &
    Phaser.GameObjects.Components.Transform;
  private mess: Phaser.GameObjects.Rectangle[] = [];
  private scanning = false;

  constructor(scene: Phaser.Scene, originX: number, originY: number) {
    this.scene = scene;
    this.originX = originX;
    this.originY = originY;
    this.glitch = scene.textures.exists(VISUAL_REVAMP_KEYS.GLITCH)
      ? scene.add
          .image(originX, originY - 34, VISUAL_REVAMP_KEYS.GLITCH)
          .setDisplaySize(30, 38)
          .setDepth(22)
      : scene.add
          .rectangle(originX, originY - 34, 18, 26, 0x8a3a3a, 1)
          .setStrokeStyle(2, 0x5a2424, 1)
          .setDepth(22);
    // Idle fidget so he reads alive even between orders.
    scene.tweens.add({
      targets: this.glitch,
      y: originY - 38,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Rebuild his mini-shelf to match the batch size. His mess persists. */
  setBatch(count: number): void {
    this.baskets.forEach((basket) => basket.destroy());
    this.baskets = [];
    for (let i = 0; i < count; i++) {
      this.baskets.push(
        this.scene.add
          .rectangle(
            this.originX + i * (MINI_W + MINI_GAP),
            this.originY,
            MINI_W,
            MINI_H,
            0xa9885a,
            0.9,
          )
          .setStrokeStyle(1, 0x6e5635, 1)
          .setDepth(20),
      );
    }
  }

  /**
   * Fill one order his way: scan baskets 0..target, opening each. Fires
   * and forgets — pure theatre; never blocks the player's loop.
   */
  fillOrder(targetIndex: number): void {
    if (this.scanning) return;
    this.scanning = true;
    if (targetIndex >= 5) this.bark();
    const visit = (i: number): void => {
      const basket = this.baskets[i];
      if (!basket || i > targetIndex) {
        this.scanning = false;
        return;
      }
      this.scene.tweens.add({
        targets: this.glitch,
        x: basket.x,
        duration: SCAN_MS_PER_BASKET * 0.4,
        ease: "Sine.easeInOut",
        onComplete: () => {
          // Flip the mini lid: a quick tint flash + a mess crumb on misses.
          basket.setFillStyle(0x82663e, 0.9);
          this.scene.time.delayedCall(SCAN_MS_PER_BASKET * 0.3, () => {
            basket.setFillStyle(0xa9885a, 0.9);
            if (i < targetIndex) this.dropCrumb(basket.x);
            visit(i + 1);
          });
        },
      });
    };
    visit(0);
  }

  private dropCrumb(x: number): void {
    const crumb = this.scene.add
      .rectangle(
        x + Phaser.Math.Between(-8, 8),
        this.originY + MINI_H + Phaser.Math.Between(4, 12),
        3,
        2,
        0x9a7544,
        0.9,
      )
      .setDepth(6);
    this.mess.push(crumb);
  }

  private bark(): void {
    const line = pick(GLITCH_FAILURE_TAUNTS);
    const bark = this.scene.add
      .text(this.originX + 40, this.originY - 64, line, {
        fontSize: "9px",
        fontFamily: FONTS.RETRO,
        color: "#d8a0a0",
        backgroundColor: "#2e1a1a",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 170 },
      })
      .setOrigin(0.5, 1)
      .setDepth(50);
    const cam = this.scene.cameras.main;
    bark.x = Phaser.Math.Clamp(
      bark.x,
      bark.width / 2 + 8,
      cam.width - bark.width / 2 - 8,
    );
    this.scene.tweens.add({
      targets: bark,
      alpha: 0,
      delay: 2400,
      duration: 400,
      onComplete: () => bark.destroy(),
    });
  }
}
