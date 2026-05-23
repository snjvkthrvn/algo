import Phaser from 'phaser';
import { COLORS, s, SPACING, STAGE, TYPE } from '../tokens';

/**
 * Cosmic-rune HUD layout:
 *  - top-left  : ornate badge with eyebrow / title / round counter / gem progression
 *  - top-right : crystal counter (placeholder asset Phase 1, real Phase 2)
 *  - bottom    : dialogue box with avatar slot + speaker name + line
 *
 * The HUD does not own gameplay state; it renders what the scene tells it to.
 */

export type HudConfig = {
  eyebrow: string;
  footerHint: string;
};

export type Hud = {
  setRound(title: string, principle: string, teach: string): void;
  setRoundProgress(currentIndex: number, totalRounds: number): void;
  setState(label: string): void;
  setCrystals(count: number): void;
  showDialogue(speaker: string, text: string): void;
  showSummary(text: string): void;
  showPromptNext(text: string): void;
};

const BADGE_W = s(220);
const BADGE_H = s(110);
const COUNTER_W = s(110);
const COUNTER_H = s(46);
const DIALOG_H = s(108);

export function buildHud(scene: Phaser.Scene, config: HudConfig): Hud {
  const badge = buildBadge(scene, config.eyebrow);
  const counter = buildCrystalCounter(scene);
  const dialog = buildDialogueBox(scene);

  // Footer keyboard hint: positioned just below the top-right crystal counter
  // so it stays out of the dialog box at the bottom of the screen.
  scene.add
    .text(STAGE.width - SPACING.md, SPACING.md + COUNTER_H + s(4), config.footerHint, TYPE.micro)
    .setOrigin(1, 0)
    .setDepth(22)
    .setAlpha(0.35);

  function setRound(title: string, _principle: string, teach: string): void {
    badge.setTitle(title);
    dialog.show('Rune Keeper', teach);
  }

  function setRoundProgress(currentIndex: number, totalRounds: number): void {
    badge.setProgress(currentIndex, totalRounds);
  }

  function setState(label: string): void {
    badge.setState(label);
  }

  function setCrystals(count: number): void {
    counter.setCount(count);
  }

  function showDialogue(speaker: string, text: string): void {
    dialog.show(speaker, text);
  }

  function showSummary(text: string): void {
    dialog.show('Rune Keeper', text);
  }

  function showPromptNext(text: string): void {
    dialog.show('', text);
  }

  return { setRound, setRoundProgress, setState, setCrystals, showDialogue, showSummary, showPromptNext };
}

// ────────────────────────────────────────────────────────────────────────────
// Top-left badge: PUZZLE / TITLE / ROUND COUNTER / GEMS
// ────────────────────────────────────────────────────────────────────────────

type BadgeApi = {
  setTitle(title: string): void;
  setProgress(currentIndex: number, totalRounds: number): void;
  setState(label: string): void;
};

function buildBadge(scene: Phaser.Scene, eyebrow: string): BadgeApi {
  const x = SPACING.md;
  const y = SPACING.md;

  const bg = scene.add.graphics().setDepth(20);
  paintFrame(bg, x, y, BADGE_W, BADGE_H);

  scene.add
    .text(x + SPACING.md, y + SPACING.sm, eyebrow, {
      ...TYPE.eyebrow,
      color: COLORS.text.accent,
    })
    .setDepth(21);

  const titleText = scene.add
    .text(x + SPACING.md, y + SPACING.sm + s(16), '', {
      ...TYPE.display,
      fontSize: `${Math.round(18 * (STAGE.width / 1280))}px`,
    })
    .setDepth(21);

  const roundLabel = scene.add
    .text(x + SPACING.md, y + s(58), 'Round 0/3', {
      ...TYPE.body,
      color: COLORS.text.primary,
    })
    .setDepth(21);

  // Gem placeholders — three diamond shapes that fill as rounds complete.
  const gemY = y + s(86);
  const gems: Phaser.GameObjects.Graphics[] = [];
  for (let i = 0; i < 3; i += 1) {
    const gx = x + SPACING.md + s(8) + i * s(20);
    const gem = scene.add.graphics().setDepth(21);
    paintDiamond(gem, gx, gemY, s(8), 0x1f1a35, COLORS.tile.dimEdge);
    gems.push(gem);
  }

  const stateText = scene.add
    .text(x + BADGE_W - SPACING.md, y + s(86), '', {
      ...TYPE.eyebrow,
      color: COLORS.text.accent,
      fontSize: `${Math.round(10 * (STAGE.width / 1280))}px`,
    })
    .setOrigin(1, 0.5)
    .setDepth(21)
    .setAlpha(0);

  return {
    setTitle(title) {
      titleText.setText(title);
    },
    setProgress(currentIndex, totalRounds) {
      roundLabel.setText(`Round ${Math.min(currentIndex + 1, totalRounds)}/${totalRounds}`);
      for (let i = 0; i < gems.length; i += 1) {
        const gx = x + SPACING.md + s(8) + i * s(20);
        gems[i]!.clear();
        const fill = i < currentIndex ? COLORS.tile.lit : 0x1f1a35;
        const edge = i < currentIndex ? COLORS.tile.litEdge : COLORS.tile.dimEdge;
        paintDiamond(gems[i]!, gx, gemY, s(8), fill, edge);
      }
    },
    setState(label) {
      stateText.setText(label.toUpperCase());
      scene.tweens.killTweensOf(stateText);
      scene.tweens.add({
        targets: stateText,
        alpha: label ? 1 : 0,
        duration: 240,
      });
    },
  };
}

