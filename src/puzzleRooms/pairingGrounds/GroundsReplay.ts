/**
 * GroundsReplay — the grounds' optional post-clear demonstration.
 *
 * Ghost stones appear; spectral Bit lifts one, and ONLY its true partner
 * pulses bright — he glides straight to it and the pair settles level.
 * Below, a dim scanner dot grinds ghost pair after ghost pair. Knowing
 * what you need beats checking everything — shown, not told (VISION §3).
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";

const GHOST_W = 34;
const GHOST_H = 28;
const GHOST_GAP = 10;

export class GroundsReplay {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Replay one round: anchor the first value of its first valid pair. */
  async play(
    values: ReadonlyArray<number>,
    pair: readonly [number, number],
    y: number,
  ): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "Bit lifts one stone and already knows what it needs — one walk. The scanner below checks pair after pair.",
      false,
    );

    const { width } = this.scene.cameras.main;
    const count = values.length;
    const rowW = count * GHOST_W + (count - 1) * GHOST_GAP;
    const startX = Math.round((width / 2 - rowW / 2) / 8) * 8 + GHOST_W / 2;
    const centerOf = (i: number): number => startX + i * (GHOST_W + GHOST_GAP);
    const anchorIndex = values.indexOf(pair[0]);
    const partnerIndex = values.indexOf(pair[1]);

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
          .text(0, 0, String(values[i]), {
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
      .circle(centerOf(anchorIndex), y - GHOST_H - 10, 5, COLORS.CYAN_GLOW, 1)
      .setDepth(56);
    const scanner = this.scene.add
      .circle(centerOf(0), y + GHOST_H + 6, 4, 0xd86a6a, 0.85)
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

    // The scanner grinds pairs below, independent and dim.
    const scanRun = (async (): Promise<void> => {
      for (let i = 0; i < count - 1 && this.playing; i++) {
        for (let j = i + 1; j < Math.min(i + 4, count); j++) {
          await tweenTo(scanner, { x: centerOf(j) }, 180);
          audioManager.playTone(150, 25, "square");
        }
      }
    })();

    // Bit: lift the anchor, the true partner alone pulses, one glide.
    await tweenTo(bit, { y: y - GHOST_H - 20 }, 220);
    const partner = ghosts[partnerIndex];
    if (partner) {
      this.scene.tweens.add({
        targets: partner,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 240,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
      });
    }
    await new Promise((resolve) => this.scene.time.delayedCall(700, resolve));
    await tweenTo(bit, { x: centerOf(partnerIndex) }, 420);
    audioManager.playTone(620, 140, "triangle");

    await new Promise((resolve) => this.scene.time.delayedCall(1100, resolve));
    this.playing = false;
    await scanRun.catch(() => undefined);
    for (const obj of [...ghosts, bit, scanner]) {
      this.scene.tweens.add({
        targets: obj,
        alpha: 0,
        duration: 360,
        onComplete: () => obj.destroy(),
      });
    }
  }
}
