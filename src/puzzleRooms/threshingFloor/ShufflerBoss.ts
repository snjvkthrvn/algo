/**
 * ShufflerBoss — the boss body on the Threshing Floor.
 *
 * The Shuffler looms on the north platform and physically interferes with
 * the player's work. Every act of sabotage is TELEGRAPHED: windUp() sweeps
 * his arm toward the target and rings a warning shimmer there for ~900ms
 * before the scene applies the effect — boss pressure the player can read
 * and race, not a hidden timer (VISION §6: urgency belongs to bosses, but
 * it should be fair urgency).
 *
 * Texture-guarded: a dark husk silhouette until/unless the figure art is
 * loaded (BOSS_SHUFFLER_FIGURE ships with the visual revamp).
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { VISUAL_REVAMP_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { GLITCH_FAILURE_TAUNTS } from "../../data/dialogue/glitch_dialogue";

const WINDUP_MS = 900;

function pick(lines: ReadonlyArray<string>): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

export class ShufflerBoss {
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.GameObject &
    Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.Components.AlphaSingle;
  private homeX: number;
  private homeY: number;
  private defeated = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.homeX = x;
    this.homeY = y;
    this.body = scene.textures.exists(VISUAL_REVAMP_KEYS.BOSS_SHUFFLER_FIGURE)
      ? scene.add
          .image(x, y, VISUAL_REVAMP_KEYS.BOSS_SHUFFLER_FIGURE)
          .setDisplaySize(120, 140)
          .setDepth(18)
      : (scene.add
          .ellipse(x, y, 84, 120, 0x2a2330, 0.95)
          .setStrokeStyle(3, 0x4a3a52, 1)
          .setDepth(18) as unknown as typeof this.body);
    // The loom: slow bob with occasional glitch-jitter.
    scene.tweens.add({
      targets: this.body,
      y: y - 8,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    scene.time.addEvent({
      delay: 3400,
      loop: true,
      callback: () => {
        if (this.defeated) return;
        this.scene.tweens.add({
          targets: this.body,
          x: this.homeX + Phaser.Math.Between(-5, 5),
          duration: 60,
          yoyo: true,
          repeat: 3,
          onComplete: () => this.body.setX(this.homeX),
        });
      },
    });
  }

  /**
   * Telegraph sabotage at a world position: arm-sweep toward it plus a
   * warning shimmer ring the player can read and race. Resolves when the
   * wind-up lands; the SCENE then applies the actual effect.
   */
  windUp(targetX: number, targetY: number): Promise<void> {
    if (this.defeated) return Promise.resolve();
    audioManager.playTone(95, 200, "sawtooth");
    const ring = this.scene.add
      .circle(targetX, targetY, 30, 0x000000, 0)
      .setStrokeStyle(3, 0x9a4ad8, 0.9)
      .setDepth(40);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 1.6, to: 0.7 },
      alpha: { from: 0.9, to: 0.2 },
      duration: WINDUP_MS,
      ease: "Sine.easeIn",
      onComplete: () => ring.destroy(),
    });
    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: this.body,
        tweens: [
          { x: this.homeX + (targetX < this.homeX ? -18 : 18), duration: WINDUP_MS * 0.7, ease: "Quad.easeIn" },
          { x: this.homeX, duration: WINDUP_MS * 0.3, ease: "Quad.easeOut" },
        ],
        onComplete: () => {
          JuiceSystem.cameraShake(this.scene, 90, 0.003);
          resolve();
        },
      });
    });
  }

  /** A clamped taunt over the boss's head. */
  bark(line?: string): void {
    if (this.defeated) return;
    const bark = this.scene.add
      .text(this.homeX, this.homeY - 84, line ?? pick(GLITCH_FAILURE_TAUNTS), {
        fontSize: "9px",
        fontFamily: FONTS.RETRO,
        color: "#d8a0e8",
        backgroundColor: "#221a2e",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 200 },
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
      delay: 2600,
      duration: 400,
      onComplete: () => bark.destroy(),
    });
  }

  /** Stagger and dissolve into husk-dust. */
  defeat(): Promise<void> {
    this.defeated = true;
    audioManager.playTone(70, 500, "sawtooth");
    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: this.body,
        tweens: [
          { x: this.homeX - 12, duration: 120, yoyo: true, repeat: 2 },
          { y: this.homeY + 16, alpha: 0.6, duration: 420, ease: "Quad.easeIn" },
          { alpha: 0, scale: 0.85, duration: 600, ease: "Sine.easeIn" },
        ],
        onComplete: () => {
          for (let i = 0; i < 14; i++) {
            const dust = this.scene.add
              .rectangle(
                this.homeX + Phaser.Math.Between(-40, 40),
                this.homeY + Phaser.Math.Between(-50, 30),
                3,
                3,
                0x9a8a6a,
                0.9,
              )
              .setDepth(19);
            this.scene.tweens.add({
              targets: dust,
              y: dust.y + Phaser.Math.Between(30, 70),
              alpha: 0,
              duration: Phaser.Math.Between(600, 1100),
              ease: "Quad.easeIn",
              onComplete: () => dust.destroy(),
            });
          }
          resolve();
        },
      });
    });
  }
}
