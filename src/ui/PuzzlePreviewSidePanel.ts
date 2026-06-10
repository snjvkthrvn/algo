/**
 * Live-preview side panel for puzzle scenes.
 *
 * Renders a persistent panel on the right (or left) edge of the puzzle frame
 * that shows the algorithm's current state and what the next available action
 * will do — before the player commits. Designed for keyboard-driven puzzles
 * where there's no button to "hover" but the player still benefits from
 * seeing the look-ahead.
 *
 * Usage:
 *   const preview = new PuzzlePreviewSidePanel(this);
 *   preview.setTitle('ALGORITHM STATE');
 *   preview.setState([`L = 0 → 3`, `R = 3 → 8`]);
 *   preview.setNextAction('SPACE  →  arr = [8, 5, 2, 3]');
 *   preview.show();
 *   // ...later, on shutdown:
 *   preview.destroy();
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS } from '../config/constants';
import { drawPanel } from './panel';

export interface PuzzlePreviewSidePanelOptions {
  /** Which side of the puzzle frame to render. Defaults to 'right'. */
  side?: 'right' | 'left';
  /** Panel width in pixels. Snap to 8. Defaults to 264. */
  width?: number;
  /** Panel height in pixels. Snap to 8. Defaults to 280. */
  height?: number;
  /** Vertical offset from the camera vertical center. Defaults to 0. */
  yOffset?: number;
  /** Depth for the panel chrome. Body elements render at depth + 1. */
  depth?: number;
  /**
   * Accent colour for the title strip, divider, and label-text. Phase 17 —
   * gives each boss its own preview-panel signature instead of all three
   * looking like the same green terminal window. Pick something that
   * pairs with the boss's other accents (Sentinel cyan, Shuffler gold,
   * Mirror Serpent teal). Defaults to COLORS.CYAN_GLOW.
   */
  accentColor?: number;
  /** Hex string version of accentColor for text fill. */
  accentColorHex?: string;
}

export class PuzzlePreviewSidePanel {
  private readonly scene: Phaser.Scene;
  private readonly chrome: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly stateLabel: Phaser.GameObjects.Text;
  private readonly stateBody: Phaser.GameObjects.Text;
  private readonly divider: Phaser.GameObjects.Rectangle;
  private readonly nextLabel: Phaser.GameObjects.Text;
  private readonly nextBody: Phaser.GameObjects.Text;
  private readonly elements: Phaser.GameObjects.GameObject[];
  private isVisible = false;

  constructor(scene: Phaser.Scene, options: PuzzlePreviewSidePanelOptions = {}) {
    this.scene = scene;
    const { width: cameraWidth, height: cameraHeight } = scene.cameras.main;

    const panelWidth = options.width ?? 280;
    const panelHeight = options.height ?? 304;
    const depth = options.depth ?? 1990;
    const side = options.side ?? 'right';
    const yOffset = options.yOffset ?? 0;
    // Phase 17 — per-boss accent for the preview panel. Defaults to cyan
    // so existing tutorial puzzles render identically; boss scenes pass
    // their own colour so each capstone has its own signature.
    const accentColor = options.accentColor ?? COLORS.CYAN_GLOW;
    const accentHex = options.accentColorHex ?? '#06b6d4';

    // Snap to 8-pixel grid; sit just inside the puzzle frame's 40px padding.
    const x = side === 'right'
      ? Math.round(cameraWidth - panelWidth - 56)
      : 56;
    const y = Math.round((cameraHeight - panelHeight) / 2 + yOffset);

    // Frame chrome — dark fill on the void-black background, accent
    // strip on top in the boss's signature colour.
    this.chrome = drawPanel(scene, x, y, panelWidth, panelHeight, {
      depth,
      scrollFactor: 0,
      fill: 0x081820,
      frame: COLORS.FRAME_BORDER_LIGHT,
      inner: COLORS.SUCCESS,
      alpha: 0.94,
      shadow: true,
      accent: accentColor,
    });

    const padX = 18;
    const labelColor = accentHex;
    const bodyColor = COLOR_HEX.TEXT_LIGHT;

    this.titleText = scene.add
      .text(x + padX, y + 12, '▸ PREVIEW', {
        fontSize: '10px',
        fontFamily: FONTS.RETRO,
        color: labelColor,
        wordWrap: { width: panelWidth - padX * 2 },
      })
      .setDepth(depth + 1)
      .setScrollFactor(0);

    // Section 1: current algorithm state
    this.stateLabel = scene.add
      .text(x + padX, y + 42, 'CURRENT STATE', {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.TEXT_MUTED,
      })
      .setDepth(depth + 1)
      .setScrollFactor(0);

    this.stateBody = scene.add
      .text(x + padX, y + 60, '', {
        fontSize: '11px',
        fontFamily: FONTS.RETRO,
        color: bodyColor,
        wordWrap: { width: panelWidth - padX * 2 },
        lineSpacing: 6,
      })
      .setDepth(depth + 1)
      .setScrollFactor(0);

    // Divider between state and next-action
    const dividerY = y + Math.round(panelHeight * 0.62);
    this.divider = scene.add
      .rectangle(x + padX, dividerY, panelWidth - padX * 2, 1, COLORS.FRAME_BORDER_LIGHT, 0.8)
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
      .setScrollFactor(0);

    // Section 2: next action preview
    this.nextLabel = scene.add
      .text(x + padX, dividerY + 12, 'NEXT ACTION', {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.CYAN_GLOW,
      })
      .setDepth(depth + 1)
      .setScrollFactor(0);

    this.nextBody = scene.add
      .text(x + padX, dividerY + 32, '', {
        fontSize: '11px',
        fontFamily: FONTS.RETRO,
        color: bodyColor,
        wordWrap: { width: panelWidth - padX * 2 },
        lineSpacing: 6,
      })
      .setDepth(depth + 1)
      .setScrollFactor(0);

    this.elements = [
      this.chrome,
      this.titleText,
      this.stateLabel,
      this.stateBody,
      this.divider,
      this.nextLabel,
      this.nextBody,
    ];

    // Hidden until show() is called
    for (const el of this.elements) {
      if ('setAlpha' in el && typeof (el as Phaser.GameObjects.Graphics).setAlpha === 'function') {
        (el as Phaser.GameObjects.Graphics).setAlpha(0);
      }
    }
  }

  setTitle(title: string): void {
    this.titleText.setText(`▸ ${title}`);
  }

  setState(lines: string[] | string): void {
    const text = Array.isArray(lines) ? lines.join('\n') : lines;
    this.stateBody.setText(text);
  }

  setNextAction(text: string): void {
    this.nextBody.setText(text);
  }

  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.scene.tweens.add({
      targets: this.elements,
      alpha: 1,
      duration: 180,
      ease: 'Power2.easeOut',
    });
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.scene.tweens.add({
      targets: this.elements,
      alpha: 0,
      duration: 120,
      ease: 'Power2.easeIn',
    });
  }

  destroy(): void {
    for (const el of this.elements) el.destroy();
  }
}
