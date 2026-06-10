/**
 * RowWalker — embodiment layer for RiverRow scenes (docs/VISION.md §2).
 *
 * The overworld Player walks a bank lane beneath the row; the tile nearest
 * their body is the focused tile (marked on the ground), and the act input
 * (SPACE / gamepad A / click) presses it through RiverRow's own input path.
 * One integration serves every Twin Rivers trial and the Mirror Serpent,
 * because they all run their boards through RiverRow.
 *
 * Rows are recreated per round — call setRow() after each `new RiverRow`
 * and the walker re-derives its lane from the new row's geometry.
 */

import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import type { RiverRow } from '../ui/RiverRow';
import { PuzzleRoom } from './PuzzleRoom';

export interface RowWalkerOptions {
  /** Gate acting (e.g. while the scene is resolving). Default: always. */
  canAct?: () => boolean;
  /** Fired when the focused tile changes (-1 = none). */
  onFocusChange?: (index: number) => void;
}

export class RowWalker {
  readonly room: PuzzleRoom;
  private options: RowWalkerOptions;
  private row: RiverRow | null = null;
  private focusIndex = -1;
  private marker: Phaser.GameObjects.Graphics;
  /** Mutable bounds object shared with PuzzleRoom — setRow updates it in place. */
  private laneBounds = { x: 0, y: 0, width: 0, height: 0 };

  static preload(scene: Phaser.Scene): void {
    PuzzleRoom.preload(scene);
  }

  constructor(scene: Phaser.Scene, options: RowWalkerOptions = {}) {
    this.options = options;
    this.marker = scene.add.graphics().setDepth(18);

    const { width, height } = scene.cameras.main;
    // Placeholder lane until the first setRow; spawn near screen centre-low.
    this.laneBounds.x = 96;
    this.laneBounds.y = height - 200;
    this.laneBounds.width = width - 192;
    this.laneBounds.height = 96;

    this.room = new PuzzleRoom(scene, {
      bounds: this.laneBounds,
      spawn: { x: width / 2 - 260, y: height - 152 },
      onAct: () => this.pressFocused(),
      onStep: () => this.refreshFocus(),
    });

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.marker.destroy();
    });
  }

  /** Rebind to a freshly built row; the lane re-derives from its geometry. */
  setRow(row: RiverRow | null): void {
    this.row = row;
    this.focusIndex = -1;
    this.marker.clear();
    if (!row || row.tileCount === 0) return;

    const first = row.tileCenter(0);
    const last = row.tileCenter(row.tileCount - 1);
    if (!first || !last) return;

    const margin = row.tileSize * 1.2;
    this.laneBounds.x = first.x - margin;
    this.laneBounds.width = last.x - first.x + margin * 2;
    this.laneBounds.y = row.baselineY + row.tileSize / 2 + 18;
    this.laneBounds.height = 92;

    // If the player is outside the new lane, step them onto its west end.
    const pos = this.room.player.getPosition();
    const inLane =
      pos.x >= this.laneBounds.x && pos.x <= this.laneBounds.x + this.laneBounds.width &&
      pos.y >= this.laneBounds.y && pos.y <= this.laneBounds.y + this.laneBounds.height;
    if (!inLane) {
      this.room.player.setPosition(this.laneBounds.x + 24, this.laneBounds.y + 48);
    }
    this.refreshFocus();
  }

  update(time: number, delta: number): void {
    this.room.update(time, delta);
  }

  setActive(active: boolean): void {
    this.room.setActive(active);
  }

  /** Index of the tile the player currently stands at (-1 = none). */
  get focusedIndex(): number {
    return this.focusIndex;
  }

  private pressFocused(): void {
    if (!this.row || this.focusIndex < 0) return;
    if (this.options.canAct?.() === false) return;
    this.row.press(this.focusIndex);
  }

  private refreshFocus(): void {
    if (!this.row) return;
    const px = this.room.player.getPosition().x;

    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.row.tileCount; i++) {
      const center = this.row.tileCenter(i);
      if (!center) continue;
      const dist = Math.abs(px - center.x);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (bestDist > this.row.tileSize * 0.9) best = -1;
    if (best === this.focusIndex) return;

    this.focusIndex = best;
    this.options.onFocusChange?.(best);
    this.repaintMarker();
  }

  private repaintMarker(): void {
    const g = this.marker;
    g.clear();
    if (!this.row || this.focusIndex < 0) return;
    const center = this.row.tileCenter(this.focusIndex);
    if (!center) return;
    const y = center.y + this.row.tileSize / 2 + 10;
    g.fillStyle(COLORS.CYAN_GLOW, 0.55);
    g.fillTriangle(center.x - 6, y + 8, center.x + 6, y + 8, center.x, y);
  }
}
