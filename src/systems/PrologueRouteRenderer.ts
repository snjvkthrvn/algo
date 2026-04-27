import Phaser from 'phaser';
import type { PrologueRouteLandmark } from '../data/regions/prologue';

export interface PrologueRouteHandle {
  destroy: () => void;
}

export class PrologueRouteRenderer {
  constructor(private readonly scene: Phaser.Scene) {}

  build(landmark: PrologueRouteLandmark): Phaser.GameObjects.Image {
    return this.scene.add
      .image(landmark.x, landmark.y, landmark.imageKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(landmark.displayWidth, landmark.displayHeight)
      .setAngle(landmark.rotation ?? 0)
      .setDepth(landmark.depth);
  }

  buildAll(landmarks: PrologueRouteLandmark[]): PrologueRouteHandle {
    const images = landmarks.map((landmark) => this.build(landmark));

    return {
      destroy: () => {
        for (const image of images) {
          image.destroy();
        }
      },
    };
  }
}
