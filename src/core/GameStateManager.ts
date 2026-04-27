/**
 * GameStateManager - Singleton source of truth for all game state.
 * Emits events via EventBus on state changes.
 */

import { eventBus, GameEvents } from './EventBus';
import type { GameState, PuzzleResult, GameSettings } from '../data/types';
import { BitStage, BitMood } from '../data/types';
import { REGIONS } from '../config/constants';
import { PROLOGUE_CONFIG } from '../data/regions/prologue';

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  textSpeed: 30, // chars per second
};

function createDefaultState(): GameState {
  return {
    player: {
      x: PROLOGUE_CONFIG.spawnPoint.x,
      y: PROLOGUE_CONFIG.spawnPoint.y,
      region: REGIONS.PROLOGUE,
    },
    companion: { stage: BitStage.SPARK, mood: BitMood.NEUTRAL },
    rival: { encountered: false, encounterStage: 0 },
    shardsCollected: [],
    puzzleResults: {},
    codexEntries: [],
    npcStates: {},
    flags: {},
    settings: { ...DEFAULT_SETTINGS },
    saveVersion: 1,
    playTime: 0,
  };
}

class GameStateManagerClass {
  private state: GameState = createDefaultState();
  private playTimeStart: number = Date.now();

  getState(): Readonly<GameState> {
    return this.state;
  }

  // Player position
  setPlayerPosition(x: number, y: number): void {
    this.state.player.x = x;
    this.state.player.y = y;
  }

  setPlayerRegion(region: string): void {
    this.state.player.region = region;
    eventBus.emit(GameEvents.REGION_ENTER, { regionId: region });
    eventBus.emit(GameEvents.STATE_CHANGED, { key: 'player.region', value: region });
  }

  // Puzzle results
  setPuzzleResult(puzzleId: string, result: PuzzleResult): void {
    this.state.puzzleResults[puzzleId] = result;
    eventBus.emit(GameEvents.PUZZLE_COMPLETE, {
      puzzleId,
      stars: result.stars,
      time: result.time,
      attempts: result.attempts,
      hintsUsed: result.hintsUsed,
    });
    eventBus.emit(GameEvents.STATE_CHANGED, { key: `puzzleResults.${puzzleId}`, value: result });
  }

  getPuzzleResult(puzzleId: string): PuzzleResult | undefined {
    return this.state.puzzleResults[puzzleId];
  }

  isPuzzleCompleted(puzzleId: string): boolean {
    return puzzleId in this.state.puzzleResults;
  }

  // Codex
  unlockCodexEntry(entryId: string): void {
    if (!this.state.codexEntries.includes(entryId)) {
      this.state.codexEntries.push(entryId);
      eventBus.emit(GameEvents.CODEX_UNLOCK, { entryId });
      eventBus.emit(GameEvents.STATE_CHANGED, { key: 'codexEntries', value: this.state.codexEntries });
    }
  }

  isCodexUnlocked(entryId: string): boolean {
    return this.state.codexEntries.includes(entryId);
  }

  // NPC states
  setNPCState(npcId: string, state: string): void {
    this.state.npcStates[npcId] = state;
    eventBus.emit(GameEvents.STATE_CHANGED, { key: `npcStates.${npcId}`, value: state });
  }

  getNPCState(npcId: string): string {
    return this.state.npcStates[npcId] || 'idle';
  }

  // Flags
  setFlag(flag: string, value: boolean = true): void {
    this.state.flags[flag] = value;
    eventBus.emit(GameEvents.STATE_CHANGED, { key: `flags.${flag}`, value });
  }

  getFlag(flag: string): boolean {
    return this.state.flags[flag] || false;
  }

  // Settings
  updateSettings(partial: Partial<GameSettings>): void {
    Object.assign(this.state.settings, partial);
    eventBus.emit(GameEvents.STATE_CHANGED, { key: 'settings', value: this.state.settings });
  }

  getSettings(): Readonly<GameSettings> {
    return this.state.settings;
  }

  // Play time
  updatePlayTime(): void {
    const now = Date.now();
    this.state.playTime += now - this.playTimeStart;
    this.playTimeStart = now;
  }

  // State management
  loadState(saved: GameState): void {
    this.state = saved;
    this.playTimeStart = Date.now();
  }

  resetState(): void {
    this.state = createDefaultState();
    this.playTimeStart = Date.now();
  }

  // Companion (Bit)
  setBitStage(stage: BitStage): void {
    const from = this.state.companion.stage;
    this.state.companion.stage = stage;
    eventBus.emit(GameEvents.BIT_EVOLVE, { from, to: stage });
    eventBus.emit(GameEvents.STATE_CHANGED, { key: 'companion.stage', value: stage });
  }

  getBitStage(): BitStage {
    return this.state.companion.stage;
  }

  setBitMood(mood: BitMood): void {
    this.state.companion.mood = mood;
    eventBus.emit(GameEvents.BIT_MOOD_CHANGE, { mood });
  }

  getBitMood(): BitMood {
    return this.state.companion.mood;
  }

  // Shards
  collectShard(shardId: string): void {
    if (!this.state.shardsCollected.includes(shardId)) {
      this.state.shardsCollected.push(shardId);
      eventBus.emit(GameEvents.SHARD_COLLECTED, {
        shardId,
        totalCollected: this.state.shardsCollected.length,
      });
      eventBus.emit(GameEvents.STATE_CHANGED, { key: 'shardsCollected', value: this.state.shardsCollected });
    }
  }

  getShardsCollected(): string[] {
    return this.state.shardsCollected;
  }

  isShardCollected(shardId: string): boolean {
    return this.state.shardsCollected.includes(shardId);
  }

  // Rival (Glitch)
  advanceGlitchEncounter(): void {
    if (!this.state.rival.encountered) {
      this.state.rival.encountered = true;
    }
    this.state.rival.encounterStage += 1;
    eventBus.emit(GameEvents.GLITCH_ENCOUNTER, { stage: this.state.rival.encounterStage });
    eventBus.emit(GameEvents.STATE_CHANGED, { key: 'rival.encounterStage', value: this.state.rival.encounterStage });
  }

  getGlitchEncounterStage(): number {
    return this.state.rival.encounterStage;
  }

  getSerializableState(): GameState {
    this.updatePlayTime();
    return { ...this.state };
  }
}

export const gameState = new GameStateManagerClass();
