/**
 * InteractionPrompt — floating "[SPACE] Talk" affordance above interactables.
 *
 * The prompt lives in world space (so it tracks NPCs as they move), but its
 * chrome is drawn from primitives so borders stay crisp under camera zoom.
 */

import Phaser from 'phaser';
import { FONTS } from '../config/constants';
import { drawPanel, PANEL_PALETTE } from './panel';

const PROMPT_WIDTH = 192;
const PROMPT_HEIGHT = 40;
const PROMPT_DEPTH = 4000;

export class InteractionPrompt {
  private container: Phaser.GameObjects.Container;
  private bobContainer: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(PROMPT_DEPTH);
    this.container.setVisible(false);
    this.bobContainer = scene.add.container(0, 0);
    this.container.add(this.bobContainer);

    const bg = drawPanel(
      scene,
      -PROMPT_WIDTH / 2,
      -PROMPT_HEIGHT / 2,
      PROMPT_WIDTH,
      PROMPT_HEIGHT,
      { depth: PROMPT_DEPTH, scrollFactor: 1, fill: PANEL_PALETTE.FILL }
    );
    this.bobContainer.add(bg);

    this.text = scene.add
      .text(0, 0, '[SPACE] Talk', {
        fontSize: '12px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
      })
      .setOrigin(0.5);
    this.bobContainer.add(this.text);

    // Float the visual content, not the world-position anchor.
    scene.tweens.add({
      targets: this.bobContainer,
      y: '-=4',
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  show(x: number, y: number, promptText: string = '[SPACE] Talk'): void {
    this.container.setPosition(x, y);
    this.text.setText(promptText);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
