/**
 * RoundRecap — a brief "what just happened, algorithmically" card shown
 * between rounds.
 *
 * The LessonCard introduces the round; RoundRecap closes it. Together they
 * sandwich the play with explicit framing: *here's what to learn*, *play*,
 * *here's what you actually demonstrated*. This is the difference between
 * a puzzle being a sequence of clicks and a puzzle being a teaching arc.
 *
 * Content layout:
 *
 *   ┌──────────────────────────────────────┐
 *   │ ROUND X · LABEL                  ★★☆ │
 *   │ ─────────────────────────────────── │
 *   │ Your cost:   N swaps                 │
 *   │ Brute force: B inversions            │
 *   │ Saved:       S steps (F× speedup)    │
 *   │ ─────────────────────────────────── │
 *   │ insight: one-sentence takeaway       │
 *   │                                      │
 *   │ press SPACE · ENTER · click — next   │
 *   └──────────────────────────────────────┘
 *
 * Variants: parchment (Array Plains, Twin Rivers), cosmic (Prologue).
 *
 * The card auto-dismisses after `autoDismissMs` (default 3500) and resolves
 * its onDismiss callback so the scene can await it cleanly.
 */

import Phaser from 'phaser';

export type RoundRecapVariant = 'parchment' | 'cosmic';

export interface RoundRecapData {
  /** "ROUND 2 · TWIST" — appears as the eyebrow. */
  readonly title: string;
  /**
   * Star count earned this round (1-3). The recap surfaces the player's
   * preview star value so they know how the run is scoring.
   */
  readonly stars: 1 | 2 | 3;
  /** Stat rows. */
  readonly stats: ReadonlyArray<RecapStat>;
  /** Single-sentence algorithmic takeaway. */
  readonly insight: string;
}

export interface RecapStat {
  readonly label: string;
  readonly value: string;
  /** Tint for the value, e.g. 'algo' (green) or 'brute' (red) or 'gold'. */
  readonly tint?: 'algo' | 'brute' | 'gold' | 'plain';
}

export interface RoundRecapOptions {
  readonly variant?: RoundRecapVariant;
  readonly width?: number;
  readonly autoDismissMs?: number;
  readonly onDismiss?: () => void;
}

const PARCH = {
  bg: 0xf0e4c2,
  bgAlt: 0xd8c890,
  ink: '#1a1208',
  inkDim: '#4a3818',
  accent: '#a03830',
  algo: '#3c8038',
  brute: '#a03830',
  gold: '#f5b820',
  goldNum: 0xf5b820,
  panelStroke: 0x1a1208,
  rule: 0xa06832,
};
const COSM = {
  bg: 0x0d0a2a,
  bgAlt: 0x06061a,
  ink: '#e0f8d0',
  inkDim: '#a7b8d9',
  accent: '#a78bfa',
  algo: '#86efac',
  brute: '#fda4af',
  gold: '#f5b820',
  goldNum: 0xf5b820,
  panelStroke: 0xe0f8d0,
  rule: 0x22d3ee,
};

const STAR_FULL = '★';
const STAR_EMPTY = '☆';

export class RoundRecap {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private autoTimer: Phaser.Time.TimerEvent | null = null;
  private readonly onDismiss?: () => void;
  private dismissed = false;
  private readonly keyHandler: () => void;

