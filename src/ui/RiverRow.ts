/**
 * RiverRow - Shared rendering primitive for Twin Rivers interactive puzzles.
 *
 * Provides:
 *   - A horizontal row of value tiles (numbers, letters, etc.)
 *   - Up to two cursors that highlight specific indices
 *   - Optional fixed/variable window highlight (a tinted span across multiple tiles)
 *   - Tile-level state controls (mark resolved, mark active)
 *
 * Designed to be composed by puzzle scenes — the puzzle owns the *what* (rules,
 * round progression), and RiverRow owns the *how it looks*.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS } from '../config/constants';

export interface RiverRowOptions {
  values: ReadonlyArray<string | number>;
  centerX: number;
  y: number;
  tileSize?: number;
  gap?: number;
  showIndices?: boolean;
}

export interface RiverCursorOptions {
  label: string;
  color: number;
  index: number;
  /** Vertical offset from the row baseline; +ve = below the row, -ve = above. */
  side: 'top' | 'bottom';
}

interface TileVisual {
  container: Phaser.GameObjects.Container;
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  index: number;
  x: number;
  y: number;
}

interface CursorVisual {
  container: Phaser.GameObjects.Container;
  arrow: Phaser.GameObjects.Triangle;
  pillar: Phaser.GameObjects.Rectangle;
  labelText: Phaser.GameObjects.Text;
  side: 'top' | 'bottom';
  baseY: number;
  color: number;
  index: number;
}

