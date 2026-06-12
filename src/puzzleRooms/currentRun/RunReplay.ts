/**
 * RunReplay — the run's optional post-clear demonstration.
 *
 * A ghost float-line rides the full stream once: the right edge extends
 * float by float; each duplicate flashes a red tangle and the left tie
 * pays out until it clears; the longest clean stretch glows as the ride
 * passes it. The rhythm is the lesson; no text explains it (VISION §3).
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import { riderWalk } from "./runPlan";

const GHOST_W = 26;
const GHOST_GAP = 8;
const STEP_MS = 420;

export class RunReplay {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  async play(letters: ReadonlyArray<string>, y: number): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "One ride downstream: the net grows while the catch stays clean, pays out the left tie at every twin, and the longest clean stretch glows.",
      false,
    );

    const { width } = this.scene.cameras.main;
    const n = letters.length;
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
          .ellipse(0, 0, GHOST_W, GHOST_W - 6, COLORS.CYAN_GLOW, 0.16)
          .setStrokeStyle(1, COLORS.CYAN_GLOW, 0.8),
      );
      ghost.add(
        this.scene.add
          .text(0, 0, letters[i], {
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
        delay: i * 25,
      });
    }

    const frame = this.scene.add.graphics().setDepth(56);
    const paint = (left: number, right: number, snagged: boolean): void => {
      frame.clear();
      frame.lineStyle(2, snagged ? 0xd8745a : 0x9ff7f7, 0.95);
      frame.strokeRoundedRect(
        centerOf(left) - GHOST_W / 2 - 3,
        y - GHOST_W / 2 - 5,
        (right - left) * pitch + GHOST_W + 6,
        GHOST_W + 8,
        6,
      );
    };

    const { bestStart, bestLength } = riderWalk(letters);
    const inWindow = new Set<string>([letters[0]]);
    let left = 0;
    paint(0, 0, false);

    for (let right = 1; right < n; right++) {
      await new Promise((resolve) =>
        this.scene.time.delayedCall(STEP_MS, resolve),
      );
      while (inWindow.has(letters[right])) {
        paint(left, right, true);
        audioManager.playTone(170, 50, "square");
        this.scene.tweens.add({
          targets: ghosts[left],
          alpha: 0.4,
          duration: 140,
        });
        inWindow.delete(letters[left]);
        left++;
        await new Promise((resolve) =>
          this.scene.time.delayedCall(STEP_MS * 0.55, resolve),
        );
      }
      inWindow.add(letters[right]);
      paint(left, right, false);
      audioManager.playTone(480, 30, "triangle");
      if (left === bestStart && right === bestStart + bestLength - 1) {
        for (let i = left; i <= right; i++) {
          this.scene.tweens.add({
            targets: ghosts[i],
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 220,
            yoyo: true,
            ease: "Back.easeOut",
          });
        }
        audioManager.playTone(660, 200, "sine");
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
