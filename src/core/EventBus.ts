/**
 * EventBus - Typed pub/sub event system for decoupled scene communication.
 * Singleton pattern - use EventBus.instance or the exported eventBus.
 */

type EventCallback = (...args: unknown[]) => void;

interface EventListener {
  callback: EventCallback;
  context: unknown;
  once: boolean;
}

class EventBusManager {
  private listeners: Map<string, EventListener[]> = new Map();

  on(event: string, callback: EventCallback, context?: unknown): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ callback, context, once: false });
    return this;
  }

  once(event: string, callback: EventCallback, context?: unknown): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ callback, context, once: true });
    return this;
  }

  off(event: string, callback: EventCallback, context?: unknown): this {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return this;

    this.listeners.set(
      event,
      eventListeners.filter(
        (listener) =>
          listener.callback !== callback || listener.context !== context
      )
    );
    return this;
  }

  emit(event: string, ...args: unknown[]): this {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return this;

    const toRemove: EventListener[] = [];

    for (const listener of eventListeners) {
      listener.callback.apply(listener.context, args);
      if (listener.once) {
        toRemove.push(listener);
      }
    }

    if (toRemove.length > 0) {
      this.listeners.set(
        event,
        eventListeners.filter((l) => !toRemove.includes(l))
      );
    }

    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}

/** Global event bus singleton */
export const eventBus = new EventBusManager();

// Event name constants
export const GameEvents = {
  PUZZLE_COMPLETE: 'puzzle:complete',
  PUZZLE_START: 'puzzle:start',
  DIALOGUE_START: 'dialogue:start',
  DIALOGUE_END: 'dialogue:end',
  REGION_ENTER: 'region:enter',
  CODEX_UNLOCK: 'codex:unlock',
  STATE_CHANGED: 'state:changed',
  PLAYER_VOID_FALL: 'player:void-fall',
  BOSS_PHASE_CHANGE: 'boss:phase-change',
  SAVE_GAME: 'save:game',
  TRANSITION_START: 'transition:start',
  TRANSITION_COMPLETE: 'transition:complete',

  // Companion & rival events
  BIT_MOOD_CHANGE: 'bit:mood-change',   // payload: { mood: BitMood }
  BIT_EVOLVE: 'bit:evolve',             // payload: { from: BitStage, to: BitStage }
  BIT_HINT: 'bit:hint',                 // payload: { warm: boolean } — hot/cold signal to player
  GLITCH_ENCOUNTER: 'glitch:encounter', // payload: { stage: number, x: number, y: number }
  SHARD_COLLECTED: 'shard:collected',   // payload: { shardId: string, totalCollected: number }
  WATCHER_NEARBY: 'watcher:nearby',     // payload: { distance: number } — triggers Bit scared mood
} as const;
