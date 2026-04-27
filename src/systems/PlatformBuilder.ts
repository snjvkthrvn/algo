import type { PlatformCluster } from '../data/regions/prologue';

const TILESET_KEY = 'prologue-tileset';
const PLATFORM_DEPTH = 2;
const PLATFORM_SCALE = 0.26;

export interface PlatformHandle {
  destroy(): void;
}

export class PlatformBuilder {
  constructor(private scene: Phaser.Scene) {}

  build(cluster: PlatformCluster): PlatformHandle {
    const sprites: Phaser.GameObjects.Image[] = [];

    for (const tile of cluster.tiles) {
      const sprite = this.scene.add
        .image(cluster.origin.x + tile.dx, cluster.origin.y + tile.dy, TILESET_KEY, tile.frame)
        .setOrigin(0.5, 0.5)
        .setScale(PLATFORM_SCALE)
        .setDepth(PLATFORM_DEPTH);

      sprites.push(sprite);
    }

    return {
      destroy: () => {
        for (const sprite of sprites) {
          sprite.destroy();
        }
      },
    };
  }

  buildAll(clusters: readonly PlatformCluster[]): PlatformHandle {
    const handles = clusters.map((cluster) => this.build(cluster));

    return {
      destroy: () => {
        for (const handle of handles) {
          handle.destroy();
        }
      },
    };
  }
}
