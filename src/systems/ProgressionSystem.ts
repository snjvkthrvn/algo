/**
 * ProgressionSystem - Unlock gates, Bit evolution, Glitch encounters.
 */

import { gameState } from '../core/GameStateManager';
import { eventBus, GameEvents } from '../core/EventBus';
import { BitStage } from '../data/types';

class ProgressionSystemClass {
  constructor() {
    eventBus.on(GameEvents.PUZZLE_COMPLETE, (...args: unknown[]) => {
      const data = args[0] as { puzzleId: string };
      this.onPuzzleComplete(data.puzzleId);
    });
  }

  private onPuzzleComplete(puzzleId: string): void {
    gameState.setFlag(`puzzle_${puzzleId}_complete`, true);

    // The overworld scene plays this beat after puzzle/bridge transitions.
    if (
      puzzleId === 'p0_1' &&
      !gameState.getFlag('glitch_intro_done') &&
      !gameState.getFlag('glitch_encounter_1_pending')
    ) {
      gameState.setFlag('glitch_encounter_1_pending', true);
    }

    this.checkGates();
  }

  private checkGates(): void {
    const p01Done = gameState.getFlag('puzzle_p0_1_complete');
    const p02Done = gameState.getFlag('puzzle_p0_2_complete');

    if (p01Done && p02Done && !gameState.getFlag('boss_gate_open')) {
      gameState.setFlag('boss_gate_open', true);
      eventBus.emit('progression:gate-open', { gateId: 'boss_gate' });
    }

    const bossDefeated = gameState.getFlag('puzzle_boss_sentinel_complete');
    if (bossDefeated && !gameState.getFlag('gateway_open')) {
      gameState.setFlag('gateway_open', true);
      eventBus.emit('progression:gate-open', { gateId: 'array_plains_gateway' });

      if (gameState.getBitStage() === BitStage.SPARK) {
        gameState.setBitStage(BitStage.BYTE);
        gameState.collectShard('prologue_logic_shard');
      }

      // The overworld scene owns the post-Sentinel return and Glitch beats.
      if (!gameState.getFlag('boss_return_cutscene_done')) {
        gameState.setFlag('boss_return_cutscene_pending', true);
      }

      if (
        !gameState.getFlag('glitch_encounter_2_done') &&
        !gameState.getFlag('glitch_encounter_2_pending')
      ) {
        gameState.setFlag('glitch_encounter_2_pending', true);
      }
    }
  }

  isBossGateOpen(): boolean {
    return gameState.getFlag('boss_gate_open');
  }

  isGatewayOpen(): boolean {
    return gameState.getFlag('gateway_open');
  }

  getPrologueProgress(): { puzzles: number; total: number } {
    let completed = 0;
    if (gameState.getFlag('puzzle_p0_1_complete')) completed++;
    if (gameState.getFlag('puzzle_p0_2_complete')) completed++;
    if (gameState.getFlag('puzzle_boss_sentinel_complete')) completed++;
    return { puzzles: completed, total: 3 };
  }
}

/** Singleton: registers EventBus listeners once for the entire session. */
export const progressionSystem = new ProgressionSystemClass();
