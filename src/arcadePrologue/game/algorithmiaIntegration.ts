import Phaser from 'phaser';
import { SCENE_KEYS } from '../../config/constants';
import { gameState } from '../../core/GameStateManager';
import type { ConceptBridgeData } from '../../data/types';

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
    hintsUsed: 0,
  });

  if (scene.scene.isActive(PROLOGUE_RUN_UI_KEY)) {
    scene.scene.stop(PROLOGUE_RUN_UI_KEY);
  }

  const { width, height } = scene.cameras.main;
  const fadeOverlay = scene.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(10000);

  scene.tweens.add({
    targets: fadeOverlay,
    alpha: 1,
    duration: 500,
    delay: options.delayMs ?? (alreadyCompleted ? 800 : 1400),
    onComplete: () => {
      fadeOverlay.destroy();
      const bridgeData: ConceptBridgeData = {
        puzzleName: options.puzzleName,
        puzzleId: options.puzzleId,
        concept: options.concept,
        returnScene: options.returnScene,
        attempts: 0,
        timeSpent,
        hintsUsed: 0,
        stars,
      };
      scene.scene.start(SCENE_KEYS.CONCEPT_BRIDGE, bridgeData);
    },
  });
}
