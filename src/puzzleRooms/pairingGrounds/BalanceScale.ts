/**
 * BalanceScale — the Pairing Grounds' diegetic target and judge.
 *
 * The round's target is carved on the scale's plaque (a numeral, never a
 * formula). Offering a pair sends both values' ghosts arcing onto the
 * pans: a true pair settles the beam level with a chime and the pair
 * locks onto the dais; a false pair slams the beam sideways with a camera
 * nudge — the caller cracks the stones and keeps the anchor.
 *
 * Texture-guarded: a procedural post-and-beam scale until art lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { PAIRING_GROUNDS_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import { JuiceSystem } from "../../systems/JuiceSystem";

const BEAM_W = 120;

export class BalanceScale {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private beam: Phaser.GameObjects.Rectangle | null = null;
  private targetText!: Phaser.GameObjects.Text;
  private lockedPairs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    if (scene.textures.exists(PAIRING_GROUNDS_KEYS.SCALE)) {
      scene.add
        .image(x, y, PAIRING_GROUNDS_KEYS.SCALE)
        .setDisplaySize(150, 150)
        .setDepth(14);
    } else {
      scene.add
        .rectangle(x, y + 30, 12, 70, 0x6e5232, 1)
        .setStrokeStyle(2, 0x46341e, 1)
        .setDepth(14);
      this.beam = scene.add
        .rectangle(x, y - 6, BEAM_W, 8, 0x9a7a3a, 1)
        .setStrokeStyle(2, 0x5e4a22, 1)
        .setDepth(15);
    }
    this.targetText = scene.add
      .text(x, y + 64, "", {
        fontSize: "14px",
        fontFamily: FONTS.RETRO,
        color: "#f4e3c1",
        backgroundColor: "#2e2417",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(16);
  }

  /** Carve the round's target onto the plaque. */
  setTarget(target: number): void {
    this.targetText.setText(`⚖ ${target}`);
  }

  /**
   * Judge an offered pair. Resolves true (settled level, pair locked)
   * or false (slammed sideways) once the animation lands.
   */
  offer(a: number, b: number, target: number): Promise<boolean> {
    const correct = a + b === target;
    const beam = this.beam;

    return new Promise((resolve) => {
      const land = (): void => {
        if (correct) {
          audioManager.playSFX("scale_settle");
          audioManager.playTone(620, 160, "triangle");
          this.lockedPairs++;
          // The locked pair rests on the dais as a small twin-stone trophy —
          // no arithmetic text in the room (VISION §4).
          const px = this.x - 50 + this.lockedPairs * 24;
          this.scene.add
            .ellipse(px - 4, this.y + 84, 10, 12, 0x8d8d96, 1)
            .setStrokeStyle(1, 0x5a5a64, 1)
            .setDepth(16);
          this.scene.add
            .ellipse(px + 5, this.y + 86, 10, 12, 0x8d8d96, 1)
            .setStrokeStyle(1, 0x5a5a64, 1)
            .setDepth(16);
          resolve(true);
          return;
        }
        audioManager.playSFX("scale_slam");
        audioManager.playTone(120, 160, "square");
        JuiceSystem.cameraShake(this.scene, 100, 0.003);
        if (beam) {
          this.scene.tweens.add({
            targets: beam,
            angle: a > b ? -16 : 16,
            duration: 140,
            yoyo: true,
            ease: "Quad.easeOut",
            onComplete: () => beam.setAngle(0),
          });
        }
        resolve(false);
      };

      if (beam) {
        this.scene.tweens.add({
          targets: beam,
          y: this.y - 2,
          duration: 180,
          yoyo: true,
          ease: "Sine.easeInOut",
          onComplete: land,
        });
      } else {
        this.scene.time.delayedCall(220, land);
      }
    });
  }
}
