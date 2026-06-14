/**
 * MirrorSerpent — the boss body in the Serpent's Coil (Twin Rivers finale).
 *
 * The serpent looms over the north basin and interferes with the player's
 * crossing. Every act of sabotage is TELEGRAPHED: windUp() surfaces a coil
 * ring at the target and looms toward it for ~900ms before the scene applies
 * the effect — boss pressure the player can read and race, not a hidden timer
 * (VISION §6: urgency belongs to bosses, but it must be fair urgency).
 *
 * Texture-guarded: a stacked teal coil silhouette until/unless the figure art
 * is loaded (BOSS_MIRROR_SERPENT_FIGURE ships with the visual revamp).
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { VISUAL_REVAMP_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import { JuiceSystem } from "../../systems/JuiceSystem";

const WINDUP_MS = 900;

/** Bespoke hiss register — the Glitch taunt pool is wrong for a serpent. */
export const SERPENT_HISSES: ReadonlyArray<string> = [
  "Ssso eager to finissssh…",
  "The river bendsss to me.",
  "Undo… undo… all your careful work.",
  "You cannot out-coil the coil.",
  "Sssettle nothing. I unsssettle it.",
  "Twissst again, little wader.",
];

function pick(lines: ReadonlyArray<string>): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

type Loomable = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.AlphaSingle;

export class MirrorSerpent {
  private scene: Phaser.Scene;
  private body: Loomable;
  private homeX: number;
  private homeY: number;
  private defeated = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.homeX = x;
    this.homeY = y;
    this.body = scene.textures.exists(
      VISUAL_REVAMP_KEYS.BOSS_MIRROR_SERPENT_FIGURE,
    )
      ? (scene.add
          .image(x, y, VISUAL_REVAMP_KEYS.BOSS_MIRROR_SERPENT_FIGURE)
          .setDisplaySize(132, 132)
          .setDepth(18) as unknown as Loomable)
      : this.buildCoilFallback(x, y);

    // The loom: a slow sinuous sway, like a coil riding a swell.
    scene.tweens.add({
      targets: this.body,
      y: y - 7,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    scene.tweens.add({
      targets: this.body,
      angle: { from: -2.5, to: 2.5 },
      duration: 3300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Idle scale-glints: a faint ripple ring widens across the basin.
    scene.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => this.scaleGlint(),
    });
  }

  private buildCoilFallback(x: number, y: number): Loomable {
    const coil = this.scene.add.container(x, y).setDepth(18);
    // Three stacked rings narrowing upward into a raised head.
    const rings: Array<[number, number, number, number]> = [
      [0, 34, 96, 44],
      [6, 6, 76, 38],
      [-4, -22, 56, 32],
    ];
    for (const [dx, dy, w, h] of rings) {
      coil.add(
        this.scene.add
          .ellipse(dx, dy, w, h, 0x16383d, 0.96)
          .setStrokeStyle(3, 0x3f7d78, 1),
      );
    }
    const head = this.scene.add
      .ellipse(-2, -46, 40, 30, 0x1d4a4a, 1)
      .setStrokeStyle(3, 0x6fd0c0, 1);
    const eye = this.scene.add.circle(-10, -50, 3, 0xe8d27a, 1);
    coil.add(head);
    coil.add(eye);
    return coil as unknown as Loomable;
  }

  /** A faint water-glint ripple expanding across the basin surface. */
  private scaleGlint(): void {
    if (this.defeated) return;
    const ring = this.scene.add
      .circle(this.homeX + Phaser.Math.Between(-30, 30), this.homeY + 52, 14)
      .setStrokeStyle(2, 0x6fd0c0, 0.5)
      .setDepth(16);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 0.5, to: 2.4 },
      alpha: { from: 0.5, to: 0 },
      duration: 1600,
      ease: "Sine.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Telegraph sabotage at a world position: the coil looms toward it and a
   * surfacing-coil ring warns there for ~900ms the player can read and race.
   * Resolves when the wind-up lands; the SCENE then applies the effect.
   */
  windUp(targetX: number, targetY: number): Promise<void> {
    if (this.defeated) return Promise.resolve();
    audioManager.playTone(120, 220, "sine");
    const ring = this.scene.add
      .circle(targetX, targetY, 30, 0x000000, 0)
      .setStrokeStyle(3, 0x5ec8be, 0.9)
      .setDepth(40);
    const inner = this.scene.add
      .circle(targetX, targetY, 16, 0x000000, 0)
      .setStrokeStyle(2, 0x9a7ad8, 0.7)
      .setDepth(40);
    this.scene.tweens.add({
      targets: [ring, inner],
      scale: { from: 1.7, to: 0.7 },
      alpha: { from: 0.9, to: 0.25 },
      angle: { from: 0, to: 90 },
      duration: WINDUP_MS,
      ease: "Sine.easeIn",
      onComplete: () => {
        ring.destroy();
        inner.destroy();
      },
    });
    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: this.body,
        tweens: [
          {
            x: this.homeX + (targetX < this.homeX ? -22 : 22),
            duration: WINDUP_MS * 0.7,
            ease: "Quad.easeIn",
          },
          { x: this.homeX, duration: WINDUP_MS * 0.3, ease: "Quad.easeOut" },
        ],
        onComplete: () => {
          JuiceSystem.cameraShake(this.scene, 90, 0.003);
          resolve();
        },
      });
    });
  }

  /** A clamped hiss over the serpent's head. */
  bark(line?: string): void {
    if (this.defeated) return;
    const bark = this.scene.add
      .text(this.homeX, this.homeY - 80, line ?? pick(SERPENT_HISSES), {
        fontSize: "9px",
        fontFamily: FONTS.RETRO,
        color: "#9ce8d8",
        backgroundColor: "#10302e",
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

  /** Thrash, sink beneath the surface, and let the basin still to glass. */
  defeat(): Promise<void> {
    this.defeated = true;
    audioManager.playTone(80, 520, "sine");
    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: this.body,
        tweens: [
          { x: this.homeX - 14, duration: 110, yoyo: true, repeat: 3 },
          { angle: 14, duration: 160, yoyo: true, repeat: 1 },
          {
            y: this.homeY + 64,
            alpha: 0,
            scale: 0.7,
            duration: 720,
            ease: "Quad.easeIn",
          },
        ],
        onComplete: () => {
          // The basin stills: one last wide ripple spreads and fades to glass.
          for (let i = 0; i < 3; i++) {
            const ring = this.scene.add
              .circle(this.homeX, this.homeY + 40, 18)
              .setStrokeStyle(2, 0x8fd8cc, 0.6)
              .setDepth(16);
            this.scene.tweens.add({
              targets: ring,
              scale: { from: 0.6, to: 4 + i },
              alpha: { from: 0.6, to: 0 },
              duration: 1100 + i * 250,
              delay: i * 160,
              ease: "Sine.easeOut",
              onComplete: () => ring.destroy(),
            });
          }
          resolve();
        },
      });
    });
  }
}
