/**
 * SaveLoadManager - localStorage persistence with versioned saves.
 */

import { gameState } from './GameStateManager';
import { eventBus, GameEvents } from './EventBus';
import type { GameState } from '../data/types';
import { BitStage, BitMood } from '../data/types';

const SAVE_KEY = 'algorithmia_save_v1';
const CURRENT_VERSION = 1;

class SaveLoadManagerClass {
  constructor() {
    // Auto-save on puzzle complete and region enter.
    eventBus.on(GameEvents.PUZZLE_COMPLETE, () => this.save());
    eventBus.on(GameEvents.REGION_ENTER, () => this.save());
  }

  save(): boolean {
    try {
      const state = gameState.getSerializableState();
      const saveData = JSON.stringify(state);
      localStorage.setItem(SAVE_KEY, saveData);
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      return false;
    }
  }

  load(): boolean {
    const state = this.readSavedState(true);
    if (!state) {
      return false;
    }

    gameState.loadState(state);
    return true;
  }

  getSavedState(): GameState | null {
    return this.readSavedState(false);
  }

  hasSave(): boolean {
    return this.getSavedState() !== null;
  }

  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  private validate(state: GameState): boolean {
    return (
      typeof state.player === 'object' &&
      typeof state.player.x === 'number' &&
      typeof state.player.y === 'number' &&
      typeof state.player.region === 'string' &&
      typeof state.puzzleResults === 'object' &&
      Array.isArray(state.codexEntries) &&
      typeof state.settings === 'object' &&
      typeof state.saveVersion === 'number'
    );
  }

  private readSavedState(logErrors: boolean): GameState | null {
    try {
      const saveData = localStorage.getItem(SAVE_KEY);
      if (!saveData) return null;

      const parsed: unknown = JSON.parse(saveData);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        if (logErrors) console.warn('Save data validation failed, starting fresh');
        return null;
      }

      const state = parsed as GameState;
      this.migrate(state);

      if (!this.validate(state)) {
        if (logErrors) console.warn('Save data validation failed, starting fresh');
        return null;
      }

      return state;
    } catch (e) {
      if (logErrors) console.error('Failed to load save:', e);
      return null;
    }
  }

  private migrate(state: GameState): void {
    // Inject missing fields added in newer builds so old saves still load cleanly.
    if (!state.companion) {
      state.companion = { stage: BitStage.SPARK, mood: BitMood.NEUTRAL };
    }
    if (!state.rival) {
      state.rival = { encountered: false, encounterStage: 0 };
    }
    if (!Array.isArray(state.shardsCollected)) {
      state.shardsCollected = [];
    }
    if (!state.flags || typeof state.flags !== 'object') {
      state.flags = {};
    }
    if (!state.npcStates || typeof state.npcStates !== 'object') {
      state.npcStates = {};
    }
    // Retro-fire the chain for older saves: if puzzles are already complete but the
    // newer gate flags were never set (because the gate logic didn't exist when the
    // save was made), set them here so the player isn't softlocked at the next portal.
    this.backfillRegionGates(state);
    state.saveVersion = CURRENT_VERSION;
  }

  /** Open boss gate / next-gateway flags for any region whose puzzles are already complete. */
  private backfillRegionGates(state: GameState): void {
    const flags = state.flags;
    const puzzleDone = (id: string): boolean =>
      Boolean(state.puzzleResults?.[id] || flags[`puzzle_${id}_complete`]);

    const chain: Array<{
      puzzles: string[];
      bossGate: string;
      bossId: string;
      nextGateway: string;
    }> = [
      { puzzles: ['tr_1', 'tr_2', 'tr_3', 'tr_4'], bossGate: 'mirror_serpent_gate_open', bossId: 'boss_mirror_serpent', nextGateway: 'hash_highlands_gateway_open' },
      { puzzles: ['hh_1', 'hh_2', 'hh_3', 'hh_4'], bossGate: 'archivist_gate_open', bossId: 'boss_archivist', nextGateway: 'stack_spires_gateway_open' },
      { puzzles: ['ss_1', 'ss_2', 'ss_3', 'ss_4'], bossGate: 'recursion_gate_open', bossId: 'boss_recursion', nextGateway: 'queue_canals_gateway_open' },
      { puzzles: ['qc_1', 'qc_2', 'qc_3', 'qc_4'], bossGate: 'reconciler_gate_open', bossId: 'boss_reconciler', nextGateway: 'tree_canopy_gateway_open' },
      { puzzles: ['tc_1', 'tc_2', 'tc_3', 'tc_4'], bossGate: 'pattern_gate_open', bossId: 'boss_pattern', nextGateway: 'graph_nexus_gateway_open' },
      { puzzles: ['gn_1', 'gn_2', 'gn_3', 'gn_4'], bossGate: 'echo_gate_open', bossId: 'boss_echo', nextGateway: 'core_gateway_open' },
      { puzzles: ['core_1', 'core_2', 'core_3', 'core_4'], bossGate: 'protocol_omega_gate_open', bossId: 'boss_protocol_omega', nextGateway: 'game_complete' },
    ];

    for (const entry of chain) {
      if (entry.puzzles.every(puzzleDone) && !flags[entry.bossGate]) {
        flags[entry.bossGate] = true;
      }
      if (puzzleDone(entry.bossId) && !flags[entry.nextGateway]) {
        flags[entry.nextGateway] = true;
      }
    }
  }
}

export const saveLoadManager = new SaveLoadManagerClass();
