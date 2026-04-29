/**
 * ConceptBridgeScene - Post-puzzle educational scene.
 * 5 sections: Story Recap, Pattern Reveal, Pseudocode, Mini-Forge, Codex Unlock.
 */

import Phaser from 'phaser';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { TransitionManager } from '../core/TransitionManager';
import { JuiceSystem } from '../systems/JuiceSystem';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { CONCEPT_BRIDGE_DATA, type ConceptBridgeContent } from '../data/dialogue/concept_bridge_content';
import type { ConceptBridgeData } from '../data/types';

type Section = 'story_recap' | 'pattern_reveal' | 'pseudocode' | 'mini_forge' | 'codex_unlock';
const SECTIONS: Section[] = ['story_recap', 'pattern_reveal', 'pseudocode', 'mini_forge', 'codex_unlock'];

// Layout constants — all multiples of 8
const HEADER_H = 88;
const PANEL_MARGIN = 144;
const PANEL_Y = HEADER_H + 8;
const CONTENT_START_Y = PANEL_Y + 40;   // section title baseline
const BODY_START_Y = CONTENT_START_Y + 52; // body text baseline

export class ConceptBridgeScene extends Phaser.Scene {
  private puzzleData!: ConceptBridgeData;
  private content!: ConceptBridgeContent;
  private currentSection: number = 0;
  private sectionContainer!: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Arc[] = [];
  private miniForgeAnswered: boolean = false;
  private codexUnlockPlayed: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.CONCEPT_BRIDGE });
  }

  init(data: ConceptBridgeData): void {
    this.puzzleData = data;
    this.content = CONCEPT_BRIDGE_DATA[data.puzzleId];
    this.currentSection = 0;
    this.miniForgeAnswered = false;
    this.codexUnlockPlayed = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    audioManager.setScene(this);

    // Fade in
    const fadeIn = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({ targets: fadeIn, alpha: 0, duration: 500, onComplete: () => fadeIn.destroy() });

    // Background
    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 0.98).setOrigin(0);

    // Subtle dot-grid gives the dark void a digital texture (one-time draw, not in update)
    const grid = this.add.graphics();
    grid.fillStyle(0x88c070, 0.05);
    for (let gx = 40; gx < width; gx += 40) {
      for (let gy = 40; gy < height; gy += 40) {
        grid.fillCircle(gx, gy, 1);
      }
    }

    // Persistent header bar — stays visible across all section transitions
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.FRAME_BG, 0.9);
    headerBg.fillRect(0, 0, width, HEADER_H);
    headerBg.lineStyle(1, 0x88c070, 0.45);
    headerBg.beginPath();
    headerBg.moveTo(0, HEADER_H);
    headerBg.lineTo(width, HEADER_H);
    headerBg.strokePath();

    // Title — Game Boy green, not cyan
    this.add.text(width / 2, 24, 'CONCEPT BRIDGE', {
      fontSize: '20px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      stroke: '#081820',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Stars
    const starsText = '★'.repeat(this.puzzleData.stars) + '☆'.repeat(3 - this.puzzleData.stars);
    this.add.text(width / 2, 58, starsText, {
      fontSize: '16px',
      color: '#fbbf24',
    }).setOrigin(0.5);

    // Persistent content panel — fills the space below the header
    const panelW = width - PANEL_MARGIN * 2;
    const panelH = height - PANEL_Y - 48;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.FRAME_BG, 0.38);
    panelBg.fillRoundedRect(PANEL_MARGIN, PANEL_Y, panelW, panelH, 4);
    panelBg.lineStyle(1, COLORS.FRAME_BORDER_LIGHT, 0.28);
    panelBg.strokeRoundedRect(PANEL_MARGIN, PANEL_Y, panelW, panelH, 4);

    // Section container — cleared and repopulated on each navigation
    this.sectionContainer = this.add.container(0, 0);

    // Navigation dots
    this.createDots(width, height);

    this.input.keyboard?.on('keydown-RIGHT', () => this.nextSection());
    this.input.keyboard?.on('keydown-SPACE', () => this.nextSection());
    this.input.keyboard?.on('keydown-LEFT', () => this.prevSection());
    this.input.on('pointerdown', () => this.nextSection());

    this.showSection(0);
  }

  private createDots(width: number, height: number): void {
    const dotSpacing = 20;
    const startX = width / 2 - (SECTIONS.length - 1) * dotSpacing / 2;

    for (let i = 0; i < SECTIONS.length; i++) {
      const dot = this.add.circle(
        startX + i * dotSpacing,
        height - 20,
        5,
        i === 0 ? 0x88c070 : 0x3a3a5a
      );
      this.dots.push(dot);
    }
  }

  private showSection(index: number): void {
    this.sectionContainer.removeAll(true);
    this.currentSection = index;

    // Slide-in entrance: container descends from 16px above and fades in
    this.sectionContainer.setAlpha(0);
    this.sectionContainer.y = 16;
    this.tweens.add({
      targets: this.sectionContainer,
      alpha: 1,
      y: 0,
      duration: 240,
      ease: 'Power3.easeOut',
    });

    this.dots.forEach((dot, i) => {
      dot.setFillStyle(i === index ? 0x88c070 : 0x3a3a5a);
    });

    const { width, height } = this.cameras.main;
    const section = SECTIONS[index];

    switch (section) {
      case 'story_recap':    this.renderStoryRecap(width, height);    break;
      case 'pattern_reveal': this.renderPatternReveal(width, height); break;
      case 'pseudocode':     this.renderPseudocode(width, height);    break;
      case 'mini_forge':     this.renderMiniForge(width, height);     break;
      case 'codex_unlock':   this.renderCodexUnlock(width, height);   break;
    }
  }

  private renderStoryRecap(width: number, height: number): void {
    const title = this.add.text(width / 2, CONTENT_START_Y, 'Story Recap', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#88c070',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const lines = this.content.sections.storyRecap;
    let y = BODY_START_Y;
    for (const line of lines) {
      const text = this.add.text(width / 2, y, line, {
        fontSize: '13px', fontFamily: FONTS.MONO, color: '#d1d5db',
        wordWrap: { width: width - 360 }, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5, 0);
      this.sectionContainer.add(text);
      y += text.height + 24;
    }

    this.addNavHint(width, height);
  }

  private renderPatternReveal(width: number, height: number): void {
    const { title, explanation } = this.content.sections.patternReveal;

    const titleText = this.add.text(width / 2, CONTENT_START_Y, title, {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#22c55e',
    }).setOrigin(0.5);
    this.sectionContainer.add(titleText);

    let y = BODY_START_Y;
    for (const line of explanation) {
      const text = this.add.text(width / 2, y, line, {
        fontSize: '13px', fontFamily: FONTS.MONO, color: '#d1d5db',
        wordWrap: { width: width - 360 }, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5, 0);
      this.sectionContainer.add(text);
      y += text.height + 20;
    }

    this.addNavHint(width, height);
  }

  private renderPseudocode(width: number, height: number): void {
    const { code, explanation } = this.content.sections.pseudocode;

    const title = this.add.text(width / 2, CONTENT_START_Y, 'Pseudocode', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#f97316',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const codeLines = code.split('\n');
    const codeBlockH = codeLines.length * 20 + 32;
    const codeBg = this.add.graphics();
    codeBg.fillStyle(0x0d1117, 0.92);
    codeBg.fillRoundedRect(PANEL_MARGIN + 16, BODY_START_Y - 8, width - (PANEL_MARGIN + 16) * 2, codeBlockH, 4);
    codeBg.lineStyle(1, 0x30363d, 1);
    codeBg.strokeRoundedRect(PANEL_MARGIN + 16, BODY_START_Y - 8, width - (PANEL_MARGIN + 16) * 2, codeBlockH, 4);
    this.sectionContainer.add(codeBg);

    const codeText = this.add.text(PANEL_MARGIN + 32, BODY_START_Y + 4, code, {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#c9d1d9',
      lineSpacing: 4,
    });
    this.sectionContainer.add(codeText);

    const expText = this.add.text(width / 2, BODY_START_Y + codeBlockH + 16, explanation, {
      fontSize: '12px', fontFamily: FONTS.MONO, color: '#9ca3af',
      wordWrap: { width: width - 360 }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(expText);

    this.addNavHint(width, height);
  }

  private renderMiniForge(width: number, height: number): void {
    const { question, options, correctIndex, explanation } = this.content.sections.miniForge;

    const title = this.add.text(width / 2, CONTENT_START_Y, 'Mini-Forge Challenge', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const qText = this.add.text(width / 2, BODY_START_Y, question, {
      fontSize: '12px', fontFamily: FONTS.MONO, color: '#d1d5db',
      wordWrap: { width: width - 360 }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(qText);

    const startY = BODY_START_Y + qText.height + 32;

    if (!this.miniForgeAnswered) {
      options.forEach((option, i) => {
        const y = startY + i * 48;
        const bg = this.add.rectangle(width / 2, y, 520, 36, 0x1a1a2e, 0.85);
        bg.setStrokeStyle(1, 0x4a4a6a);
        bg.setInteractive({ useHandCursor: true });

        const optText = this.add.text(width / 2, y, option, {
          fontSize: '11px', fontFamily: FONTS.MONO, color: '#9ca3af',
        }).setOrigin(0.5);

        bg.on('pointerover', () => {
          bg.setStrokeStyle(2, 0x88c070);
          optText.setColor('#e0f8d0');
        });

        bg.on('pointerout', () => {
          bg.setStrokeStyle(1, 0x4a4a6a);
          optText.setColor('#9ca3af');
        });

        bg.on('pointerdown', () => {
          this.miniForgeAnswered = true;
          const correct = i === correctIndex;

          if (correct) {
            bg.setFillStyle(0x22c55e, 0.28);
            bg.setStrokeStyle(2, 0x22c55e);
            audioManager.playCorrectTone();
          } else {
            bg.setFillStyle(0xef4444, 0.28);
            bg.setStrokeStyle(2, 0xef4444);
            audioManager.playWrongTone();
          }

          this.time.delayedCall(500, () => {
            const expText = this.add.text(width / 2, startY + options.length * 48 + 20, explanation, {
              fontSize: '12px', fontFamily: FONTS.MONO, color: '#fbbf24',
              wordWrap: { width: width - 360 }, align: 'center',
            }).setOrigin(0.5, 0);
            this.sectionContainer.add(expText);
          });
        });

        this.sectionContainer.add([bg, optText]);
      });
    }

    this.addNavHint(width, height);
  }

  private renderCodexUnlock(width: number, height: number): void {
    const entryId = this.content.sections.codexEntryId;
    gameState.unlockCodexEntry(entryId);

    // Vertically center the unlock celebration within the content panel
    const titleY = Math.round((PANEL_Y + height - 48) / 2) - 80;

    const title = this.add.text(width / 2, titleY, 'CODEX ENTRY UNLOCKED', {
      fontSize: '20px', fontFamily: FONTS.RETRO, color: '#fbbf24',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    title.setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Expo.easeOut' });
    this.sectionContainer.add(title);

    const entryName = entryId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const nameText = this.add.text(width / 2, titleY + 56, entryName, {
      fontSize: '14px', fontFamily: FONTS.RETRO, color: '#e0f8d0',
    }).setOrigin(0.5);
    nameText.setAlpha(0);
    this.tweens.add({ targets: nameText, alpha: 1, duration: 500, delay: 300 });
    this.sectionContainer.add(nameText);

    if (!this.codexUnlockPlayed) {
      this.codexUnlockPlayed = true;
      JuiceSystem.goldRain(this);
      this.time.delayedCall(80, () => JuiceSystem.screenFlash(this, 0xfbbf24, 0.10, 500));
      const sparkCx = width / 2;
      const sparkCy = titleY + 28;
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24;
        const spark = this.add.circle(
          sparkCx + Math.cos(angle) * 96,
          sparkCy + Math.sin(angle) * 56,
          2, COLORS.GOLD_ACCENT, 0
        );
        this.tweens.add({
          targets: spark,
          alpha: 0.9,
          scale: 2,
          duration: 400,
          delay: 500 + i * 24,
          yoyo: true,
          onComplete: () => spark.destroy(),
        });
        this.sectionContainer.add(spark);
      }

      audioManager.playTone(523, 200, 'sine');
      this.time.delayedCall(200, () => audioManager.playTone(659, 200, 'sine'));
      this.time.delayedCall(400, () => audioManager.playTone(784, 300, 'sine'));
    }

    const stats = [
      `Time: ${this.puzzleData.timeSpent}s`,
      `Attempts: ${this.puzzleData.attempts}`,
      `Hints: ${this.puzzleData.hintsUsed}`,
    ];
    const statsText = this.add.text(width / 2, titleY + 128, stats.join('   |   '), {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#9ca3af',
    }).setOrigin(0.5);
    statsText.setAlpha(0);
    this.tweens.add({ targets: statsText, alpha: 1, duration: 500, delay: 600 });
    this.sectionContainer.add(statsText);

    const cont = this.add.text(width / 2, height - 56, 'Press SPACE to continue', {
      fontSize: '10px', fontFamily: FONTS.RETRO, color: '#88c070',
    }).setOrigin(0.5);
    this.tweens.add({ targets: cont, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.sectionContainer.add(cont);
  }

  private addNavHint(width: number, height: number): void {
    const text = this.currentSection < SECTIONS.length - 1
      ? '▶ SPACE or click to continue'
      : '▶ SPACE to finish';

    const hint = this.add.text(width / 2, height - 48, text, {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#88c070',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.sectionContainer.add(hint);
  }

  private nextSection(): void {
    if (this.currentSection < SECTIONS.length - 1) {
      this.currentSection++;
      this.showSection(this.currentSection);
    } else {
      TransitionManager.fade(this, this.puzzleData.returnScene ?? SCENE_KEYS.PROLOGUE);
    }
  }

  private prevSection(): void {
    if (this.currentSection > 0) {
      this.currentSection--;
      this.showSection(this.currentSection);
    }
  }
}
