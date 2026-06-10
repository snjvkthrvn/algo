/**
 * BossEntryBanner — dramatic "BOSS BATTLE" reveal when a boss scene mounts.
 *
 * The brutal audit flagged that boss scenes (Sentinel, Shuffler, Mirror
 * Serpent) re-use the exact same puzzle-frame chrome as tutorial puzzles
 * with only a small "Phase I" label as the boss tell. Players blow into
 * the scene and wonder if this is just another puzzle.
 *
 * This widget fires a full-width banner card on entry:
 *   1. Black scrim fades in (briefly darkens the scene)
 *   2. Red "BOSS BATTLE" tag slides down from above
 *   3. Boss name appears in large mythic letters
 *   4. Subtitle (region tag + one-line thesis) fades in
 *   5. Audio sting (deep then soaring two-note motif)
 *   6. Hold ~2.0s
 *   7. Card slides up + scrim fades out
 *   8. onComplete fires — boss-scene-specific setup begins
 *
 * Total entry beat: ~2.6s. The pause is the "you are entering combat"
 * cue the audit asked for. Honors reduceMotion (the slide collapses to
 * a fade, the scrim is suppressed, the timing tightens to ~1.4s).
 */

import Phaser from 'phaser';
import { COLORS, FONTS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { drawPanel } from './panel';
import { gameState } from '../core/GameStateManager';
import { a11yManager } from '../core/A11yManager';

export interface BossEntryBannerOptions {
  /** Boss display name, e.g. "The Shuffler". */
  bossName: string;
  /** Region this boss belongs to, e.g. "Array Plains finale". Shown small below name. */
  regionTag: string;
  /** One-line thesis of the boss, shown below subtitle. Optional. */
  thesis?: string;
  /**
   * Accent color used for the BOSS BATTLE tag + card border. Pick per-boss
   * so each capstone has its own signature: Sentinel = cyan/mystic,
   * Shuffler = gold/chaos, Mirror Serpent = teal/water. The audit asked
   * each boss to *feel* distinct from tutorials and from each other; the
   * accent does that visually.
   */
  accentColor?: number;
  /** Fires when the banner has fully retracted; start the boss mechanic here. */
  onComplete: () => void;
}

const DEFAULT_ACCENT = 0xef4444; // crimson — the "boss" register

export function playBossEntryBanner(
  scene: Phaser.Scene,
  options: BossEntryBannerOptions,
): void {
  const { width, height } = scene.cameras.main;
  const accent = options.accentColor ?? DEFAULT_ACCENT;
  const reduceMotion = (() => {
    try { return gameState.getSettings().reduceMotion; } catch { return false; }
  })();

  // Scrim — darkens the whole scene so the banner reads cleanly. Skipped
  // under reduceMotion (the banner alone carries the cue).
  let scrim: Phaser.GameObjects.Rectangle | null = null;
  if (!reduceMotion) {
    scrim = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0)
      .setDepth(9985)
      .setScrollFactor(0);
    scene.tweens.add({ targets: scrim, alpha: 0.38, duration: 140, ease: 'Sine.easeOut' });
  }

  // Banner card — wide horizontal panel that descends from above.
  const cardW = Math.min(width - 160, 640);
  const cardH = 132;
  const cardX = width / 2 - cardW / 2;
  const cardYFinal = height / 2 - cardH / 2 - 12;
  const cardYStart = reduceMotion ? cardYFinal : -cardH - 20;

  const container = scene.add.container(0, cardYStart)
    .setDepth(9990)
    .setAlpha(reduceMotion ? 0 : 1)
    .setScrollFactor(0);

  // drawPanel creates and returns its own Graphics; the previous code
  // tried to pass in a pre-created Graphics via a `graphics` option that
  // doesn't exist on PanelOptions — so it was being silently ignored
  // and the pre-created object stayed empty (the panel rendered fine
  // because drawPanel made its own; this just leaked one Graphics per
  // banner call). Use the drawPanel return value.
  const bg = drawPanel(scene, cardX, 0, cardW, cardH, {
    depth: 9990,
    accent,
    accentSide: 'top',
    fill: COLORS.OVERLAY_BG,
    frame: COLORS.FRAME_BORDER_LIGHT,
    inner: COLORS.SUCCESS,
    alpha: 0.96,
    shadow: true,
    shadowAlpha: 0.5,
  });
  container.add(bg);

  // BOSS BATTLE eyebrow — small, accent-colored, letterspaced so it reads
  // as a category tag rather than a name.
  const eyebrow = scene.add
    .text(width / 2, 22, 'BOSS  BATTLE', {
      fontSize: '9px',
      fontFamily: FONTS.RETRO,
      color: '#fca5a5',
      letterSpacing: 4,
    })
    .setOrigin(0.5, 0);
  container.add(eyebrow);

  // Boss name — large mythic letters, owns the centre of the card.
  const nameLine = scene.add
    .text(width / 2, 42, options.bossName, {
      fontSize: '24px',
      fontFamily: FONTS.RETRO,
      color: '#f8f8f6',
      stroke: '#0a0a1a',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 0);
  container.add(nameLine);

  // Region tag — small line below name to ground the boss in its region.
  const regionLine = scene.add
    .text(width / 2, 82, options.regionTag.toUpperCase(), {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
      letterSpacing: 3,
    })
    .setOrigin(0.5, 0);
  container.add(regionLine);

  // Optional thesis — one-line description of what the boss tests.
  if (options.thesis) {
    const thesisLine = scene.add
      .text(width / 2, 104, options.thesis, {
        fontSize: '9px',
        fontFamily: FONTS.RETRO,
        color: '#7ffcff',
        align: 'center',
        wordWrap: { width: cardW - 60 },
      })
      .setOrigin(0.5, 0);
    container.add(thesisLine);
  }

  // Audio sting — deep low note then a higher soaring note. Cheap
  // "something serious is happening" cue.
  audioManager.playTone?.(147, 220, 'square');  // D3
  scene.time.delayedCall(180, () => audioManager.playTone?.(440, 280, 'triangle')); // A4

  // Announce to assistive tech with assertive priority.
  a11yManager.announce(
    `Boss battle. ${options.bossName}. ${options.regionTag}.${options.thesis ? ' ' + options.thesis : ''}`,
    true,
  );

  // Total duration calibration:
  //   slide-in (520ms) + hold (1800ms) + slide-out (480ms) = ~2.8s
  //   reduceMotion: fade-in (260ms) + hold (900ms) + fade-out (260ms) = ~1.4s
  const slideInMs = reduceMotion ? 120 : 180;
  const holdMs = reduceMotion ? 180 : 260;
  const slideOutMs = reduceMotion ? 120 : 180;

  scene.tweens.add({
    targets: container,
    y: cardYFinal,
    alpha: 1,
    duration: slideInMs,
    ease: reduceMotion ? 'Sine.easeOut' : 'Back.easeOut',
    onComplete: () => {
      scene.time.delayedCall(holdMs, () => {
        scene.tweens.add({
          targets: container,
          y: reduceMotion ? cardYFinal : -cardH - 20,
          alpha: reduceMotion ? 0 : 1,
          duration: slideOutMs,
          ease: reduceMotion ? 'Sine.easeIn' : 'Back.easeIn',
          onComplete: () => {
            container.destroy(true);
            if (scrim) {
              scene.tweens.add({
                targets: scrim,
                alpha: 0,
                duration: 140,
                onComplete: () => scrim?.destroy(),
              });
            }
            options.onComplete();
          },
        });
      });
    },
  });
}
