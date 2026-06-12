/**
 * CrossingReplay — the crossing's optional post-clear demonstration.
 *
 * Ghost crates of the final row appear; two spectral dots walk inward
 * from BOTH ends together. At each facing pair: if the values differ the
 * pair flash-trades; if they already mirror each other the pair SHIMMERS
 * and the dots simply step on — the skip is the lesson. They meet in the
 * middle and the row runs backwards. No text explains it (VISION §3).
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";

const GHOST_W = 32;
const GHOST_H = 26;
const GHOST_GAP = 8;
const STEP_MS = 460;

export class CrossingReplay {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  async play(startValues: ReadonlyArray<number>, y: number): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "Two walkers step inward together. Pairs that differ trade; pairs that already mirror are simply passed by.",
      false,
    );

    const { width } = this.scene.cameras.main;
    const n = startValues.length;
    const rowW = n * GHOST_W + (n - 1) * GHOST_GAP;
    const startX = Math.round((width / 2 - rowW / 2) / 8) * 8 + GHOST_W / 2;
    const centerOf = (i: number): number => startX + i * (GHOST_W + GHOST_GAP);

    let values = [...startValues];
    const ghosts: Phaser.GameObjects.Container[] = [];
    const labels: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < n; i++) {
      const ghost = this.scene.add
        .container(centerOf(i), y)
        .setDepth(55)
        .setAlpha(0);
      ghost.add(
        this.scene.add
          .rectangle(0, 0, GHOST_W, GHOST_H, COLORS.CYAN_GLOW, 0.18)
          .setStrokeStyle(1, COLORS.CYAN_GLOW, 0.8),
      );
      const label = this.scene.add
        .text(0, 0, String(values[i]), {
          fontSize: "10px",
          fontFamily: FONTS.RETRO,
          color: "#9ff7f7",
        })
        .setOrigin(0.5);
      ghost.add(label);
      ghosts.push(ghost);
      labels.push(label);
      this.scene.tweens.add({
        targets: ghost,
        alpha: 1,
        duration: 220,
        delay: i * 40,
      });
    }

    const left = this.scene.add
      .circle(centerOf(0), y - GHOST_H - 8, 5, COLORS.CYAN_GLOW, 1)
      .setDepth(56);
    const right = this.scene.add
      .circle(centerOf(n - 1), y - GHOST_H - 8, 5, COLORS.CYAN_GLOW, 1)
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

    for (let i = 0; i < Math.floor(n / 2); i++) {
      const j = n - 1 - i;
      await Promise.all([
        tweenTo(left, { x: centerOf(i) }, STEP_MS * 0.6),
        tweenTo(right, { x: centerOf(j) }, STEP_MS * 0.6),
      ]);
      if (values[i] !== values[j]) {
        audioManager.playTone(520, 70, "triangle");
        const tmp = values[i];
        values = [...values];
        values[i] = values[j];
        values[j] = tmp;
        labels[i].setText(String(values[i]));
        labels[j].setText(String(values[j]));
        for (const ghost of [ghosts[i], ghosts[j]]) {
          this.scene.tweens.add({
            targets: ghost,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 140,
            yoyo: true,
            ease: "Back.easeOut",
          });
        }
      } else {
        // The skip: a quiet shimmer, then onward.
        audioManager.playTone(720, 50, "sine");
        for (const ghost of [ghosts[i], ghosts[j]]) {
          this.scene.tweens.add({
            targets: ghost,
            alpha: 0.5,
            duration: 160,
            yoyo: true,
            repeat: 1,
          });
        }
      }
      await new Promise((resolve) =>
        this.scene.time.delayedCall(STEP_MS * 0.4, resolve),
      );
    }

    await new Promise((resolve) => this.scene.time.delayedCall(900, resolve));
    for (const obj of [...ghosts, left, right]) {
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
