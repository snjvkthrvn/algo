/**
 * ConceptBridgeScene - Post-puzzle educational scene.
 * 5 sections: Story Recap, Pattern Reveal, Pseudocode, Mini-Forge, Codex Unlock.
 */

import Phaser from 'phaser';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { TransitionManager } from '../core/TransitionManager';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { CONCEPT_BRIDGE_DATA, type ConceptBridgeContent } from '../data/dialogue/concept_bridge_content';
import type { ConceptBridgeData } from '../data/types';

type Section = 'story_recap' | 'pattern_reveal' | 'pseudocode' | 'mini_forge' | 'codex_unlock';
const SECTIONS: Section[] = ['story_recap', 'pattern_reveal', 'pseudocode', 'mini_forge', 'codex_unlock'];

export class ConceptBridgeScene extends Phaser.Scene {
  private puzzleData!: ConceptBridgeData;
  private content!: ConceptBridgeContent;
  private currentSection: number = 0;
  private sectionContainer!: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Arc[] = [];
  private miniForgeAnswered: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.CONCEPT_BRIDGE });
  }

  init(data: ConceptBridgeData): void {
    this.puzzleData = data;
    this.content = CONCEPT_BRIDGE_DATA[data.puzzleId];
    this.currentSection = 0;
    this.miniForgeAnswered = false;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    audioManager.setScene(this);

    // Fade in via tween overlay
    const fadeIn = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({
      targets: fadeIn,
      alpha: 0,
      duration: 500,
      onComplete: () => fadeIn.destroy(),
    });

    // Background
    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 0.98).setOrigin(0);

    // Title
    this.add.text(width / 2, 40, 'CONCEPT BRIDGE', {
      fontSize: '18px',
      fontFamily: FONTS.RETRO,
      color: '#06b6d4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Stars display
    const starsText = '\u2605'.repeat(this.puzzleData.stars) + '\u2606'.repeat(3 - this.puzzleData.stars);
    this.add.text(width / 2, 68, starsText, {
      fontSize: '16px',
      color: '#fbbf24',
    }).setOrigin(0.5);

    // Section container
    this.sectionContainer = this.add.container(0, 0);

    // Navigation dots
    this.createDots(width, height);

    // Navigation
    this.input.keyboard?.on('keydown-RIGHT', () => this.nextSection());
    this.input.keyboard?.on('keydown-SPACE', () => this.nextSection());
    this.input.keyboard?.on('keydown-LEFT', () => this.prevSection());
    this.input.on('pointerdown', () => this.nextSection());

    // Show first section
    this.showSection(0);
  }

  private createDots(width: number, height: number): void {
    const dotSpacing = 20;
    const startX = width / 2 - (SECTIONS.length - 1) * dotSpacing / 2;

    for (let i = 0; i < SECTIONS.length; i++) {
      const dot = this.add.circle(startX + i * dotSpacing, height - 30, 4,
        i === 0 ? COLORS.CYAN_GLOW : 0x4a4a6a
      );
      this.dots.push(dot);
    }
  }

  private showSection(index: number): void {
    this.sectionContainer.removeAll(true);
    this.currentSection = index;

    // Update dots
    this.dots.forEach((dot, i) => {
      dot.setFillStyle(i === index ? COLORS.CYAN_GLOW : 0x4a4a6a);
    });

    const { width, height } = this.cameras.main;
    const section = SECTIONS[index];

    switch (section) {
      case 'story_recap':
        this.renderStoryRecap(width, height);
        break;
      case 'pattern_reveal':
        this.renderPatternReveal(width, height);
        break;
      case 'pseudocode':
        this.renderPseudocode(width, height);
        break;
      case 'mini_forge':
        this.renderMiniForge(width, height);
        break;
      case 'codex_unlock':
        this.renderCodexUnlock(width, height);
        break;
    }
  }

  private renderStoryRecap(width: number, height: number): void {
    const title = this.add.text(width / 2, 110, 'Story Recap', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#8b5cf6',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const lines = this.content.sections.storyRecap;
    let y = 170;
    for (const line of lines) {
      const text = this.add.text(width / 2, y, line, {
        fontSize: '13px', fontFamily: FONTS.MONO, color: '#d1d5db',
        wordWrap: { width: width - 200 }, align: 'center', lineSpacing: 4,
      }).setOrigin(0.5, 0);
      this.sectionContainer.add(text);
      y += text.height + 20;
    }

    this.addNavHint(width, height);
  }

  private renderPatternReveal(width: number, height: number): void {
    const { title, explanation } = this.content.sections.patternReveal;

    const titleText = this.add.text(width / 2, 110, title, {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#22c55e',
    }).setOrigin(0.5);
    this.sectionContainer.add(titleText);

    let y = 170;
    for (const line of explanation) {
      const text = this.add.text(width / 2, y, line, {
        fontSize: '12px', fontFamily: FONTS.MONO, color: '#d1d5db',
        wordWrap: { width: width - 180 }, align: 'center', lineSpacing: 4,
      }).setOrigin(0.5, 0);
      this.sectionContainer.add(text);
      y += text.height + 16;
    }

    this.addNavHint(width, height);
  }

  private renderPseudocode(width: number, height: number): void {
    const { code, explanation } = this.content.sections.pseudocode;

    const title = this.add.text(width / 2, 110, 'Pseudocode', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#f97316',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    // Code block background
    const codeLines = code.split('\n');
    const codeHeight = codeLines.length * 20 + 30;
    const codeBg = this.add.graphics();
    codeBg.fillStyle(0x0d1117, 0.9);
    codeBg.fillRoundedRect(100, 145, width - 200, codeHeight, 8);
    codeBg.lineStyle(1, 0x30363d, 1);
    codeBg.strokeRoundedRect(100, 145, width - 200, codeHeight, 8);
    this.sectionContainer.add(codeBg);

    const codeText = this.add.text(120, 160, code, {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#c9d1d9',
      lineSpacing: 4,
    });
    this.sectionContainer.add(codeText);

    const expText = this.add.text(width / 2, 160 + codeHeight + 20, explanation, {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#9ca3af',
      wordWrap: { width: width - 200 }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(expText);

    this.addNavHint(width, height);
  }

  private renderMiniForge(width: number, height: number): void {
    const { question, options, correctIndex, explanation } = this.content.sections.miniForge;

    const title = this.add.text(width / 2, 110, 'Mini-Forge Challenge', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const qText = this.add.text(width / 2, 155, question, {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#d1d5db',
      wordWrap: { width: width - 200 }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(qText);

    const startY = 155 + qText.height + 30;

    if (!this.miniForgeAnswered) {
      options.forEach((option, i) => {
        const y = startY + i * 42;
        const bg = this.add.rectangle(width / 2, y, 500, 34, 0x1a1a2e, 0.8);
        bg.setStrokeStyle(1, 0x4a4a6a);
        bg.setInteractive({ useHandCursor: true });

        const optText = this.add.text(width / 2, y, option, {
          fontSize: '11px', fontFamily: FONTS.MONO, color: '#9ca3af',
        }).setOrigin(0.5);

        bg.on('pointerover', () => {
          bg.setStrokeStyle(2, COLORS.CYAN_GLOW);
          optText.setColor('#ffffff');
        });

        bg.on('pointerout', () => {
          bg.setStrokeStyle(1, 0x4a4a6a);
          optText.setColor('#9ca3af');
        });

        bg.on('pointerdown', () => {
          this.miniForgeAnswered = true;
          const correct = i === correctIndex;

          if (correct) {
            bg.setFillStyle(0x22c55e, 0.3);
            audioManager.playCorrectTone();
          } else {
            bg.setFillStyle(0xef4444, 0.3);
            audioManager.playWrongTone();
          }

          // Show explanation
          this.time.delayedCall(500, () => {
            const expText = this.add.text(width / 2, startY + options.length * 42 + 20, explanation, {
              fontSize: '11px', fontFamily: FONTS.MONO, color: '#fbbf24',
              wordWrap: { width: width - 200 }, align: 'center',
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

    // Unlock the codex entry
    gameState.unlockCodexEntry(entryId);

    const title = this.add.text(width / 2, 150, 'CODEX ENTRY UNLOCKED', {
      fontSize: '18px', fontFamily: FONTS.RETRO, color: '#fbbf24',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Scale-in animation
    title.setScale(0);
    this.tweens.add({
      targets: title,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
    this.sectionContainer.add(title);

    const entryName = entryId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const nameText = this.add.text(width / 2, 200, entryName, {
      fontSize: '14px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    }).setOrigin(0.5);
    nameText.setAlpha(0);
    this.tweens.add({
      targets: nameText,
      alpha: 1,
      duration: 500,
      delay: 300,
    });
    this.sectionContainer.add(nameText);

    // Sparkle effect
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const spark = this.add.circle(
        width / 2 + Math.cos(angle) * 80,
        180 + Math.sin(angle) * 80,
        2, COLORS.GOLD_ACCENT, 0
      );
      this.tweens.add({
        targets: spark,
        alpha: 0.8,
        scale: 2,
        duration: 400,
        delay: 500 + i * 30,
        yoyo: true,
        onComplete: () => spark.destroy(),
      });
      this.sectionContainer.add(spark);
    }

    audioManager.playTone(523, 200, 'sine');
    this.time.delayedCall(200, () => audioManager.playTone(659, 200, 'sine'));
    this.time.delayedCall(400, () => audioManager.playTone(784, 300, 'sine'));

    // Stats
    const stats = [
      `Time: ${this.puzzleData.timeSpent}s`,
      `Attempts: ${this.puzzleData.attempts}`,
      `Hints: ${this.puzzleData.hintsUsed}`,
    ];
    const statsText = this.add.text(width / 2, 280, stats.join('  |  '), {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#9ca3af',
    }).setOrigin(0.5);
    statsText.setAlpha(0);
    this.tweens.add({
      targets: statsText,
      alpha: 1,
      duration: 500,
      delay: 600,
    });
    this.sectionContainer.add(statsText);

    // Continue prompt
    const cont = this.add.text(width / 2, height - 80, 'Press SPACE to continue', {
      fontSize: '10px', fontFamily: FONTS.RETRO, color: '#4a4a6a',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: cont,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
    this.sectionContainer.add(cont);
  }

  private addNavHint(width: number, height: number): void {
    const text = this.currentSection < SECTIONS.length - 1
      ? '\u25B6 Press SPACE or click to continue'
      : '\u25B6 Press SPACE to finish';

    const hint = this.add.text(width / 2, height - 60, text, {
      fontSize: '9px', fontFamily: FONTS.MONO, color: '#4a4a6a',
    }).setOrigin(0.5);
    this.sectionContainer.add(hint);
  }

  private nextSection(): void {
    if (this.currentSection < SECTIONS.length - 1) {
      this.currentSection++;
      this.showSection(this.currentSection);
    } else {
      // Done - return to overworld
      TransitionManager.fade(this, SCENE_KEYS.PROLOGUE);
    }
  }

  private prevSection(): void {
    if (this.currentSection > 0) {
      this.currentSection--;
      this.showSection(this.currentSection);
    }
  }
}
