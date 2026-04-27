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
    // Auto-save on puzzle complete and region enter
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
    try {
      const saveData = localStorage.getItem(SAVE_KEY);
      if (!saveData) return false;

      const state: GameState = JSON.parse(saveData);

      // Always migrate — adds any fields missing from older saves
      this.migrate(state);

      // Validate core structure
      if (!this.validate(state)) {
        console.warn('Save data validation failed, starting fresh');
        return false;
      }

      gameState.loadState(state);
      return true;
    } catch (e) {
      console.error('Failed to load save:', e);
      return false;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
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

  private migrate(state: GameState): void {
    // Inject missing fields added in newer builds so old saves still load cleanly.
    // This is always called on load — each block is idempotent.
    if (!state.companion) {
      state.companion = { stage: BitStage.SPARK, mood: BitMood.NEUTRAL };
    }
    if (!state.rival) {
      state.rival = { encountered: false, encounterStage: 0 };
    }
    if (!Array.isArray(state.shardsCollected)) {
      state.shardsCollected = [];
    }
    state.saveVersion = CURRENT_VERSION;
  }
}

export const saveLoadManager = new SaveLoadManagerClass();
