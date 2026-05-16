import Phaser from 'phaser';
import { COLOR_HEX } from '../config/constants';

export function showStarRating(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  stars: number,
  x: number = 0,
  _y: number = 0
): void {
  container.removeAll(true);

  const spacing = 40;
  const startX = x - spacing;

  for (let i = 0; i < 3; i++) {
    const sx = startX + i * spacing;
    const isFilled = i < stars;

    if (isFilled) {
      const shadow = scene.add.text(sx + 4, 4, '★', {
        fontSize: '24px',
        color: COLOR_HEX.TEXT_DARK,
      }).setOrigin(0.5).setY(-40);
      
      container.add(shadow);
      scene.tweens.add({
        targets: shadow,
        y: 4,
        duration: 420,
        delay: i * 160 + 60,
        ease: 'Stepped',
      });
    }

    const star = scene.add.text(sx, 0, '★', {
      fontSize: '24px',
      color: isFilled ? COLOR_HEX.GOLD : COLOR_HEX.WARNING,
      stroke: COLOR_HEX.TEXT_DARK,
      strokeThickness: 2,
    }).setOrigin(0.5).setY(-40);

    container.add(star);

    scene.tweens.add({
      targets: star,
      y: 0,
      duration: 420,
      delay: i * 160,
      ease: 'Stepped',
    });

    if (isFilled) {
      scene.tweens.add({
        targets: star,
        y: -8,
        duration: 200,
        delay: i * 160 + 520,
        yoyo: true,
        repeat: 2,
        ease: 'Stepped',
      });
    }
  }

  container.setVisible(true);
}
