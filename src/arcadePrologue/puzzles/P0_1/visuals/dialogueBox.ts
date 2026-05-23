import Phaser from 'phaser';
import { VISUAL_REVAMP_KEYS } from '../../../../config/assets';
import { COLORS, s, STAGE, TYPE } from '../tokens';

/**
 * RPG-style NPC dialogue panel.
 *
 * Sits at the bottom of the screen; slides in/out with tweens.
 * The NPC portrait is procedurally generated and cached as 'portrait_rune_keeper'.
 */

const BOX_X = 50;
const BOX_Y = STAGE.height - 150;
const BOX_W = STAGE.width - 100;
const BOX_H = 130;
const PORTRAIT = 84;
const TEXT_X = BOX_X + PORTRAIT + 28;
const TEXT_W = BOX_W - PORTRAIT - 40;

export type DialogueBox = {
  show(npcName: string, text: string): void;
  hide(): void;
};

export type DialogueBoxOptions = {
  /**
   * Which character's portrait to render. When omitted, defaults to the Rune
   * Keeper (P0_1). P0_2 uses 'console_keeper'.
   */
  portrait?: 'rune_keeper' | 'console_keeper';
};

// Resolve which portrait texture key to use: prefer the real character sprite
function resolvePortraitKey(
  scene: Phaser.Scene,
  portrait: 'rune_keeper' | 'console_keeper',
): string {
  if (portrait === 'console_keeper') {
    if (scene.textures.exists(VISUAL_REVAMP_KEYS.CONSOLE_KEEPER)) {
      return VISUAL_REVAMP_KEYS.CONSOLE_KEEPER;
    }
    ensureConsoleKeeperPortrait(scene);
    return 'portrait_console_keeper';
  }
  if (scene.textures.exists(VISUAL_REVAMP_KEYS.RUNE_KEEPER)) {
    return VISUAL_REVAMP_KEYS.RUNE_KEEPER;
  }
  ensurePortraitTexture(scene);
  return 'portrait_rune_keeper';
}

export function createDialogueBox(
  scene: Phaser.Scene,
  options: DialogueBoxOptions = {},
): DialogueBox {
  const PORTRAIT_KEY = resolvePortraitKey(scene, options.portrait ?? 'rune_keeper');

  const container = scene.add.container(0, STAGE.height).setDepth(200);

  // Background panel
  const bg = scene.add.graphics();
  bg.fillStyle(0x040814, 0.96);
  bg.fillRoundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, 7);
  bg.lineStyle(2, 0x06b6d4, 0.82);
  bg.strokeRoundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, 7);
  bg.lineStyle(1, 0x06b6d4, 0.28);
  bg.strokeRoundedRect(BOX_X + 4, BOX_Y + 4, BOX_W - 8, BOX_H - 8, 5);

  // Portrait frame
  const frame = scene.add.graphics();
  frame.fillStyle(0x0a1a2e, 1);
  frame.fillRect(BOX_X + 14, BOX_Y + 14, PORTRAIT + 2, PORTRAIT + 2);
  frame.lineStyle(2, 0x06b6d4, 0.88);
  frame.strokeRect(BOX_X + 12, BOX_Y + 12, PORTRAIT + 4, PORTRAIT + 4);

  const portrait = scene.add
    .image(BOX_X + 16 + PORTRAIT / 2, BOX_Y + 16 + PORTRAIT / 2, PORTRAIT_KEY)
    .setDisplaySize(PORTRAIT, PORTRAIT)
    .setOrigin(0.5);

  const nameText = scene.add
    .text(TEXT_X, BOX_Y + 22, '', {
      ...TYPE.eyebrow,
      color: '#06b6d4',
      fontSize: s(13) + 'px',
    })
    .setDepth(1);

  const dividerG = scene.add.graphics().setDepth(1);
  dividerG.lineStyle(1, 0x06b6d4, 0.35);
  dividerG.beginPath();
  dividerG.moveTo(TEXT_X, BOX_Y + 44);
  dividerG.lineTo(BOX_X + BOX_W - 20, BOX_Y + 44);
  dividerG.strokePath();

  const dialogueText = scene.add
    .text(TEXT_X, BOX_Y + 54, '', {
      fontFamily: (TYPE.body as { fontFamily: string }).fontFamily,
      fontSize: s(13) + 'px',
      color: COLORS.text.primary,
      wordWrap: { width: TEXT_W },
      lineSpacing: 4,
    })
    .setDepth(1);

  // Animated down-arrow caret
  const caret = scene.add
    .text(BOX_X + BOX_W - 22, BOX_Y + BOX_H - 20, 'v', {
      fontFamily: (TYPE.micro as { fontFamily: string }).fontFamily,
      fontSize: s(10) + 'px',
      color: '#06b6d4',
    })
    .setOrigin(0.5, 1)
    .setDepth(1);

  scene.tweens.add({
    targets: caret,
    y: BOX_Y + BOX_H - 16,
    duration: 640,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  container.add([bg, frame, portrait, nameText, dividerG, dialogueText, caret]);
  container.setAlpha(0);

  function show(npcName: string, text: string): void {
    nameText.setText(npcName);
    dialogueText.setText(text);
    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      alpha: 1,
      y: 0,
      duration: 300,
      ease: 'Power2.easeOut',
    });
  }

  function hide(): void {
    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 220,
      ease: 'Power1',
    });
  }

  return { show, hide };
}

