/**
 * ConceptBridgeScene - Post-puzzle educational scene.
 * 5 sections: Story Recap, Pattern Reveal, Pseudocode, Mini-Forge, Codex Unlock.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS, SCENE_KEYS } from '../config/constants';
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

/** Multiples of 8 — layout + minimum touch row height for Mini-Forge */
const HEADER_H = 88;
const PANEL_MARGIN = 144;
const PANEL_Y = HEADER_H + 8;
const CONTENT_START_Y = PANEL_Y + 64;
const BODY_START_Y = CONTENT_START_Y + 48;
const BODY_WRAP_INSET = 320;
const FORGE_ROW_SPACING = 56;
const FORGE_HIT_W = 520;
const FORGE_HIT_H = 48;

const PSEUDO_TAB_LABELS = ['Pseudo', 'Python', 'JS'] as const;

export class ConceptBridgeScene extends Phaser.Scene {
  private puzzleData!: ConceptBridgeData;
  private content!: ConceptBridgeContent;
  private currentSection: number = 0;
  private sectionContainer!: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Arc[] = [];
  private navLabels: Phaser.GameObjects.Text[] = [];
  private miniForgeAnswered: boolean = false;
  private miniForgeSelectedIndex: number | null = null;
  private codexUnlockPlayed: boolean = false;
  private sectionReadyAt: number = 0;
  private pseudocodeTabIndex: number = 0;
  // Hoisted out of renderPseudocode's closure so showSection() can stop it
  // before destroying the codeText target. Otherwise the typer keeps firing
  // setText on a destroyed Text, and Phaser's Canvas2D renderer dies on
  // null.drawImage when the next section paints.
  private pseudocodeTypingTimer: Phaser.Time.TimerEvent | null = null;

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
    this.pseudocodeTabIndex = 0;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    audioManager.setScene(this);

