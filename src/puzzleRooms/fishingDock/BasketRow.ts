/**
 * BasketRow + NetFrame — the Fishing Dock's catch and the net that frames it.
 *
 * Weighted fish baskets sit along the dock's slat row. The NET FRAME
 * follows the player's walk, sliding slat by slat; every slide the basket
 * ENTERING the frame pulses bright and the one LEAVING dims — the edges
 * are the whole show, the middle keeps itself (VISION §3, shown not told).
 * Hauls happen at the weigh-beam: a max-weight catch lashes to the beam;
 * anything lighter tears the net — splash debris that stays (cost economy).
 *
 * Texture-guarded: wicker rounded-rects until/unless basket art exists;
 * debris reuses the mirror-crossing sheet.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { MIRROR_CROSSING_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import type { DockGeometry } from "./dockRules";

const BASKET_W = 50;
const GAP_W = 18;

interface Basket {
  readonly value: number;
  readonly container: Phaser.GameObjects.Container;
}

export class BasketRow {
  private scene: Phaser.Scene;
  private baskets: Basket[] = [];
  private debris: Phaser.GameObjects.GameObject[] = [];
  private rowY: number;
  private walkY: number;
  private windowSize = 3;
  private reduceMotion: boolean;
  private busy = false;

  constructor(
    scene: Phaser.Scene,
    rowY: number,
    walkY: number,
    reduceMotion: boolean,
  ) {
    this.scene = scene;
    this.rowY = rowY;
    this.walkY = walkY;
    this.reduceMotion = reduceMotion;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  geometry(): DockGeometry {
    return {
      startX: this.basketX(0),
      pitch: BASKET_W + GAP_W,
      count: this.baskets.length,
      windowSize: this.windowSize,
    };
  }

  basketX(index: number): number {
    const { width } = this.scene.cameras.main;
    const count = Math.max(1, this.baskets.length);
    const rowW = count * BASKET_W + (count - 1) * GAP_W;
    const startX = Math.round((width / 2 - rowW / 2) / 8) * 8;
    return startX + BASKET_W / 2 + index * (BASKET_W + GAP_W);
  }

  setRound(values: ReadonlyArray<number>, windowSize: number): void {
    this.baskets.forEach((basket) => basket.container.destroy());
    this.windowSize = windowSize;
    this.baskets = values.map((value, i) => this.buildBasket(value, i));
  }

  private buildBasket(value: number, index: number): Basket {
    const container = this.scene.add
      .container(this.basketX(index), this.rowY)
      .setDepth(20);
    container.add(
      this.scene.add
        .rectangle(0, 0, BASKET_W, 40, 0x8a7248, 1)
        .setStrokeStyle(2, 0x5a4a2e, 1),
    );
    container.add(
      this.scene.add
        .rectangle(0, -14, BASKET_W - 8, 8, 0x6a583a, 1),
    );
    container.add(
      this.scene.add
        .text(0, 4, String(value), {
          fontSize: "14px",
          fontFamily: FONTS.RETRO,
          color: "#e8f4f4",
        })
        .setOrigin(0.5),
    );
    return { value, container };
  }

  /** Repositions after a rebuild (count changes shift the centering). */
  relayout(): void {
    this.baskets.forEach((basket, i) =>
      basket.container.setPosition(this.basketX(i), this.rowY),
    );
  }

  pulseEnter(index: number): void {
    const basket = this.baskets[index];
    if (!basket || this.reduceMotion) return;
    this.scene.tweens.add({
      targets: basket.container,
      scaleX: 1.16,
      scaleY: 1.16,
      duration: 130,
      yoyo: true,
      ease: "Back.easeOut",
    });
    audioManager.playTone(540, 35, "triangle");
  }

  dimLeave(index: number): void {
    const basket = this.baskets[index];
    if (!basket || this.reduceMotion) return;
    this.scene.tweens.add({
      targets: basket.container,
      alpha: 0.55,
      duration: 130,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  /**
   * Boss sabotage: two baskets trade slats, weights and all, arcing over
   * each other with a splash. The heaviest stretch can MOVE, so the player
   * re-scouts. Resolves when both land; the scene swaps its own values.
   */
  swap(i: number, j: number): Promise<void> {
    if (this.busy) return Promise.resolve();
    const a = this.baskets[i];
    const b = this.baskets[j];
    if (!a || !b || i === j) return Promise.resolve();
    this.busy = true;
    this.baskets[i] = b;
    this.baskets[j] = a;
    const xi = this.basketX(i);
    const xj = this.basketX(j);
    audioManager.playTone(240, 130, "triangle");
    const arc = (
      container: Phaser.GameObjects.Container,
      toX: number,
    ): Promise<void> =>
      new Promise((resolve) => {
        this.scene.tweens.chain({
          targets: container,
          tweens: [
            {
              x: (container.x + toX) / 2,
              y: this.rowY - 30,
              duration: this.reduceMotion ? 40 : 180,
              ease: "Quad.easeOut",
            },
            {
              x: toX,
              y: this.rowY,
              duration: this.reduceMotion ? 40 : 200,
              ease: "Quad.easeIn",
            },
          ],
          onComplete: () => resolve(),
        });
      });
    return Promise.all([arc(a.container, xj), arc(b.container, xi)]).then(() => {
      this.busy = false;
    });
  }

  /**
   * Haul the framed catch toward the weigh-beam. Success lashes the
   * baskets up and out; failure tears the net — splash + spill back.
   */
  haul(
    start: number,
    beamX: number,
    beamY: number,
    success: boolean,
  ): Promise<void> {
    if (this.busy) return Promise.resolve();
    this.busy = true;
    const framed = this.baskets.slice(start, start + this.windowSize);
    audioManager.playTone(success ? 520 : 150, 140, success ? "triangle" : "square");

    const lifts = framed.map(
      (basket, i) =>
        new Promise<void>((resolve) => {
          this.scene.tweens.chain({
            targets: basket.container,
            tweens: success
              ? [
                  {
                    x: beamX + i * 18 - 18,
                    y: beamY,
                    duration: this.reduceMotion ? 60 : 420,
                    ease: "Quad.easeOut",
                  },
                ]
              : [
                  { y: this.rowY - 26, duration: 160, ease: "Quad.easeOut" },
                  { y: this.rowY, duration: 200, ease: "Bounce.easeOut" },
                ],
            onComplete: () => resolve(),
          });
        }),
    );
    if (!success) this.tearSplash(start);
    return Promise.all(lifts).then(() => {
      this.busy = false;
    });
  }

  private tearSplash(start: number): void {
    const x = this.basketX(start + Math.floor(this.windowSize / 2));
    for (let i = 0; i < 3; i++) {
      const targetX = x + Phaser.Math.Between(-30, 30);
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

  /** Remove every basket and splash this row made — used at phase retire. */
  teardown(): void {
    this.baskets.forEach((basket) => basket.container.destroy());
    this.baskets = [];
    this.debris.forEach((bit) => bit.destroy());
    this.debris = [];
  }
}

/** The net frame that follows the player's walk along the dock. */
export class NetFrame {
  private frame: Phaser.GameObjects.Graphics;
  private rowY: number;
  private currentStart = 0;
  private geometryRef: () => DockGeometry;

  constructor(
    scene: Phaser.Scene,
    rowY: number,
    geometryRef: () => DockGeometry,
  ) {
    this.rowY = rowY;
    this.geometryRef = geometryRef;
    this.frame = scene.add.graphics().setDepth(28);
  }

  get start(): number {
    return this.currentStart;
  }

  /** Snap to a start without animation (round mounts). */
  reset(start: number): void {
    this.currentStart = start;
    this.paint(start);
  }

  /** Glide to a new start; returns whether the start changed. */
  glideTo(start: number): boolean {
    if (start === this.currentStart) return false;
    this.currentStart = start;
    this.paint(start);
    return true;
  }

  private paint(start: number): void {
    const geo = this.geometryRef();
    const left = geo.startX + start * geo.pitch - 34;
    const width = geo.windowSize * geo.pitch - (geo.pitch - 68);
    const g = this.frame;
    g.clear();
    g.lineStyle(3, 0x9ff7f7, 0.9);
    g.strokeRoundedRect(left, this.rowY - 34, width, 68, 10);
    g.lineStyle(1, 0x5ad8d8, 0.4);
    // Netting cross-hatch.
    for (let x = left + 10; x < left + width; x += 12) {
      g.beginPath();
      g.moveTo(x, this.rowY - 34);
      g.lineTo(x - 8, this.rowY + 34);
      g.strokePath();
    }
  }

  /** Remove the frame graphic — used when a phase board retires. */
  teardown(): void {
    this.frame.destroy();
  }
}
