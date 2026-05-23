import Phaser from 'phaser';
import { COLORS, s, STAGE, TYPE } from '../tokens';

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
  /**
   * Replaces the "Round X/N" label with a free-form objective, and configures
   * how many progress slots are drawn underneath. Used by P0_2 to show
   * "◇ Match all 3 shards ◇" / 3 progress diamonds.
   */
  setObjective(label: string, totalSlots: number): void;
  /** Fills the first N progress slots. Capped at the total configured. */
  setProgress(filled: number): void;
  addScore(delta: number): void;
  setState(label: string): void;
  showRoundTitle(text: string): void;
  showSummary(text: string): void;
  showPromptNext(label: string): void;
};

export type PrologueHudOptions = {
  /** Top-row title, e.g. "Puzzle P0-1". Defaults to "Puzzle P0-1". */
  title?: string;
  /** Subtitle below the title, e.g. "The Path of Sequences". */
  subtitle?: string;
};

const PANEL_X = 16;
const PANEL_Y = 16;
const PANEL_W = 264;
const PANEL_H = 144;
// Enough slots for the largest P0_2 round (5 shards) AND P0_1's 4-round indicator.
const MAX_ROUND_GEMS = 5;

export function buildPrologueHud(
  scene: Phaser.Scene,
  options: PrologueHudOptions = {},
): PrologueHud {
  const titleText = options.title ?? 'Puzzle P0-1';
  const subtitleText = options.subtitle ?? 'The Path of Sequences';
  // ── Left info panel ──────────────────────────────────────────────────────────
  const panelBg = scene.add.graphics().setDepth(100);
  paintPanel(panelBg, PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  scene.add
    .text(PANEL_X + PANEL_W / 2, PANEL_Y + 20, titleText, {
      fontFamily: (TYPE.eyebrow as { fontFamily: string }).fontFamily,
      fontSize: s(13) + 'px',
      fontStyle: 'bold',
      color: '#e6ecff',
      letterSpacing: s(2),
    })
    .setOrigin(0.5)
    .setDepth(101);

  // (Divider line removed — visual gap is enough separation, and the line was
  // adding "JRPG menu" texture the rest of the HUD doesn't share.)

  scene.add
    .text(PANEL_X + PANEL_W / 2, PANEL_Y + 44, subtitleText, {
      fontFamily: (TYPE.body as { fontFamily: string }).fontFamily,
      fontSize: s(12) + 'px',
      color: '#06b6d4',
      align: 'center',
      wordWrap: { width: PANEL_W - 24 },
    })
    .setOrigin(0.5)
    .setDepth(101);

  const roundText = scene.add
    .text(PANEL_X + PANEL_W / 2, PANEL_Y + 82, '', {
      fontFamily: (TYPE.eyebrow as { fontFamily: string }).fontFamily,
      fontSize: s(11) + 'px',
      fontStyle: 'bold',
      color: '#e6ecff',
      letterSpacing: s(1.5),
    })
    .setOrigin(0.5)
    .setDepth(101);

  // Diamond progress indicators
  const diamondY = PANEL_Y + 116;
  const diamonds: Phaser.GameObjects.Graphics[] = [];
  for (let i = 0; i < MAX_ROUND_GEMS; i++) {
    diamonds.push(scene.add.graphics().setDepth(101));
  }

  // State chip removed (no more "MATCH" / "LISTEN" / "CLEARED" label inside
  // the panel). Kept as a hidden text node so the showPromptNext() call site
  // can write a final "Return to the Chamber" prompt at the bottom of the
  // panel without crashing.
  const stateText = scene.add
    .text(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 14, '', {
      fontFamily: (TYPE.micro as { fontFamily: string }).fontFamily,
      fontSize: s(10) + 'px',
      color: COLORS.text.accent,
      letterSpacing: s(1),
    })
    .setOrigin(0.5)
    .setDepth(101);

  // (Top-right score + hearts come from UIScene — drawing them here too would
  // double-render and overlap. Score state is tracked locally for addScore()
  // calls so existing call sites don't break.)

  // ── Top-centre round principle text ──────────────────────────────────────────
  const principleText = scene.add
    .text(STAGE.width / 2, PANEL_Y + 6, '', {
      fontFamily: (TYPE.body as { fontFamily: string }).fontFamily,
      fontSize: s(11) + 'px',
      color: COLORS.text.muted,
      align: 'center',
      wordWrap: { width: STAGE.width - 600 },
    })
    .setOrigin(0.5, 0)
    .setAlpha(0)
    .setDepth(101);

  // ── Internal state ────────────────────────────────────────────────────────────
  let scoreValue = 0;
  // Active progress slot count (defaults to MAX_ROUND_GEMS for setRound mode)
  let activeSlots = MAX_ROUND_GEMS;

  function repaintDiamonds(filled: number, total: number): void {
    const spacing = 28;
    const startX = PANEL_X + PANEL_W / 2 - ((total - 1) / 2) * spacing;
    for (let i = 0; i < diamonds.length; i++) {
      const d = diamonds[i]!;
      d.clear();
      if (i >= total) continue;
      drawDiamond(d, startX + i * spacing, diamondY, i < filled);
    }
  }

  function setRound(num: number, total: number): void {
    roundText.setText(`Round ${num}/${total}`).setColor('#e6ecff');
    activeSlots = MAX_ROUND_GEMS;
    repaintDiamonds(num, activeSlots);
  }

  function setObjective(label: string, totalSlots: number): void {
    // Frame the label with cyan diamond ornaments like the reference
    roundText
      .setText(`◇  ${label}  ◇`)
      .setColor('#06b6d4');
    activeSlots = Math.max(1, Math.min(totalSlots, diamonds.length));
    repaintDiamonds(0, activeSlots);
  }

  function setProgress(filled: number): void {
    const f = Math.max(0, Math.min(filled, activeSlots));
    repaintDiamonds(f, activeSlots);
  }

  function addScore(delta: number): void {
    // The actual top-right score display is owned by UIScene; this is a no-op
    // for the HUD itself but kept on the interface for call-site compatibility.
    scoreValue += delta;
  }

  function setState(label: string): void {
    stateText.setText(label.toUpperCase());
  }

  function showRoundTitle(text: string): void {
    scene.tweens.killTweensOf(principleText);
    principleText.setText(text).setAlpha(0);
    scene.tweens.add({ targets: principleText, alpha: 1, duration: 340, ease: 'Sine.easeOut' });
  }

  function showSummary(text: string): void {
    scene.tweens.killTweensOf(principleText);
    principleText.setText(text);
    scene.tweens.add({ targets: principleText, alpha: 1, duration: 340, ease: 'Sine.easeOut' });
  }

  function showPromptNext(label: string): void {
    stateText.setText(label.toUpperCase()).setColor(COLORS.text.accent);
  }

  return {
    setRound,
    setObjective,
    setProgress,
    addScore,
    setState,
    showRoundTitle,
    showSummary,
    showPromptNext,
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function paintPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  // Single-border, slightly transparent slab. The nested inner stroke was
  // adding "JRPG menu" texture that fought the rest of the HUD; dropped it.
  g.fillStyle(0x050918, 0.88);
  g.fillRoundedRect(x, y, w, h, 6);
  g.lineStyle(1.5, 0x06b6d4, 0.7);
  g.strokeRoundedRect(x, y, w, h, 6);
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
