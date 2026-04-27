/**
 * StarRating - Animated star display component.
 */

import Phaser from 'phaser';

export function showStarRating(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  stars: number,
  x: number = 0,
  _y: number = 0
): void {
  container.removeAll(true);

  const starSize = 24;
  const spacing = 30;
  const startX = x - spacing;

  for (let i = 0; i < 3; i++) {
    const sx = startX + i * spacing;
    const isFilled = i < stars;

    const star = scene.add.text(sx, 0, '\u2605', {
      fontSize: `${starSize}px`,
      color: isFilled ? '#fbbf24' : '#4a4a6a',
    }).setOrigin(0.5);

    star.setScale(0);
    scene.tweens.add({
      targets: star,
      scale: 1,
      duration: 300,
      delay: i * 150,
      ease: 'Back.easeOut',
    });

    container.add(star);
  }

  container.setVisible(true);
}
