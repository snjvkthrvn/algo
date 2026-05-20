import Phaser from 'phaser';
import { P0_1_PUZZLE_KEYS } from '../../../../config/assets';
import { STAGE } from '../tokens';

/**
 * Procedural circular stone arena — painted once at scene create.
 * Uses Graphics (no external assets) so the look is fully self-contained.
 *
 * Layer stack (all low depths so grid tiles render on top):
 *   depth 1  outer shadow blob
 *   depth 2  platform fill
 *   depth 3  surface grid-line haze + perimeter ring
 *   depth 4  edge vignette fades
 */

const CX = STAGE.width / 2;
const CY = 330;
const RX = 365; // horizontal radius
const RY = 200; // vertical radius

/**
 * Returns true when real art is used — caller should skip procedural atmosphere
 * and edge vignette, which would layer over the baked-in space background.
 */
export function paintPlatform(scene: Phaser.Scene): boolean {
  if (scene.textures.exists(P0_1_PUZZLE_KEYS.STONE_ARENA)) {
    // The art already contains the space background, arena, perimeter ring, and portal.
    // Centre it on the canvas — origin defaults to 0.5.
    scene.add
      .image(STAGE.width / 2, STAGE.height / 2, P0_1_PUZZLE_KEYS.STONE_ARENA)
      .setDisplaySize(STAGE.width, STAGE.height)
      .setDepth(1);
    return true;
  }
  paintShadow(scene);
  paintSurface(scene);
  paintPerimeterRing(scene);
  paintPortal(scene);
  return false;
}

export function paintEdgeVignette(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(4);
  // top fade
  g.fillGradientStyle(0x030610, 0x030610, 0x030610, 0x030610, 0.88, 0.88, 0, 0);
  g.fillRect(0, 0, STAGE.width, 90);
  // bottom fade
  g.fillGradientStyle(0x030610, 0x030610, 0x030610, 0x030610, 0, 0, 0.72, 0.72);
  g.fillRect(0, STAGE.height - 70, STAGE.width, 70);
}

function paintShadow(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(1);
  g.fillStyle(0x000000, 0.5);
  g.fillEllipse(CX + 5, CY + 14, RX * 2 + 20, RY * 2 + 16);
}

function paintSurface(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(2);

  // Outer stone fill
  g.fillStyle(0x080e20, 0.94);
  g.fillEllipse(CX, CY, RX * 2, RY * 2);

  // Inner lighter band (worn centre stone)
  g.fillStyle(0x0d1a34, 0.7);
  g.fillEllipse(CX, CY - 6, RX * 2 - 40, RY * 2 - 32);

  // Subtle horizontal tile-grid haze lines clipped to the ellipse
  const gLines = scene.add.graphics().setDepth(3);
  gLines.lineStyle(1, 0x1a3058, 0.22);
  for (let row = 0; row <= 5; row++) {
    const tileY = 195 + row * 54;
    const dy = tileY - CY;
    const halfW = Math.sqrt(Math.max(0, 1 - (dy / RY) ** 2)) * RX;
    if (halfW < 12) continue;
    gLines.beginPath();
    gLines.moveTo(CX - halfW, tileY);
    gLines.lineTo(CX + halfW, tileY);
    gLines.strokePath();
  }
}

function paintPerimeterRing(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(3);

  // Double-ring glow effect
  g.lineStyle(3, 0x06b6d4, 0.28);
  g.strokeEllipse(CX, CY, RX * 2, RY * 2);
  g.lineStyle(1, 0x06b6d4, 0.14);
  g.strokeEllipse(CX, CY, RX * 2 - 14, RY * 2 - 10);

  // Equidistant glow dots around the perimeter
  const DOT_COUNT = 28;
  for (let i = 0; i < DOT_COUNT; i++) {
    const angle = (i / DOT_COUNT) * Math.PI * 2 - Math.PI / 2;
    const dotX = CX + Math.cos(angle) * RX;
    const dotY = CY + Math.sin(angle) * RY;
    // Larger dots at cardinal points
    const isCardinal = i % 7 === 0;
    g.fillStyle(0x06b6d4, isCardinal ? 0.7 : 0.45);
    g.fillCircle(dotX, dotY, isCardinal ? 3.5 : 2.5);
  }

  // Rune inscriptions — four arcs of small symbols
  const RUNE_COUNT = 12;
  g.lineStyle(1, 0x1e4a7a, 0.35);
  for (let i = 0; i < RUNE_COUNT; i++) {
    const angle = (i / RUNE_COUNT) * Math.PI * 2 - Math.PI / 2;
    const rx2 = RX - 24;
    const ry2 = RY - 16;
    const rx = CX + Math.cos(angle) * rx2;
    const ry = CY + Math.sin(angle) * ry2;
    const len = 5;
    // Small cross at each inner point
    g.beginPath();
    g.moveTo(rx - len, ry); g.lineTo(rx + len, ry);
    g.moveTo(rx, ry - len); g.lineTo(rx, ry + len);
    g.strokePath();
  }
}

function paintPortal(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(3);
  const px = CX;
  const py = CY - RY + 4; // just inside the top of the arena

  // Portal doorway frame
  g.fillStyle(0x0b1c3a, 0.9);
  g.fillRect(px - 20, py - 36, 40, 64);

  g.lineStyle(2, 0x06b6d4, 0.65);
  g.strokeRect(px - 20, py - 36, 40, 64);

  // Portal triangle capstone
  g.fillStyle(0x06b6d4, 0.28);
  g.fillTriangle(px - 20, py - 36, px + 20, py - 36, px, py - 60);
  g.lineStyle(1.5, 0x06b6d4, 0.55);
  g.strokeTriangle(px - 20, py - 36, px + 20, py - 36, px, py - 60);

  // Portal inner glow dot
  g.fillStyle(0x06b6d4, 0.5);
  g.fillCircle(px, py - 48, 5);
}