    const fadeIn = this.add.rectangle(0, 0, width, height, COLORS.PURE_BLACK, 1).setOrigin(0).setDepth(10000);
    if (this.prefersReducedMotion()) {
      fadeIn.destroy();
    } else {
      this.tweens.add({ targets: fadeIn, alpha: 0, duration: 500, onComplete: () => fadeIn.destroy() });
    }

    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 1).setOrigin(0);

    if (!this.textures.exists('bg-dot')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(COLORS.WARNING, 1);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture('bg-dot', 32, 32);
      g.destroy();
    }
    this.add.tileSprite(0, 0, width, height, 'bg-dot').setOrigin(0);

    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.ERROR, 0.98);
    headerBg.fillRect(0, 0, width, HEADER_H);
    headerBg.lineStyle(2, COLORS.CYAN_GLOW, 0.72);
    headerBg.beginPath();
    headerBg.moveTo(0, HEADER_H);
    headerBg.lineTo(width, HEADER_H);
    headerBg.strokePath();

    this.add.text(64, 18, 'CONCEPT BRIDGE', {
      fontSize: '18px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
      stroke: COLOR_HEX.TEXT_DARK,
      strokeThickness: 3,
    }).setOrigin(0, 0);

    this.add.text(66, 52, `${this.puzzleData.puzzleName} / ${this.puzzleData.concept}`, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_MUTED,
      wordWrap: { width: width - 420, useAdvancedWrap: true },
    }).setOrigin(0, 0);

    const starsText = '★'.repeat(this.puzzleData.stars) + '☆'.repeat(3 - this.puzzleData.stars);
    this.add.text(width - 64, 20, starsText, {
      fontSize: '16px',
      color: COLOR_HEX.GOLD,
    }).setOrigin(1, 0);

    this.add.text(width - 64, 54, `TIME ${this.puzzleData.timeSpent}s  ATTEMPTS ${this.puzzleData.attempts}  HINTS ${this.puzzleData.hintsUsed}`, {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_MUTED,
    }).setOrigin(1, 0);

    const panelW = width - PANEL_MARGIN * 2;
    const panelH = height - PANEL_Y - 48;
    drawPanel(this, PANEL_MARGIN, PANEL_Y, panelW, panelH, {
      depth: 0,
      fill: COLORS.ERROR,
      frame: COLORS.FRAME_BORDER_LIGHT,
      inner: COLORS.SUCCESS,
      alpha: 0.96,
      shadow: true,
      shadowAlpha: 0.24,
      accent: COLORS.CYAN_GLOW,
      accentSide: 'top',
    });

    this.sectionContainer = this.add.container(0, 0);

    this.createDots(width, height);

    this.input.keyboard?.on('keydown-RIGHT', () => this.nextSection());
    this.input.keyboard?.on('keydown-D', () => this.nextSection());
    this.input.keyboard?.on('keydown-SPACE', () => this.nextSection());
    this.input.keyboard?.on('keydown-ENTER', () => this.nextSection());
    this.input.keyboard?.on('keydown-LEFT', () => this.prevSection());
    this.input.keyboard?.on('keydown-A', () => this.prevSection());

    this.input.keyboard?.on('keydown-ONE', () => this.onBridgeDigitKey(0));
    this.input.keyboard?.on('keydown-TWO', () => this.onBridgeDigitKey(1));
    this.input.keyboard?.on('keydown-THREE', () => this.onBridgeDigitKey(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.onBridgeDigitKey(3));

    this.showSection(0);
  }

  private prefersReducedMotion(): boolean {
    return typeof globalThis.window !== 'undefined' &&
      globalThis.window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Digit keys: tabs 1–3 on Pseudocode; answers 1–4 on Mini-Forge. */
  private onBridgeDigitKey(zeroBased: number): void {
    if (this.time.now < this.sectionReadyAt) return;
    const section = SECTIONS[this.currentSection];
    if (section === 'pseudocode') {
      if (zeroBased < PSEUDO_TAB_LABELS.length) {
        this.pseudocodeTabIndex = zeroBased;
        this.showSection(this.currentSection);
      }
      return;
    }
    if (section === 'mini_forge') {
      this.handleMiniForgeKeyPick(zeroBased);
    }
  }

  /** Shared selection logic for both pointerdown and keyboard inputs on the Mini-Forge. */
  private chooseMiniForgeOption(index: number): void {
    if (this.miniForgeAnswered) return;
    const forge = this.content.sections.miniForge;
    if (index < 0 || index >= forge.options.length) return;

    this.miniForgeSelectedIndex = index;
    const picked = forge.options[index];
    if (index === forge.correctIndex) {
      this.miniForgeAnswered = true;
      audioManager.playCorrectTone();
      a11yManager.announce(`Correct. ${forge.explanation}`, true);
    } else {
      audioManager.playWrongTone();
      a11yManager.announce(
        `Incorrect. ${picked} is not the best answer. Try another option with keys 1 through 4, or click a different choice.`,
        true,
      );
    }
    this.showSection(this.currentSection);
  }

  /** Keyboard entry point for Mini-Forge — only acts when on that section. */
  private handleMiniForgeKeyPick(index: number): void {
    if (SECTIONS[this.currentSection] !== 'mini_forge') return;
    if (this.time.now < this.sectionReadyAt) return;
    this.chooseMiniForgeOption(index);
  }

  private createDots(width: number, _height: number): void {
    const labels = ['RECAP', 'PATTERN', 'CODE', 'FORGE', 'WORLD', 'CODEX'];
    const railW = Math.min(width - PANEL_MARGIN * 2 - 80, 760);
    const spacing = railW / (SECTIONS.length - 1);
    const startX = Math.round(width / 2 - railW / 2);
    const y = PANEL_Y + 26;

    const rail = this.add.graphics();
    rail.lineStyle(1, COLORS.FRAME_BORDER_LIGHT, 0.62);
    rail.beginPath();
    rail.moveTo(startX, y);
    rail.lineTo(startX + railW, y);
    rail.strokePath();

    this.dots = [];
    this.navLabels = [];
    for (let i = 0; i < SECTIONS.length; i++) {
      const x = Math.round(startX + i * spacing);
      const dot = this.add.circle(x, y, 5, i === 0 ? COLORS.CYAN_GLOW : COLORS.NAV_DOT_INACTIVE);
      const label = this.add.text(x, y + 12, labels[i], {
        fontSize: '7px',
        fontFamily: FONTS.RETRO,
        color: i === 0 ? COLOR_HEX.CYAN_GLOW : COLOR_HEX.TEXT_MUTED,
      }).setOrigin(0.5, 0);
      this.dots.push(dot);
      this.navLabels.push(label);
    }
  }

  private announcePseudocode(): void {
    const { code, python, js, explanation } = this.content.sections.pseudocode;
    const tabBodies = [code, python, js];
    const label = PSEUDO_TAB_LABELS[this.pseudocodeTabIndex];
    const body = tabBodies[this.pseudocodeTabIndex];
    a11yManager.announce(
      `Pseudocode, ${label} tab. ${body} Explanation: ${explanation}`,
    );
  }

  private runSectionEntranceTween(): void {
    if (this.prefersReducedMotion()) {
      this.sectionContainer.setAlpha(1);
      this.sectionContainer.y = 0;
      return;
    }
    this.sectionContainer.setAlpha(0);
    this.sectionContainer.y = 16;
    this.tweens.add({
      targets: this.sectionContainer,
      alpha: 1,
      y: 0,
      duration: 240,
      ease: 'Power3.easeOut',
    });
  }

  private showSection(index: number): void {
    this.pseudocodeTypingTimer?.remove();
    this.pseudocodeTypingTimer = null;
    this.sectionContainer.removeAll(true);
    this.currentSection = index;
    this.sectionReadyAt = this.time.now + 300;

    this.runSectionEntranceTween();

    this.dots.forEach((dot, i) => {
      dot.setFillStyle(i === index ? COLORS.CYAN_GLOW : i < index ? COLORS.SUCCESS : COLORS.NAV_DOT_INACTIVE);
    });
    this.navLabels.forEach((label, i) => {
      label.setColor(i === index ? COLOR_HEX.CYAN_GLOW : i < index ? COLOR_HEX.TEXT_LIGHT : COLOR_HEX.TEXT_MUTED);
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
        this.announcePseudocode();
        break;
      case 'mini_forge':
        this.renderMiniForge(width, height);
        if (!this.miniForgeAnswered && this.miniForgeSelectedIndex === null) {
          const { question, options } = this.content.sections.miniForge;
          a11yManager.announce(`Mini-Forge Challenge. ${question}. Options: ${options.join(', ')}`);
        }
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
      fontSize: '16px', fontFamily: FONTS.RETRO, color: COLOR_HEX.TEXT_MUTED,
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const lines = this.content.sections.storyRecap;
    let y = BODY_START_Y;
    for (const line of lines) {
      const text = this.add.text(width / 2, y, line, {
        fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_LIGHT,
        wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center', lineSpacing: 8,
      }).setOrigin(0.5, 0);
      this.sectionContainer.add(text);
      y += text.height + 24;
    }

    this.addNavHint(width, height);
  }

  private renderPatternReveal(width: number, height: number): void {
    const { title, explanation } = this.content.sections.patternReveal;

    const titleText = this.add.text(width / 2, CONTENT_START_Y, title, {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: COLOR_HEX.BRIDGE_PATTERN,
    }).setOrigin(0.5);
    this.sectionContainer.add(titleText);

    let y = BODY_START_Y;
    for (const line of explanation) {
      const text = this.add.text(width / 2, y, line, {
        fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_LIGHT,
        wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center', lineSpacing: 8,
      }).setOrigin(0.5, 0);
      this.sectionContainer.add(text);
      y += text.height + 20;
    }

    this.addNavHint(width, height);
  }

  private renderPseudocode(width: number, height: number): void {
    const { code, python, js, explanation } = this.content.sections.pseudocode;

    const title = this.add.text(width / 2, CONTENT_START_Y, 'Pseudocode', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: COLOR_HEX.ORANGE,
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const tabs = [
      { name: PSEUDO_TAB_LABELS[0], val: code },
      { name: PSEUDO_TAB_LABELS[1], val: python },
      { name: PSEUDO_TAB_LABELS[2], val: js },
    ];
    this.pseudocodeTabIndex = Math.min(this.pseudocodeTabIndex, tabs.length - 1);

    const codeBg = this.add.graphics();
    this.sectionContainer.add(codeBg);

    const codeText = this.add.text(PANEL_MARGIN + 32, BODY_START_Y + 24, '', {
      fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_LIGHT,
      lineSpacing: 8,
    });
    this.sectionContainer.add(codeText);

    const expText = this.add.text(width / 2, 0, explanation, {
      fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_MUTED,
      wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(expText);

    const tabTexts: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < tabs.length; i++) {
      const t = this.add.text(0, BODY_START_Y, tabs[i].name, {
        fontSize: '12px', fontFamily: FONTS.RETRO,
        color: COLOR_HEX.WARNING,
      }).setInteractive({ useHandCursor: true });
      const tabIdx = i;
      t.on('pointerdown', () => {
        this.pseudocodeTabIndex = tabIdx;
        drawCode();
        this.announcePseudocode();
      });
      tabTexts.push(t);
      this.sectionContainer.add(t);
    }

    const drawCode = (): void => {
      const activeIdx = Math.min(this.pseudocodeTabIndex, tabs.length - 1);
      const activeCode = tabs[activeIdx].val;
      // Typewriter reveal — characters appear at ~14 ms each, capped at
      // ~1.2 s total so even long pseudocode finishes in a heartbeat.
      this.pseudocodeTypingTimer?.remove();
      this.pseudocodeTypingTimer = null;
      codeText.setText('');
      const fullChars = activeCode.length;
      const delayMs = fullChars > 0 ? Math.max(8, Math.min(14, 1200 / fullChars)) : 14;
      let cursor = 0;
      this.pseudocodeTypingTimer = this.time.addEvent({
        delay: delayMs,
        repeat: fullChars - 1,
        callback: () => {
          if (!codeText.active) return;
          cursor += 1;
          codeText.setText(activeCode.slice(0, cursor));
        },
      });

      const codeBlockH = Math.max(124, codeText.height + 56);

      codeBg.clear();
      codeBg.fillStyle(COLORS.ERROR, 0.94);
      codeBg.fillRect(PANEL_MARGIN + 16, BODY_START_Y - 8, width - (PANEL_MARGIN + 16) * 2, codeBlockH);
      codeBg.lineStyle(1, COLORS.FRAME_BORDER_LIGHT, 1);
      codeBg.strokeRect(PANEL_MARGIN + 16, BODY_START_Y - 8, width - (PANEL_MARGIN + 16) * 2, codeBlockH);

      let tabX = PANEL_MARGIN + 32;
      tabTexts.forEach((t, index) => {
        t.setColor(index === activeIdx ? COLOR_HEX.GOLD : COLOR_HEX.WARNING);
        t.setX(tabX);
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
      fontSize: '16px', fontFamily: FONTS.RETRO, color: COLOR_HEX.GOLD,
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const qText = this.add.text(width / 2, BODY_START_Y, question, {
      fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_LIGHT,
      wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(qText);

    const startY = BODY_START_Y + qText.height + 32;

    const feedbackText = this.add.text(width / 2, startY + options.length * FORGE_ROW_SPACING + 24, '', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: COLOR_HEX.GOLD,
      wordWrap: { width: width - BODY_WRAP_INSET },
      align: 'center',
    }).setOrigin(0.5, 0);

    options.forEach((option, i) => {
      const y = startY + i * FORGE_ROW_SPACING;
      const isSelected = this.miniForgeSelectedIndex === i;
      const isCorrect = i === correctIndex;
      const bg = this.add.rectangle(width / 2, y, FORGE_HIT_W, FORGE_HIT_H, COLORS.ERROR, 0.88);
      bg.setStrokeStyle(1, COLORS.FRAME_BORDER_LIGHT);

      if (this.miniForgeAnswered && isCorrect) {
        bg.setFillStyle(COLORS.BRIDGE_PATTERN, 0.28);
        bg.setStrokeStyle(2, COLORS.BRIDGE_PATTERN);
      } else if (!this.miniForgeAnswered && isSelected) {
        bg.setFillStyle(COLORS.BRIDGE_WRONG, 0.22);
        bg.setStrokeStyle(2, COLORS.BRIDGE_WRONG);
      }

      const optText = this.add.text(width / 2, y, `[${i + 1}]  ${option}`, {
        fontSize: '12px',
        fontFamily: FONTS.MONO,
        color: this.miniForgeAnswered && isCorrect ? COLOR_HEX.TEXT_LIGHT : COLOR_HEX.TEXT_MUTED,
      }).setOrigin(0.5);

      if (!this.miniForgeAnswered) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => {
          bg.setStrokeStyle(2, COLORS.SUCCESS);
          optText.setColor(COLOR_HEX.TEXT_LIGHT);
        });

        bg.on('pointerout', () => {
          const stillSelected = this.miniForgeSelectedIndex === i;
          bg.setStrokeStyle(stillSelected ? 2 : 1, stillSelected ? COLORS.BRIDGE_WRONG : COLORS.FRAME_BORDER_LIGHT);
          optText.setColor(stillSelected ? COLOR_HEX.TEXT_LIGHT : COLOR_HEX.TEXT_MUTED);
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
      fontSize: '16px', fontFamily: FONTS.RETRO, color: COLOR_HEX.TEXT_MUTED,
    }).setOrigin(0.5);
    this.sectionContainer.add(title);

    const subtitle = this.add.text(width / 2, CONTENT_START_Y + 24, 'Where this pattern shows up in software you already use:', {
      fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_MUTED,
      wordWrap: { width: width - BODY_WRAP_INSET }, align: 'center',
    }).setOrigin(0.5, 0);
    this.sectionContainer.add(subtitle);

    let y = BODY_START_Y + 24;
    for (const line of this.content.sections.realWorld) {
      const bullet = this.add.text(PANEL_MARGIN + 48, y, '▸', {
        fontSize: '12px', fontFamily: FONTS.RETRO, color: COLOR_HEX.WARNING,
      });
      const text = this.add.text(PANEL_MARGIN + 72, y, line, {
        fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_LIGHT,
        wordWrap: { width: width - PANEL_MARGIN * 2 - 96 },
        lineSpacing: 8,
      });
      this.sectionContainer.add([bullet, text]);
      y += text.height + 18;
    }

    this.addNavHint(width, height);
  }

  private renderCodexUnlock(width: number, height: number): void {
    const entryId = this.content.sections.codexEntryId;
    gameState.unlockCodexEntry(entryId);

    const reduced = this.prefersReducedMotion();
    const titleY = Math.round((PANEL_Y + height - 48) / 2) - 80;

    const title = this.add.text(width / 2, titleY, 'CODEX ENTRY UNLOCKED', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: COLOR_HEX.GOLD,
      stroke: COLOR_HEX.PURE_BLACK, strokeThickness: 4,
    }).setOrigin(0.5);

    if (reduced) {
      title.setScale(1);
    } else {
      title.setScale(0);
      this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Expo.easeOut' });
    }
    this.sectionContainer.add(title);

    const entryName = entryId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const nameText = this.add.text(width / 2, titleY + 56, entryName, {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: COLOR_HEX.TEXT_LIGHT,
    }).setOrigin(0.5);
    if (reduced) {
      nameText.setAlpha(1);
    } else {
      nameText.setAlpha(0);
      this.tweens.add({ targets: nameText, alpha: 1, duration: 500, delay: 300 });
    }
    this.sectionContainer.add(nameText);

    if (!this.codexUnlockPlayed) {
      this.codexUnlockPlayed = true;
      if (!reduced) {
        JuiceSystem.goldRain(this);
        this.time.delayedCall(80, () => JuiceSystem.screenFlash(this, COLORS.GOLD_ACCENT, 0.10, 500));
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
      fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_MUTED,
    }).setOrigin(0.5);
    if (reduced) {
      statsText.setAlpha(1);
    } else {
      statsText.setAlpha(0);
      this.tweens.add({ targets: statsText, alpha: 1, duration: 500, delay: 600 });
    }
    this.sectionContainer.add(statsText);

    const codexHint = this.add.text(width / 2, titleY + 168, 'Press [C] in the overworld to revisit your Codex anytime.', {
      fontSize: '12px', fontFamily: FONTS.RETRO, color: COLOR_HEX.TEXT_MUTED,
    }).setOrigin(0.5);
    if (reduced) {
      codexHint.setAlpha(0.85);
    } else {
      codexHint.setAlpha(0);
      this.tweens.add({ targets: codexHint, alpha: 0.85, duration: 500, delay: 800 });
    }
    this.sectionContainer.add(codexHint);

    const cont = this.add.text(width / 2, height - 56, 'Press SPACE to continue', {
      fontSize: '12px', fontFamily: FONTS.RETRO, color: COLOR_HEX.TEXT_MUTED,
    }).setOrigin(0.5);
    if (reduced) {
      cont.setAlpha(0.85);
    } else {
      this.tweens.add({ targets: cont, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    }
    this.sectionContainer.add(cont);
  }

  private addNavHint(width: number, height: number): void {
    const current = SECTIONS[this.currentSection];
    let text: string;
    if (current === 'mini_forge' && !this.miniForgeAnswered) {
      text = 'Press [1]-[4] or tap an option to answer';
    } else if (current === 'pseudocode') {
      text = '▶ [1] Pseudo [2] Python [3] JS — SPACE or RIGHT to continue';
    } else if (this.currentSection < SECTIONS.length - 1) {
      text = '▶ SPACE or RIGHT to continue';
    } else {
      text = '▶ SPACE to finish';
    }

    const hint = this.add.text(width / 2, height - 72, text, {
      fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.CYAN_GLOW,
    }).setOrigin(0.5);

    if (this.prefersReducedMotion()) {
      hint.setAlpha(0.85);
    } else {
      this.tweens.add({
        targets: hint,
        alpha: 0.56,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.sectionContainer.add(hint);
  }

  private nextSection(): void {
    if (this.time.now < this.sectionReadyAt) return;
    if (SECTIONS[this.currentSection] === 'mini_forge' && !this.miniForgeAnswered) {
      audioManager.playWrongTone();
      if (!this.prefersReducedMotion()) {
        this.cameras.main.shake(80, 0.0015);
      }
      a11yManager.announce('Answer the Mini-Forge before you can continue.', true);
      return;
    }

    if (this.currentSection < SECTIONS.length - 1) {
      this.currentSection++;
      this.showSection(this.currentSection);
    } else {
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
