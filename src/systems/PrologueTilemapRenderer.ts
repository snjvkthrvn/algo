import Phaser from 'phaser';
import { PROLOGUE_SHEET_KEYS } from '../config/assets';
import { PROLOGUE_EMPTY_TILE, PROLOGUE_TILE_SIZE } from '../data/regions/prologueTilemap';

export interface PrologueTilemapHandle {
  destroy: () => void;
}

export class PrologueTilemapRenderer {
  constructor(private readonly scene: Phaser.Scene) {}

  build(grid: number[][]): PrologueTilemapHandle {
    const blitter = this.scene.add
      .blitter(0, 0, PROLOGUE_SHEET_KEYS.ROUTE_TILESET)
      .setDepth(1)
      .setScale(1);

    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < grid[row].length; col += 1) {
        if (grid[row][col] === PROLOGUE_EMPTY_TILE) continue;

        blitter.create(
          col * PROLOGUE_TILE_SIZE,
          row * PROLOGUE_TILE_SIZE,
          grid[row][col]
        );
      }
    }

    return {
      destroy: () => blitter.destroy(),
    };
  }
}
