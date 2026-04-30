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
    state.saveVersion = CURRENT_VERSION;
  }
}

export const saveLoadManager = new SaveLoadManagerClass();
