/**
 * BossPhaseTransition — dramatic phase-shift banner for multi-phase bosses.
 *
 * Existing boss code (Boss_Shuffler, Boss_MirrorSerpent) already implements
 * 3-phase progressions where each phase integrates a different region
 * pattern — bubble→hash→pair for the Shuffler, reverse→twoSum→fixedWindow
 * for the Mirror Serpent. The composition is real; what was missing was
 * a VISIBLE transition between phases. Players blew through Phase I and
 * suddenly the mechanic changed with no announcement, which the game audit
 * flagged as "bosses don't feel like bosses".
 *
 * This widget gives every phase shift a beat:
 *
 *   1. brief pause (the previous phase's complete-burst can settle)
 *   2. wide banner card slides in from above with phase label
 *   3. audio sting (a low-then-high two-note motif)
 *   4. soft color flash in the boss's accent color
 *   5. hold for ~1.1s so the player can read the label
 *   6. card slides up and out
 *   7. onComplete fires — caller starts the new phase mechanic
 *
 * Total duration: ~2.0s. The pause+flourish is the "the boss is shifting
 * tactics, get ready" beat that the audit asked for. Honors reduce-motion
 * (the slide collapses to a fade and the screen flash is suppressed).
 */

import Phaser from 'phaser';
import { COLORS, FONTS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { JuiceSystem } from '../systems/JuiceSystem';
import { drawPanel } from './panel';
import { gameState } from '../core/GameStateManager';
import { a11yManager } from '../core/A11yManager';

export interface BossPhaseTransitionOptions {
  /** Roman numeral or short token, e.g. "II" or "III". */
  phaseNumber: string;
  /** Phase title, e.g. "HASH STORM" or "FIXED WINDOW". */
  phaseName: string;
  /** Optional one-line pattern hint shown small under the title. */
  patternHint?: string;
  /**
   * Accent colour used for the card border and the soft screen flash.
   * Pick something diegetic to the phase (golden for hash, teal for
   * sliding window, etc.) so the colour itself foreshadows the mechanic.
   */
  accentColor?: number;
  /** Callback fired when the banner has fully retracted. Start the new
   *  phase's mechanic here. */
  onComplete: () => void;
}

const DEFAULT_ACCENT = 0xfbbf24;

export function playBossPhaseTransition(
  scene: Phaser.Scene,
  options: BossPhaseTransitionOptions,
): void {
  const { width, height } = scene.cameras.main;
  const accent = options.accentColor ?? DEFAULT_ACCENT;
  const reduceMotion = gameState.getSettings().reduceMotion;

  // Build the banner as a container so the slide/fade tween is one target.
  const cardW = Math.min(width - 80, 520);
  const cardH = 110;
  const cardX = width / 2 - cardW / 2;
  const cardYFinal = height / 2 - cardH / 2;
  // Off-screen start above the camera so the slide reads as "descends".
  const cardYStart = reduceMotion ? cardYFinal : -cardH - 12;

  const container = scene.add.container(0, cardYStart).setDepth(9990).setAlpha(reduceMotion ? 0 : 1);

  const bg = scene.add.graphics();
  drawPanel(scene, cardX, 0, cardW, cardH, {
    accent,
    accentSide: 'top',
    fill: COLORS.OVERLAY_BG,
    frame: COLORS.FRAME_BORDER_LIGHT,
    inner: COLORS.SUCCESS,
    alpha: 0.95,
    shadow: true,
    shadowAlpha: 0.4,
    graphics: bg,
  });
  container.add(bg);

  const phaseLine = scene.add
    .text(width / 2, 22, `PHASE  ${options.phaseNumber}`, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
      letterSpacing: 4,
    })
    .setOrigin(0.5, 0);
  container.add(phaseLine);

  const nameLine = scene.add
    .text(width / 2, 44, options.phaseName, {
      fontSize: '20px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      stroke: '#0a0a1a',
      strokeThickness: 2,
    })
    .setOrigin(0.5, 0);
  container.add(nameLine);

  if (options.patternHint) {
    const hintLine = scene.add
      .text(width / 2, 78, options.patternHint, {
        fontSize: '10px',
        fontFamily: FONTS.RETRO,
        color: '#7ffcff',
      })
      .setOrigin(0.5, 0);
    container.add(hintLine);
  }

  // Audio sting — low note then a higher mark. Cheap "the boss is doing
  // something new" cue; sits over the existing puzzle music without
  // colliding because the two notes are sequential.
  audioManager.playTone?.(196, 140, 'square'); // G3
  scene.time.delayedCall(180, () => audioManager.playTone?.(523, 220, 'triangle')); // C5

  // Soft color flash on the whole screen — suppressed under reduce-motion
  // (the banner alone carries the cue).
  if (!reduceMotion) {
    JuiceSystem.screenFlash(scene, accent, 0.12, 240);
  }

  // Announce to assistive tech.
  a11yManager.announce(
    `Phase ${options.phaseNumber}. ${options.phaseName}.${options.patternHint ? ' ' + options.patternHint : ''}`,
    true,
  );

  // Slide in (or fade in under reduce-motion), hold, slide out, callback.
  scene.tweens.add({
    targets: container,
    y: cardYFinal,
    alpha: reduceMotion ? 1 : 1,
    duration: reduceMotion ? 240 : 420,
    ease: reduceMotion ? 'Sine.easeOut' : 'Back.easeOut',
    onComplete: () => {
      scene.time.delayedCall(1100, () => {
        scene.tweens.add({
          targets: container,
          y: reduceMotion ? cardYFinal : -cardH - 12,
          alpha: reduceMotion ? 0 : 1,
          duration: reduceMotion ? 220 : 360,
          ease: reduceMotion ? 'Sine.easeIn' : 'Back.easeIn',
          onComplete: () => {
            container.destroy(true);
            options.onComplete();
          },
        });
      });
    },
  });
}
