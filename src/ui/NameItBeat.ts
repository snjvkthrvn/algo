/**
 * NameItBeat — the FEEL→NAME moment (docs/VISION.md §3).
 *
 * After a solve, a character names what the player just did in one or two
 * lines, spoken through the same DialogueBox language the overworld uses,
 * followed by a quiet "Codex updated" whisper. This replaces the old
 * five-tab ConceptBridge lecture as the mandatory post-puzzle flow — the
 * deep material lives on in the Codex as optional reading.
 *
 * Shared by both puzzle architectures (BasePuzzleScene subclasses and the
 * arcadePrologue scenes), so it must not assume any base-class state.
 */

import Phaser from 'phaser';
import { FONTS, COLOR_HEX } from '../config/constants';
import { gameState } from '../core/GameStateManager';
import { a11yManager } from '../core/A11yManager';
import { audioManager } from '../core/AudioManager';
import { DialogueBox } from './DialogueBox';

export interface NameItBeatData {
  /** Exact speaker name — drives the DialogueBox portrait lookup. */
  speaker: string;
  /** One or two short lines. The naming, not a lecture. */
  lines: string[];
  /** Display name for the codex whisper, e.g. "Bubble Sort". */
  conceptName: string;
}

export interface NameItBeatOptions {
  /** Show the "Codex updated" whisper after the lines. Default true. */
  codexWhisper?: boolean;
}

/**
 * Play the naming beat on any scene. Resolves once the player has advanced
 * through the lines (and the codex whisper has settled, when enabled).
 * Advancing works with keyboard (Space/Enter), pointer, and gamepad (any
 * button) so the beat has the same input parity as the rooms it follows.
 */
export function playNameItBeat(
  scene: Phaser.Scene,
  beat: NameItBeatData,
  options: NameItBeatOptions = {},
): Promise<void> {
  return new Promise((resolve) => {
    const box = new DialogueBox(scene);
    let lineIndex = 0;
    let finished = false;

    const showLine = (): void => {
      box.show(beat.speaker, beat.lines[lineIndex], () => {
        lineIndex++;
        if (lineIndex < beat.lines.length) {
          showLine();
        } else {
          finish();
        }
      });
    };

    const advance = (): void => {
      if (!finished) box.advance();
    };

    const spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const enterKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    spaceKey?.on('down', advance);
    enterKey?.on('down', advance);
    scene.input.on('pointerdown', advance);
    scene.input.gamepad?.on('down', advance);

    const cleanup = (): void => {
      spaceKey?.off('down', advance);
      enterKey?.off('down', advance);
      scene.input.off('pointerdown', advance);
      scene.input.gamepad?.off('down', advance);
      box.destroy();
    };

    const finish = (): void => {
      if (finished) return;
      finished = true;
      cleanup();
      if (options.codexWhisper === false) {
        resolve();
      } else {
        showCodexWhisper(scene, beat.conceptName).then(resolve);
      }
    };

    showLine();
  });
}

/**
 * The silent codex receipt: a small gold note that drifts up from the
 * corner and fades. No scene change, no quiz — the Codex itself is the
 * optional deep layer. Kept quiet on purpose: the mechanical victory is
 * the loud part of the moment.
 */
export function showCodexWhisper(scene: Phaser.Scene, conceptName: string): Promise<void> {
  return new Promise((resolve) => {
    const { width } = scene.cameras.main;
    const reduceMotion = gameState.getSettings().reduceMotion;

    a11yManager.announce(`Codex updated: ${conceptName}.`, false);
    audioManager.playTone?.(880, 90, 'sine');

    const note = scene.add
      .text(width - 24, 96, `✦ Codex — ${conceptName}`, {
        fontSize: '11px',
        fontFamily: FONTS.RETRO,
        color: COLOR_HEX.GOLD,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(1, 0.5)
      .setDepth(9999)
      .setScrollFactor(0)
      .setAlpha(0);

    if (reduceMotion) {
      note.setAlpha(1);
      scene.time.delayedCall(900, () => {
        note.destroy();
        resolve();
      });
      return;
    }

    scene.tweens.add({
      targets: note,
      alpha: 1,
      y: 88,
      duration: 260,
      ease: 'Power2.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: note,
          alpha: 0,
          y: 78,
          duration: 320,
          ease: 'Power3.easeIn',
          delay: 950,
          onComplete: () => {
            note.destroy();
            resolve();
          },
        });
      },
    });
  });
}
