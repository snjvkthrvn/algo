import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus, GameEvents } from './EventBus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  it('should call listeners when event is emitted', () => {
    const callback = vi.fn();
    eventBus.on('test', callback);
    eventBus.emit('test', 'hello');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('hello');
  });

  it('should pass multiple args to listeners', () => {
    const callback = vi.fn();
    eventBus.on('test', callback);
    eventBus.emit('test', 'a', 'b', 42);

    expect(callback).toHaveBeenCalledWith('a', 'b', 42);
  });

  it('should support multiple listeners on same event', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    eventBus.on('test', cb1);
    eventBus.on('test', cb2);
    eventBus.emit('test', 'data');

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('should remove listener with off()', () => {
    const callback = vi.fn();
    eventBus.on('test', callback);
    eventBus.off('test', callback);
    eventBus.emit('test');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should only remove matching listener with off()', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    eventBus.on('test', cb1);
    eventBus.on('test', cb2);
    eventBus.off('test', cb1);
    eventBus.emit('test');

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('should fire once() listener only once', () => {
    const callback = vi.fn();
    eventBus.once('test', callback);
    eventBus.emit('test', 'first');
    eventBus.emit('test', 'second');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');
  });

  it('should apply context to listener', () => {
    const context = { name: 'ctx' };
    let receivedThis: unknown;
    eventBus.on('test', function (this: unknown) {
      receivedThis = this;
    }, context);
    eventBus.emit('test');

    expect(receivedThis).toBe(context);
  });

  it('should only remove listener matching both callback and context', () => {
    const callback = vi.fn();
    const ctx1 = {};
    const ctx2 = {};
    eventBus.on('test', callback, ctx1);
    eventBus.on('test', callback, ctx2);
    eventBus.off('test', callback, ctx1);
    eventBus.emit('test');

    // cb with ctx2 should still fire
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should removeAllListeners for a specific event', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    eventBus.on('a', cb1);
    eventBus.on('b', cb2);
    eventBus.removeAllListeners('a');
    eventBus.emit('a');
    eventBus.emit('b');

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('should removeAllListeners globally', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    eventBus.on('a', cb1);
    eventBus.on('b', cb2);
    eventBus.removeAllListeners();
    eventBus.emit('a');
    eventBus.emit('b');

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it('should not throw when emitting with no listeners', () => {
    expect(() => eventBus.emit('nonexistent')).not.toThrow();
  });

  it('should not throw when removing from event with no listeners', () => {
    expect(() => eventBus.off('nonexistent', vi.fn())).not.toThrow();
  });

  it('should support chaining', () => {
    const cb = vi.fn();
    const result = eventBus.on('test', cb).emit('test').off('test', cb);
    expect(result).toBe(eventBus);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should export GameEvents constants', () => {
    expect(GameEvents.PUZZLE_COMPLETE).toBe('puzzle:complete');
    expect(GameEvents.REGION_ENTER).toBe('region:enter');
    expect(GameEvents.CODEX_UNLOCK).toBe('codex:unlock');
    expect(GameEvents.STATE_CHANGED).toBe('state:changed');
  });
});
