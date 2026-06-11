/**
 * BinRow — the Sorting Mill's wall of numbered bins.
 *
 * A correct toss is SWALLOWED: the crop sprite arcs in and joins the bin's
 * visible stack (two crops sharing a bin is what a collision looks like —
 * seen, never explained). A wrong toss is SPAT BACK: the bin rejects the
 * crop with a rebound arc and a bruised husk falls below it, where the
 * bruise pile persists for the whole run — the mill's cost economy.
 *
 * Texture-guarded: slatted-wood rectangles until the art batch lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { SORTING_MILL_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import type { BinRowGeometry } from "./millRules";

const BIN_W = 80;
const BIN_H = 64;
const GAP_W = 20;

interface Bin {
  readonly container: Phaser.GameObjects.Container;
  readonly label: Phaser.GameObjects.Text;
  stackCount: number;
}

export class BinRow {
  private scene: Phaser.Scene;
  private bins: Bin[] = [];
  private bruises: Phaser.GameObjects.GameObject[] = [];
  private rowY: number;
  private reduceMotion: boolean;
  private busy = false;

  constructor(scene: Phaser.Scene, rowY: number, reduceMotion: boolean) {
    this.scene = scene;
    this.rowY = rowY;
    this.reduceMotion = reduceMotion;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  geometry(): BinRowGeometry {
    return {
      startX: this.startX(),
      binW: BIN_W,
      gapW: GAP_W,
      count: this.bins.length,
    };
  }

  binCenter(index: number): { x: number; y: number } | null {
    const bin = this.bins[index];
    if (!bin) return null;
    return { x: bin.container.x, y: bin.container.y };
  }

  private startX(): number {
    const { width } = this.scene.cameras.main;
    const rowW = this.bins.length * BIN_W + (this.bins.length - 1) * GAP_W;
    return Math.round((width / 2 - rowW / 2) / 8) * 8;
  }

  /** (Re)build the row. Bruise piles persist; bin stacks start empty. */
  setBins(count: number): void {
    this.bins.forEach((bin) => bin.container.destroy());
    this.bins = [];
    for (let i = 0; i < count; i++) this.bins.push(this.buildBin(i));
    this.layout();
  }

  private buildBin(index: number): Bin {
    const container = this.scene.add.container(0, this.rowY).setDepth(20);
    if (this.scene.textures.exists(SORTING_MILL_KEYS.BIN)) {
      container.add(
        this.scene.add
          .image(0, 0, SORTING_MILL_KEYS.BIN)
          .setDisplaySize(BIN_W, BIN_H + 8),
      );
    } else {
      container.add(
        this.scene.add
          .rectangle(0, 0, BIN_W, BIN_H, 0x7a5a34, 1)
          .setStrokeStyle(2, 0x4e3a20, 1),
      );
      container.add(
        this.scene.add
          .rectangle(0, -BIN_H / 2 + 6, BIN_W - 10, 8, 0x3a2c18, 1),
      );
    }
    const label = this.scene.add
      .text(0, BIN_H / 2 + 12, String(index + 1), {
        fontSize: "12px",
        fontFamily: FONTS.RETRO,
        color: "#f4e3c1",
      })
      .setOrigin(0.5);
    container.add(label);
    return { container, label, stackCount: 0 };
  }

  private layout(): void {
    const startX = this.startX();
    this.bins.forEach((bin, i) => {
      bin.container.setPosition(
        startX + BIN_W / 2 + i * (BIN_W + GAP_W),
        this.rowY,
      );
    });
  }

  /**
   * Toss the carried crop at a bin. Correct → swallow + stack growth.
   * Wrong → spit-back rebound + persistent bruise pile. Resolves when the
   * animation settles; the caller keeps/clears the carried crop.
   */
  toss(
    binIndex: number,
    correct: boolean,
    cropFrame: number,
    fromX: number,
    fromY: number,
  ): Promise<void> {
    const bin = this.bins[binIndex];
    if (!bin || this.busy) return Promise.resolve();
    this.busy = true;

    const flying = this.makeCropSprite(cropFrame, fromX, fromY);
    const targetY = this.rowY - BIN_H / 2;

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: flying,
        x: bin.container.x,
        y: targetY,
        duration: this.reduceMotion ? 60 : 260,
        ease: "Quad.easeOut",
        onComplete: () => {
          if (correct) {
            audioManager.playSFX("bin_swallow");
            audioManager.playTone(520, 90, "triangle");
            // Join the visible stack: nudge into the bin and stay.
            const slot = bin.stackCount++;
            this.scene.tweens.add({
              targets: flying,
              x: bin.container.x + ((slot % 3) - 1) * 14,
              y: this.rowY - 10 - Math.floor(slot / 3) * 10,
              duration: this.reduceMotion ? 40 : 160,
              ease: "Quad.easeIn",
              onComplete: () => {
                this.busy = false;
                resolve();
              },
            });
            this.scene.tweens.add({
              targets: bin.container,
              y: this.rowY + 4,
              duration: 90,
              yoyo: true,
              ease: "Quad.easeOut",
            });
            return;
          }
          // Spit-back: the bin shudders and the crop rebounds toward the
          // thrower; a bruised husk drops below the bin and stays.
          audioManager.playSFX("bin_reject");
          audioManager.playTone(140, 110, "square");
          this.dropBruise(bin.container.x);
          this.scene.tweens.add({
            targets: bin.container,
            x: bin.container.x + 4,
            duration: 50,
            yoyo: true,
            repeat: 2,
          });
          this.scene.tweens.add({
            targets: flying,
            x: fromX,
            y: fromY,
            angle: 180,
            duration: this.reduceMotion ? 60 : 300,
            ease: "Quad.easeIn",
            onComplete: () => {
              flying.destroy();
              this.busy = false;
              resolve();
            },
          });
        },
      });
    });
  }

  private makeCropSprite(
    frame: number,
    x: number,
    y: number,
  ): Phaser.GameObjects.GameObject &
    Phaser.GameObjects.Components.Transform & { destroy(): void } {
    if (this.scene.textures.exists(SORTING_MILL_KEYS.CROP_SHEET)) {
      return this.scene.add
        .image(x, y, SORTING_MILL_KEYS.CROP_SHEET, frame)
        .setDepth(30);
    }
    return this.scene.add
      .ellipse(x, y, 16, 12, 0x9bbf5a, 1)
      .setStrokeStyle(1, 0x5e7a34, 1)
      .setDepth(30);
  }

  private dropBruise(x: number): void {
    const targetX = x + Phaser.Math.Between(-22, 22);
    const targetY = this.rowY + BIN_H / 2 + Phaser.Math.Between(12, 30);
    const bruise = this.scene.textures.exists(SORTING_MILL_KEYS.BRUISE_SHEET)
      ? this.scene.add
          .image(targetX, targetY, SORTING_MILL_KEYS.BRUISE_SHEET, Phaser.Math.Between(0, 3))
          .setDepth(6)
      : this.scene.add
          .rectangle(targetX, targetY, 5, 3, 0x6e5635, 0.95)
          .setDepth(6);
    this.bruises.push(bruise);
  }

  /** Where the hens peck post-clear: every bruise pile. */
  bruisePositions(): Array<{ x: number; y: number }> {
    return this.bruises.map((bruise) => {
      const obj = bruise as unknown as { x: number; y: number };
      return { x: obj.x, y: obj.y };
    });
  }
}
