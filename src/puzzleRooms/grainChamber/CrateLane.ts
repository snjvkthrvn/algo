/**
 * CrateLane — the row of grain crates on the chamber's floor plane.
 *
 * Replaces P1_1's floating mid-screen tile row. Crates sit IN the furrow
 * lane the player walks beside; standing in a gap addresses that adjacent
 * pair; trades physically lift both crates, swing them past each other,
 * and land with a thud. Each crate grows a sprout whose height tracks its
 * value; a full sort blooms the row in a cascade.
 *
 * Texture-guarded: with no crate sheet, crates render as wooden rectangles
 * with the value painted on — playable before art lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { GRAIN_CHAMBER_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import type { LaneGeometry } from "./chamberRules";

const CRATE_W = 64;
const CRATE_H = 52;
const GAP_W = 24;

interface Crate {
  readonly value: number;
  readonly container: Phaser.GameObjects.Container;
  readonly sprout: Phaser.GameObjects.Rectangle;
}

export class CrateLane {
  private scene: Phaser.Scene;
  private crates: Crate[] = [];
  private laneY: number;
  private animating = false;

  constructor(scene: Phaser.Scene, laneY: number) {
    this.scene = scene;
    this.laneY = laneY;
  }

  geometry(): LaneGeometry {
    return {
      startX: this.startX(),
      crateW: CRATE_W,
      gapW: GAP_W,
      count: this.crates.length,
    };
  }

  private startX(): number {
    const { width } = this.scene.cameras.main;
    const rowW =
      this.crates.length * CRATE_W + (this.crates.length - 1) * GAP_W;
    return Math.round((width / 2 - rowW / 2) / 8) * 8;
  }

  get isAnimating(): boolean {
    return this.animating;
  }

  /** (Re)build crates for a working row. Existing crates are destroyed. */
  setRow(values: ReadonlyArray<number>): void {
    this.crates.forEach((crate) => crate.container.destroy());
    this.crates = values.map((value) => this.buildCrate(value));
    this.layout();
  }

  values(): number[] {
    return this.crates.map((crate) => crate.value);
  }

  crateCenter(index: number): { x: number; y: number } | null {
    const crate = this.crates[index];
    if (!crate) return null;
    return { x: crate.container.x, y: crate.container.y };
  }

  private buildCrate(value: number): Crate {
    const container = this.scene.add.container(0, this.laneY).setDepth(20);
    if (this.scene.textures.exists(GRAIN_CHAMBER_KEYS.CRATE_SHEET)) {
      container.add(
        this.scene.add
          .image(0, 0, GRAIN_CHAMBER_KEYS.CRATE_SHEET)
          .setDisplaySize(CRATE_W, CRATE_H + 8),
      );
    } else {
      container.add(
        this.scene.add
          .rectangle(0, 0, CRATE_W, CRATE_H, 0x8a6233, 1)
          .setStrokeStyle(2, 0x5b3f1e, 1),
      );
    }
    // The value reads as stenciled paint on the crate face in both modes.
    container.add(
      this.scene.add
        .text(0, 2, String(value), {
          fontSize: "18px",
          fontFamily: FONTS.RETRO,
          color: "#f4e3c1",
        })
        .setOrigin(0.5),
    );
    // Sprout above the crate; height tracks value (seedling → tall stalk).
    const sprout = this.scene.add
      .rectangle(0, -CRATE_H / 2 - 2, 5, 6 + value * 4, 0x6f9b3f, 1)
      .setOrigin(0.5, 1);
    container.add(sprout);
    return { value, container, sprout };
  }

  private layout(): void {
    const startX = this.startX();
    this.crates.forEach((crate, i) => {
      const x = startX + CRATE_W / 2 + i * (CRATE_W + GAP_W);
      crate.container.setPosition(x, this.laneY);
    });
  }

  /**
   * Animate the adjacent trade at gapIndex: both crates lift with squash,
   * swing past each other, land with a thud. Resolves when settled.
   * The CALLER updates logical values via swapAdjacent; this keeps the
   * display bookkeeping in sync.
   */
  animateTrade(gapIndex: number): Promise<void> {
    const left = this.crates[gapIndex];
    const right = this.crates[gapIndex + 1];
    if (!left || !right || this.animating) return Promise.resolve();
    this.animating = true;
    audioManager.playSFX("crate_lift");
    const leftX = left.container.x;
    const rightX = right.container.x;

    const lift = (
      crate: Crate,
      targetX: number,
      arcDir: -1 | 1,
    ): Promise<void> =>
      new Promise((resolve) => {
        this.scene.tweens.chain({
          targets: crate.container,
          tweens: [
            {
              y: this.laneY - 28 + arcDir * 6,
              scaleY: 0.92,
              duration: 130,
              ease: "Quad.easeOut",
            },
            { x: targetX, duration: 200, ease: "Sine.easeInOut" },
            { y: this.laneY, scaleY: 1, duration: 110, ease: "Quad.easeIn" },
          ],
          onComplete: () => resolve(),
        });
      });

    return Promise.all([
      lift(left, rightX, -1),
      lift(right, leftX, 1),
    ]).then(() => {
      const tmp = this.crates[gapIndex];
      this.crates[gapIndex] = this.crates[gapIndex + 1];
      this.crates[gapIndex + 1] = tmp;
      audioManager.playSFX("crate_thud");
      // Procedural thud fallback so the trade lands audibly pre-asset:
      // heavier values land lower.
      audioManager.playTone(140 - this.crates[gapIndex].value * 6, 70, "square");
      this.animating = false;
    });
  }

  /** Bloom cascade when the row sorts: sprouts flare left → right. */
  bloomCascade(deliveryIndex = 0): Promise<void> {
    audioManager.playSFX("bloom_chime");
    audioManager.playTone(440 + deliveryIndex * 110, 220, "triangle");
    return new Promise((resolve) => {
      this.crates.forEach((crate, i) => {
        this.scene.tweens.add({
          targets: crate.sprout,
          scaleX: 2.2,
          duration: 240,
          delay: i * 90,
          yoyo: true,
          ease: "Back.easeOut",
          onStart: () => crate.sprout.setFillStyle(0x9bd35a),
        });
      });
      this.scene.time.delayedCall(this.crates.length * 90 + 480, resolve);
    });
  }
}
