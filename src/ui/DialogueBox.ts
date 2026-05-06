/**
 * DialogueBox — primitive-drawn panel with typewriter text.
 *
 * Layout uses an 8-pixel grid: every position, padding, and gap is a
 * multiple of 8 so text and chrome share a consistent rhythm.
 */

import Phaser from 'phaser';
import { FONTS } from '../config/constants';
import { gameState } from '../core/GameStateManager';
import { drawPanel, PANEL_PALETTE } from './panel';
import { a11yManager } from '../core/A11yManager';

export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private portraitFrame: Phaser.GameObjects.Image;
  private speakerText: Phaser.GameObjects.Text;
  private contentText: Phaser.GameObjects.Text;
  private continuePrompt: Phaser.GameObjects.Text;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private fullText: string = '';
  private currentCharIndex: number = 0;
  private isTyping: boolean = false;
  private onCompleteCallback: (() => void) | null = null;

  private readonly BOX_X = 32;
  private readonly BOX_Y: number;
  private readonly BOX_WIDTH: number;
  private readonly BOX_HEIGHT = 160;
  private readonly INNER_PAD_X = 32;
  private readonly INNER_PAD_Y = 16;
  private readonly PORTRAIT_RESERVE = 128;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.cameras.main;
    this.BOX_WIDTH = width - this.BOX_X * 2;
    this.BOX_Y = height - this.BOX_HEIGHT - 32;

    const textX = this.BOX_X + this.INNER_PAD_X;
    const speakerY = this.BOX_Y + this.INNER_PAD_Y;
    const bodyY = speakerY + 32;
    const wrapWidth = this.BOX_WIDTH - this.INNER_PAD_X * 2 - this.PORTRAIT_RESERVE;
    const portraitX = this.BOX_X + this.BOX_WIDTH - 32 - 48;
    const portraitY = this.BOX_Y + this.BOX_HEIGHT / 2;

    this.container = scene.add.container(0, 0).setDepth(5000).setScrollFactor(0);
    this.container.setVisible(false);

    this.background = drawPanel(
      scene,
      this.BOX_X,
      this.BOX_Y,
      this.BOX_WIDTH,
      this.BOX_HEIGHT,
      { depth: 5000, scrollFactor: 0, inner: PANEL_PALETTE.INNER }
    );
    this.container.add(this.background);

    this.portraitFrame = scene.add
      .image(portraitX, portraitY, 'prologue-ui-portrait_active')
      .setOrigin(0.5)
      .setDisplaySize(96, 96);
    this.container.add(this.portraitFrame);

    this.speakerText = scene.add.text(textX, speakerY, '', {
      fontSize: '24px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    });
    this.container.add(this.speakerText);

    this.contentText = scene.add.text(textX, bodyY, '', {
      fontSize: '24px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      wordWrap: { width: wrapWidth },
      lineSpacing: 8,
    });
    this.container.add(this.contentText);

    this.continuePrompt = scene.add.text(
      this.BOX_X + this.BOX_WIDTH - 24,
      this.BOX_Y + this.BOX_HEIGHT - 24,
      '▼',
      { fontSize: '12px', color: '#081820' }
    ).setOrigin(0.5);
    this.continuePrompt.setVisible(false);
    this.container.add(this.continuePrompt);

    scene.tweens.add({
      targets: this.continuePrompt,
      y: '+=4',
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
    });
  }

  show(speaker: string, text: string, onComplete?: () => void): void {
    this.container.setVisible(true);
    this.speakerText.setText(speaker);
    this.fullText = text;
    this.currentCharIndex = 0;
    this.contentText.setText('');
    this.continuePrompt.setVisible(false);
    this.isTyping = true;
    this.onCompleteCallback = onComplete || null;

    a11yManager.announce(`${speaker} says: ${text}`, true);

    const speed = gameState.getSettings().textSpeed;
    const delay = Math.max(10, Math.floor(1000 / speed));

    this.typewriterTimer = this.scene.time.addEvent({
      delay,
      repeat: text.length - 1,
      callback: () => {
        this.currentCharIndex++;
        this.contentText.setText(this.fullText.substring(0, this.currentCharIndex));

        if (this.currentCharIndex >= this.fullText.length) {
          this.isTyping = false;
          this.continuePrompt.setVisible(true);
        }
      },
    });
  }

  advance(): boolean {
    if (this.isTyping) {
      this.typewriterTimer?.destroy();
      this.currentCharIndex = this.fullText.length;
      this.contentText.setText(this.fullText);
      this.isTyping = false;
      this.continuePrompt.setVisible(true);
      return false;
    }

    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
    return true;
  }

  hide(): void {
    this.typewriterTimer?.destroy();
    this.container.setVisible(false);
    this.isTyping = false;
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  destroy(): void {
    this.typewriterTimer?.destroy();
    this.container.destroy();
  }
}
