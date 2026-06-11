/**
 * StoneField — the standing stones of the Pairing Grounds.
 *
 * Stones stand in up to two rows on the courtyard floor. The player picks
 * one up as their ANCHOR (it follows them, mill-carry style), seeks its
 * partner, or puts it back down on open floor. Failed offers crack both
 * stones: chip rubble drops and persists for the whole run — the grounds'
 * cost economy.
 *
 * Texture-guarded: granite rounded-rects + runtime numerals until art lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { PAIRING_GROUNDS_KEYS } from "../../config/assets";
import { audioManager } from "../../core/AudioManager";
import type { StoneCenter } from "./groundsRules";

const STONE_W = 52;
const STONE_H = 60;
const GAP_X = 28;
const GAP_Y = 36;
const PER_ROW = 6;

interface Stone {
  readonly value: number;
  readonly container: Phaser.GameObjects.Container;
  homeX: number;
  homeY: number;
  carried: boolean;
  spent: boolean;
}

export class StoneField {
  private scene: Phaser.Scene;
  private stones: Stone[] = [];
  private chips: Phaser.GameObjects.GameObject[] = [];
  private fieldY: number;
  private reduceMotion: boolean;

  constructor(scene: Phaser.Scene, fieldY: number, reduceMotion: boolean) {
    this.scene = scene;
    this.fieldY = fieldY;
    this.reduceMotion = reduceMotion;
  }

  /** Centers of stones still standing (spent pairs excluded → -1 slots kept). */
  centers(): StoneCenter[] {
    return this.stones.map((stone) =>
      stone.spent || stone.carried
        ? { x: -9999, y: -9999 }
        : { x: stone.container.x, y: stone.container.y },
    );
  }

  valueOf(index: number): number | null {
    return this.stones[index]?.value ?? null;
  }

  isSpent(index: number): boolean {
    return this.stones[index]?.spent ?? true;
  }

  stoneCenter(index: number): { x: number; y: number } | null {
    const stone = this.stones[index];
    if (!stone) return null;
    return { x: stone.container.x, y: stone.container.y };
  }

  /** (Re)build the field for a round. Chip rubble persists. */
  setRound(values: ReadonlyArray<number>): void {
    this.stones.forEach((stone) => stone.container.destroy());
    this.stones = values.map((value) => this.buildStone(value));
    this.layout();
  }

  private buildStone(value: number): Stone {
    const container = this.scene.add.container(0, 0).setDepth(20);
    if (this.scene.textures.exists(PAIRING_GROUNDS_KEYS.RUNESTONE)) {
      container.add(
        this.scene.add
          .image(0, 0, PAIRING_GROUNDS_KEYS.RUNESTONE)
          .setDisplaySize(STONE_W, STONE_H + 8),
      );
    } else {
      container.add(
        this.scene.add
          .rectangle(0, 0, STONE_W, STONE_H, 0x8d8d96, 1)
          .setStrokeStyle(2, 0x5a5a64, 1),
      );
    }
    container.add(
      this.scene.add
        .text(0, 2, String(value), {
          fontSize: "16px",
          fontFamily: FONTS.RETRO,
          color: "#2e2e38",
        })
        .setOrigin(0.5),
    );
    return { value, container, homeX: 0, homeY: 0, carried: false, spent: false };
  }

  private layout(): void {
    const { width } = this.scene.cameras.main;
    const count = this.stones.length;
    const rows = count > PER_ROW ? 2 : 1;
    const perRow = Math.ceil(count / rows);
    this.stones.forEach((stone, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inThisRow = row === rows - 1 ? count - perRow * row : perRow;
      const rowW = inThisRow * STONE_W + (inThisRow - 1) * GAP_X;
      const startX = Math.round((width / 2 - rowW / 2) / 8) * 8 + STONE_W / 2;
      stone.homeX = startX + col * (STONE_W + GAP_X);
      stone.homeY = this.fieldY + row * (STONE_H + GAP_Y);
      stone.container.setPosition(stone.homeX, stone.homeY);
    });
  }

  /** Lift a stone as the anchor; it follows the player from here. */
  pickUp(index: number): boolean {
    const stone = this.stones[index];
    if (!stone || stone.spent || stone.carried) return false;
    stone.carried = true;
    stone.container.setDepth(34);
    audioManager.playTone(380, 70, "triangle");
    return true;
  }

  /** Call every frame with the player position while carrying. */
  followPlayer(x: number, y: number): void {
    const carried = this.stones.find((stone) => stone.carried);
    carried?.container.setPosition(x, y - 38);
  }

  carriedIndex(): number {
    return this.stones.findIndex((stone) => stone.carried);
  }

  /** Put the anchor back on its home slot. */
  putDown(): boolean {
    const stone = this.stones.find((s) => s.carried);
    if (!stone) return false;
    stone.carried = false;
    stone.container.setDepth(20);
    audioManager.playTone(240, 70, "triangle");
    this.scene.tweens.add({
      targets: stone.container,
      x: stone.homeX,
      y: stone.homeY,
      duration: this.reduceMotion ? 40 : 220,
      ease: "Quad.easeOut",
    });
    return true;
  }

  /** A successful offer consumed both stones — they live on the dais now. */
  spendPair(anchorIndex: number, partnerIndex: number): void {
    for (const i of [anchorIndex, partnerIndex]) {
      const stone = this.stones[i];
      if (!stone) continue;
      stone.spent = true;
      stone.carried = false;
      stone.container.setVisible(false);
    }
  }

  /** Failed offer: both stones crack — rubble drops and stays. */
  crackChip(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const targetX = x + Phaser.Math.Between(-20, 20);
      const targetY = y + Phaser.Math.Between(8, 26);
      const chip = this.scene.textures.exists(PAIRING_GROUNDS_KEYS.CHIP_SHEET)
        ? this.scene.add
            .image(targetX, targetY, PAIRING_GROUNDS_KEYS.CHIP_SHEET, Phaser.Math.Between(0, 3))
            .setDepth(6)
        : this.scene.add
            .rectangle(targetX, targetY, 4, 3, 0x6f6f78, 0.95)
            .setDepth(6);
      this.chips.push(chip);
    }
  }

  chipPositions(): Array<{ x: number; y: number }> {
    return this.chips.map((chip) => {
      const obj = chip as unknown as { x: number; y: number };
      return { x: obj.x, y: obj.y };
    });
  }

  /** Return the carried stone to its home after a failed offer rebound. */
  reboundCarried(): void {
    const stone = this.stones.find((s) => s.carried);
    if (!stone) return;
    // Stays carried — the anchor survives in your hands; only chips fall.
    audioManager.playTone(150, 100, "square");
  }
}
