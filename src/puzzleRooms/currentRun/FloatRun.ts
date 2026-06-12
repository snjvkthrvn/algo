/**
 * FloatRun — the Current Run's lettered floats and the drift-net riding them.
 *
 * The net spans [leftTie .. rightEdge]. When two same letters sit inside
 * it, a taut red TANGLE line snaps between them and the frame tints warm —
 * the snag IS the readout; no LENGTH/BEST/REPEAT text exists. Releasing
 * the left tie pays a float out of the net. Claims fly the run's floats
 * to the east post; a bad claim splashes persistent debris.
 *
 * Texture-guarded: cork-ring floats until/unless art exists; debris reuses
 * the mirror-crossing sheet.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { MIRROR_CROSSING_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import { firstSnag } from "./runPlan";
import type { RunGeometry } from "./runRules";

const FLOAT_W = 48;
const GAP_W = 16;

interface FloatPiece {
  readonly letter: string;
  readonly container: Phaser.GameObjects.Container;
}

export class FloatRun {
  private scene: Phaser.Scene;
  private floats: FloatPiece[] = [];
  private debris: Phaser.GameObjects.GameObject[] = [];
  private laneY: number;
  private walkY: number;
  private reduceMotion: boolean;
  private frame: Phaser.GameObjects.Graphics;
  private tangle: Phaser.GameObjects.Graphics;
  private letters: string[] = [];
  private busy = false;

  constructor(
    scene: Phaser.Scene,
    laneY: number,
    walkY: number,
    reduceMotion: boolean,
  ) {
    this.scene = scene;
    this.laneY = laneY;
    this.walkY = walkY;
    this.reduceMotion = reduceMotion;
    this.frame = scene.add.graphics().setDepth(26);
    this.tangle = scene.add.graphics().setDepth(27);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  geometry(): RunGeometry {
    return {
      startX: this.floatX(0),
      pitch: FLOAT_W + GAP_W,
      count: this.floats.length,
    };
  }

  floatX(index: number): number {
    const { width } = this.scene.cameras.main;
    const count = Math.max(1, this.floats.length);
    const rowW = count * FLOAT_W + (count - 1) * GAP_W;
    const startX = Math.round((width / 2 - 40 - rowW / 2) / 8) * 8;
    return startX + FLOAT_W / 2 + index * (FLOAT_W + GAP_W);
  }

  setRound(letters: ReadonlyArray<string>): void {
    this.floats.forEach((piece) => piece.container.destroy());
    this.letters = [...letters];
    this.floats = letters.map((letter, i) => this.buildFloat(letter, i));
    this.frame.clear();
    this.tangle.clear();
  }

  private buildFloat(letter: string, index: number): FloatPiece {
    const container = this.scene.add
      .container(this.floatX(index), this.laneY)
      .setDepth(20);
    container.add(
      this.scene.add
        .ellipse(0, 0, FLOAT_W, FLOAT_W - 14, 0x7a6248, 1)
        .setStrokeStyle(3, 0x4e3e2c, 1),
    );
    container.add(
      this.scene.add
        .text(0, 0, letter, {
          fontSize: "16px",
          fontFamily: FONTS.RETRO,
          color: "#e8f4f4",
        })
        .setOrigin(0.5),
    );
    if (!this.reduceMotion) {
      this.scene.tweens.add({
        targets: container,
        y: this.laneY + Phaser.Math.Between(-4, 4),
        duration: Phaser.Math.Between(1200, 1900),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    return { letter, container };
  }

  /** Paint the net over [left..right] and its snag, if any. Returns snag. */
  paintNet(left: number, right: number): [number, number] | null {
    const snag = firstSnag(this.letters, left, right);
    const g = this.frame;
    g.clear();
    const x1 = this.floatX(left) - FLOAT_W / 2 - 4;
    const x2 = this.floatX(right) + FLOAT_W / 2 + 4;
    g.lineStyle(3, snag ? 0xd8745a : 0x9ff7f7, 0.9);
    g.strokeRoundedRect(x1, this.laneY - 30, x2 - x1, 60, 10);

    const t = this.tangle;
    t.clear();
    if (snag) {
      const [a, b] = snag;
      t.lineStyle(2, 0xe84a3a, 0.95);
      const ax = this.floatX(a);
      const bx = this.floatX(b);
      // A taut, slightly jagged tangle line between the twins.
      t.beginPath();
      t.moveTo(ax, this.laneY - 18);
      t.lineTo((ax + bx) / 2, this.laneY - 26);
      t.lineTo(bx, this.laneY - 18);
      t.strokePath();
    }
    return snag;
  }

  /** Pay the left tie out by one: the released float dims behind the net. */
  releaseLeft(index: number): void {
    const piece = this.floats[index];
    if (!piece) return;
    audioManager.playTone(260, 70, "triangle");
    this.scene.tweens.add({
      targets: piece.container,
      alpha: 0.45,
      duration: this.reduceMotion ? 40 : 200,
      ease: "Sine.easeOut",
    });
  }

  /** Restore alphas for a fresh window (round mounts). */
  resetAlphas(): void {
    this.floats.forEach((piece) => piece.container.setAlpha(1));
  }

  /** Claim the run [left..right]: fly it to the post, or splash. */
  claim(
    left: number,
    right: number,
    postX: number,
    success: boolean,
  ): Promise<void> {
    if (this.busy) return Promise.resolve();
    this.busy = true;
    audioManager.playTone(success ? 620 : 150, 160, success ? "triangle" : "square");
    if (!success) {
      this.splashAt((this.floatX(left) + this.floatX(right)) / 2);
      this.busy = false;
      return Promise.resolve();
    }
    const claimed = this.floats.slice(left, right + 1);
    const flights = claimed.map(
      (piece, i) =>
        new Promise<void>((resolve) =>
          this.scene.tweens.add({
            targets: piece.container,
            x: postX,
            y: this.laneY - 70 - i * 6,
            alpha: 0.85,
            duration: this.reduceMotion ? 60 : 380 + i * 60,
            ease: "Quad.easeOut",
            onComplete: () => resolve(),
          }),
        ),
    );
    return Promise.all(flights).then(() => {
      this.busy = false;
    });
  }

  private splashAt(x: number): void {
    for (let i = 0; i < 3; i++) {
      const targetX = x + Phaser.Math.Between(-28, 28);
      const targetY = this.walkY + Phaser.Math.Between(4, 18);
      const bit = this.scene.textures.exists(MIRROR_CROSSING_KEYS.DEBRIS_SHEET)
        ? this.scene.add
            .image(
              targetX,
              targetY,
              MIRROR_CROSSING_KEYS.DEBRIS_SHEET,
              Phaser.Math.Between(0, 3),
            )
            .setDepth(6)
        : this.scene.add
            .rectangle(targetX, targetY, 5, 3, 0x4a6a6a, 0.95)
            .setDepth(6);
      this.debris.push(bit);
    }
  }

  debrisPositions(): Array<{ x: number; y: number }> {
    return this.debris.map((bit) => {
      const obj = bit as unknown as { x: number; y: number };
      return { x: obj.x, y: obj.y };
    });
  }
}
