import Phaser from 'phaser';
import { VISUAL_REVAMP_KEYS } from '../../../../config/assets';
import { SCENE_KEYS } from '../../../../config/constants';
import { COLORS, s, STAGE } from '../tokens';

/**
 * Quiet, two-layer backdrop:
 *  - gradient stage fill (no per-frame work)
 *  - one cached starfield texture
 *  - one cached nebula blob, dimmed during preview
 */

export type Atmosphere = {
  setMood(mood: 'normal' | 'preview'): void;
};

const STAR_KEY = 'p0_1_stars';
const NEBULA_KEY = 'p0_1_nebula';
const BACKDROP_BY_SCENE: Partial<Record<string, string>> = {
  [SCENE_KEYS.PUZZLE_P0_1]: VISUAL_REVAMP_KEYS.PUZZLE_RUNE_MEMORY_BG,
  [SCENE_KEYS.PUZZLE_P0_2]: VISUAL_REVAMP_KEYS.PUZZLE_FLOW_CONSOLES_BG,
  [SCENE_KEYS.BOSS_SENTINEL]: VISUAL_REVAMP_KEYS.PUZZLE_LITANY_TRIAL_BG,
};

export function paintAtmosphere(scene: Phaser.Scene): Atmosphere {
  const hasArtBackdrop = paintBackdrop(scene);
  ensureStarTexture(scene);
  ensureNebulaTexture(scene);

  const defaultNebulaAlpha = hasArtBackdrop ? 0.24 : 0.75;
  const defaultStarsAlpha = hasArtBackdrop ? 0.42 : 1;

  const nebula = scene.add
    .image(STAGE.width / 2, STAGE.height / 2, NEBULA_KEY)
    .setDepth(1)
    .setAlpha(defaultNebulaAlpha);

  const stars = scene.add
    .image(STAGE.width / 2, STAGE.height / 2, STAR_KEY)
    .setDepth(2)
    .setAlpha(defaultStarsAlpha);

  paintEdgeFog(scene);
  paintWatcherDrift(scene);

  let active: 'normal' | 'preview' = 'normal';

  return {
    setMood(mood) {
      if (mood === active) return;
      active = mood;
      const starsAlpha = mood === 'preview' ? Math.min(defaultStarsAlpha, 0.24) : defaultStarsAlpha;
      const nebulaAlpha = mood === 'preview' ? Math.min(defaultNebulaAlpha, 0.18) : defaultNebulaAlpha;
      scene.tweens.add({ targets: stars, alpha: starsAlpha, duration: 320, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: nebula, alpha: nebulaAlpha, duration: 320, ease: 'Sine.easeInOut' });
    },
  };
}

function paintBackdrop(scene: Phaser.Scene): boolean {
  const backdropKey = BACKDROP_BY_SCENE[scene.scene.key];
  if (backdropKey && scene.textures.exists(backdropKey)) {
    scene.add
      .image(STAGE.width / 2, STAGE.height / 2, backdropKey)
      .setDisplaySize(STAGE.width, STAGE.height)
      .setDepth(0);

    const veil = scene.add.graphics().setDepth(0.5);
    veil.fillGradientStyle(0x02030a, 0x02030a, 0x050b14, 0x050b14, 0.34, 0.26, 0.42, 0.48);
    veil.fillRect(0, 0, STAGE.width, STAGE.height);
    return true;
  }

  const g = scene.add.graphics().setDepth(0);
  g.fillGradientStyle(0x0e1330, 0x0a112a, 0x040611, 0x07081b, 1, 1, 1, 1);
  g.fillRect(0, 0, STAGE.width, STAGE.height);
  return false;
}

function paintEdgeFog(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(3);
  g.fillStyle(COLORS.bg.deep, 0.55);
  g.fillRect(0, 0, STAGE.width, s(36));
  g.fillRect(0, STAGE.height - s(36), STAGE.width, s(36));
}

/**
 * The distant Watcher — a purple diamond prism drifting slowly across the top
 * of the chamber. It signals "you are being observed" without pulling focus
 * from the rune board, and gives the cosmic backdrop a slow living motion.
 */
function paintWatcherDrift(scene: Phaser.Scene): void {
  const prism = scene.add.container(-s(40), s(60)).setDepth(3.2);
  const gfx = scene.add.graphics();
  gfx.fillStyle(0xa78bfa, 0.28);
  gfx.fillTriangle(0, -s(14), s(14), 0, 0, s(14));
  gfx.fillTriangle(0, -s(14), -s(14), 0, 0, s(14));
  gfx.lineStyle(1, 0xa78bfa, 0.55);
  gfx.strokeTriangle(0, -s(14), s(14), 0, 0, s(14));
  gfx.strokeTriangle(0, -s(14), -s(14), 0, 0, s(14));
  gfx.fillStyle(0xa78bfa, 0.55);
  gfx.fillRect(-s(2), -s(2), s(4), s(4));
  prism.add(gfx);
  prism.setAlpha(0.4);
  scene.tweens.add({
    targets: prism,
    x: STAGE.width + s(40),
    duration: 42000,
    repeat: -1,
    delay: -10000,
    ease: 'Linear',
  });
  scene.tweens.add({
    targets: gfx,
    angle: 360,
    duration: 18000,
    repeat: -1,
    ease: 'Linear',
  });
}

function ensureStarTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(STAR_KEY)) return;
  const g = scene.make.graphics(undefined, false);
  const rng = Phaser.Math.RND;
  // Density scales with the scaled stage area so the sky doesn't look sparse.
  const count = Math.round(56 * (STAGE.width * STAGE.height) / (960 * 540));
  for (let i = 0; i < count; i += 1) {
    const x = rng.between(0, STAGE.width);
    const y = rng.between(0, STAGE.height);
    const alpha = rng.realInRange(0.16, 0.5);
    const size = rng.realInRange(s(0.6), s(1.4));
    g.fillStyle(0xdfeaff, alpha);
    g.fillCircle(x, y, size);
  }
  g.generateTexture(STAR_KEY, STAGE.width, STAGE.height);
  g.destroy();
}

function ensureNebulaTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(NEBULA_KEY)) return;
  const g = scene.make.graphics(undefined, false);
  const cx = STAGE.width / 2;
  const cy = STAGE.height / 2;
  // Two overlapping soft blobs — a quiet wash, no additive stacks.
  for (let i = 10; i >= 1; i -= 1) {
    g.fillStyle(0x6c52d6, 0.012);
    g.fillCircle(cx + s(80), cy - s(30), s(180 - i * 10));
  }
  for (let i = 8; i >= 1; i -= 1) {
    g.fillStyle(0x2b8fd6, 0.01);
    g.fillCircle(cx - s(90), cy + s(50), s(180 - i * 10));
  }
  g.generateTexture(NEBULA_KEY, STAGE.width, STAGE.height);
  g.destroy();
}
