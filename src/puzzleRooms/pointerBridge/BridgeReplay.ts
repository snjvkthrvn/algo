/**
 * BridgeReplay — the bridge's optional post-clear demonstration.
 *
 * A spectral piling line with its own ghost rope replays the canonical
 * convergent walk: before each step the rope visibly answers — sagging
 * heavy pulls the RIGHT dot inward, stretching light pulls the LEFT —
 * until it levels and lashes down. The rope steers; no text explains it
 * (VISION §3).
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import { optimalWalk } from "./bridgePlan";

const GHOST_W = 30;
const GHOST_GAP = 8;
const STEP_MS = 520;

export class BridgeReplay {
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
    target: number,
    y: number,
  ): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "The rope steers the walk: when the pair weighs heavy the right buoy steps in; when it runs light, the left. Level means lock.",
      false,
    );

    const { width } = this.scene.cameras.main;
    const n = values.length;
    const rowW = n * GHOST_W + (n - 1) * GHOST_GAP;
    const startX = Math.round((width / 2 - rowW / 2) / 8) * 8 + GHOST_W / 2;
    const centerOf = (i: number): number => startX + i * (GHOST_W + GHOST_GAP);

    const ghosts: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < n; i++) {
      const ghost = this.scene.add
        .container(centerOf(i), y)
        .setDepth(55)
        .setAlpha(0);
      ghost.add(
        this.scene.add
          .ellipse(0, 0, GHOST_W, GHOST_W - 8, COLORS.CYAN_GLOW, 0.16)
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
        delay: i * 35,
      });
    }

    let left = 0;
    let right = n - 1;
    const rope = this.scene.add.graphics().setDepth(56);
    const paintGhostRope = (): void => {
      rope.clear();
      const sum = values[left] + values[right];
      const diff = sum - target;
      const sag = diff === 0 ? 4 : diff > 0 ? Math.min(32, 10 + diff * 2) : 1;
      const color = diff === 0 ? 0x9ff7f7 : diff > 0 ? 0xd8a05a : 0x7a9a9a;
      const yTop = y - 22;
      rope.lineStyle(2, color, 0.9);
      rope.beginPath();
      rope.moveTo(centerOf(left), yTop);
      rope.lineTo((centerOf(left) + centerOf(right)) / 2, yTop + sag);
      rope.lineTo(centerOf(right), yTop);
      rope.strokePath();
    };
    paintGhostRope();

    for (const step of optimalWalk(values, target).steps) {
      await new Promise((resolve) =>
        this.scene.time.delayedCall(STEP_MS, resolve),
      );
      if (step === "left") left++;
      else right--;
      audioManager.playTone(step === "left" ? 360 : 300, 50, "triangle");
      paintGhostRope();
    }
    await new Promise((resolve) =>
      this.scene.time.delayedCall(STEP_MS, resolve),
    );
    audioManager.playTone(660, 200, "sine");
    for (const ghost of [ghosts[left], ghosts[right]]) {
      this.scene.tweens.add({
        targets: ghost,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 200,
        yoyo: true,
        ease: "Back.easeOut",
      });
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
      targets: rope,
      alpha: 0,
      duration: 360,
      onComplete: () => rope.destroy(),
    });
    this.playing = false;
  }
}
