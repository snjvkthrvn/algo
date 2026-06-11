import Phaser from "phaser";
import { COLORS, s, STAGE, TYPE } from "../tokens";

/**
 * HUD for the isometric path puzzle — matches the screenshot layout:
 *
 *   ┌─ top-left ─────────────┐     ┌─ top-right ─┐
 *   │ Puzzle P0-1            │     │  ◆  × 07    │
 *   │ The Path of Sequences  │     └─────────────┘
 *   │ ◇ Round 2/3 ◇          │
 *   │  ◆  ◆  ◇  (diamonds)   │
 *   │  state chip            │
 *   └────────────────────────┘
 */

export type PrologueHud = {
  setRound(num: number, total: number): void;
  addScore(delta: number): void;
  setState(label: string): void;
  showRoundTitle(text: string): void;
  showSummary(text: string): void;
  showPromptNext(label: string): void;
};

const PANEL_X = 16;
const PANEL_Y = 16;
const PANEL_W = 272;
const PANEL_H = 188;
const MAX_ROUND_GEMS = 4;

export function buildPrologueHud(scene: Phaser.Scene): PrologueHud {
  // ── Left info panel ──────────────────────────────────────────────────────────
  const panelBg = scene.add.graphics().setDepth(100);
  paintPanel(panelBg, PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  // Diegetic name — was "Puzzle P0-1" (engineering ID leaking to the player).
  // The puzzle's in-world name is the Path of Sequences; using that here keeps
  // the player inside the fiction rather than the codebase.
  scene.add
    .text(PANEL_X + PANEL_W / 2, PANEL_Y + 22, "The Path of Sequences", {
      fontFamily: (TYPE.eyebrow as { fontFamily: string }).fontFamily,
      fontSize: s(11) + "px",
      fontStyle: "bold",
      color: "#e6ecff",
      letterSpacing: s(2),
    })
    .setOrigin(0.5)
    .setDepth(101);

  // Divider
  const sep = scene.add.graphics().setDepth(101);
  sep.lineStyle(1, 0x06b6d4, 0.5);
  sep.beginPath();
  sep.moveTo(PANEL_X + 14, PANEL_Y + 38);
  sep.lineTo(PANEL_X + PANEL_W - 14, PANEL_Y + 38);
  sep.strokePath();

  const roundText = scene.add
    .text(PANEL_X + PANEL_W / 2, PANEL_Y + 94, "", {
      fontFamily: (TYPE.eyebrow as { fontFamily: string }).fontFamily,
      fontSize: s(12) + "px",
      fontStyle: "bold",
      color: "#e6ecff",
      letterSpacing: s(2),
    })
    .setOrigin(0.5)
    .setDepth(101);

  // Diamond progress indicators
  const diamondY = PANEL_Y + 128;
  const diamonds: Phaser.GameObjects.Graphics[] = [];
  for (let i = 0; i < MAX_ROUND_GEMS; i++) {
    const d = scene.add.graphics().setDepth(101);
    diamonds.push(d);
    const dx = PANEL_X + PANEL_W / 2 + (i - (MAX_ROUND_GEMS - 1) / 2) * 30;
    drawDiamond(d, dx, diamondY, false);
  }

  // State label
  const stateText = scene.add
    .text(PANEL_X + PANEL_W / 2, PANEL_Y + 162, "WATCHING", {
      fontFamily: (TYPE.micro as { fontFamily: string }).fontFamily,
      fontSize: s(10) + "px",
      color: COLORS.text.muted,
      letterSpacing: s(1),
    })
    .setOrigin(0.5)
    .setDepth(101);

  // ── Top-centre round principle text ──────────────────────────────────────────
  const principleText = scene.add
    .text(STAGE.width / 2, PANEL_Y + 6, "", {
      fontFamily: (TYPE.body as { fontFamily: string }).fontFamily,
      fontSize: s(11) + "px",
      color: COLORS.text.muted,
      align: "center",
      wordWrap: { width: STAGE.width - 600 },
    })
    .setOrigin(0.5, 0)
    .setAlpha(0)
    .setDepth(101);

  // ── Internal state ────────────────────────────────────────────────────────────
  let scoreValue = 0;

  function setRound(num: number, total: number): void {
    roundText.setText(`Round ${num}/${total}`);
    for (let i = 0; i < diamonds.length; i++) {
      drawDiamond(
        diamonds[i]!,
        PANEL_X + PANEL_W / 2 + (i - (MAX_ROUND_GEMS - 1) / 2) * 30,
        diamondY,
        i < num,
      );
    }
  }

  function addScore(delta: number): void {
    scoreValue += delta;
  }

  function setState(label: string): void {
    stateText.setText(label.toUpperCase());
  }

  function showRoundTitle(text: string): void {
    scene.tweens.killTweensOf(principleText);
    principleText.setText(text).setAlpha(0);
    scene.tweens.add({
      targets: principleText,
      alpha: 1,
      duration: 340,
      ease: "Sine.easeOut",
    });
  }

  function showSummary(text: string): void {
    scene.tweens.killTweensOf(principleText);
    principleText.setText(text);
    scene.tweens.add({
      targets: principleText,
      alpha: 1,
      duration: 340,
      ease: "Sine.easeOut",
    });
  }

  function showPromptNext(label: string): void {
    stateText.setText(label.toUpperCase()).setColor(COLORS.text.accent);
  }

  return {
    setRound,
    addScore,
    setState,
    showRoundTitle,
    showSummary,
    showPromptNext,
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function paintPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(0x050918, 0.91);
  g.fillRoundedRect(x, y, w, h, 7);
  g.lineStyle(2, 0x06b6d4, 0.8);
  g.strokeRoundedRect(x, y, w, h, 7);
  g.lineStyle(1, 0x06b6d4, 0.22);
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 5);
}

function drawDiamond(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  filled: boolean,
): void {
  g.clear();
  const color = filled ? 0x06b6d4 : 0x1e3558;
  const alpha = filled ? 1 : 0.5;
  const size = 8;
  g.fillStyle(color, alpha);
  // Diamond = two triangles sharing the horizontal midline
  g.fillTriangle(cx, cy - size, cx + size, cy, cx - size, cy);
  g.fillTriangle(cx - size, cy, cx + size, cy, cx, cy + size);
  g.lineStyle(1.5, 0x06b6d4, filled ? 0.8 : 0.35);
  g.strokeTriangle(cx, cy - size, cx + size, cy, cx - size, cy);
  g.strokeTriangle(cx - size, cy, cx + size, cy, cx, cy + size);
}
