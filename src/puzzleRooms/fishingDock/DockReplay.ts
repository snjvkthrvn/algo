/**
 * DockReplay — the dock's optional post-clear demonstration.
 *
 * A ghost dock slides a spectral net one full pass: every step the
 * entering basket flashes bright and the leaving one dims — nothing in
 * the middle is touched. At the heaviest window the weigh-beam holds.
 * The edges are the lesson; no text explains it (VISION §3).
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import { bestWindowStart } from "./dockPlan";

const GHOST_W = 28;
const GHOST_GAP = 8;
const STEP_MS = 480;

export class DockReplay {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  async play(
    values: ReadonlyArray<number>,
    k: number,
    y: number,
  ): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "One pass of the net: each slide only the entering and leaving baskets change — the beam holds at the heaviest catch.",
      false,
    );

    const { width } = this.scene.cameras.main;
    const n = values.length;
    const pitch = GHOST_W + GHOST_GAP;
    const rowW = n * GHOST_W + (n - 1) * GHOST_GAP;
    const startX = Math.round((width / 2 - rowW / 2) / 8) * 8 + GHOST_W / 2;
    const centerOf = (i: number): number => startX + i * pitch;

    const ghosts: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < n; i++) {
      const ghost = this.scene.add
        .container(centerOf(i), y)
        .setDepth(55)
        .setAlpha(0);
      ghost.add(
        this.scene.add
          .rectangle(0, 0, GHOST_W, GHOST_W - 6, COLORS.CYAN_GLOW, 0.16)
          .setStrokeStyle(1, COLORS.CYAN_GLOW, 0.8),
      );
      ghost.add(
        this.scene.add
          .text(0, 0, String(values[i]), {
            fontSize: "9px",
            fontFamily: FONTS.RETRO,
            color: "#9ff7f7",
          })
          .setOrigin(0.5),
      );
      ghosts.push(ghost);
      this.scene.tweens.add({
        targets: ghost,
        alpha: 1,
        duration: 200,
        delay: i * 30,
      });
    }

    const frame = this.scene.add.graphics().setDepth(56);
    const paintFrame = (start: number): void => {
      frame.clear();
      frame.lineStyle(2, 0x9ff7f7, 0.95);
      frame.strokeRoundedRect(
        centerOf(start) - GHOST_W / 2 - 3,
        y - GHOST_W / 2 - 5,
        k * pitch - GHOST_GAP + 6,
        GHOST_W + 6,
        6,
      );
    };
    paintFrame(0);

    const best = bestWindowStart(values, k);
    for (let start = 1; start <= n - k; start++) {
      await new Promise((resolve) =>
        this.scene.time.delayedCall(STEP_MS, resolve),
      );
      paintFrame(start);
      // The edges: entering flashes, leaving dims. The middle sleeps.
      const entering = ghosts[start + k - 1];
      const leaving = ghosts[start - 1];
      audioManager.playTone(520, 35, "triangle");
      this.scene.tweens.add({
        targets: entering,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 130,
        yoyo: true,
        ease: "Back.easeOut",
      });
      this.scene.tweens.add({
        targets: leaving,
        alpha: 0.45,
        duration: 130,
        yoyo: true,
      });
      if (start === best) {
        await new Promise((resolve) =>
          this.scene.time.delayedCall(STEP_MS * 0.6, resolve),
        );
        audioManager.playTone(660, 200, "sine");
        for (let i = start; i < start + k; i++) {
          this.scene.tweens.add({
            targets: ghosts[i],
            y: y - 10,
            duration: 240,
            yoyo: true,
            ease: "Sine.easeOut",
          });
        }
      }
    }

    await new Promise((resolve) => this.scene.time.delayedCall(1100, resolve));
    for (const obj of [...ghosts]) {
      this.scene.tweens.add({
        targets: obj,
        alpha: 0,
        duration: 360,
        onComplete: () => obj.destroy(),
      });
    }
    this.scene.tweens.add({
      targets: frame,
      alpha: 0,
      duration: 360,
      onComplete: () => frame.destroy(),
    });
    this.playing = false;
  }
}
