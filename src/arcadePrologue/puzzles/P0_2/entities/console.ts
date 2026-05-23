/**
 * Console entity — the slotted pillars the player drops shards into.
 *
 * Visually: a stepped pedestal + an octagonal display panel with a glowing
 * symbol etched on the front. State:
 *
 *   idle      — dim base
 *   highlight — player is in range; cyan rim pulse
 *   correct   — shard placed; full tint glow + steady halo
 *   wrong     — placed wrong shard; red flash then back to idle
 */

import Phaser from 'phaser';
import { COLORS } from '../tokens';
import type { ConsoleDef } from '../rounds';
import { TINT_COLOR, TINT_BODY, drawSymbol } from './symbols';
import { resolveConsoleSprite } from './sheetFrames';

export type ConsoleEntity = {
  def: ConsoleDef;
  container: Phaser.GameObjects.Container;
  rim: Phaser.GameObjects.Graphics;
  /** Procedural panel — only present when not using the sprite-sheet image. */
  panel: Phaser.GameObjects.Graphics | null;
  haloRing: Phaser.GameObjects.Arc;
  /** A shard has been correctly placed into this console. */
  filled: boolean;
  setHighlighted(on: boolean): void;
  flashCorrect(scene: Phaser.Scene): void;
  flashWrong(scene: Phaser.Scene): void;
  destroy(): void;
};

const W = 88;
const H = 104;
const PANEL_H = 64; // tall octagonal display
const BASE_H = 28; // stepped pedestal at the bottom

// v2 sprite fills more of its 256x320 cell than v1 did, so 160w looked
// chunky and dwarfed the player. 135w / 170h matches the reference's
// console-to-player proportion (player is roughly 60% the height of a
// console at these values).
const SPRITE_DISPLAY_W = 135;
const SPRITE_DISPLAY_H = 170;

