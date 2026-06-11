/**
 * MillReplay — the mill's optional post-clear demonstration.
 *
 * One crop, shown twice over ghost bins: first sighting, spectral Bit
 * PACES the crop's count bin to bin, wrapping at the row's end, and lands
 * on its home (the wrapping walk is the rule). Then the SAME crop again —
 * one straight glide to the bin it already knows. Learn once, then O(1),
 * with no text doing the explaining (VISION §3).
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import { paceTarget } from "./millRules";

const GHOST_W = 34;
const GHOST_H = 26;
const GHOST_GAP = 10;
const HOP_MS = 200;

export class MillReplay {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Replay one crop's weight over `count` ghost bins at y. */
  async play(weight: number, count: number, y: number): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "Bit paces the crop's count along the bins, wrapping at the end — then takes the repeat in one straight walk.",
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
      .circle(centerOf(0), y - GHOST_H - 10, 5, COLORS.CYAN_GLOW, 1)
      .setDepth(56);

    const tweenTo = (
      props: Record<string, number>,
      duration: number,
    ): Promise<void> =>
      new Promise((resolve) =>
        this.scene.tweens.add({
          targets: bit,
          ...props,
          duration,
          ease: "Sine.easeInOut",
          onComplete: () => resolve(),
        }),
      );

    // First sighting: pace the full count, wrapping. (Cap the hops shown:
    // pace weight % count + count once when weight >= count, so big weights
    // still SHOW a wrap without 22 literal hops.)
    const home = paceTarget(weight, count);
    const hopsToShow = weight >= count ? count + home : home;
    for (let hop = 1; hop <= hopsToShow; hop++) {
      await tweenTo({ x: centerOf(hop % count) }, HOP_MS);
      audioManager.playTone(420 + (hop % count) * 30, 30, "triangle");
    }
    await tweenTo({ y: y - GHOST_H - 20 }, 160);
    await tweenTo({ y: y - GHOST_H - 10 }, 160);
    await new Promise((resolve) => this.scene.time.delayedCall(500, resolve));

    // The repeat: straight to the known home in one glide.
    await tweenTo({ x: centerOf(0) }, 260);
    await new Promise((resolve) => this.scene.time.delayedCall(250, resolve));
    await tweenTo({ x: centerOf(home) }, 340);
    audioManager.playTone(700, 110, "triangle");

    await new Promise((resolve) => this.scene.time.delayedCall(900, resolve));
    for (const obj of [...ghosts, bit]) {
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
