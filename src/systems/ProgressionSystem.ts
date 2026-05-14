/**
 * ProgressionSystem - Unlock gates, Bit evolution, Glitch encounters.
 *
 * Regions 1-2 (Prologue, Array Plains) are hand-rolled because they own special
 * cinematics and Bit evolution beats. Regions 3-9 follow a uniform pattern
 * (4 puzzles -> boss gate -> boss complete -> next gateway) and are driven by
 * REGION_CHAIN below so the same code drives every transition.
 */

import { gameState } from '../core/GameStateManager';
import { eventBus, GameEvents } from '../core/EventBus';
import { BitStage } from '../data/types';

interface RegionChainEntry {
  /** Stable id for the boss-gate flag, e.g. 'mirror_serpent_gate_open'. */
  bossGateFlag: string;
  /** Puzzle ids whose completion opens the boss gate. */
  puzzleIds: string[];
  /** Boss puzzle id (also a flag prefix: `puzzle_<id>_complete`). */
  bossPuzzleId: string;
  /** Flag set after the boss falls; opens the next region's gateway. */
  nextGatewayFlag: string;
  /** Optional Bit evolution after the boss falls. */
  bitEvolution?: { from: BitStage; to: BitStage };
  /** Optional shard awarded after the boss falls. */
  shardId?: string;
  /** Optional codex entry unlocked. */
  codexEntryId?: string;
  /** If true, this is the final boss — no next gateway, fire endgame instead. */
  isFinalBoss?: boolean;
}

const REGION_CHAIN: RegionChainEntry[] = [
  {
    // Twin Rivers
    bossGateFlag: 'mirror_serpent_gate_open',
    puzzleIds: ['tr_1', 'tr_2', 'tr_3', 'tr_4'],
    bossPuzzleId: 'boss_mirror_serpent',
    nextGatewayFlag: 'hash_highlands_gateway_open',
    bitEvolution: { from: BitStage.FRAME, to: BitStage.BRANCH },
    shardId: 'twin_rivers_logic_shard',
  },
  {
    // Hash Highlands
    bossGateFlag: 'archivist_gate_open',
    puzzleIds: ['hh_1', 'hh_2', 'hh_3', 'hh_4'],
    bossPuzzleId: 'boss_archivist',
    nextGatewayFlag: 'stack_spires_gateway_open',
    shardId: 'hash_highlands_logic_shard',
  },
  {
    // Stack Spires
    bossGateFlag: 'recursion_gate_open',
    puzzleIds: ['ss_1', 'ss_2', 'ss_3', 'ss_4'],
    bossPuzzleId: 'boss_recursion',
    nextGatewayFlag: 'queue_canals_gateway_open',
    shardId: 'stack_spires_logic_shard',
  },
  {
    // Queue Canals
    bossGateFlag: 'reconciler_gate_open',
    puzzleIds: ['qc_1', 'qc_2', 'qc_3', 'qc_4'],
    bossPuzzleId: 'boss_reconciler',
    nextGatewayFlag: 'tree_canopy_gateway_open',
    bitEvolution: { from: BitStage.BRANCH, to: BitStage.GRAPH },
    shardId: 'queue_canals_logic_shard',
  },
  {
    // Tree Canopy
    bossGateFlag: 'pattern_gate_open',
    puzzleIds: ['tc_1', 'tc_2', 'tc_3', 'tc_4'],
    bossPuzzleId: 'boss_pattern',
    nextGatewayFlag: 'graph_nexus_gateway_open',
    shardId: 'tree_canopy_logic_shard',
  },
  {
    // Graph Nexus
    bossGateFlag: 'echo_gate_open',
    puzzleIds: ['gn_1', 'gn_2', 'gn_3', 'gn_4'],
    bossPuzzleId: 'boss_echo',
    nextGatewayFlag: 'core_gateway_open',
    shardId: 'graph_nexus_logic_shard',
  },
  {
    // Core (final region)
    bossGateFlag: 'protocol_omega_gate_open',
    puzzleIds: ['core_1', 'core_2', 'core_3', 'core_4'],
    bossPuzzleId: 'boss_protocol_omega',
    nextGatewayFlag: 'game_complete',
    bitEvolution: { from: BitStage.GRAPH, to: BitStage.CORE },
    shardId: 'core_logic_shard',
    isFinalBoss: true,
  },
];

class ProgressionSystemClass {
  constructor() {
    eventBus.on(GameEvents.PUZZLE_COMPLETE, (...args: unknown[]) => {
      const data = args[0] as { puzzleId: string };
      this.onPuzzleComplete(data.puzzleId);
    });
  }

