/**
 * GlitchCorner — a small "the brute-force / glitch approach" callout shown
 * in every region puzzle.
 *
 * The design canvas places this in the Bit panel, providing a foil: while Bit
 * teaches the elegant algorithm, the Glitch corner shows what the naive
 * approach looks like (and quietly explains why it's worse).
 *
 * Two visual variants are paired with the region themes:
 *
 *   - prologue (cosmic)   — purple-dashed border, dim purple body text.
 *   - parchment (farm/tr) — barn-red dashed border on a warm tan body.
 *
 * The widget is a self-contained container; cleanup goes through the scene's
 * SHUTDOWN handler.
 */

import Phaser from 'phaser';
import { drawPanel } from './panel';

export type GlitchCornerVariant = 'cosmic' | 'parchment' | 'riverside';

export interface GlitchCornerOptions {
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly variant: GlitchCornerVariant;
  /** Small caps heading; e.g. "GLITCH NEARBY" or "GLITCH'S APPROACH". */
  readonly heading: string;
  /** Body quote or comparison text. */
  readonly body: string;
  readonly depth?: number;
}

const PURPLE = 0xa78bfa;
const BARN_RED = 0xa03830;
const PARCH = 0xf0e4c2;
// Round-4 art-pass: riverside palette pulled from twin_rivers_grounded_v1.png
// (cool stone-grey + cyan accents) so the Glitch corner reads as a stone
// notice-board in the river setting rather than a tan farm parchment.
const RIVER_STONE = 0xd6e1e8;
const RIVER_CYAN = 0x22d3ee;
const RIVER_DEEP_INK = 0x132028;

export class GlitchCorner {
  readonly container: Phaser.GameObjects.Container;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, opts: GlitchCornerOptions) {
    const w = opts.width ?? 180;
    const h = opts.height ?? 68;
    this.container = scene.add.container(opts.x, opts.y).setDepth(opts.depth ?? 50);

    const isCosmic = opts.variant === 'cosmic';
    const isRiverside = opts.variant === 'riverside';
    const headingColor = isCosmic ? '#a78bfa' : isRiverside ? '#22d3ee' : '#a03830';
    const bodyColor = isCosmic ? '#a7b8d9' : isRiverside ? '#132028' : '#1a1208';
    const fill = isCosmic ? 0x1a0a2a : isRiverside ? RIVER_STONE : PARCH;
    const fillAlpha = isCosmic ? 0.45 : isRiverside ? 0.90 : 0.92;
    const stroke = isCosmic ? PURPLE : isRiverside ? RIVER_CYAN : BARN_RED;
    // Reference RIVER_DEEP_INK so the constant export stays linked even though
    // current variants don't pick it directly (reserved for future depth-band).
    void RIVER_DEEP_INK;

    // Backing panel: dashed border drawn manually with a graphics object.
    const panel = scene.add.graphics();
    panel.fillStyle(fill, fillAlpha);
    panel.fillRoundedRect(-w / 2, -h / 2, w, h, 2);
    // Dashed border.
    panel.lineStyle(1, stroke, 0.85);
    this.drawDashedRect(panel, -w / 2, -h / 2, w, h, 4, 3);
    this.container.add(panel);
    this.objects.push(panel);

    // Heading.
    const heading = scene.add.text(
      -w / 2 + 8, -h / 2 + 6,
      `⚠ ${opts.heading.toUpperCase()}`,
      {
        fontSize: '7px',
        fontFamily: '"Press Start 2P", monospace',
        color: headingColor,
        letterSpacing: 1.5,
      },
    ).setOrigin(0, 0);
    this.container.add(heading);
    this.objects.push(heading);

    // Body.
    const body = scene.add.text(
      -w / 2 + 8, -h / 2 + 22,
      opts.body,
      {
        fontSize: '10px',
        fontFamily: '"IBM Plex Mono", monospace',
        color: bodyColor,
        wordWrap: { width: w - 18, useAdvancedWrap: true },
        fontStyle: 'italic',
      },
    ).setOrigin(0, 0);
    this.container.add(body);
    this.objects.push(body);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
    this.container.destroy();
  }

  private drawDashedRect(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    dash: number, gap: number,
  ): void {
    const step = dash + gap;
    // Top.
    for (let cx = x; cx < x + w; cx += step) {
      g.beginPath();
      g.moveTo(cx, y);
      g.lineTo(Math.min(cx + dash, x + w), y);
      g.strokePath();
    }
    // Bottom.
    for (let cx = x; cx < x + w; cx += step) {
      g.beginPath();
      g.moveTo(cx, y + h);
      g.lineTo(Math.min(cx + dash, x + w), y + h);
      g.strokePath();
    }
    // Left.
    for (let cy = y; cy < y + h; cy += step) {
      g.beginPath();
      g.moveTo(x, cy);
      g.lineTo(x, Math.min(cy + dash, y + h));
      g.strokePath();
    }
    // Right.
    for (let cy = y; cy < y + h; cy += step) {
      g.beginPath();
      g.moveTo(x + w, cy);
      g.lineTo(x + w, Math.min(cy + dash, y + h));
      g.strokePath();
    }
  }
}

/**
 * Convenience builder for the most common pattern in the design: a Glitch
 * corner placed bottom-left of the puzzle frame.
 */
export function placeGlitchCorner(
  scene: Phaser.Scene,
  variant: GlitchCornerVariant,
  heading: string,
  body: string,
): GlitchCorner {
  const { height } = scene.cameras.main;
  return new GlitchCorner(scene, {
    x: 56 + 90,
    y: height - 88,
    width: 180,
    height: 68,
    variant,
    heading,
    body,
    depth: 40,
  });
}

/** Re-export drawPanel so consumers can also build their own variants. */
export { drawPanel };
