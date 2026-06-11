/**
 * CropBench — the mill's receiving bench. Crops arrive from the chute one
 * at a time; the player picks the waiting crop up (it follows them while
 * carried) and tosses it at a bin. The crop's tag shows its name and its
 * pace-count weight — a numeral, never a formula (VISION §4).
 *
 * Texture-guarded: ellipse crops + plain tag until the art batch lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { SORTING_MILL_KEYS } from "../../config/assets";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";

import { makeCropSprite } from "./cropVisual";

export class CropBench {
  private scene: Phaser.Scene;
  private benchX: number;
  private benchY: number;
  private waiting: Phaser.GameObjects.Container | null = null;
  private carried: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, benchX: number, benchY: number) {
    this.scene = scene;
    this.benchX = benchX;
    this.benchY = benchY;
    // The bench itself: a worn table surface (procedural; the painted
    // backdrop carries the real furniture once art lands).
    if (!scene.textures.exists(SORTING_MILL_KEYS.BACKDROP)) {
      scene.add
        .rectangle(benchX, benchY + 14, 84, 30, 0x6e5232, 1)
        .setStrokeStyle(2, 0x46341e, 1)
        .setDepth(8);
    }
  }

  get benchPosition(): { x: number; y: number } {
    return { x: this.benchX, y: this.benchY };
  }

  get hasWaiting(): boolean {
    return this.waiting !== null;
  }

  get isCarrying(): boolean {
    return this.carried !== null;
  }

  /** The chute delivers the next crop onto the bench. */
  arrive(crop: string, weight: number): Promise<void> {
    this.waiting?.destroy();
    a11yManager.announce(
      `${crop} arrives at the bench. Its count is ${weight}.`,
      true,
    );
    audioManager.playTone(300, 70, "square");

    const bundle = this.scene.add
      .container(this.benchX, -20)
      .setDepth(32);
    bundle.add(this.makeCropBody(crop));
    bundle.add(
      this.scene.add
        .text(0, 18, `${crop} · ${weight}`, {
          fontSize: "9px",
          fontFamily: FONTS.RETRO,
          color: "#f4e3c1",
          backgroundColor: "#2e2417",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 0),
    );
    this.waiting = bundle;

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: bundle,
        y: this.benchY - 6,
        duration: 380,
        ease: "Bounce.easeOut",
        onComplete: () => resolve(),
      });
    });
  }

  private makeCropBody(crop: string): Phaser.GameObjects.GameObject {
    return makeCropSprite(this.scene, crop, 0, 0);
  }

  /** Pick the waiting crop up; it follows the player from here. */
  take(): boolean {
    if (!this.waiting || this.carried) return false;
    this.carried = this.waiting;
    this.waiting = null;
    audioManager.playTone(440, 60, "triangle");
    return true;
  }

  /** Call every frame with the player position while carrying. */
  followPlayer(x: number, y: number): void {
    this.carried?.setPosition(x, y - 34);
  }

  /** The carried crop was swallowed — clear it. */
  consumeCarried(): void {
    this.carried?.destroy();
    this.carried = null;
  }
}
