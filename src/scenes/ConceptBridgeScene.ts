/**
 * ConceptBridgeScene - Post-puzzle educational scene.
 * 5 sections: Story Recap, Pattern Reveal, Pseudocode, Mini-Forge, Codex Unlock.
 */

import Phaser from 'phaser';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { TransitionManager } from '../core/TransitionManager';
import { drawPanel } from '../ui/panel';
import { JuiceSystem } from '../systems/JuiceSystem';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { a11yManager } from '../core/A11yManager';
import { getConceptBridgeContent, type ConceptBridgeContent } from '../data/dialogue/concept_bridge_content';
import type { ConceptBridgeData } from '../data/types';

type Section = 'story_recap' | 'pattern_reveal' | 'pseudocode' | 'mini_forge' | 'real_world' | 'codex_unlock';
const SECTIONS: Section[] = ['story_recap', 'pattern_reveal', 'pseudocode', 'mini_forge', 'real_world', 'codex_unlock'];

// Layout constants — all multiples of 8 for crisp pixel-snap
const HEADER_H = 88;
const PANEL_MARGIN = 144;
const PANEL_Y = HEADER_H + 8;
const CONTENT_START_Y = PANEL_Y + 40;   // section title baseline
const BODY_START_Y = CONTENT_START_Y + 48; // body text baseline
const BODY_WRAP_INSET = 320;            // word-wrap inset from viewport width

export class ConceptBridgeScene extends Phaser.Scene {
  private puzzleData!: ConceptBridgeData;
  private content!: ConceptBridgeContent;
  private currentSection: number = 0;
  private sectionContainer!: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Arc[] = [];
  private miniForgeAnswered: boolean = false;
  private miniForgeSelectedIndex: number | null = null;
  private codexUnlockPlayed: boolean = false;
  private sectionReadyAt: number = 0;

  constructor() {
    super({ key: SCENE_KEYS.CONCEPT_BRIDGE });
  }

  init(data: ConceptBridgeData): void {
    this.puzzleData = data;
    this.content = getConceptBridgeContent(data);
    this.currentSection = 0;
    this.miniForgeAnswered = false;
    this.miniForgeSelectedIndex = null;
    this.codexUnlockPlayed = false;
    this.sectionReadyAt = 0;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    audioManager.setScene(this);

    // Fade in
    const fadeIn = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({ targets: fadeIn, alpha: 0, duration: 500, onComplete: () => fadeIn.destroy() });

    // Background
    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 1).setOrigin(0);

