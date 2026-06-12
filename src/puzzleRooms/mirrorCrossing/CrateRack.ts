/**
 * CrateRack — the floating crate row the Mirror Crossing is fought over.
 *
 * Crates bob gently on the water band between the two boardwalks. The
 * player (south walk) and their mirror twin (north walk) trade FACING
 * pairs: both crates lift and swing past each other over the river. A
 * wasted trade (a pair already mirrored) splashes — soaked debris washes
 * onto the south boardwalk and stays for the whole run.
 *
 * Texture-guarded: TR_DOCK_CRATE art when loaded, plank rects otherwise.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import {
  MIRROR_CROSSING_KEYS,
  VISUAL_REVAMP_KEYS,
} from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import type { RackGeometry } from "./crossingRules";

const CRATE_W = 56;
const CRATE_H = 48;
const GAP_W = 14;

interface Crate {
  value: number;
  readonly container: Phaser.GameObjects.Container;
}

export class CrateRack {
  private scene: Phaser.Scene;
  private crates: Crate[] = [];
  private debris: Phaser.GameObjects.GameObject[] = [];
  private rackY: number;
  private walkY: number;
  private reduceMotion: boolean;
  private busy = false;
  private currentRibbon: Phaser.GameObjects.Graphics | null = null;
  private currentFlipped = false;

  constructor(
    scene: Phaser.Scene,
    rackY: number,
    southWalkY: number,
    reduceMotion: boolean,
  ) {
    this.scene = scene;
    this.rackY = rackY;
    this.walkY = southWalkY;
    this.reduceMotion = reduceMotion;
    this.currentRibbon = scene.add.graphics().setDepth(7);
    this.paintCurrent();
  }

  get isBusy(): boolean {
    return this.busy;
  }

  geometry(): RackGeometry {
    return {
      startX: this.startX(),
      crateW: CRATE_W,
      gapW: GAP_W,
      count: this.crates.length,
    };
  }

  /** Center x of the whole rack — the mirror twin reflects across this. */
  centerX(): number {
    const geo = this.geometry();
    return geo.startX + (geo.count * (CRATE_W + GAP_W) - GAP_W) / 2;
  }

  values(): number[] {
    return this.crates.map((crate) => crate.value);
  }

  crateCenter(slot: number): { x: number; y: number } | null {
    const crate = this.crates[slot];
    if (!crate) return null;
    return { x: crate.container.x, y: crate.container.y };
  }

  private startX(): number {
    const { width } = this.scene.cameras.main;
    const rowW =
      this.crates.length * CRATE_W + (this.crates.length - 1) * GAP_W;
    return Math.round((width / 2 - rowW / 2) / 8) * 8;
  }

  /** (Re)build the rack. Debris persists; the current resets downstream. */
  setRow(values: ReadonlyArray<number>): void {
    this.crates.forEach((crate) => crate.container.destroy());
    this.crates = values.map((value) => this.buildCrate(value));
    this.currentFlipped = false;
    this.paintCurrent();
    this.layout();
  }

  private buildCrate(value: number): Crate {
    const container = this.scene.add.container(0, this.rackY).setDepth(20);
    if (this.scene.textures.exists(VISUAL_REVAMP_KEYS.TR_DOCK_CRATE)) {
      container.add(
        this.scene.add
          .image(0, 0, VISUAL_REVAMP_KEYS.TR_DOCK_CRATE)
          .setDisplaySize(CRATE_W, CRATE_H + 6),
      );
    } else {
      container.add(
        this.scene.add
          .rectangle(0, 0, CRATE_W, CRATE_H, 0x6e5a3a, 1)
          .setStrokeStyle(2, 0x46381e, 1),
      );
    }
    container.add(
      this.scene.add
        .text(0, 2, String(value), {
          fontSize: "16px",
          fontFamily: FONTS.RETRO,
          color: "#e8f4f4",
        })
        .setOrigin(0.5),
    );
    // Bob idle — alive when paused (VISION §5 wound 4).
    if (!this.reduceMotion) {
      this.scene.tweens.add({
        targets: container,
        y: this.rackY + Phaser.Math.Between(-3, 3),
        duration: Phaser.Math.Between(1400, 2200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    return { value, container };
  }

  private layout(): void {
    const startX = this.startX();
    this.crates.forEach((crate, i) => {
      crate.container.setPosition(
        startX + CRATE_W / 2 + i * (CRATE_W + GAP_W),
        this.rackY,
      );
    });
  }

  private paintCurrent(): void {
    const g = this.currentRibbon;
    if (!g) return;
    g.clear();
    const { width } = this.scene.cameras.main;
    g.lineStyle(2, 0x5ad8d8, 0.35);
    const dir = this.currentFlipped ? -1 : 1;
    for (let x = 80; x < width - 80; x += 96) {
      const y = this.rackY + 34;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 28 * dir, y);
      g.lineTo(x + 20 * dir, y - 4);
      g.strokePath();
    }
  }

  /** The clear payoff: the river's current visibly reverses. */
  flipCurrent(): void {
    this.currentFlipped = true;
    this.paintCurrent();
    audioManager.playTone(520, 200, "sine");
  }

  /**
   * Trade the facing pair anchored at `slot`: both crates lift and swing
   * past each other over the water. Resolves when settled. The CALLER
   * updates its logical values; this keeps display bookkeeping in sync.
   */
  tradePair(slot: number): Promise<void> {
    const n = this.crates.length;
    const mirror = n - 1 - slot;
    const a = this.crates[Math.min(slot, mirror)];
    const b = this.crates[Math.max(slot, mirror)];
    if (!a || !b || a === b || this.busy) return Promise.resolve();
    this.busy = true;
    audioManager.playTone(300, 70, "triangle");
    const ax = a.container.x;
    const bx = b.container.x;

    const swing = (
      crate: Crate,
      targetX: number,
      arc: number,
    ): Promise<void> =>
      new Promise((resolve) =>
        this.scene.tweens.chain({
          targets: crate.container,
          tweens: [
            { y: this.rackY - 22 + arc, duration: 140, ease: "Quad.easeOut" },
            { x: targetX, duration: 320, ease: "Sine.easeInOut" },
            { y: this.rackY, duration: 130, ease: "Quad.easeIn" },
          ],
          onComplete: () => resolve(),
        }),
      );

    return Promise.all([swing(a, bx, -6), swing(b, ax, 6)]).then(() => {
      const ia = this.crates.indexOf(a);
      const ib = this.crates.indexOf(b);
      const tmp = this.crates[ia];
      this.crates[ia] = this.crates[ib];
      this.crates[ib] = tmp;
      audioManager.playTone(180, 80, "square");
      this.busy = false;
    });
  }

  /** A wasted trade splashes: soaked debris washes onto the south walk. */
  splash(slot: number): void {
    const center = this.crateCenter(slot);
    if (!center) return;
    audioManager.playTone(140, 160, "sawtooth");
    for (let i = 0; i < 3; i++) {
      const targetX = center.x + Phaser.Math.Between(-26, 26);
      const targetY = this.walkY + Phaser.Math.Between(4, 18);
      const bit = this.scene.textures.exists(
        MIRROR_CROSSING_KEYS.DEBRIS_SHEET,
      )
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
      if (this.reduceMotion) continue;
      bit.setPosition(center.x, this.rackY);
      this.scene.tweens.add({
        targets: bit,
        x: targetX,
        y: targetY,
        duration: Phaser.Math.Between(260, 420),
        ease: "Quad.easeIn",
      });
    }
  }

  debrisPositions(): Array<{ x: number; y: number }> {
    return this.debris.map((bit) => {
      const obj = bit as unknown as { x: number; y: number };
      return { x: obj.x, y: obj.y };
    });
  }
}
