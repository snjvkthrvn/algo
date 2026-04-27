import Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import type { PlatformCluster } from '../data/regions/prologue';
import { PlatformBuilder } from './PlatformBuilder';

describe('PlatformBuilder', () => {
  it('creates one sprite per tile at origin plus offset', () => {
    const added: Array<{ x: number; y: number; key: string; frame: number }> = [];
    const fakeScene = {
      add: {
        image: (x: number, y: number, key: string, frame: number) => {
          added.push({ x, y, key, frame });
          const sprite = {
            setOrigin: () => sprite,
            setDepth: () => sprite,
            setScale: () => sprite,
          };
          return sprite;
        },
      },
    } as unknown as Phaser.Scene;

    const cluster: PlatformCluster = {
      id: 'test',
      label: 'test',
      origin: { x: 100, y: 200 },
      tiles: [
        { dx: -10, dy: -20, frame: 6 },
        { dx: 10, dy: 20, frame: 9 },
      ],
      footprint: { x: 0, y: 0, width: 200, height: 100 },
    };

    new PlatformBuilder(fakeScene).build(cluster);

    expect(added).toEqual([
      { x: 90, y: 180, key: 'prologue-tileset', frame: 6 },
      { x: 110, y: 220, key: 'prologue-tileset', frame: 9 },
    ]);
  });

  it('returns a disposable that destroys all sprites built', () => {
    const destroyed: string[] = [];
    const fakeScene = {
      add: {
        image: () => ({
          setOrigin() {
            return this;
          },
          setDepth() {
            return this;
          },
          setScale() {
            return this;
          },
          destroy: () => destroyed.push('sprite'),
        }),
      },
    } as unknown as Phaser.Scene;
    const cluster: PlatformCluster = {
      id: 'x',
      label: 'x',
      origin: { x: 0, y: 0 },
      tiles: [{ dx: 0, dy: 0, frame: 6 }],
      footprint: { x: 0, y: 0, width: 10, height: 10 },
    };

    const handle = new PlatformBuilder(fakeScene).build(cluster);
    handle.destroy();

    expect(destroyed).toEqual(['sprite']);
  });
});