  private onPuzzleComplete(puzzleId: string): void {
    gameState.setFlag(`puzzle_${puzzleId}_complete`, true);

    // Script Scene 0-4 / 0-6: Codex entries unlock immediately after each
    // prologue puzzle. The Sentinel boss does not award a codex entry — its
    // payoff is the shard + Bit evolution handled in checkGates().
    if (puzzleId === 'p0_1') gameState.unlockCodexEntry('sequential_processing');
    if (puzzleId === 'p0_2') gameState.unlockCodexEntry('key_value_mapping');

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

    const arrayPuzzlesDone = [
      'puzzle_ap_1_complete',
      'puzzle_ap_2_complete',
      'puzzle_ap_3_complete',
      'puzzle_ap_4_complete',
    ].every((flag) => gameState.getFlag(flag));

    if (arrayPuzzlesDone && !gameState.getFlag('shuffler_gate_open')) {
      gameState.setFlag('shuffler_gate_open', true);
      eventBus.emit('progression:gate-open', { gateId: 'shuffler_gate' });
    }

    const shufflerDefeated = gameState.getFlag('puzzle_boss_shuffler_complete');
    if (shufflerDefeated && !gameState.getFlag('twin_rivers_gateway_open')) {
      gameState.setFlag('twin_rivers_gateway_open', true);
      eventBus.emit('progression:gate-open', { gateId: 'twin_rivers_gateway' });

      if (gameState.getBitStage() === BitStage.BYTE) {
        gameState.setBitStage(BitStage.FRAME);
      }

      gameState.collectShard('array_plains_logic_shard');
      gameState.unlockCodexEntry('collection_mastery');
    }

    // Regions 3-9: identical pattern, driven by REGION_CHAIN.
    for (const entry of REGION_CHAIN) {
      this.checkRegionEntry(entry);
    }
  }

  private checkRegionEntry(entry: RegionChainEntry): void {
    // Boss gate opens once all four region puzzles are complete.
    const puzzlesDone = entry.puzzleIds.every((id) =>
      gameState.getFlag(`puzzle_${id}_complete`)
    );
    if (puzzlesDone && !gameState.getFlag(entry.bossGateFlag)) {
      gameState.setFlag(entry.bossGateFlag, true);
      eventBus.emit('progression:gate-open', { gateId: entry.bossGateFlag });
    }

    // Boss falls -> next gateway opens, Bit may evolve, shard awarded.
    const bossDefeated = gameState.getFlag(`puzzle_${entry.bossPuzzleId}_complete`);
    if (bossDefeated && !gameState.getFlag(entry.nextGatewayFlag)) {
      gameState.setFlag(entry.nextGatewayFlag, true);
      eventBus.emit('progression:gate-open', { gateId: entry.nextGatewayFlag });

      if (entry.bitEvolution && gameState.getBitStage() === entry.bitEvolution.from) {
        gameState.setBitStage(entry.bitEvolution.to);
      }
      if (entry.shardId) {
        gameState.collectShard(entry.shardId);
      }
      if (entry.codexEntryId) {
        gameState.unlockCodexEntry(entry.codexEntryId);
      }
      if (entry.isFinalBoss) {
        gameState.setFlag('endgame_pending', true);
        eventBus.emit('progression:game-complete', {});
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

  isShufflerGateOpen(): boolean {
    return gameState.getFlag('shuffler_gate_open');
  }

  isTwinRiversGatewayOpen(): boolean {
    return gameState.getFlag('twin_rivers_gateway_open');
  }

  getArrayPlainsProgress(): { puzzles: number; total: number } {
    let completed = 0;
    if (gameState.getFlag('puzzle_ap_1_complete')) completed++;
    if (gameState.getFlag('puzzle_ap_2_complete')) completed++;
    if (gameState.getFlag('puzzle_ap_3_complete')) completed++;
    if (gameState.getFlag('puzzle_ap_4_complete')) completed++;
    if (gameState.getFlag('puzzle_boss_shuffler_complete')) completed++;
    return { puzzles: completed, total: 5 };
  }

  isGameComplete(): boolean {
    return gameState.getFlag('game_complete');
  }

  getRegionEncounterProgress(regionId: string): { completed: number; total: number } | null {
    if (regionId === 'prologue') {
      const p = this.getPrologueProgress();
      return { completed: p.puzzles, total: p.total };
    }
    if (regionId === 'array_plains') {
      const p = this.getArrayPlainsProgress();
      return { completed: p.puzzles, total: p.total };
    }

    const regionMap: Record<string, number> = {
      'twin_rivers': 0,
      'hash_highlands': 1,
      'stack_spires': 2,
      'queue_canals': 3,
      'tree_canopy': 4,
      'graph_nexus': 5,
      'core': 6,
    };
    
    const index = regionMap[regionId];
    if (index !== undefined) {
      const entry = REGION_CHAIN[index];
      let completed = 0;
      entry.puzzleIds.forEach(id => {
        if (gameState.getFlag(`puzzle_${id}_complete`)) completed++;
      });
      if (gameState.getFlag(`puzzle_${entry.bossPuzzleId}_complete`)) completed++;
      return { completed, total: entry.puzzleIds.length + 1 };
    }

    return null;
  }
}

/** Singleton: registers EventBus listeners once for the entire session. */
export const progressionSystem = new ProgressionSystemClass();
