/**
 * CodexScene - Knowledge base viewer.
 * Full-screen dark UI with sidebar (entry list) and content panel.
 */

import { VISUAL_REVAMP_KEYS, getImageAssetPath } from '../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { gameState } from '../core/GameStateManager';
import { audioManager } from '../core/AudioManager';
import { CODEX_ENTRIES } from '../data/codex/entries';
import type { CodexEntry, CodexSection } from '../data/types';
import { drawPanel } from '../ui/panel';
import { CONCEPT_BRIDGE_DATA } from '../data/dialogue/concept_bridge_content';

const CODEX_PALETTE = {
  ink: '#1a1208',
  inkMuted: '#5a3a1a',
  page: 0xf0e4c2,
  pageAlt: 0xd8c890,
  row: 0xe6d19a,
  rowSelected: 0xf5b820,
  frame: 0x5a3a1a,
  dark: 0x1a1208,
  rune: 0x06b6d4,
  runeCss: '#06b6d4',
  greenCss: '#346856',
  orangeCss: '#a05a2a',
  goldCss: '#8a5a12',
};

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

  preload(): void {
    const path = getImageAssetPath(VISUAL_REVAMP_KEYS.CODEX_ARTIFACT_BG);
    if (path && !this.textures.exists(VISUAL_REVAMP_KEYS.CODEX_ARTIFACT_BG)) {
      this.load.image(VISUAL_REVAMP_KEYS.CODEX_ARTIFACT_BG, path);
    }
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

    // Background: in-world artifact first, dark fallback second. The generated
    // tome has page regions reserved for Phaser text so the Codex reads like a
    // physical object instead of a terminal overlay.
    if (this.textures.exists(VISUAL_REVAMP_KEYS.CODEX_ARTIFACT_BG)) {
      const bg = this.add.image(width / 2, height / 2, VISUAL_REVAMP_KEYS.CODEX_ARTIFACT_BG).setOrigin(0.5);
      const source = bg.texture.getSourceImage() as HTMLImageElement;
      bg.setScale(Math.max(width / source.width, height / source.height));
      this.add.rectangle(0, 0, width, height, 0x1a1208, 0.04).setOrigin(0);
    } else {
      this.add.rectangle(0, 0, width, height, COLORS.OVERLAY_BG, 1).setOrigin(0);
      if (this.textures.exists(VISUAL_REVAMP_KEYS.TITLE_BG)) {
        const bg = this.add.image(width / 2, height / 2, VISUAL_REVAMP_KEYS.TITLE_BG).setOrigin(0.5).setAlpha(0.18);
        const source = bg.texture.getSourceImage() as HTMLImageElement;
        bg.setScale(Math.max(width / source.width, height / source.height));
      }
      this.add.rectangle(0, 0, width, height, 0x081820, 0.72).setOrigin(0);
    }

    // Title
    drawPanel(this, 26, 18, width - 52, 48, {
      depth: 1,
      fill: CODEX_PALETTE.pageAlt,
      frame: CODEX_PALETTE.frame,
      inner: 0xb7893a,
      shadow: true,
      shadowAlpha: 0.14,
      accent: CODEX_PALETTE.rune,
      accentSide: 'top',
    });

    this.add.text(width / 2, 28, 'CODEX', {
      fontSize: '17px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.ink,
    }).setOrigin(0.5, 0).setDepth(2);

    this.add.text(width / 2, 51, 'ESC / C CLOSE', {
      fontSize: '8px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.inkMuted,
    }).setOrigin(0.5, 0).setDepth(2);

    // Close button
    const closeBtn = this.add.text(width - 54, 31, 'X', {
      fontSize: '14px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.ink,
      backgroundColor: '#d8c890',
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
      fill: CODEX_PALETTE.page,
      frame: CODEX_PALETTE.frame,
      inner: 0xb7893a,
      alpha: 0.32,
      shadow: true,
      shadowAlpha: 0.10,
      accent: CODEX_PALETTE.rune,
    });

    // Sidebar entries
    this.createSidebar(sidebarWidth);

    // Content panel (right 70%)
    drawPanel(this, sidebarWidth + 12, 84, width - sidebarWidth - 32, height - 112, {
      depth: 1,
      fill: CODEX_PALETTE.page,
      frame: CODEX_PALETTE.frame,
      inner: 0xb7893a,
      alpha: 0.24,
      shadow: true,
      shadowAlpha: 0.08,
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
      color: CODEX_PALETTE.inkMuted,
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

      const bg = this.add.rectangle(0, 0, sidebarWidth - 52, 36, unlocked ? CODEX_PALETTE.row : CODEX_PALETTE.pageAlt, unlocked ? 0.78 : 0.28);
      bg.setOrigin(0, 0.5);
      if (unlocked) {
        bg.setStrokeStyle(1, CODEX_PALETTE.frame, 0.72);
        bg.setInteractive({ useHandCursor: true });
      }
      container.add(bg);

      const text = this.add.text(10, 0, unlocked ? this.compactSidebarLabel(entry.algorithmName, sidebarWidth) : '???', {
        fontSize: '9px', fontFamily: FONTS.RETRO,
        color: unlocked ? CODEX_PALETTE.ink : CODEX_PALETTE.inkMuted,
        fixedWidth: sidebarWidth - 92,
      }).setOrigin(0, 0.5);
      container.add(text);

      if (unlocked) {
        // Status dot
        const dot = this.add.circle(sidebarWidth - 55, 0, 4, CODEX_PALETTE.rune);
        container.add(dot);

        bg.on('pointerover', () => {
          bg.setFillStyle(CODEX_PALETTE.rowSelected, 0.62);
          text.setColor(CODEX_PALETTE.ink);
        });

        bg.on('pointerout', () => {
          bg.setFillStyle(this.selectedIndex === i ? CODEX_PALETTE.rowSelected : CODEX_PALETTE.row, this.selectedIndex === i ? 0.86 : 0.78);
          text.setColor(CODEX_PALETTE.ink);
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
      bg.setFillStyle(isSelected ? CODEX_PALETTE.rowSelected : CODEX_PALETTE.row, isSelected ? 0.86 : 0.78);
      text.setColor(CODEX_PALETTE.ink);
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
      fontSize: '14px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.ink,
      wordWrap: { width: contentWidth - 48, useAdvancedWrap: true },
    });
    this.contentContainer.add(title);

    // Difficulty
    const diffText = this.add.text(10, title.y + title.height + 10, `Difficulty: ${entry.difficulty}`, {
      fontSize: '10px', fontFamily: FONTS.MONO, color: CODEX_PALETTE.inkMuted,
    });
    this.contentContainer.add(diffText);

    // Sections
    let y = diffText.y + diffText.height + 24;
    for (const section of entry.sections) {
      y = this.renderCodexSection(section, y, contentWidth);
    }
    y = this.renderDeepLayer(entry, y, contentWidth);
    this.updateContentScrollBounds(y);
  }

  /**
   * The optional deep layer (docs/VISION.md §4): pattern reveal, pseudocode
   * in three flavors, and real-world deployments, sourced from the old
   * ConceptBridge content. This is where the CS student goes by choice —
   * the playable game itself never shows code.
   */
  private renderDeepLayer(entry: CodexEntry, startY: number, maxWidth: number): number {
    const bridge = CONCEPT_BRIDGE_DATA[entry.unlockedBy];
    if (!bridge) return startY;

    const wrapWidth = maxWidth - 40;
    let y = startY + 8;

    const divider = this.add.rectangle(10, y, wrapWidth, 2, CODEX_PALETTE.frame, 0.35).setOrigin(0, 0.5);
    this.contentContainer.add(divider);
    y += 20;

    const header = this.add.text(10, y, '◆ DEEPER — FOR THE CURIOUS', {
      fontSize: '11px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.goldCss,
    });
    this.contentContainer.add(header);
    y += 22;

    const note = this.add.text(10, y, 'Optional reading. The pattern you felt, written the way engineers write it.', {
      fontSize: '9px', fontFamily: FONTS.MONO, color: CODEX_PALETTE.inkMuted,
      wordWrap: { width: wrapWidth },
    });
    this.contentContainer.add(note);
    y += note.height + 18;

    // Pattern reveal — name, complexity, analogues.
    const prTitle = this.add.text(10, y, bridge.sections.patternReveal.title, {
      fontSize: '11px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.greenCss,
      wordWrap: { width: wrapWidth, useAdvancedWrap: true },
    });
    this.contentContainer.add(prTitle);
    y += prTitle.height + 12;
    for (const line of bridge.sections.patternReveal.explanation) {
      const text = this.add.text(10, y, line, {
        fontSize: '11px', fontFamily: FONTS.MONO, color: CODEX_PALETTE.ink,
        wordWrap: { width: wrapWidth }, lineSpacing: 3,
      });
      this.contentContainer.add(text);
      y += text.height + 8;
    }
    y += 14;

    // Pseudocode with language tabs. The plate is sized to the tallest
    // variant so switching tabs never reflows the sections below it.
    const variants: Array<{ label: string; code: string }> = [
      { label: 'PSEUDO', code: bridge.sections.pseudocode.code },
      { label: 'PYTHON', code: bridge.sections.pseudocode.python },
      { label: 'JS', code: bridge.sections.pseudocode.js },
    ];

    const tabTexts: Phaser.GameObjects.Text[] = [];
    let tabX = 10;
    const tabY = y;
    const codeText = this.add.text(22, 0, '', {
      fontSize: '10px', fontFamily: FONTS.MONO, color: '#e6e6f0',
      lineSpacing: 4,
    });

    let maxCodeHeight = 0;
    for (const variant of variants) {
      codeText.setText(variant.code);
      maxCodeHeight = Math.max(maxCodeHeight, codeText.height);
    }

    const selectTab = (index: number): void => {
      codeText.setText(variants[index].code);
      tabTexts.forEach((tab, i) => {
        tab.setColor(i === index ? CODEX_PALETTE.goldCss : CODEX_PALETTE.inkMuted);
      });
    };

    variants.forEach((variant, i) => {
      const tab = this.add.text(tabX, tabY, `[ ${variant.label} ]`, {
        fontSize: '10px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.inkMuted,
      }).setInteractive({ useHandCursor: true });
      tab.on('pointerdown', () => {
        audioManager.playTone?.(660, 60, 'square');
        selectTab(i);
      });
      this.contentContainer.add(tab);
      tabTexts.push(tab);
      tabX += tab.width + 16;
    });
    y += 26;

    const plate = this.add.rectangle(10, y, wrapWidth, maxCodeHeight + 24, 0x241c30, 0.95).setOrigin(0, 0);
    plate.setStrokeStyle(2, CODEX_PALETTE.frame, 0.8);
    this.contentContainer.add(plate);
    codeText.setPosition(22, y + 12);
    this.contentContainer.add(codeText);
    selectTab(0);
    y += maxCodeHeight + 24 + 10;

    const codeCaption = this.add.text(10, y, bridge.sections.pseudocode.explanation, {
      fontSize: '10px', fontFamily: FONTS.MONO, color: CODEX_PALETTE.inkMuted,
      wordWrap: { width: wrapWidth }, lineSpacing: 3,
    });
    this.contentContainer.add(codeCaption);
    y += codeCaption.height + 18;

    // Where it ships.
    const rwTitle = this.add.text(10, y, 'WHERE IT SHIPS', {
      fontSize: '11px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.orangeCss,
    });
    this.contentContainer.add(rwTitle);
    y += 22;
    for (const line of bridge.sections.realWorld) {
      const bullet = this.add.text(10, y, '▸', {
        fontSize: '10px', fontFamily: FONTS.RETRO, color: CODEX_PALETTE.orangeCss,
      });
      const text = this.add.text(26, y, line, {
        fontSize: '10px', fontFamily: FONTS.MONO, color: CODEX_PALETTE.ink,
        wordWrap: { width: wrapWidth - 16 }, lineSpacing: 3,
      });
      this.contentContainer.add([bullet, text]);
      y += text.height + 8;
    }
    y += 16;

    return y;
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
        fontSize: '11px', fontFamily: FONTS.MONO, color: CODEX_PALETTE.ink,
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
      case 'what_you_felt': return CODEX_PALETTE.runeCss;
      case 'plain_explanation': return CODEX_PALETTE.ink;
      case 'pattern_steps': return CODEX_PALETTE.greenCss;
      case 'real_world': return CODEX_PALETTE.orangeCss;
      case 'unlocked_ability': return CODEX_PALETTE.goldCss;
      default: return CODEX_PALETTE.inkMuted;
    }
  }

  private showEmptyState(): void {
    const { width, height } = this.cameras.main;
    const sidebarWidth = width * 0.3;
    const contentWidth = width - sidebarWidth - 64;
    const text = this.add.text(contentWidth / 2, height / 2 - 120, 'No entries unlocked yet.\nComplete puzzles to fill the Codex.', {
      fontSize: '12px', fontFamily: FONTS.MONO, color: CODEX_PALETTE.ink,
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
