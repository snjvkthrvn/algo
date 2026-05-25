import Phaser from 'phaser';
import { COLORS, px, s, SPACING, STAGE, TYPE } from '../puzzles/P0_1/tokens';
import { GAME, type ScoreEvent } from '../game/state';
import { PROLOGUE_RUN_UI_KEY } from '../game/algorithmiaIntegration';

/**
 * Persistent HUD overlay.
 *
 * Launched alongside the first gameplay scene; remains active for the duration
 * of a single run. Stopped (or re-launched) by the title / game over / win
 * screens. Reads everything from the GAME singleton and animates updates.
 */

const PAD_X = SPACING.xxl;
const PAD_Y = SPACING.md;

const TB_W = s(720);
const TB_H = s(3);
const TB_Y = s(5);

const GEM_X = STAGE.width - 156;
const GEM_Y = 16;
const GEM_W = 140;
const GEM_H = 68;

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private comboChip!: Phaser.GameObjects.Container;
  private hearts: Phaser.GameObjects.Graphics[] = [];
  private timeBarBg!: Phaser.GameObjects.Graphics;
  private timeBarFill!: Phaser.GameObjects.Graphics;
  private timeBarRatio = 1;
  private timeBarTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: PROLOGUE_RUN_UI_KEY, active: false });
  }

  create(): void {
    // ── Top-right HUD panel ────────────────────────────────────────────────────
    const panelBg = this.add.graphics().setDepth(39);
    panelBg.fillStyle(0x0c1024, 0.78);
    panelBg.fillRoundedRect(GEM_X, GEM_Y, GEM_W, GEM_H, s(12));
    panelBg.lineStyle(s(1), 0x2a3a6f, 0.45);
    panelBg.strokeRoundedRect(GEM_X, GEM_Y, GEM_W, GEM_H, s(12));

    this.hearts = [];
    const heartsWidth = (GAME.maxLives - 1) * s(20);
    const startX = GEM_X + (GEM_W - heartsWidth) / 2;
    for (let i = 0; i < GAME.maxLives; i += 1) {
      const heart = this.add.graphics();
      heart.x = startX + i * s(20);
      heart.y = GEM_Y + s(20);
      heart.setDepth(40);
      this.paintHeart(heart, i < GAME.lives);
      this.hearts.push(heart);
    }

    this.scoreText = this.add
      .text(GEM_X + GEM_W / 2, GEM_Y + s(44), this.formatScore(GAME.score), {
        fontFamily: (TYPE.display as { fontFamily: string }).fontFamily,
        fontSize: s(13) + 'px',
        fontStyle: 'bold',
        color: '#e6ecff',
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.comboChip = this.add.container(STAGE.width - PAD_X - s(100), PAD_Y + s(56)).setDepth(40);
    const chipBg = this.add.graphics();
    chipBg.fillStyle(0xfca5a5, 0.16);
    chipBg.fillRoundedRect(0, 0, s(100), s(22), s(11));
    chipBg.lineStyle(s(1), 0xfca5a5, 0.55);
    chipBg.strokeRoundedRect(0, 0, s(100), s(22), s(11));
    this.comboText = this.add
      .text(s(50), s(11), 'COMBO \u00d70', {
        ...TYPE.eyebrow,
        color: '#fde68a',
        letterSpacing: s(1.5),
        fontSize: px(11),
      })
      .setOrigin(0.5);
    this.comboChip.add([chipBg, this.comboText]);
    this.comboChip.setAlpha(0);

    this.timeBarBg = this.add.graphics().setDepth(40).setAlpha(0);
    this.timeBarBg.fillStyle(COLORS.surface.line, 0.4);
    this.timeBarBg.fillRoundedRect(STAGE.width / 2 - TB_W / 2, TB_Y, TB_W, TB_H, s(2));
    this.timeBarFill = this.add.graphics().setDepth(41).setAlpha(0);
    this.repaintTimeBar();

    this.subscribe();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe());
    this.refresh();
  }

  private subscribe(): void {
    GAME.emitter.on('score', this.onScore, this);
    GAME.emitter.on('lives', this.onLives, this);
    GAME.emitter.on('combo', this.onCombo, this);
    GAME.emitter.on('reset', this.refresh, this);
    GAME.emitter.on('roundStart', this.onRoundStart, this);
    GAME.emitter.on('roundEnd', this.onRoundEnd, this);
  }

  private unsubscribe(): void {
    GAME.emitter.off('score', this.onScore, this);
    GAME.emitter.off('lives', this.onLives, this);
    GAME.emitter.off('combo', this.onCombo, this);
    GAME.emitter.off('reset', this.refresh, this);
    GAME.emitter.off('roundStart', this.onRoundStart, this);
    GAME.emitter.off('roundEnd', this.onRoundEnd, this);
  }

  private refresh(): void {
    this.scoreText.setText(this.formatScore(GAME.score));
    this.hearts.forEach((h, i) => this.paintHeart(h, i < GAME.lives));
    this.updateCombo(GAME.combo);
  }

  private onScore(_ev: ScoreEvent): void {
    this.scoreText.setText(this.formatScore(GAME.score));
    this.tweens.killTweensOf(this.scoreText);
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.18, to: 1 },
      duration: 260,
      ease: 'Quad.easeOut',
    });
  }

  private onLives(value: number): void {
    this.hearts.forEach((h, i) => this.paintHeart(h, i < value));
    const lost = this.hearts[value];
    if (!lost) return;
    this.tweens.killTweensOf(lost);
    this.tweens.add({
      targets: lost,
      scale: { from: 1.35, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  private onCombo(value: number): void {
    this.updateCombo(value);
  }

  private updateCombo(value: number): void {
    this.comboText.setText(`COMBO \u00d7${value}`);
    this.tweens.killTweensOf(this.comboChip);
    if (value > 0) {
      this.tweens.add({
        targets: this.comboChip,
        alpha: 1,
        duration: 220,
        ease: 'Sine.easeOut',
      });
      this.tweens.add({
        targets: this.comboChip,
        scale: { from: 1.12, to: 1 },
        duration: 240,
        ease: 'Quad.easeOut',
      });
    } else {
      this.tweens.add({
        targets: this.comboChip,
        alpha: 0,
        duration: 320,
        ease: 'Sine.easeIn',
      });
    }
  }

  private paintHeart(g: Phaser.GameObjects.Graphics, alive: boolean): void {
    g.clear();
    const color = alive ? 0xff7a7a : 0x3a4257;
    const alpha = alive ? 0.95 : 0.45;
    g.fillStyle(color, alpha);
    g.fillCircle(s(-4), s(-1), s(5));
    g.fillCircle(s(4), s(-1), s(5));
    g.fillTriangle(s(-8), s(1), s(8), s(1), 0, s(9));
  }

  private formatScore(v: number): string {
    return `SCORE  ${v.toLocaleString('en-US')}`;
  }

  private onRoundStart(duration: number): void {
    this.timeBarTween?.stop();
    this.timeBarRatio = 1;
    this.repaintTimeBar();
    this.tweens.add({
      targets: [this.timeBarBg, this.timeBarFill],
      alpha: 1,
      duration: 260,
      ease: 'Sine.easeOut',
    });
    this.timeBarTween = this.tweens.addCounter({
      from: 1,
      to: 0,
      duration,
      ease: 'Linear',
      onUpdate: (t) => {
        this.timeBarRatio = t.getValue() as number;
        this.repaintTimeBar();
      },
    });
  }

  private onRoundEnd(): void {
    this.timeBarTween?.stop();
    this.timeBarTween = undefined;
    this.tweens.add({
      targets: [this.timeBarBg, this.timeBarFill],
      alpha: 0,
      duration: 360,
      ease: 'Sine.easeIn',
    });
  }

  private repaintTimeBar(): void {
    this.timeBarFill.clear();
    const ratio = Math.max(0, Math.min(1, this.timeBarRatio));
    const w = TB_W * ratio;
    let color: number;
    if (ratio > 0.5) color = COLORS.accent;
    else if (ratio > 0.25) color = 0xfde68a;
    else color = 0xf87171;
    this.timeBarFill.fillStyle(color, 0.9);
    this.timeBarFill.fillRoundedRect(STAGE.width / 2 - TB_W / 2, TB_Y, w, TB_H, s(2));
  }
}
