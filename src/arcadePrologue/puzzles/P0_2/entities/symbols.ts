/**
 * Pure drawing primitives for shard runes.
 *
 * Each symbol draws into a pre-positioned Graphics object; the caller controls
 * world position and depth. Symbols are designed to read at ~30px tall.
 */

import Phaser from 'phaser';
import type { ShardSymbol, ShardTint } from '../rounds';

export const TINT_COLOR: Record<ShardTint, number> = {
  red:    0xff5d6c,
  blue:   0x6cb2ff,
  green:  0x6cffa6,
  violet: 0xc18bff,
  amber:  0xffd76c,
};

/** Slightly desaturated outer color used for console body fills. */
export const TINT_BODY: Record<ShardTint, number> = {
  red:    0x4a1820,
  blue:   0x152a4a,
  green:  0x123420,
  violet: 0x2c184a,
  amber:  0x4a3a0c,
};

export function drawSymbol(
  g: Phaser.GameObjects.Graphics,
  symbol: ShardSymbol,
  cx: number,
  cy: number,
  size: number,
  color: number,
  alpha = 1,
): void {
  const half = size / 2;
  g.lineStyle(2.2, color, alpha);

  switch (symbol) {
    case 'peak': {
      // Two stacked triangles ▲▲ (pyramid)
      g.beginPath();
      g.moveTo(cx - half, cy + half * 0.55);
      g.lineTo(cx + half, cy + half * 0.55);
      g.moveTo(cx - half * 0.66, cy + half * 0.05);
      g.lineTo(cx + half * 0.66, cy + half * 0.05);
      g.strokePath();
      g.beginPath();
      g.moveTo(cx - half, cy + half * 0.55);
      g.lineTo(cx, cy - half * 0.85);
      g.lineTo(cx + half, cy + half * 0.55);
      g.strokePath();
      return;
    }
    case 'diamond': {
      // Diamond outline ◇
      g.beginPath();
      g.moveTo(cx, cy - half);
      g.lineTo(cx + half, cy);
      g.lineTo(cx, cy + half);
      g.lineTo(cx - half, cy);
      g.closePath();
      g.strokePath();
      // Inner echo
      g.lineStyle(1.2, color, alpha * 0.6);
      g.beginPath();
      g.moveTo(cx, cy - half * 0.5);
      g.lineTo(cx + half * 0.5, cy);
      g.lineTo(cx, cy + half * 0.5);
      g.lineTo(cx - half * 0.5, cy);
      g.closePath();
      g.strokePath();
      return;
    }
    case 'lines': {
      // Horizontal stack ☰ with notch
      g.beginPath();
      g.moveTo(cx - half, cy - half * 0.45);
      g.lineTo(cx + half, cy - half * 0.45);
      g.moveTo(cx - half, cy + half * 0.05);
      g.lineTo(cx + half, cy + half * 0.05);
      g.moveTo(cx - half, cy + half * 0.55);
      g.lineTo(cx + half, cy + half * 0.55);
      g.strokePath();
      return;
    }
    case 'star': {
      // 4-pointed compass-star
      g.beginPath();
      g.moveTo(cx, cy - half);
      g.lineTo(cx + half * 0.28, cy - half * 0.28);
      g.lineTo(cx + half, cy);
      g.lineTo(cx + half * 0.28, cy + half * 0.28);
      g.lineTo(cx, cy + half);
      g.lineTo(cx - half * 0.28, cy + half * 0.28);
      g.lineTo(cx - half, cy);
      g.lineTo(cx - half * 0.28, cy - half * 0.28);
      g.closePath();
      g.strokePath();
      return;
    }
    case 'wave': {
      // Two sine arcs (curved infinity feel)
      const steps = 12;
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = cx - half + t * size;
        const y = cy - Math.sin(t * Math.PI * 2) * half * 0.35;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = cx - half + t * size;
        const y = cy + half * 0.4 - Math.sin(t * Math.PI * 2 + Math.PI) * half * 0.25;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
      return;
    }
  }
}