export function createConsole(scene: Phaser.Scene, def: ConsoleDef): ConsoleEntity {
  const container = scene.add.container(def.pose.x, def.pose.y).setDepth(20);

  // Decide: sprite sheet or procedural?
  const sprite = resolveConsoleSprite(def.tint, def.symbol);
  const useSprite =
    sprite !== null && scene.textures.exists(sprite.textureKey);

  // Soft ground shadow under the pedestal
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.55);
  shadow.fillEllipse(
    0,
    useSprite ? SPRITE_DISPLAY_H / 2 - 12 : H / 2 - 2,
    useSprite ? SPRITE_DISPLAY_W - 24 : W + 16,
    14,
  );
  container.add(shadow);

  // ── Body: either the generated sprite frame, or procedural pedestal+panel ─
  let panel: Phaser.GameObjects.Graphics | null = null;
  let spriteBody: Phaser.GameObjects.Image | null = null;
  if (useSprite && sprite) {
    spriteBody = scene.add
      .image(0, 0, sprite.textureKey, sprite.frame)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(SPRITE_DISPLAY_W, SPRITE_DISPLAY_H);
    // Make sure pixel art stays crisp
    if (spriteBody.texture) spriteBody.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(spriteBody);
  } else {
    const pedestal = scene.add.graphics();
    paintPedestal(pedestal);
    container.add(pedestal);

    panel = scene.add.graphics();
    paintPanel(panel, def, false);
    container.add(panel);
  }

  // ── Highlight rim (drawn separately so we can toggle alpha cheaply) ───────
  const rim = scene.add.graphics();
  paintRim(rim, def, 0, useSprite);
  container.add(rim);

  // ── Halo behind the console for "filled" state ────────────────────────────
  const haloY = useSprite ? -SPRITE_DISPLAY_H / 4 : -PANEL_H / 2 - 8;
  const haloRing = scene.add
    .circle(0, haloY, useSprite ? 64 : 48, TINT_COLOR[def.tint], 0)
    .setStrokeStyle(2, TINT_COLOR[def.tint], 0)
    .setBlendMode(Phaser.BlendModes.ADD);
  container.add(haloRing);
  // Restack so halo sits behind the body
  container.sendToBack(haloRing);
  container.sendToBack(shadow);

  let filled = false;
  let highlightOn = false;
  let proximityTween: Phaser.Tweens.Tween | null = null;

  function setHighlighted(on: boolean): void {
    if (on === highlightOn) return;
    highlightOn = on;
    paintRim(rim, def, on && !filled ? 1 : 0, useSprite);
    // Proximity pulse on the halo: when the player is nearby (highlight = on),
    // the halo gently pulses in the console's tint color, signaling
    // "this is the slot you can drop something into" without using text.
    proximityTween?.stop();
    if (on && !filled) {
      haloRing.setStrokeStyle(2, TINT_COLOR[def.tint], 0.4);
      haloRing.setFillStyle(TINT_COLOR[def.tint], 0.06);
      proximityTween = scene.tweens.add({
        targets: haloRing,
        scale: 1.12,
        alpha: { from: 0.55, to: 0.9 },
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (!filled) {
      haloRing.setScale(1).setAlpha(1);
      haloRing.setStrokeStyle(2, TINT_COLOR[def.tint], 0);
      haloRing.setFillStyle(TINT_COLOR[def.tint], 0);
    }
  }

  function flashCorrect(s: Phaser.Scene): void {
    filled = true;
    if (panel) paintPanel(panel, def, true);
    // For sprite version, give it a brief brighten via clearTint scale pop
    // Quick pop + halo bloom
    s.tweens.add({
      targets: container,
      scale: { from: 1, to: 1.07 },
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    haloRing.setStrokeStyle(2, TINT_COLOR[def.tint], 0.7);
    haloRing.setFillStyle(TINT_COLOR[def.tint], 0.18);
    s.tweens.add({
      targets: haloRing,
      scale: { from: 0.6, to: 1.4 },
      alpha: { from: 0.9, to: 0 },
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        haloRing.setScale(1).setAlpha(1);
        haloRing.setStrokeStyle(2, TINT_COLOR[def.tint], 0.45);
        haloRing.setFillStyle(TINT_COLOR[def.tint], 0.08);
      },
    });
  }

  function flashWrong(s: Phaser.Scene): void {
    const flash = scene.add.graphics();
    flash.fillStyle(0xff3a4a, 0.55);
    flash.fillCircle(0, haloY, 56);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    container.add(flash);
    s.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
    // Shake
    const baseX = container.x;
    s.tweens.add({
      targets: container,
      x: { from: baseX - 3, to: baseX + 3 },
      duration: 60,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => container.setX(baseX),
    });
  }

  function destroy(): void {
    container.destroy();
  }

  return {
    def,
    container,
    rim,
    panel,
    haloRing,
    get filled() {
      return filled;
    },
    setHighlighted,
    flashCorrect,
    flashWrong,
    destroy,
  };
}

// ── Painters ────────────────────────────────────────────────────────────────

function paintPedestal(g: Phaser.GameObjects.Graphics): void {
  const halfW = W / 2;
  const baseTop = H / 2 - BASE_H;
  const baseBottom = H / 2;

  // Outer trapezoid base
  g.fillStyle(0x0a1428, 1);
  g.beginPath();
  g.moveTo(-halfW, baseBottom);
  g.lineTo(halfW, baseBottom);
  g.lineTo(halfW - 8, baseTop);
  g.lineTo(-halfW + 8, baseTop);
  g.closePath();
  g.fillPath();

  // Inner step (lighter)
  g.fillStyle(0x14264a, 1);
  g.beginPath();
  g.moveTo(-halfW + 10, baseBottom - 6);
  g.lineTo(halfW - 10, baseBottom - 6);
  g.lineTo(halfW - 14, baseTop + 2);
  g.lineTo(-halfW + 14, baseTop + 2);
  g.closePath();
  g.fillPath();

  // Hairline edges
  g.lineStyle(1, 0x2a4878, 0.9);
  g.beginPath();
  g.moveTo(-halfW + 8, baseTop);
  g.lineTo(halfW - 8, baseTop);
  g.strokePath();
}

function paintPanel(
  g: Phaser.GameObjects.Graphics,
  def: ConsoleDef,
  lit: boolean,
): void {
  g.clear();

  const cx = 0;
  const cy = -PANEL_H / 2 - 8;
  const w = W - 16;
  const h = PANEL_H;
  const inset = 14;

  const tintEdge = TINT_COLOR[def.tint];
  const tintFill = TINT_BODY[def.tint];

  // Outer octagon — fill darker, fully opaque
  g.fillStyle(tintFill, lit ? 1 : 0.92);
  octagon(g, cx, cy, w, h, inset, true, false);

  // Inner cap (darker)
  g.fillStyle(0x06101e, lit ? 0.55 : 0.7);
  octagon(g, cx, cy, w - 14, h - 14, inset - 4, true, false);

  // Edge stroke — strong tint when lit
  g.lineStyle(2, tintEdge, lit ? 1 : 0.85);
  octagon(g, cx, cy, w, h, inset, false, true);

  // Inner stroke (thinner echo)
  g.lineStyle(1, tintEdge, lit ? 0.7 : 0.4);
  octagon(g, cx, cy, w - 14, h - 14, inset - 4, false, true);

  // Symbol etched on the panel
  drawSymbol(g, def.symbol, cx, cy, 32, tintEdge, lit ? 1 : 0.92);

  // When lit, splash a subtle inner bloom
  if (lit) {
    g.fillStyle(tintEdge, 0.18);
    g.fillEllipse(cx, cy + 4, w - 32, h - 32);
  }
}

function paintRim(
  g: Phaser.GameObjects.Graphics,
  _def: ConsoleDef,
  alpha: number,
  useSprite = false,
): void {
  g.clear();
  if (alpha <= 0) return;
  // For sprite-based consoles, draw a soft elliptical highlight that wraps
  // around the whole pillar instead of the precise procedural octagon.
  if (useSprite) {
    g.lineStyle(3, COLORS.accent, 0.95 * alpha);
    g.strokeEllipse(0, -10, SPRITE_DISPLAY_W * 0.85, SPRITE_DISPLAY_H * 0.95);
    g.lineStyle(1.2, COLORS.accent, 0.5 * alpha);
    g.strokeEllipse(0, -10, SPRITE_DISPLAY_W * 0.92, SPRITE_DISPLAY_H * 1.02);
    return;
  }
  const cx = 0;
  const cy = -PANEL_H / 2 - 8;
  const w = W - 16;
  const h = PANEL_H;
  const inset = 14;
  // Cyan outline pulse — interactive state cue
  g.lineStyle(3, COLORS.accent, 0.95 * alpha);
  octagon(g, cx, cy, w + 6, h + 6, inset + 1, false, true);
}

// Octagon path: stop -> upper-right -> right -> lower-right -> bottom ...
function octagon(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  inset: number,
  fill: boolean,
  stroke: boolean,
): void {
  const hw = w / 2;
  const hh = h / 2;
  g.beginPath();
  g.moveTo(cx - hw + inset, cy - hh);
  g.lineTo(cx + hw - inset, cy - hh);
  g.lineTo(cx + hw, cy - hh + inset);
  g.lineTo(cx + hw, cy + hh - inset);
  g.lineTo(cx + hw - inset, cy + hh);
  g.lineTo(cx - hw + inset, cy + hh);
  g.lineTo(cx - hw, cy + hh - inset);
  g.lineTo(cx - hw, cy - hh + inset);
  g.closePath();
  if (fill) g.fillPath();
  if (stroke) g.strokePath();
}
