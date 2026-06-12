/**
 * GlitchSplasher — Glitch flailing at his own mini-rack in the corner:
 * random pair swaps anywhere, forever, never converging on the reversal.
 * The player who trades only the pairs that differ finishes while he's
 * still soaking himself. Pure theatre; never blocks the player.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { VISUAL_REVAMP_KEYS } from "../../config/assets";
import { GLITCH_FAILURE_TAUNTS } from "../../data/dialogue/glitch_dialogue";

const MINI_W = 22;
const MINI_GAP = 7;
const SPLASH_EVERY_MS = 1400;

function pick(lines: ReadonlyArray<string>): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

export class GlitchSplasher {
  private scene: Phaser.Scene;
  private originX: number;
  private originY: number;
  private minis: Phaser.GameObjects.Rectangle[] = [];
  private glitch: Phaser.GameObjects.GameObject &
    Phaser.GameObjects.Components.Transform;
  private timer: Phaser.Time.TimerEvent | null = null;
  private splashes = 0;

  constructor(scene: Phaser.Scene, originX: number, originY: number) {
    this.scene = scene;
    this.originX = originX;
    this.originY = originY;
    this.glitch = scene.textures.exists(VISUAL_REVAMP_KEYS.GLITCH)
      ? scene.add
          .image(originX - 26, originY - 28, VISUAL_REVAMP_KEYS.GLITCH)
          .setDisplaySize(30, 38)
          .setDepth(22)
      : scene.add
          .rectangle(originX - 26, originY - 28, 18, 26, 0x8a3a3a, 1)
          .setStrokeStyle(2, 0x5a2424, 1)
          .setDepth(22);
    scene.tweens.add({
      targets: this.glitch,
      y: originY - 32,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  setRow(count: number): void {
    this.minis.forEach((mini) => mini.destroy());
    this.minis = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      this.minis.push(
        this.scene.add
          .rectangle(
            this.originX + i * (MINI_W + MINI_GAP),
            this.originY,
            MINI_W,
            MINI_W - 6,
            0x6e5a3a,
            0.9,
          )
          .setStrokeStyle(1, 0x46381e, 1)
          .setDepth(20),
      );
    }
    this.timer?.remove();
    this.timer = this.scene.time.addEvent({
      delay: SPLASH_EVERY_MS,
      loop: true,
      callback: () => this.flail(),
    });
  }

  private flail(): void {
    if (this.minis.length < 2) return;
    const i = Phaser.Math.Between(0, this.minis.length - 1);
    let j = Phaser.Math.Between(0, this.minis.length - 1);
    if (i === j) j = (j + 1) % this.minis.length;
    const a = this.minis[i];
    const b = this.minis[j];
    const ax = a.x;
    this.scene.tweens.add({
      targets: a,
      x: b.x,
      y: this.originY - 8,
      duration: 360,
      yoyo: false,
      ease: "Sine.easeInOut",
      onComplete: () => a.setY(this.originY),
    });
    this.scene.tweens.add({
      targets: b,
      x: ax,
      duration: 360,
      ease: "Sine.easeInOut",
    });
    this.splashes++;
    if (this.splashes % 9 === 0) this.bark();
  }

  stop(): void {
    this.timer?.remove();
    this.timer = null;
  }

  private bark(): void {
    const bark = this.scene.add
      .text(this.originX + 30, this.originY - 54, pick(GLITCH_FAILURE_TAUNTS), {
        fontSize: "9px",
        fontFamily: FONTS.RETRO,
        color: "#d8a0a0",
        backgroundColor: "#1a2e2e",
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
