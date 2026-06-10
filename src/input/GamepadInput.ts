import type Phaser from 'phaser';

export type DigitalDirection = 'left' | 'right' | 'up' | 'down';

type PadLike = {
  axes?: Array<{ getValue?: () => number; value?: number } | number>;
  buttons?: Array<{ pressed?: boolean; value?: number } | number>;
  connected?: boolean;
  leftStick?: { x?: number; y?: number };
};

type GamepadPluginLike = {
  getPad?: (index: number) => PadLike | null;
  pad1?: PadLike | null;
  gamepads?: Array<PadLike | null | undefined>;
};

export function getPrimaryGamepad(scene: Phaser.Scene): PadLike | null {
  const plugin = scene.input?.gamepad as GamepadPluginLike | undefined;
  if (!plugin) return null;

  const directPad = plugin.getPad?.(0) ?? plugin.pad1 ?? null;
  if (directPad && directPad.connected !== false) return directPad;

  return plugin.gamepads?.find((pad): pad is PadLike => Boolean(pad && pad.connected !== false)) ?? null;
}

export function readGamepadDirection(scene: Phaser.Scene, deadzone = 0.45): DigitalDirection | null {
  const pad = getPrimaryGamepad(scene);
  if (!pad) return null;

  if (isGamepadButtonPressed(scene, 14)) return 'left';
  if (isGamepadButtonPressed(scene, 15)) return 'right';
  if (isGamepadButtonPressed(scene, 12)) return 'up';
  if (isGamepadButtonPressed(scene, 13)) return 'down';

  const x = readAxis(pad, 0) ?? pad.leftStick?.x ?? 0;
  const y = readAxis(pad, 1) ?? pad.leftStick?.y ?? 0;
  if (Math.abs(x) < deadzone && Math.abs(y) < deadzone) return null;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}

export function isGamepadButtonPressed(scene: Phaser.Scene, buttonIndex: number): boolean {
  const pad = getPrimaryGamepad(scene);
  if (!pad) return false;

  const button = pad.buttons?.[buttonIndex];
  if (typeof button === 'number') return button > 0.5;
  return Boolean(button?.pressed || (button?.value ?? 0) > 0.5);
}

function readAxis(pad: PadLike, axisIndex: number): number | null {
  const axis = pad.axes?.[axisIndex];
  if (typeof axis === 'number') return axis;
  if (!axis) return null;
  if (typeof axis.getValue === 'function') return axis.getValue();
  return axis.value ?? null;
}
