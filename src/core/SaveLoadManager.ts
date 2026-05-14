/**
 * SaveLoadManager - localStorage persistence with versioned saves.
 */

import { gameState } from './GameStateManager';
import { eventBus, GameEvents } from './EventBus';
import type { GameSettings, GameState, PuzzleResult } from '../data/types';
import { BitStage, BitMood } from '../data/types';

const SAVE_KEY = 'algorithmia_save_v2';
const LEGACY_SAVE_KEYS = ['algorithmia_save_v1'];
const ALL_SAVE_KEYS = [SAVE_KEY, ...LEGACY_SAVE_KEYS];
const CURRENT_VERSION = 2;

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  textSpeed: 45,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isPuzzleResult(value: unknown): value is PuzzleResult {
  return (
    isRecord(value) &&
    isFiniteNumber(value.stars) &&
    isFiniteNumber(value.time) &&
    isFiniteNumber(value.attempts) &&
    isFiniteNumber(value.hintsUsed)
  );
}

function migratePuzzleResult(value: unknown): PuzzleResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const { stars, time, attempts, hintsUsed } = value;
  if (!isFiniteNumber(stars) || !isFiniteNumber(time)) {
    return null;
  }

  return {
    stars,
    time,
    attempts: isFiniteNumber(attempts) ? attempts : 0,
    hintsUsed: isFiniteNumber(hintsUsed) ? hintsUsed : 0,
  };
}

class SaveLoadManagerClass {
  private autoSaveQueued = false;
  private suppressNextAutoSaveTick = false;
  private lastRecoveryNotice: string | null = null;

  private readonly requestAutoSave = () => {
    if (this.autoSaveQueued) return;
    this.autoSaveQueued = true;
    queueMicrotask(() => {
      this.autoSaveQueued = false;
      if (this.suppressNextAutoSaveTick) {
        // Caller (typically beginNewGame) reset state intentionally and does
        // not want the freshly-reset empty state persisted before navigation.
        this.suppressNextAutoSaveTick = false;
        return;
      }
      this.save();
    });
  };

  /**
   * Skip the next pending auto-save tick. Used right after `gameState.resetState()`
   * to prevent an empty save from being written between deleteSave() and the
   * start of a new game cinematic.
   */
  suppressNextAutoSave(): void {
    this.suppressNextAutoSaveTick = true;
  }

  constructor() {
    this.registerAutoSave();
  }

  registerAutoSave(): void {
    eventBus.off(GameEvents.PUZZLE_COMPLETE, this.requestAutoSave);
    eventBus.off(GameEvents.REGION_ENTER, this.requestAutoSave);
    eventBus.off(GameEvents.STATE_CHANGED, this.requestAutoSave);
    // Queue the write so progression and codex side effects settle first.
    eventBus.on(GameEvents.PUZZLE_COMPLETE, this.requestAutoSave);
    eventBus.on(GameEvents.REGION_ENTER, this.requestAutoSave);
    eventBus.on(GameEvents.STATE_CHANGED, this.requestAutoSave);
  }

  save(): boolean {
    try {
      const state = gameState.getSerializableState();
      state.saveVersion = CURRENT_VERSION;
      const saveData = JSON.stringify(state);
      localStorage.setItem(SAVE_KEY, saveData);
      for (const legacyKey of LEGACY_SAVE_KEYS) {
        localStorage.removeItem(legacyKey);
      }
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
    this.save();
    return true;
  }

  getSavedState(): GameState | null {
    return this.readSavedState(false);
  }

  hasSave(): boolean {
    return this.getSavedState() !== null;
  }

  deleteSave(): void {
    for (const key of ALL_SAVE_KEYS) {
      localStorage.removeItem(key);
    }
  }

  consumeRecoveryNotice(): string | null {
    const notice = this.lastRecoveryNotice;
    this.lastRecoveryNotice = null;
    return notice;
  }

  private validate(state: GameState): boolean {
    return (
      isRecord(state.player) &&
      isFiniteNumber(state.player.x) &&
      isFiniteNumber(state.player.y) &&
      typeof state.player.region === 'string' &&
      isRecord(state.companion) &&
      typeof state.companion.stage === 'string' &&
      typeof state.companion.mood === 'string' &&
      isRecord(state.rival) &&
      typeof state.rival.encountered === 'boolean' &&
      isFiniteNumber(state.rival.encounterStage) &&
      isStringArray(state.shardsCollected) &&
      this.isPuzzleResults(state.puzzleResults) &&
      isStringArray(state.codexEntries) &&
      this.isStringRecord(state.npcStates) &&
      this.isBooleanRecord(state.flags) &&
      this.isSettings(state.settings) &&
      state.saveVersion === CURRENT_VERSION &&
      isFiniteNumber(state.playTime)
    );
  }

  private readSavedState(logErrors: boolean): GameState | null {
    try {
      const saveData = this.getRawSaveData();
      if (!saveData) return null;

      const parsed: unknown = JSON.parse(saveData.data);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.clearCorruptSave('Save data validation failed, starting fresh', logErrors);
        return null;
      }

      const state = this.migrate(parsed);
      if (!state) {
        this.clearCorruptSave('Save data validation failed, starting fresh', logErrors);
        return null;
      }

      if (!this.validate(state)) {
        this.clearCorruptSave('Save data validation failed, starting fresh', logErrors);
        return null;
      }

      return state;
    } catch (e) {
      this.clearCorruptSave('Failed to load save, cleared corrupt data', logErrors, e);
      return null;
    }
  }

