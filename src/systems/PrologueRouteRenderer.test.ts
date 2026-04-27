import Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import type { PrologueRouteLandmark } from '../data/regions/prologue';
import { PrologueRouteRenderer } from './PrologueRouteRenderer';

describe('PrologueRouteRenderer', () => {
  it('renders each landmark with the configured image, size, depth, and rotation when present', () => {
    const added: Array<{
      x: number;
      y: number;
      key: string;
      width?: number;
      height?: number;
      angle?: number;
      depth?: number;
    }> = [];

    const fakeScene = {
      add: {
        image: (x: number, y: number, key: string) => {
          const record = {
            x,
            y,
            key,
            width: undefined as number | undefined,
            height: undefined as number | undefined,
            angle: undefined as number | undefined,
            depth: undefined as number | undefined,
          };
          added.push(record);
          const image = {
            setOrigin: () => image,
            setDisplaySize: (width: number, height: number) => {
              record.width = width;
              record.height = height;
              return image;
            },
            setAngle: (angle: number) => {
              record.angle = angle;
              return image;
            },
            setDepth: (depth: number) => {
              record.depth = depth;
              return image;
            },
            destroy: () => undefined,
          };
          return image;
        },
      },
    } as unknown as Phaser.Scene;

    const landmarks: PrologueRouteLandmark[] = [
      {
        id: 'hub',
        label: 'Hub',
        imageKey: 'prologue-rework-central-hub',
        x: 900,
        y: 395,
        displayWidth: 520,
        displayHeight: 250,
        rotation: 12,
        depth: 2,
      },
    ];

    new PrologueRouteRenderer(fakeScene).buildAll(landmarks);

    expect(added).toEqual([
      {
        x: 900,
        y: 395,
        key: 'prologue-rework-central-hub',
        width: 520,
        height: 250,
        angle: 12,
        depth: 2,
      },
    ]);
  });

  it('returns a disposable handle that destroys rendered images', () => {
    const destroyed: string[] = [];
    const fakeScene = {
      add: {
        image: () => {
          const image = {
            setOrigin: () => image,
            setDisplaySize: () => image,
            setAngle: () => image,
            setDepth: () => image,
            destroy: () => destroyed.push('image'),
          };
          return image;
        },
      },
    } as unknown as Phaser.Scene;

    const landmarks: PrologueRouteLandmark[] = [
      {
        id: 'a',
        label: 'A',
        imageKey: 'prologue-rework-awakening-platform',
        x: 1,
        y: 2,
        displayWidth: 3,
        displayHeight: 4,
        depth: 2,
      },
      {
        id: 'b',
        label: 'B',
        imageKey: 'prologue-rework-route-bridge',
        x: 5,
        y: 6,
        displayWidth: 7,
        displayHeight: 8,
        depth: 2,
      },
    ];

    const handle = new PrologueRouteRenderer(fakeScene).buildAll(landmarks);
    handle.destroy();

    expect(destroyed).toEqual(['image', 'image']);
  });
});