    // Subtle dot-grid gives the dark void a digital texture (optimized as TileSprite)
    if (!this.textures.exists('bg-dot')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x346856, 1);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture('bg-dot', 32, 32);
      g.destroy();
    }
    this.add.tileSprite(0, 0, width, height, 'bg-dot').setOrigin(0);

    // Persistent header bar — stays visible across all section transitions
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.FRAME_BG, 1);
    headerBg.fillRect(0, 0, width, HEADER_H);
    headerBg.lineStyle(2, COLORS.FRAME_BORDER, 1);
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
    drawPanel(this, PANEL_MARGIN, PANEL_Y, panelW, panelH, {
      depth: 0,
      fill: COLORS.FRAME_BG,
      frame: COLORS.FRAME_BORDER,
      inner: COLORS.FRAME_BORDER_LIGHT,
      alpha: 1,
    });

    // Section container — cleared and repopulated on each navigation
    this.sectionContainer = this.add.container(0, 0);

    // Navigation dots
    this.createDots(width, height);

    this.input.keyboard?.on('keydown-RIGHT', () => this.nextSection());
    this.input.keyboard?.on('keydown-D', () => this.nextSection());
    this.input.keyboard?.on('keydown-SPACE', () => this.nextSection());
    this.input.keyboard?.on('keydown-ENTER', () => this.nextSection());
    this.input.keyboard?.on('keydown-LEFT', () => this.prevSection());
    this.input.keyboard?.on('keydown-A', () => this.prevSection());

    // Number keys 1-4 pick a Mini-Forge answer while on that section.
    // Without these, keyboard-only players have no way to pass the Forge.
    this.input.keyboard?.on('keydown-ONE', () => this.handleMiniForgeKeyPick(0));
    this.input.keyboard?.on('keydown-TWO', () => this.handleMiniForgeKeyPick(1));
    this.input.keyboard?.on('keydown-THREE', () => this.handleMiniForgeKeyPick(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.handleMiniForgeKeyPick(3));

    this.showSection(0);
  }

  /** Shared selection logic for both pointerdown and keyboard inputs on the Mini-Forge. */
  private chooseMiniForgeOption(index: number): void {
    if (this.miniForgeAnswered) return;
    const forge = this.content.sections.miniForge;
    if (index < 0 || index >= forge.options.length) return;

    this.miniForgeSelectedIndex = index;
    if (index === forge.correctIndex) {
      this.miniForgeAnswered = true;
      audioManager.playCorrectTone();
    } else {
      audioManager.playWrongTone();
    }
    this.showSection(this.currentSection);
  }

  /** Keyboard entry point for Mini-Forge — only acts when on that section. */
  private handleMiniForgeKeyPick(index: number): void {
    if (SECTIONS[this.currentSection] !== 'mini_forge') return;
    if (this.time.now < this.sectionReadyAt) return;
    this.chooseMiniForgeOption(index);
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
    this.sectionReadyAt = this.time.now + 300;

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
      case 'story_recap':
        this.renderStoryRecap(width, height);
        a11yManager.announce(`Story Recap. ${this.content.sections.storyRecap.join(' ')}`);
        break;
      case 'pattern_reveal':
        this.renderPatternReveal(width, height);
        a11yManager.announce(`Pattern Reveal: ${this.content.sections.patternReveal.title}. ${this.content.sections.patternReveal.explanation.join(' ')}`);
        break;
      case 'pseudocode':
        this.renderPseudocode(width, height);
        a11yManager.announce(`Pseudocode. ${this.content.sections.pseudocode.code}. ${this.content.sections.pseudocode.explanation}`);
        break;
      case 'mini_forge':
        this.renderMiniForge(width, height);
        a11yManager.announce(`Mini-Forge Challenge. ${this.content.sections.miniForge.question}. Options: ${this.content.sections.miniForge.options.join(', ')}`);
        break;
      case 'real_world':
        this.renderRealWorld(width, height);
        a11yManager.announce(`Real-world usage. ${this.content.sections.realWorld.join(' ')}`);
        break;
      case 'codex_unlock':
        this.renderCodexUnlock(width, height);
        a11yManager.announce(`Codex Entry Unlocked: ${this.content.sections.codexEntryId.replace(/_/g, ' ')}`);
        break;
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
        fontSize: '13px', fontFamily: FONTS.MONO, color: '#e0f8d0',
        wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center', lineSpacing: 6,
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
        fontSize: '13px', fontFamily: FONTS.MONO, color: '#e0f8d0',
        wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5, 0);
      this.sectionContainer.add(text);
      y += text.height + 20;
    }

    this.addNavHint(width, height);
  }

  private renderPseudocode(width: number, height: number): void {
    const { code, python, js, explanation } = this.content.sections.pseudocode;

    const title = this.add.text(width / 2, CONTENT_START_Y, 'Pseudocode', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#f97316',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const tabs = [
      { name: 'Pseudo', val: code },
      { name: 'Python', val: python },
      { name: 'JS', val: js }
    ];
    let currentTab = 0;

    const codeBg = this.add.graphics();
    this.sectionContainer.add(codeBg);

    const codeText = this.add.text(PANEL_MARGIN + 32, BODY_START_Y + 24, '', {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      lineSpacing: 4,
    });
    this.sectionContainer.add(codeText);

    const expText = this.add.text(width / 2, 0, explanation, {
      fontSize: '12px', fontFamily: FONTS.MONO, color: '#88c070',
      wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(expText);

    const tabTexts: Phaser.GameObjects.Text[] = [];
    const drawCode = () => {
      const activeCode = tabs[currentTab].val;
      codeText.setText(activeCode);

      const codeLines = activeCode.split('\n');
      const codeBlockH = codeLines.length * 20 + 44;

      // Sharp pixel chrome — no rounded corners, GB palette
      codeBg.clear();
      codeBg.fillStyle(0x081820, 0.94);
      codeBg.fillRect(PANEL_MARGIN + 16, BODY_START_Y - 8, width - (PANEL_MARGIN + 16) * 2, codeBlockH);
      codeBg.lineStyle(1, 0x346856, 1);
      codeBg.strokeRect(PANEL_MARGIN + 16, BODY_START_Y - 8, width - (PANEL_MARGIN + 16) * 2, codeBlockH);

      tabTexts.forEach(t => t.destroy());
      tabTexts.length = 0;

      let tabX = PANEL_MARGIN + 32;
      tabs.forEach((tab, index) => {
        const t = this.add.text(tabX, BODY_START_Y, tab.name, {
          fontSize: '10px', fontFamily: FONTS.RETRO,
          color: index === currentTab ? '#fbbf24' : '#346856',
        }).setInteractive({ useHandCursor: true });

        t.on('pointerdown', () => {
          currentTab = index;
          drawCode();
        });

        tabTexts.push(t);
        this.sectionContainer.add(t);
        tabX += t.width + 24;
      });

      expText.setY(BODY_START_Y + codeBlockH + 16);
    };

    drawCode();
    this.addNavHint(width, height);
  }

  private renderMiniForge(width: number, height: number): void {
    const { question, options, correctIndex, explanation } = this.content.sections.miniForge;

    const title = this.add.text(width / 2, CONTENT_START_Y, 'Mini-Forge Challenge', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#fbbf24',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const qText = this.add.text(width / 2, BODY_START_Y, question, {
      fontSize: '12px', fontFamily: FONTS.MONO, color: '#e0f8d0',
      wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(qText);

    const startY = BODY_START_Y + qText.height + 32;

    const feedbackText = this.add.text(width / 2, startY + options.length * 48 + 24, '', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#fbbf24',
      wordWrap: { width: width - BODY_WRAP_INSET },
      align: 'center',
    }).setOrigin(0.5, 0);

    options.forEach((option, i) => {
      const y = startY + i * 48;
      const isSelected = this.miniForgeSelectedIndex === i;
      const isCorrect = i === correctIndex;
      const bg = this.add.rectangle(width / 2, y, 520, 36, 0x081820, 0.88);
      bg.setStrokeStyle(1, 0x346856);

      if (this.miniForgeAnswered && isCorrect) {
        bg.setFillStyle(0x22c55e, 0.28);
        bg.setStrokeStyle(2, 0x22c55e);
      } else if (!this.miniForgeAnswered && isSelected) {
        bg.setFillStyle(0xef4444, 0.22);
        bg.setStrokeStyle(2, 0xef4444);
      }

      // Numbered prefix tells keyboard players which key picks this option
      const optText = this.add.text(width / 2, y, `[${i + 1}]  ${option}`, {
        fontSize: '11px',
        fontFamily: FONTS.MONO,
        color: this.miniForgeAnswered && isCorrect ? '#e0f8d0' : '#9ca3af',
      }).setOrigin(0.5);

      if (!this.miniForgeAnswered) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => {
          bg.setStrokeStyle(2, 0x88c070);
          optText.setColor('#e0f8d0');
        });

        bg.on('pointerout', () => {
          const stillSelected = this.miniForgeSelectedIndex === i;
          bg.setStrokeStyle(stillSelected ? 2 : 1, stillSelected ? 0xef4444 : 0x346856);
          optText.setColor('#88c070');
        });

        bg.on('pointerdown', () => this.chooseMiniForgeOption(i));
      }

      this.sectionContainer.add([bg, optText]);
    });

    if (this.miniForgeAnswered) {
      feedbackText.setText(explanation);
    } else if (this.miniForgeSelectedIndex !== null) {
      feedbackText.setText('That breaks the invariant. Try another option before continuing.');
    }
    this.sectionContainer.add(feedbackText);

    this.addNavHint(width, height);
  }

  private renderRealWorld(width: number, height: number): void {
    const title = this.add.text(width / 2, CONTENT_START_Y, 'Real-World Usage', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const subtitle = this.add.text(width / 2, CONTENT_START_Y + 24, 'Where this pattern shows up in software you already use:', {
      fontSize: '11px', fontFamily: FONTS.MONO, color: '#88c070',
      wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(subtitle);

    let y = BODY_START_Y + 24;
    for (const line of this.content.sections.realWorld) {
      // Bullet glyph + body text, left-aligned inside the panel
      const bullet = this.add.text(PANEL_MARGIN + 48, y, '▸', {
        fontSize: '12px', fontFamily: FONTS.RETRO, color: '#06b6d4',
      });
      const text = this.add.text(PANEL_MARGIN + 72, y, line, {
        fontSize: '12px', fontFamily: FONTS.MONO, color: '#e0f8d0',
        wordWrap: { width: width - PANEL_MARGIN * 2 - 96 },
        lineSpacing: 4,
      });
      this.sectionContainer.add([bullet, text]);
      y += text.height + 18;
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
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#88c070',
    }).setOrigin(0.5);
    statsText.setAlpha(0);
    this.tweens.add({ targets: statsText, alpha: 1, duration: 500, delay: 600 });
    this.sectionContainer.add(statsText);

    // Onboarding hint — tells the player HOW to revisit the Codex they just unlocked.
    const codexHint = this.add.text(width / 2, titleY + 168, 'Press [C] in the overworld to revisit your Codex anytime.', {
      fontSize: '9px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    }).setOrigin(0.5);
    codexHint.setAlpha(0);
    this.tweens.add({ targets: codexHint, alpha: 0.85, duration: 500, delay: 800 });
    this.sectionContainer.add(codexHint);

    const cont = this.add.text(width / 2, height - 56, 'Press SPACE to continue', {
      fontSize: '10px', fontFamily: FONTS.RETRO, color: '#88c070',
    }).setOrigin(0.5);
    this.tweens.add({ targets: cont, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.sectionContainer.add(cont);
  }

  private addNavHint(width: number, height: number): void {
    const current = SECTIONS[this.currentSection];
    const text = current === 'mini_forge' && !this.miniForgeAnswered
      ? 'Press [1]-[4] or click an option to answer'
      : this.currentSection < SECTIONS.length - 1
      ? '▶ SPACE or RIGHT to continue'
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
    if (this.time.now < this.sectionReadyAt) return;
    if (SECTIONS[this.currentSection] === 'mini_forge' && !this.miniForgeAnswered) {
      audioManager.playWrongTone();
      this.cameras.main.shake(80, 0.0015);
      return;
    }

    if (this.currentSection < SECTIONS.length - 1) {
      this.currentSection++;
      this.showSection(this.currentSection);
    } else {
      // Final boss falls -> route into the ending instead of back to the Core overworld.
      const target = gameState.getFlag('endgame_pending')
        ? SCENE_KEYS.END_GAME
        : (this.puzzleData.returnScene ?? SCENE_KEYS.PROLOGUE);
      TransitionManager.fade(this, target);
    }
  }

  private prevSection(): void {
    if (this.currentSection > 0) {
      this.currentSection--;
      this.showSection(this.currentSection);
    }
  }
}
