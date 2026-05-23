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
  [SCENE_KEYS.PUZZLE_P0_1]: VISUAL_REVAMP_KEYS.P0_1_COSMIC_BG,
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
  // Deep cosmic purple — top-left and top-right brighter to suggest distant galaxies,
  // bottom corners darker so the platform reads against a calm field.
  g.fillGradientStyle(0x2a1158, 0x451b78, 0x0a0420, 0x140832, 1, 1, 1, 1);
  g.fillRect(0, 0, STAGE.width, STAGE.height);
  return false;
}

function paintEdgeFog(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(3);
  g.fillStyle(COLORS.bg.deep, 0.55);
  g.fillRect(0, 0, STAGE.width, s(36));
  g.fillRect(0, STAGE.height - s(36), STAGE.width, s(36));
}

function ensureStarTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(STAR_KEY)) return;
  const g = scene.make.graphics(undefined, false);
  const rng = Phaser.Math.RND;
  // Denser starfield — cosmic-rune-platform bg should feel like deep space.
  const count = Math.round(140 * (STAGE.width * STAGE.height) / (960 * 540));
  for (let i = 0; i < count; i += 1) {
    const x = rng.between(0, STAGE.width);
    const y = rng.between(0, STAGE.height);
    const alpha = rng.realInRange(0.2, 0.85);
    const size = rng.realInRange(s(0.6), s(1.6));
    const tint = rng.weightedPick([0xdfeaff, 0xa6d4ff, 0xffd6f6, 0xffeac0]);
    g.fillStyle(tint, alpha);
    g.fillCircle(x, y, size);
  }
  // A handful of large twinkles.
  for (let i = 0; i < 14; i += 1) {
    const x = rng.between(0, STAGE.width);
    const y = rng.between(0, STAGE.height);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, s(2));
    g.fillStyle(0xb8d8ff, 0.35);
    g.fillCircle(x, y, s(5));
  }
  g.generateTexture(STAR_KEY, STAGE.width, STAGE.height);
  g.destroy();
}

function ensureNebulaTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(NEBULA_KEY)) return;
  const g = scene.make.graphics(undefined, false);
  const cx = STAGE.width / 2;
  const cy = STAGE.height / 2;
  // Three overlapping nebula clouds — purple primary, magenta + cyan accents.
  for (let i = 14; i >= 1; i -= 1) {
    g.fillStyle(0x9c5cff, 0.022);
    g.fillCircle(cx + s(140), cy - s(60), s(260 - i * 14));
  }
  for (let i = 12; i >= 1; i -= 1) {
    g.fillStyle(0xd64dc8, 0.018);
    g.fillCircle(cx - s(200), cy - s(40), s(220 - i * 12));
  }
  for (let i = 10; i >= 1; i -= 1) {
    g.fillStyle(0x2b8fd6, 0.018);
    g.fillCircle(cx - s(100), cy + s(80), s(200 - i * 12));
  }
  g.generateTexture(NEBULA_KEY, STAGE.width, STAGE.height);
  g.destroy();
}
