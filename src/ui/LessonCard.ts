/**
 * LessonCard — the between-rounds "WHY this round exists" overlay.
 *
 * Each region puzzle now ships a 4-round difficulty curve, and each round
 * carries a `RoundLesson` block (title, bullets, optional complexity
 * comparison). Before the round starts, the scene shows a LessonCard that
 * surfaces *why* this round matters algorithmically — turning the puzzle
 * from a reflex test into a genuine teaching arc.
 *
 * The card is dismissable (SPACE / ENTER / click) and auto-dismisses after a
 * generous read window. It owns its own input handling and removes itself
 * cleanly when closed.
 *
 * Variants:
 *   parchment — warm tan card with barn-red accents, used by Array Plains
 *               and Twin Rivers puzzles.
 *   cosmic    — deep purple/cyan card used by Prologue puzzles.
 */

import Phaser from 'phaser';
import { VISUAL_REVAMP_KEYS } from '../config/assets';

export type LessonCardVariant = 'parchment' | 'cosmic' | 'riverside';

/**
 * Round-7 art-pass: the light parchment/riverside cards read as a second,
 * competing UI language stacked on the dark navy/cyan puzzle chrome — the
 * "kid put it together" tell. Each region now renders its lesson card as a
 * DIEGETIC in-world prop instead of a flat panel:
 *   parchment → a weathered WOODEN BARN SIGN   (Array Plains)
 *   riverside → a carved RIVER-STONE TABLET    (Twin Rivers)
 * Both are 512x320 pixel-art textures with a uniform 48px frame, drawn as a
 * Phaser 9-slice so they scale to any card height with crisp corner hardware.
 * 'cosmic' (Prologue) stays procedural — its dark center already coheres with
 * the cosmic chrome and Gemini never flagged it.
 */
const FRAME_INSET = 48;
const VARIANT_FRAME: Record<LessonCardVariant, string | null> = {
  parchment: VISUAL_REVAMP_KEYS.LESSON_CARD_AP,
  riverside: VISUAL_REVAMP_KEYS.LESSON_CARD_TR,
  cosmic: null,
};

/**
 * Manual 9-slice from nine plain Images. Phaser's built-in NineSlice GameObject
 * is WebGL-only (there is no NineSliceCanvasRenderer), so it renders nothing
 * under the Canvas2D renderer — which is what the Playwright harness forces and
 * what some browsers fall back to. Plain Images have a Canvas renderer, so this
 * draws identically everywhere while keeping the corner hardware undistorted:
 * only the edges (1 axis) and the center (both axes) stretch.
 *
 * Returns the nine Images positioned around the container origin (0,0) so the
 * caller can add them to the card container and track them for cleanup.
 */
function buildNineSlice(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  inset: number,
): Phaser.GameObjects.Image[] {
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage() as { width: number; height: number };
  const texW = src.width;
  const texH = src.height;
  if (!tex.has('ns_tl')) {
    const tcw = texW - 2 * inset;
    const tch = texH - 2 * inset;
    tex.add('ns_tl', 0, 0, 0, inset, inset);
    tex.add('ns_tm', 0, inset, 0, tcw, inset);
    tex.add('ns_tr', 0, texW - inset, 0, inset, inset);
    tex.add('ns_ml', 0, 0, inset, inset, tch);
    tex.add('ns_mm', 0, inset, inset, tcw, tch);
    tex.add('ns_mr', 0, texW - inset, inset, inset, tch);
    tex.add('ns_bl', 0, 0, texH - inset, inset, inset);
    tex.add('ns_bm', 0, inset, texH - inset, tcw, inset);
    tex.add('ns_br', 0, texW - inset, texH - inset, inset, inset);
  }
  const L = inset;
  const cw = w - 2 * L;
  const ch = h - 2 * L;
  const x0 = -w / 2;
  const y0 = -h / 2;
  const xr = w / 2 - L;
  const yb = h / 2 - L;
  const mk = (frame: string, x: number, y: number, dw: number, dh: number) =>
    scene.add.image(x, y, key, frame).setOrigin(0, 0).setDisplaySize(dw, dh);
  return [
    mk('ns_tl', x0, y0, L, L),
    mk('ns_tm', x0 + L, y0, cw, L),
    mk('ns_tr', xr, y0, L, L),
    mk('ns_ml', x0, y0 + L, L, ch),
    mk('ns_mm', x0 + L, y0 + L, cw, ch),
    mk('ns_mr', xr, y0 + L, L, ch),
    mk('ns_bl', x0, yb, L, L),
    mk('ns_bm', x0 + L, yb, cw, L),
    mk('ns_br', xr, yb, L, L),
  ];
}

