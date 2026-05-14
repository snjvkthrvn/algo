/**
 * HUDManager - Minimal retro HUD with region name and contextual prompts.
 *
 * Lives at the top-left (region badge), top-right (companion status), and
 * bottom-center (persistent controls reminder). All positions snap to an
 * 8-pixel grid for crisp rendering.
 */

import Phaser from 'phaser';
import { COLORS, COLOR_HEX, FONTS } from '../config/constants';
import {
  REGION_PRESENTATION,
  getRegionPresentationByTitle,
  getRegionProgress,
} from '../data/regionPresentation';
import { drawPanel } from '../ui/panel';
import { a11yManager } from '../core/A11yManager';
import { gameState } from '../core/GameStateManager';
import { eventBus, GameEvents } from '../core/EventBus';
import { BitStage } from '../data/types';
import { progressionSystem } from './ProgressionSystem';

const BIT_STAGE_GLYPH: Record<BitStage, string> = {
  [BitStage.SPARK]: '*',
  [BitStage.BYTE]: '::',
  [BitStage.FRAME]: '[ ]',
  [BitStage.BRANCH]: '<>',
  [BitStage.GRAPH]: '<*>',
  [BitStage.CORE]: '(*)',
};

const BIT_STAGE_LABEL: Record<BitStage, string> = {
  [BitStage.SPARK]: 'SPARK',
  [BitStage.BYTE]: 'BYTE',
  [BitStage.FRAME]: 'FRAME',
  [BitStage.BRANCH]: 'BRANCH',
  [BitStage.GRAPH]: 'GRAPH',
  [BitStage.CORE]: 'CORE',
};

export class HUDManager {
  private scene: Phaser.Scene;
  private regionText: Phaser.GameObjects.Text;
  private encountersText!: Phaser.GameObjects.Text;
  private activeRegionId: string | null = null;
  private container: Phaser.GameObjects.Container;
  private cardTween: Phaser.Tweens.Tween | null = null;
  private cardObjects: Phaser.GameObjects.GameObject[] = [];

  private bitStatusText!: Phaser.GameObjects.Text;
  private shardStatusText!: Phaser.GameObjects.Text;
  private objectiveHintText!: Phaser.GameObjects.Text;
  private objectiveTextCache = '';
  private controlsStripText!: Phaser.GameObjects.Text;