/** Procedural Rune Keeper portrait — a hooded figure with glowing eyes. */
function ensurePortraitTexture(scene: Phaser.Scene): void {
  const KEY = 'portrait_rune_keeper';
  if (scene.textures.exists(KEY)) return;

  const size = PORTRAIT;
  const g = scene.make.graphics(undefined, false);
  const cx = size / 2;

  // Dark background
  g.fillStyle(0x08132a, 1);
  g.fillRect(0, 0, size, size);

  // Robe / cloak body (dark teal-blue trapezoid)
  g.fillStyle(0x132844, 1);
  g.fillTriangle(cx, 14, 6, size - 2, size - 6, size - 2);

  // Hood inner shadow
  g.fillStyle(0x0b1e36, 0.9);
  g.fillCircle(cx, 32, 20);

  // Face / void inside hood
  g.fillStyle(0x05090f, 0.95);
  g.fillEllipse(cx, 32, 26, 26);

  // Glowing eyes
  g.fillStyle(0x06b6d4, 1);
  g.fillCircle(cx - 5, 32, 3.5);
  g.fillCircle(cx + 5, 32, 3.5);

  // Eye halo
  g.fillStyle(0x06b6d4, 0.18);
  g.fillCircle(cx - 5, 32, 6.5);
  g.fillCircle(cx + 5, 32, 6.5);

  // Hood rim highlight
  g.lineStyle(1, 0x2a6080, 0.55);
  g.strokeCircle(cx, 26, 21);

  // Robe crease lines
  g.lineStyle(1, 0x1a3855, 0.4);
  g.beginPath();
  g.moveTo(cx, 46);
  g.lineTo(cx - 10, size - 4);
  g.moveTo(cx, 46);
  g.lineTo(cx + 10, size - 4);
  g.strokePath();

  // Rune tablet glyph on chest
  g.lineStyle(1, 0x2a8fa0, 0.45);
  g.fillStyle(0x07b0c8, 0.18);
  g.fillRect(cx - 6, 54, 12, 12);
  g.strokeRect(cx - 6, 54, 12, 12);
  g.beginPath();
  g.moveTo(cx - 3, 60);
  g.lineTo(cx + 3, 60);
  g.moveTo(cx, 57);
  g.lineTo(cx, 63);
  g.strokePath();

  g.generateTexture(KEY, size, size);
  g.destroy();
}

/** Procedural Console Keeper portrait — bespectacled engineer in a hood. */
function ensureConsoleKeeperPortrait(scene: Phaser.Scene): void {
  const KEY = 'portrait_console_keeper';
  if (scene.textures.exists(KEY)) return;

  const size = PORTRAIT;
  const g = scene.make.graphics(undefined, false);
  const cx = size / 2;

  // Dark backdrop
  g.fillStyle(0x081229, 1);
  g.fillRect(0, 0, size, size);

  // Robe trapezoid (slightly more teal than Rune Keeper)
  g.fillStyle(0x123250, 1);
  g.fillTriangle(cx, 14, 6, size - 2, size - 6, size - 2);

  // Hood inner shadow
  g.fillStyle(0x081e36, 0.9);
  g.fillCircle(cx, 32, 20);

  // Face — slightly visible (not a void like Rune Keeper)
  g.fillStyle(0x1a2a3e, 1);
  g.fillEllipse(cx, 34, 22, 24);

  // Round goggles (the bespectacled engineer look)
  g.fillStyle(0x06b6d4, 1);
  g.fillCircle(cx - 6, 33, 4.5);
  g.fillCircle(cx + 6, 33, 4.5);
  g.lineStyle(1.2, 0x2a8fa0, 0.9);
  g.strokeCircle(cx - 6, 33, 5);
  g.strokeCircle(cx + 6, 33, 5);
  // Goggle bridge
  g.beginPath();
  g.moveTo(cx - 2, 33);
  g.lineTo(cx + 2, 33);
  g.strokePath();

  // Hood rim
  g.lineStyle(1, 0x2a6080, 0.55);
  g.strokeCircle(cx, 26, 21);

  // Robe creases
  g.lineStyle(1, 0x1a3855, 0.4);
  g.beginPath();
  g.moveTo(cx, 46);
  g.lineTo(cx - 10, size - 4);
  g.moveTo(cx, 46);
  g.lineTo(cx + 10, size - 4);
  g.strokePath();

  // Toolbelt console icon on chest (a small panel with two buttons)
  g.fillStyle(0x07b0c8, 0.18);
  g.fillRect(cx - 8, 54, 16, 12);
  g.lineStyle(1, 0x2a8fa0, 0.65);
  g.strokeRect(cx - 8, 54, 16, 12);
  g.fillStyle(0xff5d6c, 1);
  g.fillCircle(cx - 3, 60, 1.4);
  g.fillStyle(0x6cffa6, 1);
  g.fillCircle(cx + 3, 60, 1.4);

  g.generateTexture(KEY, size, size);
  g.destroy();
}
