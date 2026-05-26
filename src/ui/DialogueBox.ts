/**
 * DialogueBox — primitive-drawn panel with typewriter text.
 *
 * Layout uses an 8-pixel grid: every position, padding, and gap is a
 * multiple of 8 so text and chrome share a consistent rhythm.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS } from '../config/constants';
import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { gameState } from '../core/GameStateManager';
import { drawPanel, PANEL_PALETTE } from './panel';
import { a11yManager } from '../core/A11yManager';

/**
 * Map speaker names (as written in dialogue trees) to the portrait asset key.
 * Speaker names are exact-match — the lookup is fast and the table is the
 * one place to maintain the mapping. Unknown speakers (Narrator, Bit,
 * System, field-note labels like "Index 0", etc.) fall through to no
 * portrait and the panel collapses the portrait region.
 */
const SPEAKER_PORTRAITS: Record<string, string> = {
  // Prologue cast
  'Professor Node':   VISUAL_REVAMP_KEYS.PORTRAIT_PROFESSOR_NODE,
  'Rune Keeper':      VISUAL_REVAMP_KEYS.PORTRAIT_RUNE_KEEPER,
  'Console Keeper':   VISUAL_REVAMP_KEYS.PORTRAIT_CONSOLE_KEEPER,
  'Watcher':          VISUAL_REVAMP_KEYS.PORTRAIT_WATCHER,
  'Glitch':           VISUAL_REVAMP_KEYS.PORTRAIT_GLITCH,
  // Array Plains keepers
  'Sorting Farmer':   VISUAL_REVAMP_KEYS.PORTRAIT_SORTING_FARMER,
  'Basket Keeper':    VISUAL_REVAMP_KEYS.PORTRAIT_BASKET_KEEPER,
  'Crop Sorter':      VISUAL_REVAMP_KEYS.PORTRAIT_CROP_SORTER,
  'Tile Worker':      VISUAL_REVAMP_KEYS.PORTRAIT_TILE_WORKER,
  'Village Elder':    VISUAL_REVAMP_KEYS.PORTRAIT_VILLAGE_ELDER,
  // Twin Rivers keepers
  'Mirror Walker':    VISUAL_REVAMP_KEYS.PORTRAIT_MIRROR_WALKER,
  'Bridge Keeper':    VISUAL_REVAMP_KEYS.PORTRAIT_BRIDGE_KEEPER,
  'Window Fisher':    VISUAL_REVAMP_KEYS.PORTRAIT_WINDOW_FISHER,
  'Current Rider':    VISUAL_REVAMP_KEYS.PORTRAIT_CURRENT_RIDER,
};

const lookupPortrait = (speaker: string): string | null => SPEAKER_PORTRAITS[speaker] ?? null;

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
  private readonly PORTRAIT_RESERVE = 112;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.cameras.main;
    this.BOX_WIDTH = width - this.BOX_X * 2;
    this.BOX_Y = height - this.BOX_HEIGHT - 32;

    const textX = this.BOX_X + this.INNER_PAD_X;
    const speakerY = this.BOX_Y + this.INNER_PAD_Y;
    // Smaller speaker label sets visual hierarchy; body sits below with more breathing room.
    const bodyY = speakerY + 28;
    const wrapWidth = this.BOX_WIDTH - this.INNER_PAD_X * 2 - this.PORTRAIT_RESERVE;
    const portraitX = this.BOX_X + this.BOX_WIDTH - 32 - 40;
    const portraitY = this.BOX_Y + this.BOX_HEIGHT / 2;

    this.container = scene.add.container(0, 0).setDepth(5000).setScrollFactor(0);
    this.container.setVisible(false);

    this.background = drawPanel(
      scene,
      this.BOX_X,
      this.BOX_Y,
      this.BOX_WIDTH,
      this.BOX_HEIGHT,
      {
        depth: 5000,
        scrollFactor: 0,
        fill: COLORS.ERROR,
        frame: COLORS.FRAME_BORDER_LIGHT,
        inner: PANEL_PALETTE.ACCENT,
        alpha: 0.94,
        shadow: true,
        shadowAlpha: 0.28,
        accent: COLORS.CYAN_GLOW,
      }
    );
    this.container.add(this.background);

    // Portrait — defaults to legacy generic frame so unknown speakers still
    // get something; show() swaps the texture per-speaker via SPEAKER_PORTRAITS.
    // displaySize 96x96 lifts the portrait from a thumbnail to a real character
    // presence, addressing the audit's "no portrait recognition" finding.
    this.portraitFrame = scene.add
      .image(portraitX, portraitY, 'prologue-ui-portrait_active')
      .setOrigin(0.5)
      .setDisplaySize(96, 96);
    this.container.add(this.portraitFrame);

    // Speaker label — bumped from 14px to 18px and given a small bg accent
    // so the player's eye finds "who's talking" at a glance. The audit
    // flagged the old 14px green-on-panel as easy to miss.
    this.speakerText = scene.add.text(textX, speakerY, '', {
      fontSize: '18px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.CYAN_GLOW,
      stroke: '#0a0a1a',
      strokeThickness: 3,
    });
    this.container.add(this.speakerText);

    this.contentText = scene.add.text(textX, bodyY, '', {
      fontSize: '20px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
      wordWrap: { width: wrapWidth },
      lineSpacing: 8,
    });
    this.container.add(this.contentText);

    this.continuePrompt = scene.add.text(
      this.BOX_X + this.BOX_WIDTH - 24,
      this.BOX_Y + this.BOX_HEIGHT - 24,
      '▼',
      { fontSize: '12px', color: COLOR_HEX.CYAN_GLOW }
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
    this.typewriterTimer?.destroy();
    this.typewriterTimer = null;
    this.container.setVisible(true);
    this.speakerText.setText(speaker);

    // Swap portrait texture per speaker. Falls back to the generic legacy
    // frame for unknown speakers (Narrator, Bit, field notes, etc.). The
    // texture-exists guard prevents a noisy 404 if a portrait isn't loaded
    // yet (e.g. during test boot when only a subset of assets are present).
    const portraitKey = lookupPortrait(speaker);
    if (portraitKey && this.scene.textures.exists(portraitKey)) {
      this.portraitFrame.setTexture(portraitKey);
      this.portraitFrame.setVisible(true);
    } else {
      // Unknown speaker — hide the portrait slot rather than show a wrong
      // face. The text-only dialogue still works cleanly.
      this.portraitFrame.setVisible(false);
    }

    this.fullText = text;
    this.currentCharIndex = 0;
    this.contentText.setText('');
    this.continuePrompt.setVisible(false);
    this.onCompleteCallback = onComplete || null;

    if (text.length === 0) {
      this.isTyping = false;
      this.continuePrompt.setVisible(true);
      a11yManager.announce(`${speaker} continues.`, true);
      return;
    }

    this.isTyping = true;
    a11yManager.announce(`${speaker} says: ${text}`, true);

    const settings = gameState.getSettings();
    const speed = Math.max(1, settings.textSpeed || 30);
    const delay = Math.max(10, Math.floor(1000 / speed));

    this.typewriterTimer = this.scene.time.addEvent({
      delay,
      repeat: Math.max(0, text.length - 1),
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
