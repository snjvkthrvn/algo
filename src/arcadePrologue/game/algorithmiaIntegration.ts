import Phaser from 'phaser';
import { SCENE_KEYS } from '../../config/constants';
import { gameState } from '../../core/GameStateManager';
import { playNameItBeat } from '../../ui/NameItBeat';
import { getNameItBeat } from '../../data/dialogue/name_it_beats';

export const PROLOGUE_RUN_UI_KEY = 'ProloguePuzzleRunUI';
export const PROLOGUE_GAME_OVER_KEY = 'ProloguePuzzleGameOver';

type LaunchData = {
  returnScene?: string;
};

type CompletionOptions = {
  puzzleId: string;
  puzzleName: string;
  concept: string;
  returnScene: string;
  startedAt: number;
  stars?: number;
  hintsUsed?: number;
  delayMs?: number;
};

export function resolveReturnScene(data: LaunchData | undefined): string {
  return data?.returnScene || SCENE_KEYS.PROLOGUE;
}

export function completeAlgorithmiaPuzzle(scene: Phaser.Scene, options: CompletionOptions): void {
  const stars = options.stars ?? 3;
  const timeSpent = Math.max(0, Math.floor((Date.now() - options.startedAt) / 1000));
  const alreadyCompleted = gameState.isPuzzleCompleted(options.puzzleId);

  gameState.setPuzzleResult(options.puzzleId, {
    stars,
    time: timeSpent,
    attempts: 0,
    hintsUsed: options.hintsUsed ?? 0,
  });

  if (scene.scene.isActive(PROLOGUE_RUN_UI_KEY)) {
    scene.scene.stop(PROLOGUE_RUN_UI_KEY);
  }

  const { width, height } = scene.cameras.main;
  const holdMs = options.delayMs ?? (alreadyCompleted ? 800 : 1400);

  // FEEL→NAME (docs/VISION.md §3): keeper names the concept in-scene, the
  // Codex updates silently via ProgressionSystem, and we return straight to
  // the overworld — no lecture screen.
  const fadeToReturnScene = (): void => {
    const fadeOverlay = scene.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10000);
    scene.tweens.add({
      targets: fadeOverlay,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        fadeOverlay.destroy();
        scene.scene.start(options.returnScene);
      },
    });
  };

  const beat = getNameItBeat(options.puzzleId);
  if (!beat || alreadyCompleted) {
    scene.time.delayedCall(holdMs + 200, fadeToReturnScene);
    return;
  }

  scene.time.delayedCall(holdMs, () => {
    void playNameItBeat(scene, beat).then(fadeToReturnScene);
  });
}
