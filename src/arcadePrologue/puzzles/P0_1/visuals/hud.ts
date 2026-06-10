import Phaser from 'phaser';
import { COLORS, px, s, SPACING, STAGE, TYPE } from '../tokens';

/**
 * Heads-up display — shared between puzzles.
 *
 * Caller wires:
 *  - eyebrow       suite tag at the very top
 *  - title         current round title
 *  - principle     short philosophical line (the *idea* of the round)
 *  - teach         short instructional line (the *verb* of the round)
 *  - state chip    bottom-center, swaps based on caller-provided label
 *  - hint          muted footer hint with keys
 *
 * The HUD does not own the state machine; it just renders strings.
 */

export type HudConfig = {
  eyebrow: string;
  footerHint: string;
};

export type Hud = {
  setRound(title: string, principle: string, teach: string): void;
  setState(label: string): void;
  showSummary(text: string): void;
  showPromptNext(text: string): void;
};

export function buildHud(scene: Phaser.Scene, config: HudConfig): Hud {
  const headerBg = scene.add.graphics().setDepth(20).setAlpha(0.86);
  paintHeaderBg(headerBg, s(760), s(92));

  scene.add
    .text(STAGE.width / 2, SPACING.sm, config.eyebrow, {
      ...TYPE.eyebrow,
      fontSize: px(8),
      letterSpacing: s(1),
    })
    .setOrigin(0.5, 0)
    .setDepth(22)
    .setAlpha(0.85);

  const title = scene.add
    .text(STAGE.width / 2, SPACING.lg + s(6), '', {
      ...TYPE.display,
      fontSize: px(15),
      wordWrap: { width: STAGE.width - SPACING.xxxl * 4 },
      align: 'center',
    })
    .setOrigin(0.5, 0)
    .setDepth(22)
    .setShadow(0, s(2), '#0b1020', s(8), true, true);

  const principle = scene.add
    .text(STAGE.width / 2, SPACING.lg + s(34), '', {
      ...TYPE.body,
      fontSize: px(9),
      color: COLORS.text.primary,
      align: 'center',
      wordWrap: { width: STAGE.width - SPACING.xxxl * 4 },
    })
    .setOrigin(0.5, 0)
    .setDepth(22)
    .setAlpha(0);

  const teach = scene.add
    .text(STAGE.width / 2, SPACING.lg + s(56), '', {
      ...TYPE.body,
      fontSize: px(9),
      align: 'center',
      wordWrap: { width: STAGE.width - SPACING.xxxl * 4 },
    })
    .setOrigin(0.5, 0)
    .setDepth(22)
    .setAlpha(0);

  const chipY = STAGE.height - SPACING.xxxl;
  const chip = scene.add.container(STAGE.width / 2, chipY).setDepth(22).setAlpha(0);
  const chipBg = scene.add.graphics();
  paintChipBg(chipBg, s(180), s(26));
  const chipText = scene.add
    .text(0, 0, '', { ...TYPE.eyebrow, color: COLORS.text.primary, letterSpacing: s(2) })
    .setOrigin(0.5);
  chip.add([chipBg, chipText]);

  const footer = scene.add
    .text(STAGE.width / 2, STAGE.height - SPACING.md - s(2), config.footerHint, TYPE.micro)
    .setOrigin(0.5, 1)
    .setDepth(22)
    .setColor(COLORS.text.primary)
    .setAlpha(0.84);
  const footerBg = scene.add.graphics().setDepth(21).setAlpha(0.82);
  paintFooterBg(footerBg, s(650), s(28));

  function setRound(t: string, p: string, te: string): void {
    scene.tweens.killTweensOf([principle, teach]);
    title.setText(t);
    principle.setText(p);
    teach.setText(te);
    scene.tweens.add({
      targets: [principle, teach],
      alpha: { from: 0, to: 1 },
      duration: 360,
      ease: 'Sine.easeOut',
    });
  }

  function setState(label: string): void {
    scene.tweens.killTweensOf(chip);
    chipText.setText(label.toUpperCase());
    scene.tweens.add({
      targets: chip,
      alpha: label ? 1 : 0,
      duration: 240,
      ease: 'Sine.easeInOut',
    });
  }

  function showSummary(text: string): void {
    scene.tweens.killTweensOf(teach);
    teach.setText(text);
    scene.tweens.add({
      targets: teach,
      alpha: { from: 0.4, to: 1 },
      duration: 360,
      ease: 'Sine.easeOut',
    });
  }

  function showPromptNext(text: string): void {
    scene.tweens.killTweensOf(footer);
    footer.setText(text);
    footer.setColor(COLORS.text.accent);
    scene.tweens.add({
      targets: footer,
      alpha: { from: 0.2, to: 0.95 },
      duration: 360,
      ease: 'Sine.easeOut',
    });
  }

  return { setRound, setState, showSummary, showPromptNext };
}

function paintChipBg(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  g.fillStyle(COLORS.surface.glass, 0.7);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, s(13));
  g.lineStyle(s(1), COLORS.accent, 0.35);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, s(13));
}

function paintFooterBg(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const x = STAGE.width / 2 - w / 2;
  const y = STAGE.height - SPACING.md - h;
  g.fillStyle(COLORS.surface.glass, 0.78);
  g.fillRoundedRect(x, y, w, h, s(10));
  g.lineStyle(s(1), COLORS.accent, 0.22);
  g.strokeRoundedRect(x, y, w, h, s(10));
}

function paintHeaderBg(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const x = STAGE.width / 2 - w / 2;
  const y = SPACING.xs;
  g.fillStyle(COLORS.surface.glass, 0.78);
  g.fillRoundedRect(x, y, w, h, s(10));
  g.lineStyle(s(1), COLORS.accent, 0.26);
  g.strokeRoundedRect(x, y, w, h, s(10));
}
