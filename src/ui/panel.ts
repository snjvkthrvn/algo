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
  if (options.shadow) {
    g.fillStyle(options.shadowColor ?? COLORS.PURE_BLACK, options.shadowAlpha ?? 0.34);
    g.fillRect(ix + shadowOffset, iy + shadowOffset, iw, ih);
  }

  g.fillStyle(fill, alpha);
  g.fillRect(ix, iy, iw, ih);
  g.lineStyle(2, frame, alpha);
  g.strokeRect(ix, iy, iw, ih);

  if (options.inner !== undefined) {
    g.lineStyle(1, options.inner, alpha);
    g.strokeRect(ix + 4, iy + 4, iw - 8, ih - 8);
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
