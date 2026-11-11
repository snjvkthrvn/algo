/**
 * GlitchStation — Glitch sorting the same arrivals at his corner mini-bins,
 * his way: trial-tossing random bins until one takes the crop, remembering
 * NOTHING between repeats. The player who remembers BEAN's home pays once;
 * Glitch pays every time. Pure theatre, never blocks the player.
 *
 * Texture-guarded: maroon Glitch + mini wood rects until art lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { SORTING_MILL_KEYS, VISUAL_REVAMP_KEYS } from "../../config/assets";
import { GLITCH_FAILURE_TAUNTS } from "../../data/dialogue/glitch_dialogue";

const MINI_W = 24;
const MINI_H = 18;
const MINI_GAP = 8;
const TOSS_MS = 700;

function pick(lines: ReadonlyArray<string>): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

export class GlitchStation {
  private scene: Phaser.Scene;
  private originX: number;
  private originY: number;
  private bins: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[] =
    [];
  private glitch: Phaser.GameObjects.GameObject &
    Phaser.GameObjects.Components.Transform;
  private working = false;
  private seenCrops = new Set<string>();

  constructor(scene: Phaser.Scene, originX: number, originY: number) {
    this.scene = scene;
    this.originX = originX;
    this.originY = originY;
    this.glitch = scene.textures.exists(VISUAL_REVAMP_KEYS.GLITCH)
      ? scene.add
          .image(originX - 28, originY - 30, VISUAL_REVAMP_KEYS.GLITCH)
          .setDisplaySize(30, 38)
          .setDepth(22)
      : scene.add
          .rectangle(originX - 28, originY - 30, 18, 26, 0x8a3a3a, 1)
          .setStrokeStyle(2, 0x5a2424, 1)
          .setDepth(22);
    this.scene.tweens.add({
      targets: this.glitch,
      y: originY - 34,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  setBins(count: number): void {
    this.bins.forEach((bin) => bin.destroy());
    this.bins = [];
    for (let i = 0; i < count; i++) {
      const x = this.originX + i * (MINI_W + MINI_GAP);
      // His pocket copies of the mill bins — real bin art when loaded.
      this.bins.push(
        this.scene.textures.exists(SORTING_MILL_KEYS.BIN)
          ? this.scene.add
              .image(x, this.originY, SORTING_MILL_KEYS.BIN)
              .setDisplaySize(MINI_W, MINI_H)
              .setAlpha(0.95)
              .setDepth(20)
          : this.scene.add
              .rectangle(x, this.originY, MINI_W, MINI_H, 0x7a5a34, 0.9)
              .setStrokeStyle(1, 0x4e3a20, 1)
              .setDepth(20),
      );
    }
  }

  /** Reject/accept flash that works for both textured and fallback bins. */
  private flashBin(
    bin: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image,
    kind: "reject" | "accept" | "rest",
  ): void {
    if (bin instanceof Phaser.GameObjects.Image) {
      if (kind === "rest") bin.clearTint();
      else bin.setTint(kind === "reject" ? 0xe08a8a : 0xa8d890);
      return;
    }
    if (kind === "rest") bin.setFillStyle(0x7a5a34, 0.9);
    else bin.setFillStyle(kind === "reject" ? 0x8a3a3a : 0x5e7a34, 0.9);
  }

  /** Sort one arrival his way: random tosses until the home bin takes it. */
  sortArrival(crop: string, homeBin: number): void {
    if (this.working) return;
    this.working = true;
    // A repeat crop he ALREADY solved costs him all over again — bark.
    if (this.seenCrops.has(crop)) this.bark();
    this.seenCrops.add(crop);

    // His trial order: a random shuffle that ends on the home bin.
    const wrong = this.bins
      .map((_, i) => i)
      .filter((i) => i !== homeBin)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(2, this.bins.length - 1));
    const tries = [...wrong, homeBin];

    const attempt = (step: number): void => {
      const target = this.bins[tries[step]];
      if (!target) {
        this.working = false;
        return;
      }
      this.scene.tweens.add({
        targets: this.glitch,
        x: target.x,
        duration: TOSS_MS * 0.4,
        ease: "Sine.easeInOut",
        onComplete: () => {
          const rejected = tries[step] !== homeBin;
          this.flashBin(target, rejected ? "reject" : "accept");
          this.scene.time.delayedCall(TOSS_MS * 0.35, () => {
            this.flashBin(target, "rest");
            if (rejected) {
              attempt(step + 1);
            } else {
              this.working = false;
            }
          });
        },
      });
    };
    attempt(0);
  }

  private bark(): void {
    const bark = this.scene.add
      .text(this.originX + 30, this.originY - 58, pick(GLITCH_FAILURE_TAUNTS), {
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
