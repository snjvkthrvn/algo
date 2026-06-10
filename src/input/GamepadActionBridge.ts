import type Phaser from 'phaser';
import { isGamepadButtonPressed, readGamepadDirection, type DigitalDirection } from './GamepadInput';

interface GamepadActionHandlers {
  left?: () => void;
  right?: () => void;
  up?: () => void;
  down?: () => void;
  action?: () => void;
  secondaryLeft?: () => void;
  secondaryRight?: () => void;
}

interface GamepadActionBridgeOptions {
  repeatMs?: number;
  deadzone?: number;
}

export class GamepadActionBridge {
  private readonly scene: Phaser.Scene;
  private readonly handlers: GamepadActionHandlers;
  private readonly repeatMs: number;
  private readonly deadzone: number;
  private nextDirectionalAt = 0;
  private actionWasDown = false;
  private secondaryLeftWasDown = false;
  private secondaryRightWasDown = false;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    handlers: GamepadActionHandlers,
    options: GamepadActionBridgeOptions = {},
  ) {
    this.scene = scene;
    this.handlers = handlers;
    this.repeatMs = options.repeatMs ?? 170;
    this.deadzone = options.deadzone ?? 0.45;

    this.scene.events?.on?.('update', this.update, this);
    this.scene.events?.once?.('shutdown', this.destroy, this);
    this.scene.events?.once?.('destroy', this.destroy, this);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events?.off?.('update', this.update, this);
    this.scene.events?.off?.('shutdown', this.destroy, this);
    this.scene.events?.off?.('destroy', this.destroy, this);
  }

  private update(time: number): void {
    this.handleDirection(time);
    this.handleButton(0, 'actionWasDown', this.handlers.action);
    this.handleButton(2, 'secondaryLeftWasDown', this.handlers.secondaryLeft);
    this.handleButton(1, 'secondaryRightWasDown', this.handlers.secondaryRight);
  }

  private handleDirection(time: number): void {
    const direction = readGamepadDirection(this.scene, this.deadzone);
    if (!direction) {
      this.nextDirectionalAt = 0;
      return;
    }

    if (time < this.nextDirectionalAt) return;
    this.getDirectionalHandler(direction)?.();
    this.nextDirectionalAt = time + this.repeatMs;
  }

  private getDirectionalHandler(direction: DigitalDirection): (() => void) | undefined {
    if (direction === 'left') return this.handlers.left;
    if (direction === 'right') return this.handlers.right;
    if (direction === 'up') return this.handlers.up;
    return this.handlers.down;
  }

  private handleButton(
    buttonIndex: number,
    latchName: 'actionWasDown' | 'secondaryLeftWasDown' | 'secondaryRightWasDown',
    handler?: () => void,
  ): void {
    if (!handler) return;
    const down = isGamepadButtonPressed(this.scene, buttonIndex);
    if (down && !this[latchName]) handler();
    this[latchName] = down;
  }
}
