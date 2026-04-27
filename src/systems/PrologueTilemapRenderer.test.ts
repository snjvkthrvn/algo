import Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { PROLOGUE_EMPTY_TILE } from '../data/regions/prologueTilemap';
import { PrologueTilemapRenderer } from './PrologueTilemapRenderer';

describe('PrologueTilemapRenderer', () => {
  it('batches every tile through one scaled blitter', () => {
    const created: Array<{
      x: number;
      y: number;
      frame: number;
    }> = [];
    const blitterCalls: Array<{ x: number; y: number; key: string; depth?: number; scale?: number }> = [];
    const scene = {
      add: {
        blitter: (x: number, y: number, key: string) => {
          const call = { x, y, key, depth: undefined as number | undefined, scale: undefined as number | undefined };
          blitterCalls.push(call);
          const blitter = {
            setDepth: (depth: number) => {
              call.depth = depth;
              return blitter;
            },
            setScale: (scale: number) => {
              call.scale = scale;
              return blitter;
            },
            create: (bobX: number, bobY: number, frame: number) => {
              created.push({ x: bobX, y: bobY, frame });
            },
            destroy: () => undefined,
          };
          return blitter;
        },
      },
    } as unknown as Phaser.Scene;

    new PrologueTilemapRenderer(scene).build([
      [0, 1],
      [2, 3],
    ]);

    expect(blitterCalls).toEqual([
      { x: 0, y: 0, key: 'prologue-sheet-route-tileset', depth: 1, scale: 1 },
    ]);
    expect(created).toEqual([
      { x: 0, y: 0, frame: 0 },
      { x: 32, y: 0, frame: 1 },
      { x: 0, y: 32, frame: 2 },
      { x: 32, y: 32, frame: 3 },
    ]);
  });

  it('skips empty void cells so platform edges read against the background', () => {
    const created: Array<{ x: number; y: number; frame: number }> = [];
    const scene = {
      add: {
        blitter: () => {
          const blitter = {
            setDepth: () => blitter,
            setScale: () => blitter,
            create: (x: number, y: number, frame: number) => {
              created.push({ x, y, frame });
            },
            destroy: () => undefined,
          };
          return blitter;
        },
      },
    } as unknown as Phaser.Scene;

    new PrologueTilemapRenderer(scene).build([
      [PROLOGUE_EMPTY_TILE, 1],
      [2, PROLOGUE_EMPTY_TILE],
    ]);

    expect(created).toEqual([
      { x: 32, y: 0, frame: 1 },
      { x: 0, y: 32, frame: 2 },
    ]);
  });
});
