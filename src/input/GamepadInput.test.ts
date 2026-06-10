import { describe, expect, it } from 'vitest';
import { isGamepadButtonPressed, readGamepadDirection } from './GamepadInput';

function makeScene(gamepad: unknown): Phaser.Scene {
  return { input: { gamepad } } as Phaser.Scene;
}

function buttons(pressedIndex: number): Array<{ pressed: boolean; value: number }> {
  return Array.from({ length: 16 }, (_, index) => ({
    pressed: index === pressedIndex,
    value: index === pressedIndex ? 1 : 0,
  }));
}

describe('GamepadInput', () => {
  it('reads standard d-pad buttons before analog axes', () => {
    const scene = makeScene({
      getPad: () => ({
        connected: true,
        axes: [{ value: -1 }, { value: 0 }],
        buttons: buttons(15),
      }),
    });

    expect(readGamepadDirection(scene)).toBe('right');
  });

  it('uses the strongest analog axis beyond the deadzone', () => {
    const scene = makeScene({
      getPad: () => ({
        connected: true,
        axes: [{ value: 0.2 }, { value: -0.8 }],
        buttons: [],
      }),
    });

    expect(readGamepadDirection(scene)).toBe('up');
  });

  it('exposes action buttons as pressed when their value crosses halfway', () => {
    const scene = makeScene({
      pad1: {
        connected: true,
        buttons: [{ pressed: false, value: 0.8 }],
      },
    });

    expect(isGamepadButtonPressed(scene, 0)).toBe(true);
  });
});
