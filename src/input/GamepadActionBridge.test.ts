import { describe, expect, it } from 'vitest';
import { GamepadActionBridge } from './GamepadActionBridge';

function makeScene(direction: 'left' | 'right' | 'up' | 'down' | null, button = -1): Phaser.Scene {
  const listeners = new Map<string, Function[]>();
  const scene = {
    input: {
      gamepad: {
        getPad: () => ({
          connected: true,
          axes: [
            { value: direction === 'left' ? -1 : direction === 'right' ? 1 : 0 },
            { value: direction === 'up' ? -1 : direction === 'down' ? 1 : 0 },
          ],
          buttons: Array.from({ length: 16 }, (_, index) => ({
            pressed: index === button,
            value: index === button ? 1 : 0,
          })),
        }),
      },
    },
    events: {
      on: (name: string, handler: Function, context?: unknown) => {
        listeners.set(name, [...(listeners.get(name) ?? []), context ? handler.bind(context) : handler]);
      },
      once: () => undefined,
      off: () => undefined,
      emit: (name: string, ...args: unknown[]) => {
        for (const handler of listeners.get(name) ?? []) handler(...args);
      },
    },
  };
  return scene as unknown as Phaser.Scene;
}

describe('GamepadActionBridge', () => {
  it('routes held d-pad direction through a repeat gate', () => {
    const calls: string[] = [];
    const scene = makeScene('right');
    new GamepadActionBridge(scene, { right: () => calls.push('right') }, { repeatMs: 100 });

    scene.events.emit('update', 0);
    scene.events.emit('update', 30);
    scene.events.emit('update', 110);

    expect(calls).toEqual(['right', 'right']);
  });

  it('fires action buttons only on the press edge', () => {
    const calls: string[] = [];
    const scene = makeScene(null, 0);
    new GamepadActionBridge(scene, { action: () => calls.push('action') });

    scene.events.emit('update', 0);
    scene.events.emit('update', 16);

    expect(calls).toEqual(['action']);
  });
});