function paintDiamond(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  fill: number,
  edge: number,
): void {
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r, cy);
  g.lineTo(cx, cy + r);
  g.lineTo(cx - r, cy);
  g.closePath();
  g.fillPath();
  g.lineStyle(s(1.2), edge, 1);
  g.strokePath();
}

// ────────────────────────────────────────────────────────────────────────────
// Top-right crystal counter
// ────────────────────────────────────────────────────────────────────────────

type CounterApi = {
  setCount(count: number): void;
};

function buildCrystalCounter(scene: Phaser.Scene): CounterApi {
  const x = STAGE.width - COUNTER_W - SPACING.md;
  const y = SPACING.md;

  const bg = scene.add.graphics().setDepth(20);
  paintFrame(bg, x, y, COUNTER_W, COUNTER_H);

  // Crystal icon: small cyan diamond at left.
  const iconG = scene.add.graphics().setDepth(21);
  paintDiamond(iconG, x + SPACING.md + s(8), y + COUNTER_H / 2, s(10), COLORS.tile.lit, COLORS.tile.litEdge);

  const text = scene.add
    .text(x + COUNTER_W - SPACING.md, y + COUNTER_H / 2, '× 00', {
      ...TYPE.display,
      fontSize: `${Math.round(16 * (STAGE.width / 1280))}px`,
    })
    .setOrigin(1, 0.5)
    .setDepth(21);

  return {
    setCount(count) {
      text.setText(`× ${String(count).padStart(2, '0')}`);
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Bottom dialogue box with avatar + speaker + line
// ────────────────────────────────────────────────────────────────────────────

type DialogApi = {
  show(speaker: string, text: string): void;
};

function buildDialogueBox(scene: Phaser.Scene): DialogApi {
  const margin = SPACING.lg;
  const x = margin;
  const y = STAGE.height - DIALOG_H - margin;
  const w = STAGE.width - margin * 2;

  const bg = scene.add.graphics().setDepth(20);
  paintFrame(bg, x, y, w, DIALOG_H);

  // Avatar slot — circular badge holding the speaker portrait (placeholder circle).
  const avatarR = (DIALOG_H - SPACING.md * 2) / 2;
  const avatarCX = x + SPACING.md + avatarR;
  const avatarCY = y + DIALOG_H / 2;
  const avatar = scene.add.graphics().setDepth(21);
  avatar.fillStyle(0x1c1638, 1);
  avatar.fillCircle(avatarCX, avatarCY, avatarR);
  avatar.lineStyle(s(1.4), COLORS.tile.lit, 0.5);
  avatar.strokeCircle(avatarCX, avatarCY, avatarR);

  // Placeholder hood silhouette inside the avatar.
  avatar.fillStyle(0x2e2654, 1);
  avatar.slice(avatarCX, avatarCY, avatarR - s(6), Phaser.Math.DegToRad(190), Phaser.Math.DegToRad(350), true);
  avatar.fillPath();
  avatar.fillStyle(0xe0f8ff, 1);
  avatar.fillCircle(avatarCX - s(4), avatarCY - s(2), s(2));
  avatar.fillCircle(avatarCX + s(4), avatarCY - s(2), s(2));

  const speakerX = avatarCX + avatarR + SPACING.md;
  const speakerName = scene.add
    .text(speakerX, y + SPACING.md, '', {
      ...TYPE.display,
      color: COLORS.text.accent,
      fontSize: `${Math.round(16 * (STAGE.width / 1280))}px`,
    })
    .setDepth(21);

  const speakerText = scene.add
    .text(speakerX, y + SPACING.md + s(22), '', {
      ...TYPE.body,
      color: COLORS.text.primary,
      wordWrap: { width: w - (speakerX - x) - SPACING.lg },
    })
    .setDepth(21);

  // Advance triangle at the far right.
  const tri = scene.add.graphics().setDepth(21);
  const tx = x + w - SPACING.md - s(4);
  const ty = y + DIALOG_H - SPACING.md - s(4);
  tri.fillStyle(COLORS.tile.lit, 0.85);
  tri.beginPath();
  tri.moveTo(tx - s(5), ty - s(3));
  tri.lineTo(tx + s(5), ty - s(3));
  tri.lineTo(tx, ty + s(4));
  tri.closePath();
  tri.fillPath();
  scene.tweens.add({
    targets: tri,
    alpha: { from: 0.4, to: 1 },
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  return {
    show(speaker, text) {
      speakerName.setText(speaker);
      speakerText.setText(text);
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Shared frame painter — cosmic-stone border with cyan accent.
// ────────────────────────────────────────────────────────────────────────────

function paintFrame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x0a0420, 0.92);
  g.fillRoundedRect(x, y, w, h, s(8));
  g.lineStyle(s(2), COLORS.tile.lit, 0.6);
  g.strokeRoundedRect(x, y, w, h, s(8));
  g.lineStyle(s(1), COLORS.platform.runeEngrave, 0.4);
  g.strokeRoundedRect(x + s(3), y + s(3), w - s(6), h - s(6), s(6));
}
