/**
 * CodexScene - Knowledge base viewer.
 * Full-screen dark UI with sidebar (entry list) and content panel.
 */

import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { COLORS, COLOR_HEX, FONTS, SCENE_KEYS } from '../config/constants';
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
  private contentBaseY: number = 100;
  private contentViewportH: number = 0;
  private contentScrollY: number = 0;
  private contentMaxScroll: number = 0;
  private scrollHintText?: Phaser.GameObjects.Text;

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
      fill: COLORS.ERROR,
      frame: COLORS.FRAME_BORDER_LIGHT,
      inner: COLORS.SUCCESS,
      shadow: true,
      shadowAlpha: 0.22,
      accent: COLORS.CYAN_GLOW,
      accentSide: 'top',
    });

    this.add.text(width / 2, 30, 'CODEX', {
      fontSize: '18px', fontFamily: FONTS.RETRO, color: COLOR_HEX.TEXT_LIGHT,
    }).setOrigin(0.5, 0).setDepth(2);

    this.add.text(width / 2, 54, 'ESC / C CLOSE', {
      fontSize: '8px', fontFamily: FONTS.RETRO, color: COLOR_HEX.CYAN_GLOW,
    }).setOrigin(0.5, 0).setDepth(2);

    // Close button
    const closeBtn = this.add.text(width - 54, 31, 'X', {
      fontSize: '14px', fontFamily: FONTS.RETRO, color: COLOR_HEX.TEXT_LIGHT,
      backgroundColor: COLOR_HEX.TEXT_DARK,
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.exitCodex());
    this.input.keyboard?.on('keydown-ESC', () => this.exitCodex());
    this.input.keyboard?.on('keydown-C', () => this.exitCodex());

    // Keyboard nav between unlocked entries
    this.input.keyboard?.on('keydown-UP', () => this.cycleUnlockedEntry(-1));
    this.input.keyboard?.on('keydown-W', () => this.cycleUnlockedEntry(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.cycleUnlockedEntry(1));
    this.input.keyboard?.on('keydown-S', () => this.cycleUnlockedEntry(1));
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.handleContentScrollKey(event));
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      this.scrollContent(dy > 0 ? 96 : -96);
    });

    // Sidebar (left 30%)
    const sidebarWidth = width * 0.3;
    drawPanel(this, 20, 84, sidebarWidth - 28, height - 112, {
      depth: 1,
      fill: COLORS.ERROR,
      frame: COLORS.FRAME_BORDER_LIGHT,
      inner: COLORS.SUCCESS,
      alpha: 0.96,
      shadow: true,
      shadowAlpha: 0.22,
      accent: COLORS.CYAN_GLOW,
    });

    // Sidebar entries
    this.createSidebar(sidebarWidth);

    // Content panel (right 70%)
    drawPanel(this, sidebarWidth + 12, 84, width - sidebarWidth - 32, height - 112, {
      depth: 1,
      fill: COLORS.ERROR,
      frame: COLORS.FRAME_BORDER_LIGHT,
      inner: COLORS.SUCCESS,
      alpha: 0.96,
      shadow: true,
      shadowAlpha: 0.22,
    });
    this.contentBaseY = 100;
    this.contentViewportH = height - 144;
    this.contentContainer = this.add.container(sidebarWidth + 28, this.contentBaseY).setDepth(2);

    const contentMask = this.add.graphics().setVisible(false);
    contentMask.fillStyle(0xffffff, 1);
    contentMask.fillRect(sidebarWidth + 28, this.contentBaseY, width - sidebarWidth - 68, this.contentViewportH);
    this.contentContainer.setMask(contentMask.createGeometryMask());

    this.scrollHintText = this.add.text(width - 52, height - 46, 'PGUP / PGDN', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.CYAN_GLOW,
    }).setOrigin(1, 1).setDepth(3).setVisible(false);

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

      const bg = this.add.rectangle(0, 0, sidebarWidth - 52, 36, unlocked ? COLORS.ERROR : COLORS.WARNING, unlocked ? 0.94 : 0.34);
      bg.setOrigin(0, 0.5);
      if (unlocked) {
        bg.setStrokeStyle(1, COLORS.FRAME_BORDER_LIGHT);
        bg.setInteractive({ useHandCursor: true });
      }
      container.add(bg);

      const text = this.add.text(10, 0, unlocked ? this.compactSidebarLabel(entry.algorithmName, sidebarWidth) : '???', {
        fontSize: '9px', fontFamily: FONTS.RETRO,
        color: unlocked ? COLOR_HEX.TEXT_LIGHT : COLOR_HEX.TEXT_MUTED,
        fixedWidth: sidebarWidth - 92,
      }).setOrigin(0, 0.5);
      container.add(text);

      if (unlocked) {
        // Status dot
        const dot = this.add.circle(sidebarWidth - 55, 0, 4, COLORS.GOLD_ACCENT);
        container.add(dot);

        bg.on('pointerover', () => {
          bg.setFillStyle(COLORS.CYAN_GLOW, 0.22);
          text.setColor(COLOR_HEX.TEXT_LIGHT);
        });

        bg.on('pointerout', () => {
          bg.setFillStyle(this.selectedIndex === i ? COLORS.WARNING : COLORS.ERROR, this.selectedIndex === i ? 1 : 0.94);
          text.setColor(COLOR_HEX.TEXT_LIGHT);
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

  private compactSidebarLabel(label: string, sidebarWidth: number): string {
    const maxChars = Math.max(14, Math.floor((sidebarWidth - 100) / 5.6));
    if (label.length <= maxChars) return label;
    return `${label.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
  }

  /** Move selection to the previous/next unlocked codex entry — keyboard only. */
  private cycleUnlockedEntry(direction: -1 | 1): void {
    const unlocked: number[] = [];
    for (let i = 0; i < CODEX_ENTRIES.length; i++) {
      if (gameState.isCodexUnlocked(CODEX_ENTRIES[i].id)) unlocked.push(i);
    }
    if (unlocked.length === 0) return;
    const currentPos = unlocked.indexOf(this.selectedIndex);
    const nextPos = currentPos < 0
      ? 0
      : (currentPos + direction + unlocked.length) % unlocked.length;
    audioManager.playTone(220, 50, 'square');
    this.selectEntry(unlocked[nextPos]);
  }

  /** Refresh sidebar visuals so the selected entry is visually distinguishable. */
  private refreshSidebarSelection(): void {
    for (let i = 0; i < this.sidebarEntries.length; i++) {
      const container = this.sidebarEntries[i];
      const bg = container.list[0] as Phaser.GameObjects.Rectangle | undefined;
      const text = container.list[1] as Phaser.GameObjects.Text | undefined;
      if (!bg || !text) continue;
      const isSelected = this.selectedIndex === i;
      const isUnlocked = gameState.isCodexUnlocked(CODEX_ENTRIES[i].id);
      if (!isUnlocked) continue;
      bg.setFillStyle(isSelected ? COLORS.WARNING : COLORS.ERROR, isSelected ? 1 : 0.94);
      text.setColor(COLOR_HEX.TEXT_LIGHT);
    }
  }

  private selectEntry(index: number): void {
    this.selectedIndex = index;
    const entry = CODEX_ENTRIES[index];
    this.refreshSidebarSelection();

    this.contentContainer.removeAll(true);
    this.setContentScroll(0);

    const { width } = this.cameras.main;
    const contentWidth = width * 0.65;

    // Entry title
    const title = this.add.text(10, 10, entry.algorithmName, {
      fontSize: '14px', fontFamily: FONTS.RETRO, color: COLOR_HEX.TEXT_LIGHT,
      wordWrap: { width: contentWidth - 48, useAdvancedWrap: true },
    });
    this.contentContainer.add(title);

    // Difficulty
    const diffText = this.add.text(10, title.y + title.height + 10, `Difficulty: ${entry.difficulty}`, {
      fontSize: '10px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_MUTED,
    });
    this.contentContainer.add(diffText);

    // Sections
    let y = diffText.y + diffText.height + 24;
    for (const section of entry.sections) {
      y = this.renderCodexSection(section, y, contentWidth);
    }
    this.updateContentScrollBounds(y);
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
        fontSize: '11px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_LIGHT,
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
      case 'what_you_felt': return COLOR_HEX.CYAN_GLOW;
      case 'plain_explanation': return COLOR_HEX.TEXT_LIGHT;
      case 'pattern_steps': return '#22c55e';
      case 'real_world': return '#f97316';
      case 'unlocked_ability': return COLOR_HEX.GOLD;
      default: return COLOR_HEX.TEXT_MUTED;
    }
  }

  private showEmptyState(): void {
    const { width, height } = this.cameras.main;
    const sidebarWidth = width * 0.3;
    const contentWidth = width - sidebarWidth - 64;
    const text = this.add.text(contentWidth / 2, height / 2 - 120, 'No entries unlocked yet.\nComplete puzzles to fill the Codex.', {
      fontSize: '12px', fontFamily: FONTS.MONO, color: COLOR_HEX.TEXT_LIGHT,
      align: 'center',
    }).setOrigin(0.5);
    this.contentContainer.add(text);
    this.updateContentScrollBounds(height / 2);
  }

  private updateContentScrollBounds(contentHeight: number): void {
    this.contentMaxScroll = Math.max(0, contentHeight + 24 - this.contentViewportH);
    this.setContentScroll(0);
    this.scrollHintText?.setVisible(this.contentMaxScroll > 0);
  }

  private handleContentScrollKey(event: KeyboardEvent): void {
    switch (event.key) {
      case 'PageDown':
        this.scrollContent(120);
        break;
      case 'PageUp':
        this.scrollContent(-120);
        break;
      case 'Home':
        this.setContentScroll(0);
        break;
      case 'End':
        this.setContentScroll(this.contentMaxScroll);
        break;
      default:
        break;
    }
  }

  private scrollContent(deltaY: number): void {
    if (this.contentMaxScroll <= 0) return;
    this.setContentScroll(this.contentScrollY + deltaY);
  }

  private setContentScroll(scrollY: number): void {
    this.contentScrollY = Phaser.Math.Clamp(scrollY, 0, this.contentMaxScroll);
    if (this.contentContainer) {
      this.contentContainer.setY(this.contentBaseY - this.contentScrollY);
    }
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
