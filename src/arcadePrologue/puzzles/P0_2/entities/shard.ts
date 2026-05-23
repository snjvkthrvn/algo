/**
 * Shard entity — the carryable, glowing crystal.
 *
 * The shard exists in one of three positions at any time:
 *   1. resting   — sitting on its pedestal (initial state)
 *   2. held      — floating beside the player (follow target = player sprite)
 *   3. placed    — locked into a console (terminal state)
 *
 * The visual is a stylized crystal (elongated hexagon) with a glow halo and
 * the matching shard symbol etched on the front.
 */

import Phaser from 'phaser';
import { COLORS } from '../tokens';
import type { ShardDef } from '../rounds';
import { TINT_COLOR, drawSymbol } from './symbols';
import { resolveShardSprite } from './sheetFrames';

export type ShardEntity = {
  def: ShardDef;
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  pedestal: Phaser.GameObjects.Graphics;
  state: 'resting' | 'held' | 'placed';
  setHighlighted(on: boolean): void;
  lift(scene: Phaser.Scene): void;
  followPlayer(targetX: number, targetY: number): void;
  drop(scene: Phaser.Scene, atX: number, atY: number): void;
  placeInto(scene: Phaser.Scene, atX: number, atY: number): void;
  destroy(): void;
};

const W = 32;
const H = 48;
// v2 sprite cells are 128x192 and contain JUST the crystal — no baked plinth.
// Display at 60x90 so the crystal is clearly visible without dominating the
// scene; the procedural floor disc beneath provides the "this is on the
// ground" anchor.
const SPRITE_DISPLAY_W = 60;
const SPRITE_DISPLAY_H = 90;

