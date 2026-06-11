/**
 * BasketShelf — the cellar's wall of numbered baskets on the floor plane.
 *
 * Mirrors the Grain Chamber's CrateLane: the player walks the shelf and
 * acts on the nearest basket. A correct opening lifts the lid and retrieves
 * the tool; a WRONG opening tumbles that basket's contents onto the floor,
 * where the mess persists for the whole run — the cellar's cost economy.
 *
 * The final batch diegetizes the old "labels fade" rule: dimLabels()
 * gutters the lanterns and the painted numbers go dark, so the player
 * finds an address by counting positions.
 *
 * Texture-guarded: wicker-toned rounded rects until the art batch lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { BASKET_CELLAR_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import type { ShelfGeometry } from "./cellarRules";

const BASKET_W = 72;
const BASKET_H = 56;
const GAP_W = 16;
const TUMBLE_COLOR = 0x9a7544;

interface Basket {
  readonly index: number;
  readonly container: Phaser.GameObjects.Container;
  readonly closed: Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown };
  readonly open: Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown };
  readonly label: Phaser.GameObjects.Text;
}

export class BasketShelf {
  private scene: Phaser.Scene;
  private baskets: Basket[] = [];
  private mess: Phaser.GameObjects.GameObject[] = [];
  private shelfY: number;
  private labelsDimmed = false;
  private reduceMotion: boolean;
  private busy = false;

  constructor(scene: Phaser.Scene, shelfY: number, reduceMotion: boolean) {
    this.scene = scene;
    this.shelfY = shelfY;
    this.reduceMotion = reduceMotion;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  geometry(): ShelfGeometry {
    return {
      startX: this.startX(),
      basketW: BASKET_W,
      gapW: GAP_W,
      count: this.baskets.length,
    };
  }

  basketCenter(index: number): { x: number; y: number } | null {
    const basket = this.baskets[index];
    if (!basket) return null;
    return { x: basket.container.x, y: basket.container.y };
  }

  private startX(): number {
    const { width } = this.scene.cameras.main;
    const rowW =
      this.baskets.length * BASKET_W + (this.baskets.length - 1) * GAP_W;
    return Math.round((width / 2 - rowW / 2) / 8) * 8;
  }

  /** (Re)build the shelf for a batch. Mess decals persist across batches. */
  setBatch(count: number): void {
    this.baskets.forEach((basket) => basket.container.destroy());
    this.baskets = [];
    for (let i = 0; i < count; i++) this.baskets.push(this.buildBasket(i));
    this.layout();
    if (this.labelsDimmed) this.applyLabelDim();
  }

  private buildBasket(index: number): Basket {
    const container = this.scene.add.container(0, this.shelfY).setDepth(20);
    let closed: Basket["closed"];
    let open: Basket["open"];
    if (
      this.scene.textures.exists(BASKET_CELLAR_KEYS.BASKET) &&
      this.scene.textures.exists(BASKET_CELLAR_KEYS.BASKET_OPEN)
    ) {
      closed = this.scene.add
        .image(0, 0, BASKET_CELLAR_KEYS.BASKET)
        .setDisplaySize(BASKET_W, BASKET_H + 6);
      open = this.scene.add
        .image(0, 0, BASKET_CELLAR_KEYS.BASKET_OPEN)
        .setDisplaySize(BASKET_W, BASKET_H + 6);
    } else {
      closed = this.scene.add
        .rectangle(0, 0, BASKET_W, BASKET_H, 0xa9885a, 1)
        .setStrokeStyle(2, 0x6e5635, 1);
      open = this.scene.add
        .rectangle(0, -4, BASKET_W, BASKET_H + 8, 0x82663e, 1)
        .setStrokeStyle(2, 0x4e3d24, 1);
    }
    open.setVisible(false);
    const label = this.scene.add
      .text(0, BASKET_H / 2 + 12, String(index + 1), {
        fontSize: "12px",
        fontFamily: FONTS.RETRO,
        color: "#f4e3c1",
      })
      .setOrigin(0.5);
    container.add([
      closed as unknown as Phaser.GameObjects.GameObject,
      open as unknown as Phaser.GameObjects.GameObject,
      label,
    ]);
    return { index, container, closed, open, label };
  }

  private layout(): void {
    const startX = this.startX();
    this.baskets.forEach((basket, i) => {
      basket.container.setPosition(
        startX + BASKET_W / 2 + i * (BASKET_W + GAP_W),
        this.shelfY,
      );
    });
  }

  /** The final-batch twist: lanterns gutter, painted numbers go dark. */
  dimLabels(): void {
    this.labelsDimmed = true;
    this.applyLabelDim();
  }

  private applyLabelDim(): void {
    for (const basket of this.baskets) {
      if (this.reduceMotion) {
        basket.label.setAlpha(0.06);
        continue;
      }
      this.scene.tweens.add({
        targets: basket.label,
        alpha: { from: basket.label.alpha, to: 0.06 },
        duration: 900,
        ease: "Sine.easeIn",
      });
    }
  }

  /**
   * Open a basket. Correct → lid lifts, closes again after a beat.
   * Wrong → contents tumble out below the basket and STAY (the economy).
   */
  openBasket(index: number, correct: boolean): Promise<void> {
    const basket = this.baskets[index];
    if (!basket || this.busy) return Promise.resolve();
    this.busy = true;
    audioManager.playSFX("basket_lid");
    audioManager.playTone(correct ? 520 : 180, 90, "triangle");
    basket.closed.setVisible(false);
    basket.open.setVisible(true);

    if (!correct) this.tumble(basket);

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: basket.container,
        y: this.shelfY - (correct ? 8 : 3),
        duration: 140,
        yoyo: true,
        ease: "Quad.easeOut",
        onComplete: () => {
          basket.open.setVisible(false);
          basket.closed.setVisible(true);
          this.busy = false;
          resolve();
        },
      });
    });
  }

  private tumble(basket: Basket): void {
    const { x } = basket.container;
    for (let i = 0; i < 6; i++) {
      const targetX = x + Phaser.Math.Between(-30, 30);
      const targetY = this.shelfY + BASKET_H / 2 + Phaser.Math.Between(14, 34);
      const bit = this.scene.add
        .rectangle(targetX, targetY, 4, 3, TUMBLE_COLOR, 0.95)
        .setDepth(6);
      this.mess.push(bit);
      if (this.reduceMotion) continue;
      bit.setPosition(x, this.shelfY);
      this.scene.tweens.add({
        targets: bit,
        x: targetX,
        y: targetY,
        duration: Phaser.Math.Between(240, 400),
        ease: "Quad.easeIn",
      });
    }
  }

  /** Where the hens should peck post-clear: every settled mess bit. */
  messPositions(): Array<{ x: number; y: number }> {
    return this.mess.map((bit) => {
      const obj = bit as unknown as { x: number; y: number };
      return { x: obj.x, y: obj.y };
    });
  }
}
