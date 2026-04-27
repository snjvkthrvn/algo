/**
 * CodexScene - Knowledge base viewer.
 * Full-screen dark UI with sidebar (entry list) and content panel.
 */

import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { CODEX_ENTRIES } from '../data/codex/entries';
import type { CodexSection } from '../data/types';

export class CodexScene extends Phaser.Scene {
  private contentContainer!: Phaser.GameObjects.Container;
  private sidebarEntries: Phaser.GameObjects.Container[] = [];
  private selectedIndex: number = -1;
  private returnScene: string = SCENE_KEYS.PROLOGUE;

  constructor() {
    super({ key: SCENE_KEYS.CODEX });
  }

  init(data: { returnScene?: string }): void {
    this.returnScene = data.returnScene || SCENE_KEYS.PROLOGUE;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    // Fade in via tween overlay
    const fadeIn = this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0).setDepth(10000);
    this.tweens.add({
      targets: fadeIn,
      alpha: 0,
      duration: 300,
      onComplete: () => fadeIn.destroy(),
    });

    audioManager.setScene(this);

    // Background
    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 0.98).setOrigin(0);

    // Title
    this.add.text(width / 2, 30, 'CODEX', {
      fontSize: '20px', fontFamily: FONTS.RETRO, color: '#06b6d4',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Close button
    const closeBtn = this.add.text(width - 30, 20, 'X', {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#ef4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.exitCodex());
    this.input.keyboard?.on('keydown-ESC', () => this.exitCodex());
    this.input.keyboard?.on('keydown-C', () => this.exitCodex());

    // Sidebar (left 30%)
    const sidebarWidth = width * 0.3;
    const sidebarBg = this.add.graphics();
    sidebarBg.fillStyle(0x111122, 0.8);
    sidebarBg.fillRect(20, 60, sidebarWidth - 20, height - 80);
    sidebarBg.lineStyle(1, 0x333355, 0.5);
    sidebarBg.strokeRect(20, 60, sidebarWidth - 20, height - 80);

    // Sidebar entries
    this.createSidebar(sidebarWidth);

    // Content panel (right 70%)
    this.contentContainer = this.add.container(sidebarWidth + 20, 60);

    // Show first unlocked entry
    const firstUnlocked = CODEX_ENTRIES.findIndex((e) => gameState.isCodexUnlocked(e.id));
    if (firstUnlocked >= 0) {
      this.selectEntry(firstUnlocked);
    } else {
      this.showEmptyState();
    }
  }

  private createSidebar(sidebarWidth: number): void {
    let y = 75;

    for (let i = 0; i < CODEX_ENTRIES.length; i++) {
      const entry = CODEX_ENTRIES[i];
      const unlocked = gameState.isCodexUnlocked(entry.id);

      const container = this.add.container(30, y);

      const bg = this.add.rectangle(0, 0, sidebarWidth - 40, 36, 0x1a1a2e, 0.6);
      bg.setOrigin(0, 0.5);
      if (unlocked) {
        bg.setStrokeStyle(1, 0x333355);
        bg.setInteractive({ useHandCursor: true });
      }
      container.add(bg);

      const text = this.add.text(10, 0, unlocked ? entry.algorithmName : '???', {
        fontSize: '10px', fontFamily: FONTS.RETRO,
        color: unlocked ? '#9ca3af' : '#333355',
      }).setOrigin(0, 0.5);
      container.add(text);

      if (unlocked) {
        // Status dot
        const dot = this.add.circle(sidebarWidth - 55, 0, 4, COLORS.GOLD_ACCENT);
        container.add(dot);

        bg.on('pointerover', () => {
          bg.setFillStyle(0x2a2a4a, 0.8);
          text.setColor('#06b6d4');
        });

        bg.on('pointerout', () => {
          bg.setFillStyle(0x1a1a2e, 0.6);
          text.setColor(this.selectedIndex === i ? '#06b6d4' : '#9ca3af');
        });

        bg.on('pointerdown', () => {
          audioManager.playClickTone();
          this.selectEntry(i);
        });
      }

      this.sidebarEntries.push(container);
      y += 42;
    }
  }

  private selectEntry(index: number): void {
    this.selectedIndex = index;
    const entry = CODEX_ENTRIES[index];

    this.contentContainer.removeAll(true);

    const { width } = this.cameras.main;
    const contentWidth = width * 0.65;

    // Entry title
    const title = this.add.text(10, 10, entry.algorithmName, {
      fontSize: '16px', fontFamily: FONTS.RETRO, color: '#06b6d4',
    });
    this.contentContainer.add(title);

    // Difficulty
    const diffText = this.add.text(10, 40, `Difficulty: ${entry.difficulty}`, {
      fontSize: '9px', fontFamily: FONTS.MONO, color: '#4a4a6a',
    });
    this.contentContainer.add(diffText);

    // Sections
    let y = 70;
    for (const section of entry.sections) {
      y = this.renderCodexSection(section, y, contentWidth);
    }
  }

  private renderCodexSection(section: CodexSection, startY: number, maxWidth: number): number {
    let y = startY;

    // Section title
    const titleColor = this.getSectionColor(section.type);
    const title = this.add.text(10, y, section.title, {
      fontSize: '11px', fontFamily: FONTS.RETRO, color: titleColor,
    });
    this.contentContainer.add(title);
    y += 24;

    // Content
    const contentLines = Array.isArray(section.content) ? section.content : [section.content];
    for (const line of contentLines) {
      const text = this.add.text(10, y, line, {
        fontSize: '11px', fontFamily: FONTS.MONO, color: '#c9d1d9',
        wordWrap: { width: maxWidth - 40 }, lineSpacing: 3,
      });
      this.contentContainer.add(text);
      y += text.height + 8;
    }

    y += 16;
    return y;
  }

  private getSectionColor(type: string): string {
    switch (type) {
      case 'what_you_felt': return '#8b5cf6';
      case 'plain_explanation': return '#06b6d4';
      case 'pattern_steps': return '#22c55e';
      case 'real_world': return '#f97316';
      case 'unlocked_ability': return '#fbbf24';
      default: return '#9ca3af';
    }
  }

  private showEmptyState(): void {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width * 0.65, height / 2, 'No entries unlocked yet.\nComplete puzzles to fill the Codex.', {
      fontSize: '12px', fontFamily: FONTS.MONO, color: '#4a4a6a',
      align: 'center',
    }).setOrigin(0.5);
    this.contentContainer.add(text);
  }

  private exitCodex(): void {
    const { width, height } = this.cameras.main;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10000);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        overlay.destroy();
        this.scene.start(this.returnScene);
      },
    });
  }
}