  private migrate(parsed: unknown): GameState | null {
    if (!isRecord(parsed) || !this.hasValidPlayer(parsed.player)) {
      return null;
    }

    const state = parsed as Partial<GameState> & { player: GameState['player'] };
    // Inject missing fields added in newer builds so old saves still load cleanly.
    if (!isRecord(state.companion)) {
      state.companion = { stage: BitStage.SPARK, mood: BitMood.NEUTRAL };
    }
    if (typeof state.companion.stage !== 'string') state.companion.stage = BitStage.SPARK;
    if (typeof state.companion.mood !== 'string') state.companion.mood = BitMood.NEUTRAL;

    if (!isRecord(state.rival)) {
      state.rival = { encountered: false, encounterStage: 0 };
    }
    if (typeof state.rival.encountered !== 'boolean') state.rival.encountered = false;
    if (!isFiniteNumber(state.rival.encounterStage)) state.rival.encounterStage = 0;

    if (!Array.isArray(state.shardsCollected)) {
      state.shardsCollected = [];
    }
    state.shardsCollected = state.shardsCollected.filter((entry): entry is string => typeof entry === 'string');

    const puzzleResults = this.toPuzzleResults(state.puzzleResults);
    if (!puzzleResults) {
      return null;
    }
    state.puzzleResults = puzzleResults;

    state.codexEntries = isStringArray(state.codexEntries) ? state.codexEntries : [];
    state.flags = this.toBooleanRecord(state.flags);
    state.npcStates = this.toStringRecord(state.npcStates);
    state.settings = this.toSettings(state.settings);
    state.playTime = isFiniteNumber(state.playTime) ? state.playTime : 0;
    state.saveVersion = CURRENT_VERSION;

    // Retro-fire the chain for older saves: if puzzles are already complete but the
    // newer gate flags were never set (because the gate logic didn't exist when the
    // save was made), set them here so the player isn't softlocked at the next portal.
    this.backfillRegionGates(state as GameState);
    return state as GameState;
  }

  private clearCorruptSave(message: string, logErrors: boolean, error?: unknown): void {
    this.deleteSave();
    this.lastRecoveryNotice = 'CORRUPT SAVE CLEARED';
    if (logErrors) {
      if (error) {
        console.warn(message, error);
      } else {
        console.warn(message);
      }
    }
  }

  private getRawSaveData(): { key: string; data: string } | null {
    for (const key of ALL_SAVE_KEYS) {
      const data = localStorage.getItem(key);
      if (data) return { key, data };
    }
    return null;
  }

  private hasValidPlayer(value: unknown): value is GameState['player'] {
    return (
      isRecord(value) &&
      isFiniteNumber(value.x) &&
      isFiniteNumber(value.y) &&
      typeof value.region === 'string' &&
      value.region.length > 0
    );
  }

  private isPuzzleResults(value: unknown): value is Record<string, PuzzleResult> {
    return isRecord(value) && Object.values(value).every(isPuzzleResult);
  }

  private toPuzzleResults(value: unknown): Record<string, PuzzleResult> | null {
    if (value === undefined) return {};
    if (!isRecord(value)) return null;

    const results: Record<string, PuzzleResult> = {};
    for (const [puzzleId, result] of Object.entries(value)) {
      const migrated = migratePuzzleResult(result);
      if (!migrated) continue;
      results[puzzleId] = migrated;
    }
    return results;
  }

  private isBooleanRecord(value: unknown): value is Record<string, boolean> {
    return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'boolean');
  }

  private isStringRecord(value: unknown): value is Record<string, string> {
    return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
  }

  private isSettings(value: unknown): value is GameSettings {
    return (
      isRecord(value) &&
      isFiniteNumber(value.musicVolume) &&
      isFiniteNumber(value.sfxVolume) &&
      isFiniteNumber(value.textSpeed)
    );
  }

  private toBooleanRecord(value: unknown): Record<string, boolean> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    );
  }

  private toStringRecord(value: unknown): Record<string, string> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  }

  private toSettings(value: unknown): GameSettings {
    if (!isRecord(value)) return { ...DEFAULT_SETTINGS };
    return {
      musicVolume: isFiniteNumber(value.musicVolume) ? value.musicVolume : DEFAULT_SETTINGS.musicVolume,
      sfxVolume: isFiniteNumber(value.sfxVolume) ? value.sfxVolume : DEFAULT_SETTINGS.sfxVolume,
      textSpeed: isFiniteNumber(value.textSpeed) ? value.textSpeed : DEFAULT_SETTINGS.textSpeed,
    };
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
      { puzzles: ['p0_1', 'p0_2'], bossGate: 'boss_gate_open', bossId: 'boss_sentinel', nextGateway: 'gateway_open' },
      { puzzles: ['ap_1', 'ap_2', 'ap_3', 'ap_4'], bossGate: 'shuffler_gate_open', bossId: 'boss_shuffler', nextGateway: 'twin_rivers_gateway_open' },
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