export class RiverRow {
  private readonly scene: Phaser.Scene;
  private readonly options: Required<Omit<RiverRowOptions, 'showIndices'>> & { showIndices: boolean };
  private readonly tiles: TileVisual[] = [];
  private readonly cursors: Map<string, CursorVisual> = new Map();
  private windowHighlight: Phaser.GameObjects.Rectangle | null = null;
  private duplicateBadges: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, options: RiverRowOptions) {
    this.scene = scene;
    this.options = {
      values: options.values,
      centerX: options.centerX,
      y: options.y,
      tileSize: options.tileSize ?? 64,
      gap: options.gap ?? 8,
      showIndices: options.showIndices ?? true,
    };
    this.renderTiles();
  }

  private renderTiles(): void {
    const { values, centerX, y, tileSize, gap, showIndices } = this.options;
    const stride = tileSize + gap;
    const totalWidth = values.length * stride - gap;
    const startX = Math.round(centerX - totalWidth / 2 + tileSize / 2);

    values.forEach((value, i) => {
      const x = startX + i * stride;
      const container = this.scene.add.container(x, y).setDepth(20);
      const shadow = this.scene.add.rectangle(4, 5, tileSize, tileSize, COLORS.PURE_BLACK, 0.32);
      const box = this.scene.add.rectangle(0, 0, tileSize, tileSize, COLORS.ERROR, 0.96)
        .setStrokeStyle(3, COLORS.FRAME_BORDER_LIGHT, 1);
      const label = this.scene.add.text(0, 0, String(value), {
        fontSize: '24px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.TEXT_LIGHT,
      }).setOrigin(0.5);

      container.add([shadow, box, label]);

      if (showIndices) {
        const idxText = this.scene.add.text(0, tileSize / 2 + 14, String(i), {
          fontSize: '8px',
          fontFamily: FONTS.RETRO,
          color: COLOR_HEX.TEXT_MUTED,
        }).setOrigin(0.5);
        container.add(idxText);
      }

      this.tiles.push({ container, box, label, index: i, x, y });
    });
  }

  setValues(values: ReadonlyArray<string | number>): void {
    if (values.length !== this.tiles.length) {
      throw new Error(
        `RiverRow.setValues: expected ${this.tiles.length} values, got ${values.length}`
      );
    }
    values.forEach((v, i) => this.tiles[i].label.setText(String(v)));
  }

  /**
   * Returns the world-space centre of the tile at `index`, or null if the
   * index is out of range. Used by external hint widgets (NextMoveHint) to
   * place affordances directly over a tile without re-deriving the row's
   * stride math.
   */
  tileCenter(index: number): { x: number; y: number } | null {
    const tile = this.tiles[index];
    if (!tile) return null;
    return { x: tile.x, y: tile.y };
  }

  /** Tile size used by the row — handy for vertical offsetting hint markers. */
  get tileSize(): number {
    return this.options.tileSize;
  }

  /** Animate a swap of two indices. Returns when the tween completes. */
  animateSwap(i: number, j: number, durationMs = 280): Promise<void> {
    if (i === j) return Promise.resolve();
    const a = this.tiles[i];
    const b = this.tiles[j];
    const aLabel = a.label.text;
    const bLabel = b.label.text;
    return new Promise((resolve) => {
      // Lift each tile, swap labels, settle. Using container.y for the arc.
      const liftA = this.scene.tweens.add({
        targets: a.container,
        y: a.y - 24,
        duration: durationMs / 2,
        ease: 'Sine.easeOut',
        yoyo: true,
        onYoyo: () => a.label.setText(bLabel),
      });
      const liftB = this.scene.tweens.add({
        targets: b.container,
        y: b.y - 24,
        duration: durationMs / 2,
        ease: 'Sine.easeOut',
        yoyo: true,
        onYoyo: () => b.label.setText(aLabel),
      });
      liftA.on('complete', () => {
        if (!liftB.isPlaying()) resolve();
      });
      liftB.on('complete', () => {
        if (!liftA.isPlaying()) resolve();
      });
    });
  }

  pulseTile(index: number, color: number = COLORS.SUCCESS): void {
    const tile = this.tiles[index];
    if (!tile) return;
    const orig = tile.box.fillColor;
    tile.box.setFillStyle(color, 0.85);
    this.scene.tweens.add({
      targets: tile.container,
      scale: 1.08,
      duration: 140,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => tile.box.setFillStyle(orig, 0.96),
    });
  }

  flashTile(index: number, color: number = 0xef4444): void {
    const tile = this.tiles[index];
    if (!tile) return;
    const orig = tile.box.fillColor;
    tile.box.setFillStyle(color, 0.95);
    this.scene.tweens.add({
      targets: tile.container,
      x: { from: tile.x - 4, to: tile.x + 4 },
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        tile.container.setX(tile.x);
        tile.box.setFillStyle(orig, 0.96);
      },
    });
  }

  /** Add or update a named cursor. */
  setCursor(id: string, options: RiverCursorOptions): void {
    const existing = this.cursors.get(id);
    if (existing) {
      this.moveCursor(id, options.index);
      return;
    }
    const tile = this.tiles[options.index];
    if (!tile) return;

    const baseY = options.side === 'top'
      ? tile.y - this.options.tileSize / 2 - 28
      : tile.y + this.options.tileSize / 2 + 28;
    const arrowDir = options.side === 'top' ? 1 : -1;

    const container = this.scene.add.container(tile.x, baseY).setDepth(22);
    const pillar = this.scene.add.rectangle(0, 0, 4, 22, options.color, 0.8);
    const arrow = options.side === 'top'
      ? this.scene.add.triangle(0, 14, -8, -6, 8, -6, 0, 8, options.color, 1)
      : this.scene.add.triangle(0, -14, -8, 6, 8, 6, 0, -8, options.color, 1);
    const labelText = this.scene.add.text(0, arrowDir > 0 ? -18 : 18, options.label, {
      fontSize: '9px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
      backgroundColor: COLOR_HEX.TEXT_DARK,
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    container.add([pillar, arrow, labelText]);
    this.cursors.set(id, {
      container,
      arrow,
      pillar,
      labelText,
      side: options.side,
      baseY,
      color: options.color,
      index: options.index,
    });

    if (this.scene.tweens) {
      this.scene.tweens.add({
        targets: container,
        y: baseY + (options.side === 'top' ? -3 : 3),
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  moveCursor(id: string, newIndex: number): void {
    const cursor = this.cursors.get(id);
    if (!cursor) return;
    const tile = this.tiles[newIndex];
    if (!tile) return;
    cursor.index = newIndex;
    this.scene.tweens.add({
      targets: cursor.container,
      x: tile.x,
      duration: 220,
      ease: 'Sine.easeInOut',
    });
  }

  removeCursor(id: string): void {
    const cursor = this.cursors.get(id);
    if (!cursor) return;
    this.scene.tweens.killTweensOf(cursor.container);
    cursor.container.destroy();
    this.cursors.delete(id);
  }

  /** Highlight the inclusive range [left, right] with a translucent panel. */
  setWindow(left: number, right: number, color: number = COLORS.CYAN_GLOW): void {
    if (left > right) {
      this.clearWindow();
      return;
    }
    const tileLeft = this.tiles[left];
    const tileRight = this.tiles[right];
    if (!tileLeft || !tileRight) return;

    const x = (tileLeft.x + tileRight.x) / 2;
    const span = tileRight.x - tileLeft.x + this.options.tileSize + 8;
    if (!this.windowHighlight) {
      this.windowHighlight = this.scene.add.rectangle(x, this.options.y, span, this.options.tileSize + 16, color, 0.18)
        .setStrokeStyle(2, color, 0.7)
        .setDepth(15);
    } else {
      this.windowHighlight.setPosition(x, this.options.y);
      this.windowHighlight.width = span;
      this.windowHighlight.setFillStyle(color, 0.18);
      this.windowHighlight.setStrokeStyle(2, color, 0.7);
      this.windowHighlight.setVisible(true);
    }
  }

  clearWindow(): void {
    this.windowHighlight?.setVisible(false);
  }

  /** Mark every duplicate value inside an inclusive window with a small badge. */
  markDuplicatesInWindow(left: number, right: number): boolean {
    this.clearDuplicateBadges();
    if (left > right) return false;
    const seen = new Map<string, number[]>();
    for (let i = left; i <= right; i++) {
      const key = String(this.tiles[i].label.text);
      const list = seen.get(key) ?? [];
      list.push(i);
      seen.set(key, list);
    }
    let hasDuplicate = false;
    seen.forEach((indices) => {
      if (indices.length < 2) return;
      hasDuplicate = true;
      indices.forEach((i) => {
        const tile = this.tiles[i];
        const badge = this.scene.add.text(tile.x, tile.y - this.options.tileSize / 2 - 12, '!', {
          fontSize: '12px',
          fontFamily: FONTS.RETRO,
          color: COLOR_HEX.TEXT_LIGHT,
          backgroundColor: COLOR_HEX.BRIDGE_WRONG,
          padding: { x: 5, y: 2 },
        }).setOrigin(0.5).setDepth(25);
        this.duplicateBadges.push(badge);
      });
    });
    return hasDuplicate;
  }

  clearDuplicateBadges(): void {
    for (const badge of this.duplicateBadges) badge.destroy();
    this.duplicateBadges = [];
  }

  getValueAt(index: number): string {
    return this.tiles[index]?.label.text ?? '';
  }

  size(): number {
    return this.tiles.length;
  }

  destroy(): void {
    for (const tile of this.tiles) tile.container.destroy();
    this.tiles.length = 0;
    this.cursors.forEach((c) => {
      this.scene.tweens.killTweensOf(c.container);
      c.container.destroy();
    });
    this.cursors.clear();
    this.windowHighlight?.destroy();
    this.windowHighlight = null;
    this.clearDuplicateBadges();
  }
}