  private readonly handleBitEvolve = () => this.refreshBitStatus();
  private readonly handleShardCollected = () => this.refreshShardStatus();
  private readonly handleScaleResize = () => this.layoutHud();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);

    // Region badge (top-left).
    this.regionText = scene.add.text(24, 16, '', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
      backgroundColor: COLOR_HEX.TEXT_DARK,
      padding: { x: 8, y: 8 },
    });
    this.regionText.setAlpha(0);
    this.container.add(this.regionText);

    this.encountersText = scene.add.text(24, 46, '', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
      backgroundColor: COLOR_HEX.TEXT_DARK,
      padding: { x: 8, y: 4 },
    });
    this.encountersText.setAlpha(0);
    this.container.add(this.encountersText);

    this.createCompanionStatus(scene);
    this.createObjectiveHint(scene);
    this.createControlsStrip(scene);

    eventBus.on(GameEvents.BIT_EVOLVE, this.handleBitEvolve);
    eventBus.on(GameEvents.SHARD_COLLECTED, this.handleShardCollected);
    eventBus.on(GameEvents.PUZZLE_COMPLETE, this.handlePuzzleComplete);
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    this.layoutHud();
  }

  /** Snap HUD chrome to the 8px grid; refresh on window / scale changes. */
  private layoutHud(): void {
    if (!this.bitStatusText?.active) return;
    const cam = this.scene.cameras.main;
    const width = cam.width;
    const height = cam.height;
    const snap8 = (v: number) => Math.round(v / 8) * 8;

    const bitX = snap8(width - 24);
    this.bitStatusText.setPosition(bitX, snap8(16));
    this.shardStatusText.setPosition(bitX, snap8(16 + 32));

    const midX = snap8(width / 2);
    this.objectiveHintText.setPosition(midX, snap8(height - 58));
    const wrapW = Math.max(160, Math.min(520, width - 64));
    this.objectiveHintText.setWordWrapWidth(wrapW, true);

    this.controlsStripText.setPosition(midX, snap8(height - 12));
    this.regionText.setPosition(snap8(24), snap8(16));
    if (this.encountersText?.active) {
      this.encountersText.setPosition(snap8(24), snap8(46));
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private createCompanionStatus(scene: Phaser.Scene): void {
    const { width } = scene.cameras.main;
    const x = width - 24;
    const y = 16;

    this.bitStatusText = scene.add.text(x, y, '', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
      backgroundColor: COLOR_HEX.TEXT_DARK,
      padding: { x: 8, y: 6 },
    }).setOrigin(1, 0).setAlpha(0.85);

    this.shardStatusText = scene.add.text(x, y + 32, '', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
      backgroundColor: COLOR_HEX.WARNING,
      padding: { x: 6, y: 4 },
    }).setOrigin(1, 0).setAlpha(0.8);

    this.container.add([this.bitStatusText, this.shardStatusText]);
    this.refreshBitStatus();
    this.refreshShardStatus();
  }

  /** Short goal line above the control strip — overworld scenes drive copy; empty hides. */
  private createObjectiveHint(scene: Phaser.Scene): void {
    const { width, height } = scene.cameras.main;
    this.objectiveHintText = scene.add
      .text(width / 2, height - 56, '', {
        fontSize: '9px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.TEXT_LIGHT,
        backgroundColor: COLOR_HEX.TEXT_DARK,
        padding: { x: 8, y: 5 },
        align: 'center',
        wordWrap: { width: Math.min(520, width - 64), useAdvancedWrap: true },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 1)
      .setAlpha(0);
    this.container.add(this.objectiveHintText);
  }

  /**
   * Set a one-line (or wrapped) player-facing objective. Pass '' to hide.
   * Uses muted palette — reserved cyan stays for interactive highlights only.
   */
  setObjectiveHint(text: string): void {
    if (!this.objectiveHintText?.active) return;
    const trimmed = text.trim();
    if (trimmed === this.objectiveTextCache) return;
    this.objectiveTextCache = trimmed;
    this.scene.tweens.killTweensOf(this.objectiveHintText);
    this.objectiveHintText.setText(trimmed);
    this.objectiveHintText.setAlpha(trimmed ? 0.9 : 0);
  }

  private createControlsStrip(scene: Phaser.Scene): void {
    const { width, height } = scene.cameras.main;
    this.controlsStripText = scene.add.text(
      width / 2,
      height - 12,
      'SPACE INTERACT  |  C CODEX  |  M MUTE  |  ESC PAUSE',
      {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.TEXT_LIGHT,
        backgroundColor: COLOR_HEX.TEXT_DARK,
        padding: { x: 8, y: 5 },
      }
    ).setOrigin(0.5, 1).setAlpha(0.86);
    this.container.add(this.controlsStripText);
  }

  private readonly handlePuzzleComplete = () => {
    this.refreshEncountersText();
    if (this.encountersText.active && this.encountersText.text && !this.prefersReducedMotion()) {
      this.scene.tweens.killTweensOf(this.encountersText);
      this.encountersText.setAlpha(0.8);
      this.scene.tweens.add({
        targets: this.encountersText,
        alpha: 0.6,
        duration: 1000,
        delay: 2000,
      });
    }
  };

  private refreshEncountersText(): void {
    if (!this.encountersText?.active || !this.activeRegionId) {
      if (this.encountersText) this.encountersText.setText('');
      return;
    }

    const progress = progressionSystem.getRegionEncounterProgress(this.activeRegionId);
    if (!progress) {
      this.encountersText.setText('');
      return;
    }

    let ledger = '';
    for (let i = 0; i < progress.total - 1; i++) {
      ledger += i < Math.min(progress.completed, progress.total - 1) ? '[x]' : '[ ]';
    }
    const bossCompleted = progress.completed === progress.total;
    ledger += bossCompleted ? '[x]' : '[B]';

    this.encountersText.setText(`ENCOUNTERS: ${ledger}`);
  }

  private refreshBitStatus(): void {
    if (!this.bitStatusText?.active) return;
    const stage = gameState.getBitStage();
    this.bitStatusText.setText(`BIT ${BIT_STAGE_GLYPH[stage]} ${BIT_STAGE_LABEL[stage]}`);
  }

  private refreshShardStatus(): void {
    if (!this.shardStatusText?.active) return;
    const count = gameState.getShardsCollected().length;
    if (count === 0) {
      this.shardStatusText.setVisible(false);
      return;
    }
    this.shardStatusText.setVisible(true);
    this.shardStatusText.setText(`${count} SHARD${count === 1 ? '' : 'S'}`);
  }

  showRegionName(name: string): void {
    const presentation = getRegionPresentationByTitle(name);
    const progress = getRegionProgress(presentation?.id);
    const label = presentation ? `${progress.label} ${presentation.shortTitle}` : name;

    this.activeRegionId = presentation?.id ?? null;
    this.refreshEncountersText();

    this.regionText.setText(label);
    this.scene.tweens.killTweensOf(this.regionText);
    this.scene.tweens.killTweensOf(this.encountersText);

    if (this.prefersReducedMotion()) {
      this.regionText.setAlpha(0.65);
      if (this.encountersText.text) this.encountersText.setAlpha(0.65);
      a11yManager.announce(label, false);
      return;
    }

    this.regionText.setAlpha(0);
    if (this.encountersText.text) this.encountersText.setAlpha(0);

    const targets: Phaser.GameObjects.GameObject[] = [this.regionText];
    if (this.encountersText.text) targets.push(this.encountersText);

    // Attention pillar: fade only on region entry; suppress during puzzle flow
    this.scene.tweens.add({
      targets,
      alpha: 0.8,
      duration: 1000,
      hold: 3000,
      yoyo: true,
    });
  }

  showRegionCard(name: string, subtitle: string): void {
    this.destroyCard();
    this.scene.tweens.killTweensOf(this.regionText);
    this.scene.tweens.killTweensOf(this.encountersText);

    const presentation = getRegionPresentationByTitle(name);
    const progress = getRegionProgress(presentation?.id);
    const persistentLabel = presentation ? `${progress.label} ${presentation.shortTitle}` : name;

    this.activeRegionId = presentation?.id ?? null;
    this.refreshEncountersText();

    if (this.prefersReducedMotion()) {
      this.regionText.setText(persistentLabel);
      this.regionText.setAlpha(0.65);
      if (this.encountersText.text) this.encountersText.setAlpha(0.65);
      const sub = subtitle.trim();
      a11yManager.announce(sub ? `${name}. ${sub}` : name, false);
      return;
    }

    const { width } = this.scene.cameras.main;
    const accent = presentation?.accentColor ?? COLORS.FRAME_BORDER_LIGHT;

    const cardW = Math.min(width - 96, 640);
    const cardH = 132;
    const cardX = Math.round(width / 2 - cardW / 2);
    const cardY = 48;

    const cardBg = drawPanel(this.scene, cardX, cardY, cardW, cardH, {
      depth: 3001,
      scrollFactor: 0,
      fill: COLORS.ERROR,
      frame: COLORS.FRAME_BORDER_LIGHT,
      inner: COLORS.SUCCESS,
      shadow: true,
      shadowAlpha: 0.26,
      accent,
      accentSide: 'top',
    });

    const titleText = this.scene.add.text(width / 2, cardY + 18, name, {
      fontSize: '16px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_LIGHT,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002);

    const subText = this.scene.add.text(width / 2, cardY + 48, subtitle, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_MUTED,
      align: 'center',
      wordWrap: { width: cardW - 48, useAdvancedWrap: true },
      lineSpacing: 6,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002);

    const actLabel = presentation
      ? `ACT ${progress.label} - ${presentation.actLabel.toUpperCase()}`
      : 'ACT ?/9';
    const actText = this.scene.add.text(width / 2, cardY + 76, actLabel, {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_DARK,
      backgroundColor: COLOR_HEX.CYAN_GLOW,
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002);

    const hintText = this.scene.add.text(width / 2, cardY + 106, 'SPACE ACT  |  C CODEX  |  M MUTE  |  ESC PAUSE', {
      fontSize: '7px',
      fontFamily: FONTS.RETRO,
      color: COLOR_HEX.TEXT_MUTED,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002);

    const rail = this.createJourneyRail(width / 2, cardY + cardH - 12, progress.current, accent);

    cardBg.setAlpha(0);
    titleText.setAlpha(0);
    subText.setAlpha(0);
    actText.setAlpha(0);
    hintText.setAlpha(0);
    rail.setAlpha(0);

    this.cardObjects = [cardBg, titleText, subText, actText, hintText, rail];
    this.cardTween = this.scene.tweens.add({
      targets: this.cardObjects,
      alpha: 1,
      duration: 500,
      hold: 2500,
      yoyo: true,
      onComplete: () => {
        this.regionText.setAlpha(0.6);
        if (this.encountersText.text) this.encountersText.setAlpha(0.6);
        this.destroyCard();
      },
    });

    // Also set persistent region text
    this.regionText.setText(persistentLabel);
  }

  private createJourneyRail(centerX: number, y: number, current: number, accent: number): Phaser.GameObjects.Graphics {
    const dotSpacing = 22;
    const startX = Math.round(centerX - ((REGION_PRESENTATION.length - 1) * dotSpacing) / 2);
    const rail = this.scene.add.graphics().setDepth(3002).setScrollFactor(0);

    rail.lineStyle(1, COLORS.FRAME_BORDER_LIGHT, 0.36);
    rail.beginPath();
    rail.moveTo(startX, y);
    rail.lineTo(startX + (REGION_PRESENTATION.length - 1) * dotSpacing, y);
    rail.strokePath();

    REGION_PRESENTATION.forEach((_region, index) => {
      const x = startX + index * dotSpacing;
      const isCurrent = current === index + 1;
      const isPast = current > index + 1;
      const fill = isCurrent ? accent : isPast ? COLORS.SUCCESS : COLORS.TEXT_LIGHT;
      const radius = isCurrent ? 4 : 3;

      rail.fillStyle(fill, isCurrent || isPast ? 1 : 0.52);
      rail.fillCircle(x, y, radius);
      rail.lineStyle(1, COLORS.ERROR, 0.72);
      rail.strokeCircle(x, y, radius + 1);
    });

    return rail;
  }

  private destroyCard(): void {
    if (this.cardTween) {
      this.cardTween.stop();
      this.cardTween = null;
    }
    for (const obj of this.cardObjects) {
      if (obj.active) obj.destroy();
    }
    this.cardObjects = [];
  }

  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this);
    eventBus.off(GameEvents.BIT_EVOLVE, this.handleBitEvolve);
    eventBus.off(GameEvents.SHARD_COLLECTED, this.handleShardCollected);
    eventBus.off(GameEvents.PUZZLE_COMPLETE, this.handlePuzzleComplete);
    this.destroyCard();
    this.container.destroy();
  }
}
