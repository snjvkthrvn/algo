/**
 * Panel — single source of truth for UI panel chrome across the game.
 * Drawn from primitives (not a stretched sprite) so borders stay 1-pixel
 * sharp regardless of size, and padding is predictable for text layout.
 */

import Phaser from 'phaser';
import { COLORS } from '../config/constants';

export interface PanelOptions {
  depth: number;
  scrollFactor?: 0 | 1;
  fill?: number;
  frame?: number;
  inner?: number;
  alpha?: number;
  shadow?: boolean;
  shadowColor?: number;
  shadowAlpha?: number;
  shadowOffset?: number;
  accent?: number;
  accentSide?: 'left' | 'top' | 'bottom';
  accentThickness?: number;
}

export const PANEL_PALETTE = {
  FILL: 0xe0f8d0,
  FRAME: 0x081820,
  INNER: 0x346856,
  ACCENT: 0x88c070,
} as const;

export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  options: PanelOptions
): Phaser.GameObjects.Graphics {
  const fill = options.fill ?? PANEL_PALETTE.FILL;
  const frame = options.frame ?? PANEL_PALETTE.FRAME;
  const sf = options.scrollFactor ?? 0;
  const alpha = options.alpha ?? 1;
  const shadowOffset = options.shadowOffset ?? 4;

  // Snap to integer pixels — non-integer offsets blur strokes on the canvas.
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.round(w);
  const ih = Math.round(h);

  const g = scene.add.graphics();

  // Hard, two-step offset drop shadow — pixel-art depth (a single soft-alpha
  // rect read as a CSS shadow). Lifts the plate off busy backdrops.
  if (options.shadow) {
    const sc = options.shadowColor ?? COLORS.PURE_BLACK;
    const sa = options.shadowAlpha ?? 0.34;
    g.fillStyle(sc, sa * 0.5);
    g.fillRect(ix + shadowOffset + 3, iy + shadowOffset + 3, iw, ih);
    g.fillStyle(sc, sa);
    g.fillRect(ix + shadowOffset, iy + shadowOffset, iw, ih);
  }

  // Body fill.
  g.fillStyle(fill, alpha);
  g.fillRect(ix, iy, iw, ih);

  // Frame border drawn as four fillRects (not strokeRect) so every edge lands
  // on exact pixels — strokeRect straddles the path and softens pixel-art UI.
  g.fillStyle(frame, alpha);
  g.fillRect(ix, iy, iw, 2);
  g.fillRect(ix, iy + ih - 2, iw, 2);
  g.fillRect(ix, iy, 2, ih);
  g.fillRect(ix + iw - 2, iy, 2, ih);

  // Inner bevel: 1px highlight on the top/left lip, 1px shade on bottom/right.
  // Reads as an embossed, crafted plate rather than a flat panel — and it's
  // fill-agnostic, so it works over every region's tint.
  g.fillStyle(0xffffff, 0.14 * alpha);
  g.fillRect(ix + 2, iy + 2, iw - 4, 1);
  g.fillRect(ix + 2, iy + 2, 1, ih - 4);
  g.fillStyle(0x000000, 0.2 * alpha);
  g.fillRect(ix + 2, iy + ih - 3, iw - 4, 1);
  g.fillRect(ix + iw - 3, iy + 2, 1, ih - 4);

  if (options.inner !== undefined) {
    // Subtle inset rule line (4 fillRect sides for crisp pixels).
    g.fillStyle(options.inner, 0.55 * alpha);
    g.fillRect(ix + 5, iy + 5, iw - 10, 1);
    g.fillRect(ix + 5, iy + ih - 6, iw - 10, 1);
    g.fillRect(ix + 5, iy + 5, 1, ih - 10);
    g.fillRect(ix + iw - 6, iy + 5, 1, ih - 10);
  }

  if (options.accent !== undefined) {
    const side = options.accentSide ?? 'left';
    const thickness = options.accentThickness ?? 4;
    g.fillStyle(options.accent, alpha);
    if (side === 'left') {
      g.fillRect(ix + 6, iy + 6, thickness, ih - 12);
    } else if (side === 'top') {
      g.fillRect(ix + 6, iy + 6, iw - 12, thickness);
    } else {
      g.fillRect(ix + 6, iy + ih - 6 - thickness, iw - 12, thickness);
    }
  }

  g.setDepth(options.depth);
  g.setScrollFactor(sf);
  return g;
}