export interface LessonCardData {
  readonly title: string;
  readonly subtitle?: string;
  readonly bullets: ReadonlyArray<string>;
  readonly comparison?: string;
}

export interface LessonCardOptions {
  readonly variant?: LessonCardVariant;
  readonly width?: number;
  readonly height?: number;
  /** Auto-dismiss after this many ms. Set to 0 to require an explicit dismiss. */
  readonly autoDismissMs?: number;
  readonly onDismiss?: () => void;
}

const COLORS_PARCH = {
  bg: 0xf0e4c2,
  bgAlt: 0xd8c890,
  ink: 0x1a1208,
  inkDim: 0x4a3818,
  accent: 0xa03830,
  accentAlt: 0x5a3a1a,
  rule: 0xa06832,
  gold: 0xf5b820,
};
const COLORS_COSMIC = {
  bg: 0x0d0a2a,
  bgAlt: 0x06061a,
  ink: 0xe0f8d0,
  inkDim: 0xa7b8d9,
  accent: 0xa78bfa,
  accentAlt: 0x22d3ee,
  rule: 0x22d3ee,
  gold: 0xf5b820,
};
// Round-4 art-pass: 'riverside' variant for Twin Rivers puzzles. The prior
// 'parchment' tan+crimson card felt like 4 different design languages on
// screen when overlaid on the painted river backdrop (cool blue water +
// stone-grey banks). The palette here is anchored on stone + flowing-cyan
// pulled from twin_rivers_grounded_v1.png — reads as "weathered river-stone
// notice board" rather than rustic-farm parchment.
const COLORS_RIVERSIDE = {
  bg: 0xd6e1e8,
  bgAlt: 0xa3b4c0,
  ink: 0x132028,
  inkDim: 0x355168,
  accent: 0x22d3ee,
  accentAlt: 0x355168,
  rule: 0x5a8eb0,
  gold: 0xf5b820,
};

