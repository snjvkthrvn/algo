/**
 * PostLine — the Rope Bridge's pilings, buoys, and the rope that does the
 * arithmetic so no text has to.
 *
 * Two buoys ride the current left/right pilings, tied by a rope whose SAG
 * is the readout: the buoyed pair too heavy → it sags deep and glows warm;
 * too light → it stretches taut and pale; equal to the target → it levels,
 * brightens, and hums. The player reads physics, never `a + b = c` text
 * (VISION §4-5).
 *
 * Texture-guarded: TR_DOCK_NODE pilings / PROP_WATER_BUOY buoys when
 * loaded, stone discs + cork rings otherwise.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import {
  MIRROR_CROSSING_KEYS,
  VISUAL_REVAMP_KEYS,
} from "../../config/assets";
import { audioManager } from "../../core/AudioManager";

const PILING_W = 52;
const GAP_W = 18;

export interface PostLineGeometry {
  readonly startX: number;
  readonly pitch: number;
  readonly count: number;
}

export class PostLine {
  private scene: Phaser.Scene;
  private lineY: number;
  private walkY: number;
  private reduceMotion: boolean;
  private values: number[] = [];
  private pilings: Phaser.GameObjects.Container[] = [];
  private buoyL: Phaser.GameObjects.Container | null = null;
  private buoyR: Phaser.GameObjects.Container | null = null;
  private rope: Phaser.GameObjects.Graphics;
  private debris: Phaser.GameObjects.GameObject[] = [];
  private left = 0;
  private right = 0;
  private target = 0;
  private busy = false;
  private levelHumAt = 0;

  constructor(
    scene: Phaser.Scene,
    lineY: number,
    southWalkY: number,
    reduceMotion: boolean,
  ) {
    this.scene = scene;
    this.lineY = lineY;
    this.walkY = southWalkY;
    this.reduceMotion = reduceMotion;
    this.rope = scene.add.graphics().setDepth(24);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get leftIndex(): number {
    return this.left;
  }

  get rightIndex(): number {
    return this.right;
  }

  currentSum(): number {
    return (this.values[this.left] ?? 0) + (this.values[this.right] ?? 0);
  }

  pilingX(index: number): number {
    const geo = this.geometry();
    return geo.startX + PILING_W / 2 + index * geo.pitch;
  }

  leftX(): number {
    return this.pilingX(this.left);
  }

  rightX(): number {
    return this.pilingX(this.right);
  }

  midX(): number {
    return (this.leftX() + this.rightX()) / 2;
  }

  geometry(): PostLineGeometry {
    const { width } = this.scene.cameras.main;
    const count = this.values.length;
    const rowW = count * PILING_W + (count - 1) * GAP_W;
    return {
      startX: Math.round((width / 2 - rowW / 2) / 8) * 8,
      pitch: PILING_W + GAP_W,
      count,
    };
  }

  /** (Re)build the line; buoys ride out to the ends. Debris persists. */
  setRound(values: ReadonlyArray<number>, target: number): void {
    this.pilings.forEach((piling) => piling.destroy());
    this.pilings = [];
    this.values = [...values];
    this.target = target;
    this.left = 0;
    this.right = values.length - 1;
    values.forEach((value, i) => this.pilings.push(this.buildPiling(value, i)));
    this.buoyL?.destroy();
    this.buoyR?.destroy();
    this.buoyL = this.buildBuoy(this.pilingX(this.left));
    this.buoyR = this.buildBuoy(this.pilingX(this.right));
    this.paintRope();
  }

  private buildPiling(value: number, index: number): Phaser.GameObjects.Container {
    const container = this.scene.add
      .container(this.pilingX(index), this.lineY)
      .setDepth(20);
    if (this.scene.textures.exists(VISUAL_REVAMP_KEYS.TR_DOCK_NODE)) {
      container.add(
        this.scene.add
          .image(0, 0, VISUAL_REVAMP_KEYS.TR_DOCK_NODE)
          .setDisplaySize(PILING_W, PILING_W),
      );
    } else {
      container.add(
        this.scene.add
          .ellipse(0, 0, PILING_W, PILING_W - 12, 0x6a7a78, 1)
          .setStrokeStyle(2, 0x46545299, 1),
      );
    }
    container.add(
      this.scene.add
        .text(0, 0, String(value), {
          fontSize: "14px",
          fontFamily: FONTS.RETRO,
          color: "#e8f4f4",
        })
        .setOrigin(0.5),
    );
    return container;
  }

  private buildBuoy(x: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, this.lineY - 30).setDepth(26);
    if (this.scene.textures.exists(VISUAL_REVAMP_KEYS.PROP_WATER_BUOY)) {
      container.add(
        this.scene.add
          .image(0, 0, VISUAL_REVAMP_KEYS.PROP_WATER_BUOY)
          .setDisplaySize(26, 30),
      );
    } else {
      container.add(
        this.scene.add
          .ellipse(0, 0, 20, 22, 0xd86a3a, 1)
          .setStrokeStyle(2, 0x8a3a1a, 1),
      );
    }
    if (!this.reduceMotion) {
      this.scene.tweens.add({
        targets: container,
        y: this.lineY - 34,
        duration: Phaser.Math.Between(1100, 1600),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    return container;
  }

  /** The rope IS the readout: sag and tint from sum vs target. */
  private paintRope(): void {
    const g = this.rope;
    g.clear();
    if (!this.buoyL || !this.buoyR) return;
    const sum = this.currentSum();
    const diff = sum - this.target;
    const x1 = this.leftX();
    const x2 = this.rightX();
    const yTop = this.lineY - 34;
    // Heavy → deep warm sag; light → taut pale; level → bright cyan.
    const sag =
      diff === 0 ? 6 : diff > 0 ? Math.min(44, 14 + diff * 2) : 2;
    const color = diff === 0 ? 0x9ff7f7 : diff > 0 ? 0xd8a05a : 0x7a9a9a;
    const alpha = diff === 0 ? 1 : 0.8;
    g.lineStyle(3, color, alpha);
    const midX = (x1 + x2) / 2;
    g.beginPath();
    g.moveTo(x1, yTop);
    // Quadratic-ish sag via two segments through the midpoint.
    g.lineTo(midX, yTop + sag);
    g.lineTo(x2, yTop);
    g.strokePath();
    if (diff === 0) {
      const now = this.scene.time.now;
      if (now - this.levelHumAt > 1200) {
        this.levelHumAt = now;
        audioManager.playTone(660, 180, "sine");
      }
    }
  }

  /** Step a buoy one piling inward. Resolves when it lands. */
  step(side: "left" | "right"): Promise<void> {
    if (this.busy || this.left >= this.right) return Promise.resolve();
    this.busy = true;
    if (side === "left") this.left++;
    else this.right--;
    const buoy = side === "left" ? this.buoyL : this.buoyR;
    const targetX = side === "left" ? this.leftX() : this.rightX();
    audioManager.playTone(side === "left" ? 360 : 300, 60, "triangle");
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: buoy,
        x: targetX,
        duration: this.reduceMotion ? 50 : 240,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.paintRope();
          this.busy = false;
          resolve();
        },
      });
    });
  }

  /** The buoys met without the target: the rope snaps back to the ends. */
  snapBack(): Promise<void> {
    this.busy = true;
    audioManager.playTone(110, 260, "sawtooth");
    this.splashAt(this.midX());
    this.left = 0;
    this.right = this.values.length - 1;
    const moves = [
      { buoy: this.buoyL, x: this.leftX() },
      { buoy: this.buoyR, x: this.rightX() },
    ];
    return Promise.all(
      moves.map(
        ({ buoy, x }) =>
          new Promise<void>((resolve) =>
            this.scene.tweens.add({
              targets: buoy,
              x,
              duration: this.reduceMotion ? 60 : 420,
              ease: "Back.easeOut",
              onComplete: () => resolve(),
            }),
          ),
      ),
    ).then(() => {
      this.paintRope();
      this.busy = false;
    });
  }

  /** A failed lock: the rope recoils and the splash debris stays. */
  failLock(): void {
    audioManager.playTone(140, 160, "square");
    this.splashAt(this.midX());
    if (this.reduceMotion || !this.buoyL || !this.buoyR) return;
    for (const buoy of [this.buoyL, this.buoyR]) {
      this.scene.tweens.add({
        targets: buoy,
        y: this.lineY - 24,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }

  /** The lock: the pair lashes down level and bright. */
  lashDown(): Promise<void> {
    this.busy = true;
    audioManager.playTone(620, 220, "triangle");
    this.paintRope();
    return new Promise((resolve) => {
      this.scene.time.delayedCall(this.reduceMotion ? 80 : 600, () => {
        this.busy = false;
        resolve();
      });
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
