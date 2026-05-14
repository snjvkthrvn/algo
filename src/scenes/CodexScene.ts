/**
 * CodexScene - Knowledge base viewer.
 * Full-screen dark UI with sidebar (entry list) and content panel.
 */

import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { CODEX_ENTRIES } from '../data/codex/entries';
import type { CodexSection } from '../data/types';
import { drawPanel } from '../ui/panel';

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
    this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 1).setOrigin(0);
    if (this.textures.exists(VISUAL_REVAMP_KEYS.TITLE_BG)) {
      const bg = this.add.image(width / 2, height / 2, VISUAL_REVAMP_KEYS.TITLE_BG).setOrigin(0.5).setAlpha(0.18);
      const source = bg.texture.getSourceImage() as HTMLImageElement;
      bg.setScale(Math.max(width / source.width, height / source.height));
    }
    this.add.rectangle(0, 0, width, height, 0x081820, 0.72).setOrigin(0);

    // Title
    drawPanel(this, 20, 16, width - 40, 54, {
      depth: 1,
      fill: COLORS.FRAME_BG,
      frame: COLORS.FRAME_BORDER,
      inner: COLORS.FRAME_BORDER_LIGHT,
    });

    this.add.text(width / 2, 30, 'CODEX', {
      fontSize: '18px', fontFamily: FONTS.RETRO, color: '#081820',
    }).setOrigin(0.5, 0).setDepth(2);

    this.add.text(width / 2, 54, 'ESC / C CLOSE', {
      fontSize: '8px', fontFamily: FONTS.RETRO, color: '#346856',
    }).setOrigin(0.5, 0).setDepth(2);

    // Close button
    const closeBtn = this.add.text(width - 54, 31, 'X', {
      fontSize: '14px', fontFamily: FONTS.RETRO, color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.exitCodex());
    this.input.keyboard?.on('keydown-ESC', () => this.exitCodex());
    this.input.keyboard?.on('keydown-C', () => this.exitCodex());

    // Sidebar (left 30%)
    const sidebarWidth = width * 0.3;
    drawPanel(this, 20, 84, sidebarWidth - 28, height - 112, {
      depth: 1,
      fill: COLORS.FRAME_BG,
      frame: COLORS.FRAME_BORDER,
      inner: COLORS.FRAME_BORDER_LIGHT,
      alpha: 0.96,
    });

    // Sidebar entries
    this.createSidebar(sidebarWidth);

    // Content panel (right 70%)
    drawPanel(this, sidebarWidth + 12, 84, width - sidebarWidth - 32, height - 112, {
      depth: 1,
      fill: COLORS.FRAME_BG,
      frame: COLORS.FRAME_BORDER,
      inner: COLORS.FRAME_BORDER_LIGHT,
      alpha: 0.96,
    });
    this.contentContainer = this.add.container(sidebarWidth + 28, 100).setDepth(2);

    // Show first unlocked entry
    const firstUnlocked = CODEX_ENTRIES.findIndex((e) => gameState.isCodexUnlocked(e.id));
    if (firstUnlocked >= 0) {
      this.selectEntry(firstUnlocked);
    } else {
      this.showEmptyState();
    }
  }

  private createSidebar(sidebarWidth: number): void {
    let y = 106;

    for (let i = 0; i < CODEX_ENTRIES.length; i++) {
      const entry = CODEX_ENTRIES[i];
      const unlocked = gameState.isCodexUnlocked(entry.id);

      const container = this.add.container(30, y).setDepth(2);

      const bg = this.add.rectangle(0, 0, sidebarWidth - 52, 36, unlocked ? 0xe0f8d0 : 0x88c070, unlocked ? 0.98 : 0.34);
      bg.setOrigin(0, 0.5);
      if (unlocked) {
        bg.setStrokeStyle(1, 0x081820);
        bg.setInteractive({ useHandCursor: true });
      }
      container.add(bg);

      const text = this.add.text(10, 0, unlocked ? entry.algorithmName : '???', {
        fontSize: '10px', fontFamily: FONTS.RETRO,
        color: unlocked ? '#081820' : '#346856',
      }).setOrigin(0, 0.5);
      container.add(text);

      if (unlocked) {
        // Status dot
        const dot = this.add.circle(sidebarWidth - 55, 0, 4, COLORS.GOLD_ACCENT);
        container.add(dot);

        bg.on('pointerover', () => {
          bg.setFillStyle(0x88c070, 1);
          text.setColor('#081820');
        });

        bg.on('pointerout', () => {
          bg.setFillStyle(0xe0f8d0, 0.98);
          text.setColor(this.selectedIndex === i ? '#081820' : '#346856');
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
      fontSize: '14px', fontFamily: FONTS.RETRO, color: '#081820',
      wordWrap: { width: contentWidth - 48, useAdvancedWrap: true },
    });
    this.contentContainer.add(title);

    // Difficulty
    const diffText = this.add.text(10, title.y + title.height + 10, `Difficulty: ${entry.difficulty}`, {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#346856',
    });
    this.contentContainer.add(diffText);

    // Sections
    let y = diffText.y + diffText.height + 24;
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
        fontSize: '11px', fontFamily: FONTS.MONO, color: '#081820',
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
      case 'what_you_felt': return '#346856';
      case 'plain_explanation': return '#081820';
      case 'pattern_steps': return '#22c55e';
      case 'real_world': return '#f97316';
      case 'unlocked_ability': return '#b7791f';
      default: return '#346856';
    }
  }

  private showEmptyState(): void {
    const { width, height } = this.cameras.main;
    const sidebarWidth = width * 0.3;
    const contentWidth = width - sidebarWidth - 64;
    const text = this.add.text(contentWidth / 2, height / 2 - 120, 'No entries unlocked yet.\nComplete puzzles to fill the Codex.', {
      fontSize: '12px', fontFamily: FONTS.MONO, color: '#081820',
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