export class LessonCard {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private autoTimer: Phaser.Time.TimerEvent | null = null;
  private readonly onDismiss?: () => void;
  private dismissed = false;
  private readonly keyHandler: () => void;
  /** Dim overlay — lives outside the card container so it can't bleed onto card text. */
  private readonly dim: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, data: LessonCardData, opts: LessonCardOptions = {}) {
    this.scene = scene;
    this.onDismiss = opts.onDismiss;
    const variant = opts.variant ?? 'parchment';
    const palette =
      variant === 'cosmic'    ? COLORS_COSMIC :
      variant === 'riverside' ? COLORS_RIVERSIDE :
      COLORS_PARCH;

    // Resolve the diegetic frame texture. Fall back to the procedural card if a
    // scene didn't preload it (or for cosmic, which has no frame texture).
    const frameKey = VARIANT_FRAME[variant];
    const textured = frameKey != null && scene.textures.exists(frameKey);
    // The river-stone tablet face is dark slate, so its text must be light —
    // but only when the texture is actually present. If we fell back to the
    // light procedural riverside card, text stays dark.
    const riversideDark = variant === 'riverside' && textured;

    const cssAccent =
      variant === 'cosmic'    ? '#a78bfa' :
      riversideDark           ? '#5fe8ff' :
      variant === 'riverside' ? '#22d3ee' :
      '#a03830';
    const cssInk =
      variant === 'cosmic'    ? '#e0f8d0' :
      riversideDark           ? '#eaf6fb' :
      variant === 'riverside' ? '#132028' :
      '#1a1208';
    const cssDim =
      variant === 'cosmic'    ? '#a7b8d9' :
      riversideDark           ? '#9fc4d4' :
      variant === 'riverside' ? '#355168' :
      '#4a3818';
    const cssGold = '#f5b820';

    // Overlay tones (divider rule + comparison pill) read on the card face. On
    // the dark stone tablet they flip to light-on-dark; otherwise they track
    // the palette (light parchment / cosmic).
    const dividerColor = riversideDark ? 0x4f8398 : palette.rule;
    const dividerAlpha = riversideDark ? 0.95 : 0.85;
    const pillFill = riversideDark ? 0x10303d : palette.bgAlt;
    const pillStroke = riversideDark ? 0x22d3ee : palette.accent;
    const pillTextCss = riversideDark ? '#cff6ff' : cssGold;

    const { width: sw, height: sh } = scene.cameras.main;
    const w = opts.width ?? Math.min(sw - 200, 560);
    const minH = 220;
    // Estimate height — bullet count + comparison + heading.
    const bulletLineH = 22;
    const estimatedH = 110 + data.bullets.length * bulletLineH + (data.comparison ? 36 : 0);
    const h = Math.max(opts.height ?? estimatedH, minH);

    // Scene-level dim overlay at a depth strictly below the card container.
    // Putting the dim INSIDE the container made some platforms render the
    // rectangle's alpha on top of the card body's text — keep it separate.
    //
    // Audit fix (Phase 18): dim alpha reduced from 0.55 to 0.30 so the
    // round-intro card doesn't entirely black out the play area behind it.
    // Players can now see what they're about to interact with (puzzle
    // tiles, pointers, etc.) while still reading the intro card clearly.
    // The card body has its own dark stroke + shadow so it stays legible
    // against the partially-visible scene underneath.
    this.dim = scene.add.rectangle(0, 0, sw, sh, 0x000000, 0.30)
      .setOrigin(0, 0)
      .setDepth(8999)
      .setInteractive();
    this.objects.push(this.dim);

    this.container = scene.add.container(sw / 2, sh / 2).setDepth(9000);

    // Card body. Round-7 art-pass: when a diegetic frame texture is available,
    // render the card as a 9-sliced in-world prop (wood barn sign / stone
    // tablet). Otherwise fall back to the procedural carved-panel (cosmic, or
    // any scene that didn't preload the texture).
    // A drop shadow is shared by both paths — it lifts the prop off the
    // partially-visible backdrop so the card never looks pasted flat.
    // Round-8: a SINGLE hard-edged, square, tight offset shadow (no rounded
    // corners, no multi-step alpha) — a stepped/translucent shadow read as a
    // soft CSS gradient under the crisp pixel art.
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x05070a, 0.42);
    shadow.fillRect(-w / 2 + 5, -h / 2 + 6, w, h);
    this.container.add(shadow);
    this.objects.push(shadow);

    if (textured) {
      // Manual 9-slice (Canvas2D-safe) keeps the corner hardware (iron brackets
      // / crystal chips) crisp at any card height; edges + flat center stretch.
      const frameImgs = buildNineSlice(scene, frameKey as string, w, h, FRAME_INSET);
      this.container.add(frameImgs);
      this.objects.push(...frameImgs);
    } else {
      const card = scene.add.graphics();
      // Phaser's fillGradientStyle only takes effect on triangles — applied to
      // fillRoundedRect it collapses to an averaged solid colour that washed out
      // the card body in earlier passes. Use a solid bright fill, then draw a
      // narrow darker strip along the bottom edge so the panel still reads as
      // dimensional rather than flat.
      card.fillStyle(palette.bg, 1);
      card.fillRoundedRect(-w / 2, -h / 2, w, h, 2);
      // Bottom shade strip — dimensional base.
      card.fillStyle(palette.bgAlt, 1);
      card.fillRect(-w / 2 + 5, h / 2 - 12, w - 10, 6);
      // Top catch-light — 2px embossed highlight = carved pixel-art, not a flat
      // panel. White-at-low-alpha works across all three palettes.
      card.fillStyle(0xffffff, 0.22);
      card.fillRect(-w / 2 + 5, -h / 2 + 4, w - 10, 2);
      card.lineStyle(3, palette.ink, 1);
      card.strokeRoundedRect(-w / 2, -h / 2, w, h, 2);
      card.lineStyle(1, palette.gold, 0.65);
      card.strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 1);
      this.container.add(card);
      this.objects.push(card);
    }

    // Top accent strip — sub-title eyebrow.
    if (data.subtitle) {
      const eyebrow = scene.add.text(-w / 2 + 20, -h / 2 + 14, data.subtitle.toUpperCase(), {
        fontSize: '9px',
        fontFamily: '"Press Start 2P", monospace',
        color: cssAccent,
      }).setOrigin(0, 0);
      this.container.add(eyebrow);
      this.objects.push(eyebrow);
    }

    // Title.
    const titleY = data.subtitle ? -h / 2 + 36 : -h / 2 + 20;
    const title = scene.add.text(-w / 2 + 20, titleY, data.title, {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: cssInk,
    }).setOrigin(0, 0);
    this.container.add(title);
    this.objects.push(title);

    // Divider.
    const dividerY = titleY + 30;
    const divider = scene.add.graphics();
    divider.lineStyle(1, dividerColor, dividerAlpha);
    divider.beginPath();
    divider.moveTo(-w / 2 + 20, dividerY);
    divider.lineTo(w / 2 - 20, dividerY);
    divider.strokePath();
    this.container.add(divider);
    this.objects.push(divider);

    // Bullets.
    let cursorY = dividerY + 14;
    for (const bullet of data.bullets) {
      const dot = scene.add.text(-w / 2 + 20, cursorY, '⦿', {
        fontSize: '12px',
        fontFamily: '"IBM Plex Mono", monospace',
        color: cssAccent,
      }).setOrigin(0, 0);
      const txt = scene.add.text(-w / 2 + 42, cursorY, bullet, {
        fontSize: '13px',
        fontFamily: '"IBM Plex Mono", monospace',
        color: cssInk,
        wordWrap: { width: w - 80, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      this.container.add([dot, txt]);
      this.objects.push(dot, txt);
      cursorY += Math.max(bulletLineH, txt.height + 4);
    }

    // Comparison line (optional) — pill displaying the O-notation contrast.
    if (data.comparison) {
      cursorY += 6;
      const pillW = w - 40;
      const pillH = 28;
      const pill = scene.add.graphics();
      pill.fillStyle(pillFill, 1);
      pill.fillRoundedRect(-pillW / 2, cursorY, pillW, pillH, 2);
      pill.lineStyle(1, pillStroke, 0.85);
      pill.strokeRoundedRect(-pillW / 2, cursorY, pillW, pillH, 2);
      const cmp = scene.add.text(0, cursorY + pillH / 2, data.comparison, {
        fontSize: '11px',
        fontFamily: '"Press Start 2P", monospace',
        color: pillTextCss,
      }).setOrigin(0.5, 0.5);
      this.container.add([pill, cmp]);
      this.objects.push(pill, cmp);
      cursorY += pillH + 6;
    }

    // Dismiss hint at the bottom.
    const hint = scene.add.text(0, h / 2 - 18, 'press  SPACE  · ENTER · click  to continue', {
      fontSize: '10px',
      fontFamily: '"IBM Plex Mono", monospace',
      color: cssDim,
      fontStyle: 'italic',
    }).setOrigin(0.5, 0.5);
    this.container.add(hint);
    this.objects.push(hint);

    // Spring-in animation. We deliberately *do not* animate the card's alpha
    // here — Playwright (and slow first paints) sometimes capture frames
    // mid-tween, which made the card look ghostly. Only the scale springs.
    // The dim fades in by itself so it doesn't slam onto the scene.
    this.container.setScale(0.92);
    this.dim.setAlpha(0);
    this.tweens.push(scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
    }));
    this.tweens.push(scene.tweens.add({
      targets: this.dim,
      alpha: 0.55,
      duration: 220,
      ease: 'Power2.easeOut',
    }));

    // Input handling — keys + click on dim.
    this.keyHandler = () => this.dismiss();
    scene.input.keyboard?.once('keydown-SPACE', this.keyHandler);
    scene.input.keyboard?.once('keydown-ENTER', this.keyHandler);
    this.dim.on('pointerdown', this.keyHandler);
    // The card itself dismisses on click — but interactive zones aren't
    // automatic for graphics-only objects, so we add a transparent hit-rect.
    const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setOrigin(0.5).setInteractive();
    hit.on('pointerdown', this.keyHandler);
    this.container.add(hit);
    this.objects.push(hit);

    const autoMs = opts.autoDismissMs ?? 8000;
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
    // Dismiss: scale down to 0 alongside a fade on the *whole container*,
    // and fade out the dim in parallel. Both finish quickly so the underlying
    // puzzle becomes available again without delay.
    this.tweens.push(this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.86,
      duration: 180,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.destroy();
        this.onDismiss?.();
      },
    }));
    this.tweens.push(this.scene.tweens.add({
      targets: this.dim,
      alpha: 0,
      duration: 180,
      ease: 'Power2.easeIn',
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

/**
 * Convenience: show a LessonCard for a round and resolve when dismissed.
 * Scenes can `await showLessonCard(this, lesson, 'parchment')` between rounds.
 */
export function showLessonCard(
  scene: Phaser.Scene,
  data: LessonCardData,
  variant: LessonCardVariant = 'parchment',
  autoDismissMs?: number,
): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-new
    new LessonCard(scene, data, {
      variant,
      autoDismissMs,
      onDismiss: resolve,
    });
  });
}
