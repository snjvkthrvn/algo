/**
 * CellarReplay — the optional post-clear demonstration for the cellar.
 *
 * One order, replayed two ways at once above the shelf: a bright spectral
 * Bit glides STRAIGHT to the target basket ghost (one hop), while a dimmer
 * scanner dot plods through ghosts 0..target in sequence. The image is the
 * whole lesson — direct address vs linear scan — with no text (VISION §3).
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";

const GHOST_W = 36;
const GHOST_H = 28;
const GHOST_GAP = 10;
const SCAN_MS = 340;

export class CellarReplay {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Replay one order (target basket) over `count` ghost baskets at y. */
  async play(count: number, targetIndex: number, y: number): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "Bit goes straight to the address; the scanner checks every basket on the way.",
      false,
    );

    const { width } = this.scene.cameras.main;
    const rowW = count * GHOST_W + (count - 1) * GHOST_GAP;
    const startX = Math.round((width / 2 - rowW / 2) / 8) * 8 + GHOST_W / 2;
    const centerOf = (i: number): number => startX + i * (GHOST_W + GHOST_GAP);

    const ghosts: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < count; i++) {
      const ghost = this.scene.add
        .container(centerOf(i), y)
        .setDepth(55)
        .setAlpha(0);
      ghost.add(
        this.scene.add
          .rectangle(0, 0, GHOST_W, GHOST_H, COLORS.CYAN_GLOW, 0.18)
          .setStrokeStyle(1, COLORS.CYAN_GLOW, 0.8),
      );
      ghost.add(
        this.scene.add
          .text(0, 0, String(i + 1), {
            fontSize: "10px",
            fontFamily: FONTS.RETRO,
            color: "#9ff7f7",
          })
          .setOrigin(0.5),
      );
      ghosts.push(ghost);
      this.scene.tweens.add({
        targets: ghost,
        alpha: 1,
        duration: 220,
        delay: i * 40,
      });
    }

    const bit = this.scene.add
      .circle(centerOf(0) - GHOST_W, y - GHOST_H - 8, 5, COLORS.CYAN_GLOW, 1)
      .setDepth(56);
    const scanner = this.scene.add
      .circle(centerOf(0) - GHOST_W, y + GHOST_H, 4, 0xd86a6a, 0.85)
      .setDepth(56);

    const tweenTo = (
      target: object,
      props: Record<string, number>,
      duration: number,
    ): Promise<void> =>
      new Promise((resolve) =>
        this.scene.tweens.add({
          targets: target,
          ...props,
          duration,
          ease: "Sine.easeInOut",
          onComplete: () => resolve(),
        }),
      );

    // Bit: one hop straight to the address.
    const bitRun = (async (): Promise<void> => {
      await tweenTo(bit, { x: centerOf(targetIndex) }, SCAN_MS * 1.4);
      audioManager.playTone(700, 90, "triangle");
      await tweenTo(bit, { y: y - GHOST_H - 18 }, 180);
      await tweenTo(bit, { y: y - GHOST_H - 8 }, 180);
    })();

    // Scanner: visits every basket up to the target.
    const scanRun = (async (): Promise<void> => {
      for (let i = 0; i <= targetIndex; i++) {
        await tweenTo(scanner, { x: centerOf(i) }, SCAN_MS * 0.55);
        audioManager.playTone(160, 35, "square");
        await new Promise((resolve) =>
          this.scene.time.delayedCall(SCAN_MS * 0.45, resolve),
        );
      }
    })();

    await Promise.all([bitRun, scanRun]);
    await new Promise((resolve) => this.scene.time.delayedCall(900, resolve));

    for (const obj of [...ghosts, bit, scanner]) {
      this.scene.tweens.add({
        targets: obj,
        alpha: 0,
        duration: 360,
        onComplete: () => obj.destroy(),
      });
    }
    this.playing = false;
  }
}
