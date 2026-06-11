import Phaser from "phaser";
import { VISUAL_REVAMP_KEYS } from "../../../../config/assets";
import { STAGE } from "../tokens";

/**
 * Floor treatment under the diamond grid — painted once at scene create.
 *
 * Layer stack (all low depths so grid tiles render on top):
 *   depth 4  shadow blob (grounding)
 *   depth 5  platform fill (cosmic fallback only)
 *   depth 6  surface haze + perimeter ring (cosmic fallback only)
 */

const CX = STAGE.width / 2;
const CY = 340;
const RX = 404; // horizontal radius — sized to contain the 6×8 diamond grid
const RY = 216; // vertical radius

/**
 * Grounds the diamond grid on the floor.
 *
 * When the warm action-arena art is loaded, the room already has a floor —
 * only a soft contact shadow is painted so the tiles sit IN the room instead
 * of floating over it. The full procedural stone disc (ring, portal) is the
 * fallback for when the art is missing.
 *
 * Returns true when the arena art is in use. Either way the logical diamond
 * tiles stay visible: the old `stone_arena.png` path that hid them baked an
 * oval floor that never aligned with the lattice, making the playfield
 * unreadable. What you see must be exactly where you can step.
 */
export function paintPlatform(scene: Phaser.Scene): boolean {
  if (
    scene.textures.exists(VISUAL_REVAMP_KEYS.PUZZLE_PROLOGUE_ACTION_ARENA_BG)
  ) {
    paintContactShadow(scene);
    return true;
  }
  paintShadow(scene);
  paintSurface(scene);
  paintPerimeterRing(scene);
  paintPortal(scene);
  return false;
}

/** Soft stacked shadow that seats the grid on the arena-art floor. */
function paintContactShadow(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(4);
  for (let i = 3; i >= 1; i -= 1) {
    g.fillStyle(0x000000, 0.07);
    g.fillEllipse(CX, CY + 10, (RX - i * 26) * 2, (RY - i * 14) * 2);
  }
}

export function paintEdgeVignette(scene: Phaser.Scene): void {
  // Depth 7 sits above the backdrop/platform (0-6) but below the tiles (10+),
  // so the cosmic edges darken to focus the eye on the bright playfield while
  // the play area itself stays crisp.
  const g = scene.add.graphics().setDepth(7);
  const V = 0x02030a;
  // top
  g.fillGradientStyle(V, V, V, V, 0.92, 0.92, 0, 0);
  g.fillRect(0, 0, STAGE.width, 130);
  // bottom
  g.fillGradientStyle(V, V, V, V, 0, 0, 0.82, 0.82);
  g.fillRect(0, STAGE.height - 120, STAGE.width, 120);
  // left
  g.fillGradientStyle(V, V, V, V, 0.7, 0, 0.7, 0);
  g.fillRect(0, 0, 160, STAGE.height);
  // right
  g.fillGradientStyle(V, V, V, V, 0, 0.7, 0, 0.7);
  g.fillRect(STAGE.width - 160, 0, 160, STAGE.height);
}

function paintShadow(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(4);
  g.fillStyle(0x000000, 0.5);
  g.fillEllipse(CX + 5, CY + 14, RX * 2 + 20, RY * 2 + 16);
}

function paintSurface(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(5);

  // Outer stone fill
  g.fillStyle(0x080e20, 0.94);
  g.fillEllipse(CX, CY, RX * 2, RY * 2);

  // Inner lighter band (worn centre stone)
  g.fillStyle(0x0d1a34, 0.7);
  g.fillEllipse(CX, CY - 6, RX * 2 - 40, RY * 2 - 32);

  // Subtle horizontal tile-grid haze lines clipped to the ellipse
  const gLines = scene.add.graphics().setDepth(6);
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
  const g = scene.add.graphics().setDepth(6);

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
    g.moveTo(rx - len, ry);
    g.lineTo(rx + len, ry);
    g.moveTo(rx, ry - len);
    g.lineTo(rx, ry + len);
    g.strokePath();
  }
}

function paintPortal(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(6);
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
