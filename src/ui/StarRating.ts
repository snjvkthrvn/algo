import Phaser from 'phaser';

export function showStarRating(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  stars: number,
  x: number = 0,
  _y: number = 0
): void {
  container.removeAll(true);

  const spacing = 38;
  const startX = x - spacing;

  for (let i = 0; i < 3; i++) {
    const sx = startX + i * spacing;
    const isFilled = i < stars;

    if (isFilled) {
      const shadow = scene.add.text(sx + 3, 3, '★', {
        fontSize: '28px',
        color: '#000000',
      }).setOrigin(0.5).setAlpha(0.45).setScale(0).setY(-35);
      container.add(shadow);
      scene.tweens.add({
        targets: shadow,
        scale: 1,
        y: 3,
        duration: 420,
        delay: i * 160 + 60,
        ease: 'Expo.easeOut',
      });
    }

    const star = scene.add.text(sx, 0, '★', {
      fontSize: '28px',
      color: isFilled ? '#fbbf24' : '#2a2a4a',
      stroke: '#f97316',
      strokeThickness: isFilled ? 1 : 0,
    }).setOrigin(0.5).setScale(0).setY(-35);

    container.add(star);

    scene.tweens.add({
      targets: star,
      scale: 1,
      y: 0,
      duration: 420,
      delay: i * 160,
      ease: 'Expo.easeOut',
    });

    if (isFilled) {
      scene.tweens.add({
        targets: star,
        alpha: 0.65,
        duration: 900,
        delay: i * 160 + 520,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
      });
    }
  }

  container.setVisible(true);
}
