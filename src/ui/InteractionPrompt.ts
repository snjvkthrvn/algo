/**
 * InteractionPrompt — floating "[SPACE] Talk" affordance above interactables.
 *
 * The prompt lives in world space (so it tracks NPCs as they move), but its
 * chrome is drawn from primitives so borders stay crisp under camera zoom.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS } from '../config/constants';
import { drawPanel, PANEL_PALETTE } from './panel';
import { a11yManager } from '../core/A11yManager';

export const INTERACTION_PROMPT_WIDTH = 320;
const PROMPT_HEIGHT = 40;
const PROMPT_DEPTH = 4000;

export class InteractionPrompt {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bobContainer: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(PROMPT_DEPTH);
    this.container.setVisible(false);
    this.bobContainer = scene.add.container(0, 0);
    this.container.add(this.bobContainer);

    const bg = drawPanel(
      scene,
      -INTERACTION_PROMPT_WIDTH / 2,
      -PROMPT_HEIGHT / 2,
      INTERACTION_PROMPT_WIDTH,
      PROMPT_HEIGHT,
      {
        depth: PROMPT_DEPTH,
        scrollFactor: 1,
        fill: COLORS.ERROR,
        frame: COLORS.CYAN_GLOW,
        inner: PANEL_PALETTE.ACCENT,
        alpha: 0.94,
        shadow: true,
        shadowAlpha: 0.28,
        accent: COLORS.CYAN_GLOW,
      }
    );
    this.bobContainer.add(bg);

    this.text = scene.add
      .text(0, 0, '[SPACE] Talk', {
        fontSize: '12px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.TEXT_LIGHT,
      })
      .setOrigin(0.5);
    this.bobContainer.add(this.text);

    // Float the visual content, not the world-position anchor.
    scene.tweens.add({
      targets: this.bobContainer,
      y: '-=4',
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
    });
  }

  show(x: number, y: number, promptText: string = '[SPACE] Talk'): void {
    const wasVisible = this.container.visible;
    const oldText = this.text.text;

    const camera = this.scene.cameras.main;
    const zoom = camera.zoom > 0 ? camera.zoom : 1;
    const scale = 1 / zoom;
    const halfWidth = (INTERACTION_PROMPT_WIDTH * scale) / 2;
    const halfHeight = (PROMPT_HEIGHT * scale) / 2;
    const padding = 8 * scale;
    const view = camera.worldView;
    const clampedX = Math.max(view.left + halfWidth + padding, Math.min(x, view.right - halfWidth - padding));
    const clampedY = Math.max(view.top + halfHeight + padding, Math.min(y, view.bottom - halfHeight - padding));

    this.container.setScale(scale);
    this.container.setPosition(clampedX, clampedY);
    this.text.setText(promptText);
    this.container.setVisible(true);

    if (!wasVisible || oldText !== promptText) {
      a11yManager.announce(`Interaction available: ${promptText}`);
    }
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