  constructor(scene: Phaser.Scene, data: RoundRecapData, opts: RoundRecapOptions = {}) {
    this.scene = scene;
    this.onDismiss = opts.onDismiss;
    const variant = opts.variant ?? 'parchment';
    const palette = variant === 'cosmic' ? COSM : PARCH;

    const { width: sw, height: sh } = scene.cameras.main;
    const w = opts.width ?? Math.min(sw - 220, 460);
    const h = 200 + data.stats.length * 22;

    this.container = scene.add.container(sw / 2, sh / 2).setDepth(9100);

    // Solid card body — we learned the hard way that fillGradientStyle on
    // fillRoundedRect silently flattens to an averaged grey-tan and ruins
    // text contrast. Stay solid.
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.42);
    shadow.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w, h, 6);
    this.container.add(shadow);
    this.objects.push(shadow);

    const card = scene.add.graphics();
    card.fillStyle(palette.bg, 1);
    card.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    card.fillStyle(palette.bgAlt, 1);
    card.fillRect(-w / 2 + 6, h / 2 - 10, w - 12, 4);
    card.lineStyle(3, palette.panelStroke, 1);
    card.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    card.lineStyle(1, palette.goldNum, 0.7);
    card.strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4);
    this.container.add(card);
    this.objects.push(card);

    // Title (left) + star rating (right).
    const titleY = -h / 2 + 18;
    const title = scene.add.text(-w / 2 + 20, titleY, data.title.toUpperCase(), {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: palette.accent,
    }).setOrigin(0, 0);
    this.container.add(title);
    this.objects.push(title);

    const starsText = STAR_FULL.repeat(data.stars) + STAR_EMPTY.repeat(3 - data.stars);
    const stars = scene.add.text(w / 2 - 20, titleY, starsText, {
      fontSize: '14px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: palette.gold,
    }).setOrigin(1, 0);
    this.container.add(stars);
    this.objects.push(stars);

    // Rule line under title.
    const ruleY = titleY + 22;
    const rule1 = scene.add.graphics();
    rule1.lineStyle(1, palette.rule, 0.85);
    rule1.beginPath();
    rule1.moveTo(-w / 2 + 20, ruleY);
    rule1.lineTo(w / 2 - 20, ruleY);
    rule1.strokePath();
    this.container.add(rule1);
    this.objects.push(rule1);

    // Stats — label on the left, value on the right.
    let cursorY = ruleY + 14;
    for (const stat of data.stats) {
      const labelTxt = scene.add.text(-w / 2 + 22, cursorY, stat.label, {
        fontSize: '11px',
        fontFamily: '"IBM Plex Mono", monospace',
        color: palette.inkDim,
      }).setOrigin(0, 0);
      const valueColor = stat.tint === 'algo' ? palette.algo
        : stat.tint === 'brute' ? palette.brute
        : stat.tint === 'gold' ? palette.gold
        : palette.ink;
      const valueTxt = scene.add.text(w / 2 - 22, cursorY, stat.value, {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", monospace',
        color: valueColor,
      }).setOrigin(1, 0);
      this.container.add([labelTxt, valueTxt]);
      this.objects.push(labelTxt, valueTxt);
      cursorY += 22;
    }

    // Second rule above insight.
    cursorY += 4;
    const rule2 = scene.add.graphics();
    rule2.lineStyle(1, palette.rule, 0.55);
    rule2.beginPath();
    rule2.moveTo(-w / 2 + 20, cursorY);
    rule2.lineTo(w / 2 - 20, cursorY);
    rule2.strokePath();
    this.container.add(rule2);
    this.objects.push(rule2);

    cursorY += 8;
    const insight = scene.add.text(-w / 2 + 20, cursorY, data.insight, {
      fontSize: '12px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: palette.ink,
      wordWrap: { width: w - 40, useAdvancedWrap: true },
      fontStyle: 'italic',
    }).setOrigin(0, 0);
    this.container.add(insight);
    this.objects.push(insight);

    const hint = scene.add.text(0, h / 2 - 18, 'press  SPACE  · ENTER · click  for next round', {
      fontSize: '9px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: palette.inkDim,
      fontStyle: 'italic',
    }).setOrigin(0.5, 0.5);
    this.container.add(hint);
    this.objects.push(hint);

    // Entrance: spring-in.
    this.container.setScale(0.92);
    this.tweens.push(scene.tweens.add({
      targets: this.container, scale: 1, duration: 260, ease: 'Back.easeOut',
    }));

    // Pulse the stars so they catch the eye.
    this.tweens.push(scene.tweens.add({
      targets: stars,
      scale: { from: 1, to: 1.12 },
      duration: 380,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      delay: 220,
    }));

    this.keyHandler = () => this.dismiss();
    scene.input.keyboard?.once('keydown-SPACE', this.keyHandler);
    scene.input.keyboard?.once('keydown-ENTER', this.keyHandler);

    const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setOrigin(0.5).setInteractive();
    hit.on('pointerdown', this.keyHandler);
    this.container.add(hit);
    this.objects.push(hit);

    const autoMs = opts.autoDismissMs ?? 3500;
    if (autoMs > 0) {
      this.autoTimer = scene.time.delayedCall(autoMs, this.keyHandler);
    }

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;
    this.scene.input.keyboard?.off('keydown-SPACE', this.keyHandler);
    this.scene.input.keyboard?.off('keydown-ENTER', this.keyHandler);
    if (this.autoTimer) {
      this.autoTimer.remove();
      this.autoTimer = null;
    }
    this.tweens.push(this.scene.tweens.add({
      targets: this.container,
      scale: 0.86,
      alpha: 0,
      duration: 180,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.destroy();
        this.onDismiss?.();
      },
    }));
  }

  destroy(): void {
    for (const t of this.tweens) t.stop();
    for (const o of this.objects) o.destroy();
    this.tweens.length = 0;
    this.objects.length = 0;
    if (this.autoTimer) {
      this.autoTimer.remove();
      this.autoTimer = null;
    }
    this.container.destroy();
  }
}

/** Convenience: show + await dismissal in scene flow. */
export function showRoundRecap(
  scene: Phaser.Scene,
  data: RoundRecapData,
  variant: RoundRecapVariant = 'parchment',
  autoDismissMs?: number,
): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-new
    new RoundRecap(scene, data, {
      variant,
      autoDismissMs,
      onDismiss: resolve,
    });
  });
}