export function createShard(scene: Phaser.Scene, def: ShardDef): ShardEntity {
  // Stand-alone pedestal underneath (small square plinth)
  const pedestal = scene.add.graphics().setDepth(15);
  paintPedestal(pedestal, def.pose.x, def.pose.y + 22);

  const container = scene.add.container(def.pose.x, def.pose.y).setDepth(40);

  // Decide: sprite frame or procedural?
  const sprite = resolveShardSprite(def.tint, def.symbol);
  const useSprite =
    sprite !== null && scene.textures.exists(sprite.textureKey);

  // Glow halo (behind body)
  const glow = scene.add
    .circle(0, 0, useSprite ? 30 : 22, TINT_COLOR[def.tint], 0.35)
    .setBlendMode(Phaser.BlendModes.ADD);
  container.add(glow);

  // Crystal body: image (cropped to crystal portion only) OR procedural
  let body: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
  if (useSprite && sprite) {
    // v2 sprite is just the crystal — center it on the container with origin
    // (0.5, 1) so the BOTTOM tip of the crystal sits ~6px above the container
    // y (which is at floor level), giving the impression of a hovering shard.
    const img = scene.add
      .image(0, -6, sprite.textureKey, sprite.frame)
      .setOrigin(0.5, 1)
      .setDisplaySize(SPRITE_DISPLAY_W, SPRITE_DISPLAY_H);
    if (img.texture) img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    body = img;
  } else {
    const g = scene.add.graphics();
    paintCrystal(g, def);
    body = g;
  }
  container.add(body);

  // Cyan highlight rim (drawn separately for cheap toggling)
  const rim = scene.add.graphics();
  paintRim(rim, 0, useSprite);
  container.add(rim);

  // Subtle bob tween — runs forever while resting
  const bob = scene.tweens.add({
    targets: container,
    y: def.pose.y - 4,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  let state: 'resting' | 'held' | 'placed' = 'resting';
  let highlightOn = false;

  function setHighlighted(on: boolean): void {
    if (state !== 'resting') return;
    if (on === highlightOn) return;
    highlightOn = on;
    paintRim(rim, on ? 1 : 0, useSprite);
    glow.setFillStyle(TINT_COLOR[def.tint], on ? 0.55 : 0.35);
  }

  function lift(s: Phaser.Scene): void {
    state = 'held';
    bob.stop();
    // Sharp lift + spark
    s.tweens.add({
      targets: container,
      scale: { from: 1, to: 1.15 },
      duration: 140,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    paintRim(rim, 1, useSprite);
    pedestal.setAlpha(0.45);
    // Desaturate while held — the held shard glow at full saturation reads as
    // "already done" when carried near its matching console. Dimming by ~25%
    // keeps the color identity but removes the "win" cue.
    if (body instanceof Phaser.GameObjects.Image) body.setTint(0xc0c0c0);
    glow.setFillStyle(TINT_COLOR[def.tint], 0.22);
  }

  function followPlayer(targetX: number, targetY: number): void {
    if (state !== 'held') return;
    // Hold in front of the player at chest height; sits slightly to the side
    // so it doesn't fully occlude the sprite's face. Bumped to depth 55 so it
    // always renders above the player sprite.
    container.setPosition(targetX + 16, targetY - 52);
    container.setDepth(55);
  }

  function drop(s: Phaser.Scene, atX: number, atY: number): void {
    // Snap back to the pedestal (no penalty — just couldn't place here)
    state = 'resting';
    paintRim(rim, 0, useSprite);
    glow.setFillStyle(TINT_COLOR[def.tint], 0.35);
    pedestal.setAlpha(1);
    container.setDepth(40);
    // Restore saturation when the shard returns to its plinth
    if (body instanceof Phaser.GameObjects.Image) body.clearTint();
    s.tweens.add({
      targets: container,
      x: def.pose.x,
      y: def.pose.y,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Restart bob
        s.tweens.add({
          targets: container,
          y: def.pose.y - 4,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });
    // Silence the unused-param warning for atX/atY (kept for symmetry)
    void atX;
    void atY;
  }

  function placeInto(s: Phaser.Scene, atX: number, atY: number): void {
    state = 'placed';
    paintRim(rim, 0, useSprite);
    container.setDepth(45);
    // Restore the shard to full saturation as it locks into place — this is
    // the moment the "match achieved" color cue should fire.
    if (body instanceof Phaser.GameObjects.Image) body.clearTint();
    glow.setFillStyle(TINT_COLOR[def.tint], 0.55);
    s.tweens.add({
      targets: container,
      x: atX,
      y: atY,
      scale: { from: 1, to: 0.85 },
      alpha: 0.85,
      duration: 320,
      ease: 'Cubic.easeOut',
    });
    s.tweens.add({
      targets: glow,
      alpha: { from: 0.55, to: 0.15 },
      duration: 320,
    });
    s.tweens.add({
      targets: pedestal,
      alpha: 0.2,
      duration: 320,
    });
  }

  function destroy(): void {
    bob.stop();
    container.destroy();
    pedestal.destroy();
  }

  return {
    def,
    container,
    glow,
    pedestal,
    get state() {
      return state;
    },
    setHighlighted,
    lift,
    followPlayer,
    drop,
    placeInto,
    destroy,
  };
}

// ── Painters ────────────────────────────────────────────────────────────────

/**
 * Floor mark, NOT a stone plinth. A flat rune disc painted on the ground
 * with a soft cyan rim and a darker inner ring. Reads as "this is an
 * interactable on the floor," not "this is a small altar." The consoles
 * are altars; these are loose carryables.
 */
function paintPedestal(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  // Ground shadow
  g.fillStyle(0x000000, 0.55);
  g.fillEllipse(x, y + 6, 42, 10);
  // Stone disc base
  g.fillStyle(0x0a1428, 0.95);
  g.fillEllipse(x, y + 2, 38, 12);
  // Inner band — slightly lighter so the disc reads as carved stone
  g.fillStyle(0x152a4a, 1);
  g.fillEllipse(x, y, 30, 8);
  // Cyan rune rim — the interactable cue color, but very thin
  g.lineStyle(1, 0x06b6d4, 0.7);
  g.strokeEllipse(x, y, 30, 8);
  // Two small cyan dots at the cardinals (sells "rune mark" not "pedestal")
  g.fillStyle(0x06b6d4, 0.9);
  g.fillCircle(x - 15, y, 1.4);
  g.fillCircle(x + 15, y, 1.4);
}

function paintCrystal(g: Phaser.GameObjects.Graphics, def: ShardDef): void {
  const tint = TINT_COLOR[def.tint];
  const hw = W / 2;
  const hh = H / 2;

  // Outer dark backing for contrast
  g.fillStyle(0x0a1428, 1);
  g.beginPath();
  crystalPath(g, hw + 1, hh + 1);
  g.fillPath();

  // Main crystal fill — diagonal tint gradient via two fills
  g.fillStyle(tint, 0.4);
  g.beginPath();
  crystalPath(g, hw, hh);
  g.fillPath();

  // Highlight stripe (left face)
  g.fillStyle(0xffffff, 0.18);
  g.beginPath();
  g.moveTo(0, -hh);
  g.lineTo(-hw * 0.85, -hh * 0.3);
  g.lineTo(-hw * 0.85, hh * 0.3);
  g.lineTo(0, hh * 0.85);
  g.closePath();
  g.fillPath();

  // Outline (bright tint)
  g.lineStyle(1.6, tint, 0.95);
  g.beginPath();
  crystalPath(g, hw, hh);
  g.strokePath();

  // Symbol — etched in the middle of the crystal
  drawSymbol(g, def.symbol, 0, 0, 18, 0xffffff, 0.95);
}

function paintRim(
  g: Phaser.GameObjects.Graphics,
  alpha: number,
  useSprite = false,
): void {
  g.clear();
  if (alpha <= 0) return;
  if (useSprite) {
    // Soft ellipse around the crystal portion (the sprite footprint)
    g.lineStyle(2.4, COLORS.accent, 0.95 * alpha);
    g.strokeEllipse(0, -4, SPRITE_DISPLAY_W * 0.78, SPRITE_DISPLAY_H * 0.92);
    g.lineStyle(1, COLORS.accent, 0.45 * alpha);
    g.strokeEllipse(0, -4, SPRITE_DISPLAY_W * 0.92, SPRITE_DISPLAY_H * 1.04);
    return;
  }
  const hw = W / 2 + 3;
  const hh = H / 2 + 3;
  g.lineStyle(2, COLORS.accent, 0.9 * alpha);
  g.beginPath();
  crystalPath(g, hw, hh);
  g.strokePath();
}

function crystalPath(g: Phaser.GameObjects.Graphics, hw: number, hh: number): void {
  g.moveTo(0, -hh);
  g.lineTo(hw, -hh * 0.3);
  g.lineTo(hw, hh * 0.3);
  g.lineTo(0, hh);
  g.lineTo(-hw, hh * 0.3);
  g.lineTo(-hw, -hh * 0.3);
  g.closePath();
}
