/**
 * AlgorithmTrace - Side panel showing pseudocode with one line highlighted at a time.
 *
 * Used by interactive puzzles to bridge the symbolic algorithm and the
 * physical action: when the player presses a key, the relevant pseudocode line
 * lights up so they see what their input *means* in algorithm terms.
 */

import Phaser from 'phaser';
import { COLORS, FONTS } from '../config/constants';
import { drawPanel } from './panel';

export interface AlgorithmTraceOptions {
  x: number;
  y: number;
  width: number;
  title: string;
  lines: string[];
}

export class AlgorithmTrace {
  private readonly scene: Phaser.Scene;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly lineTexts: Phaser.GameObjects.Text[] = [];
  private readonly highlight: Phaser.GameObjects.Rectangle;
  private currentLine = -1;
  private readonly lineHeight = 18;
  private readonly contentX: number;
  private readonly contentY: number;

  constructor(scene: Phaser.Scene, options: AlgorithmTraceOptions) {
    this.scene = scene;
    this.contentX = options.x + 14;
    this.contentY = options.y + 36;

    const panelHeight = 36 + options.lines.length * this.lineHeight + 14;
    this.panel = drawPanel(scene, options.x, options.y, options.width, panelHeight, {
      depth: 25,
      fill: 0x081820,
      frame: COLORS.CYAN_GLOW,
      inner: COLORS.FRAME_BORDER_LIGHT,
      alpha: 0.92,
    });

    this.title = scene.add.text(options.x + options.width / 2, options.y + 12, options.title, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
    }).setOrigin(0.5, 0).setDepth(26);

    // Highlight bar that slides to the active line.
    this.highlight = scene.add.rectangle(
      options.x + options.width / 2,
      this.contentY + this.lineHeight / 2 - 2,
      options.width - 16,
      this.lineHeight - 2,
      COLORS.CYAN_GLOW,
      0.18
    ).setOrigin(0.5).setDepth(26).setVisible(false);

    options.lines.forEach((line, i) => {
      const text = scene.add.text(this.contentX, this.contentY + i * this.lineHeight, line, {
        fontSize: '11px',
        fontFamily: FONTS.MONO,
        color: '#88c070',
      }).setOrigin(0, 0).setDepth(27);
      this.lineTexts.push(text);
    });
  }

  /** Highlight a specific line index. -1 clears the highlight. */
  highlightLine(index: number): void {
    if (index === this.currentLine) return;
    this.currentLine = index;

    this.lineTexts.forEach((t, i) => {
      t.setColor(i === index ? '#e0f8d0' : '#88c070');
    });

    if (index < 0 || index >= this.lineTexts.length) {
      this.highlight.setVisible(false);
      return;
    }

    const targetY = this.contentY + index * this.lineHeight + this.lineHeight / 2 - 2;
    this.highlight.setVisible(true);
    this.scene.tweens.add({
      targets: this.highlight,
      y: targetY,
      duration: 180,
      ease: 'Sine.easeOut',
    });
  }

  destroy(): void {
    this.panel.destroy();
    this.title.destroy();
    for (const t of this.lineTexts) t.destroy();
    this.lineTexts.length = 0;
    this.highlight.destroy();
  }
}
