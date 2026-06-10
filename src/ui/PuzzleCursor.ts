import { audioManager } from '../core/AudioManager';
import { COLORS } from '../config/constants';
import { JuiceSystem } from '../systems/JuiceSystem';
import { isGamepadButtonPressed, readGamepadDirection } from '../input/GamepadInput';

type CursorTarget = Phaser.GameObjects.GameObject & {
  active?: boolean;
  visible?: boolean;
  input?: Phaser.Types.Input.InteractiveObject;
  parentContainer?: Phaser.GameObjects.Container | null;
  getBounds?: (output?: Phaser.Geom.Rectangle) => Phaser.Geom.Rectangle;
  getData?: (key: string) => unknown;
  setData?: (key: string, value: unknown) => Phaser.GameObjects.GameObject;
  listenerCount?: (event: string) => number;
};

type PuzzlePulseScene = Phaser.Scene & {
  emitPuzzleActionPulse?: (x: number, y: number, kind?: 'neutral' | 'correct' | 'wrong' | 'hint' | 'complete') => void;
};

interface TargetBounds {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

interface PuzzleCursorOptions {
  autoScan?: boolean;
  scanDelay?: number;
}

const CURSOR_DEPTH = 7000;
const MIN_TARGET_SIZE = 24;
const MAX_TARGET_SIZE = 96;

export class PuzzleCursor {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private targets: CursorTarget[] = [];
  private index = -1;
  private scanTimer?: Phaser.Time.TimerEvent;
  private destroyed = false;
  private nextGamepadMoveAt = 0;
  private actionButtonWasDown = false;

  private readonly keyHandlers: Array<[string, () => void]> = [
    ['keydown-LEFT', () => this.move(-1, 0)],
    ['keydown-A', () => this.move(-1, 0)],
    ['keydown-RIGHT', () => this.move(1, 0)],
    ['keydown-D', () => this.move(1, 0)],
    ['keydown-UP', () => this.move(0, -1)],
    ['keydown-W', () => this.move(0, -1)],
    ['keydown-DOWN', () => this.move(0, 1)],
    ['keydown-S', () => this.move(0, 1)],
    ['keydown-SPACE', () => this.activate()],
    ['keydown-ENTER', () => this.activate()],
  ];

  constructor(scene: Phaser.Scene, options: PuzzleCursorOptions = {}) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.container = scene.add.container(0, 0, [this.graphics]);
    this.container.setDepth(CURSOR_DEPTH);
    this.container.setVisible(false);
    this.container.setAlpha(0.95);

    this.keyHandlers.forEach(([eventName, handler]) => {
      this.scene.input.keyboard?.on(eventName, handler);
    });

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateGamepad, this);

    if (options.autoScan !== false) {
      this.scanTimer = scene.time.addEvent({
        delay: options.scanDelay ?? 160,
        loop: true,
        callback: () => this.refreshFromScene(),
      });
      this.refreshFromScene();
    }
  }

  setTargets(targets: readonly Phaser.GameObjects.GameObject[], preferredIndex = this.index): void {
    if (this.destroyed) return;

    const nextTargets = targets
      .map((target) => target as CursorTarget)
      .filter((target, targetIndex, allTargets) => {
        return this.isValidTarget(target) && allTargets.indexOf(target) === targetIndex;
      });

    if (this.hasSameTargets(nextTargets)) {
      this.updateCursor();
      return;
    }

    const currentTarget = this.targets[this.index];
    const oldTarget = this.getFocusedActivationTarget();
    this.targets = nextTargets;

    if (this.targets.length === 0) {
      this.index = -1;
      this.emitHover(oldTarget, undefined);
      this.container.setVisible(false);
      return;
    }

    const retainedIndex = currentTarget ? this.targets.indexOf(currentTarget) : -1;
    this.index = retainedIndex >= 0 ? retainedIndex : Phaser.Math.Clamp(preferredIndex, 0, this.targets.length - 1);
    this.emitHover(oldTarget, this.getFocusedActivationTarget());
    this.updateCursor(true);
  }

  clearTargets(): void {
    this.setTargets([]);
  }

  refreshFromScene(): void {
    if (this.destroyed) return;

    const targets: CursorTarget[] = [];
    this.collectTargets(this.scene.children.list, targets);
    targets.sort((left, right) => {
      const a = this.getBounds(left);
      const b = this.getBounds(right);
      return a.centerY === b.centerY ? a.centerX - b.centerX : a.centerY - b.centerY;
    });
    this.setTargets(targets);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.keyHandlers.forEach(([eventName, handler]) => {
      this.scene.input.keyboard?.off(eventName, handler);
    });
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateGamepad, this);
    this.scanTimer?.remove(false);
    this.container.destroy();
    this.targets = [];
    this.index = -1;
  }

  private collectTargets(objects: Phaser.GameObjects.GameObject[], targets: CursorTarget[]): void {
    objects.forEach((object) => {
      const candidate = object as CursorTarget;
      if (this.isValidTarget(candidate)) {
        targets.push(candidate);
      }

      if (object instanceof Phaser.GameObjects.Container) {
        this.collectTargets(object.list as Phaser.GameObjects.GameObject[], targets);
      }
    });
  }

  private isValidTarget(target: CursorTarget): boolean {
    if (!target || target === this.container || target === this.graphics) return false;
    if (target.getData?.('puzzleCursorIgnore')) return false;
    if (target.active === false || target.visible === false) return false;
    if (!target.input || target.input.enabled === false) return false;
    if (typeof target.listenerCount === 'function' && target.listenerCount('pointerdown') === 0) return false;
    if (!this.areParentsVisible(target)) return false;
    return true;
  }

  private areParentsVisible(target: CursorTarget): boolean {
    let parent = target.parentContainer;
    while (parent) {
      if (parent.active === false || parent.visible === false || parent.getData?.('puzzleCursorIgnore')) {
        return false;
      }
      parent = parent.parentContainer;
    }
    return true;
  }

  private move(dx: number, dy: number): void {
    if (this.targets.length === 0) return;
    if (this.index < 0) {
      this.focus(0);
      return;
    }

    const current = this.targets[this.index];
    const currentBounds = this.getBounds(current);
    let bestIndex = -1;
    let bestScore = -Infinity;

    this.targets.forEach((target, targetIndex) => {
      if (targetIndex === this.index) return;
      const bounds = this.getBounds(target);
      const vectorX = bounds.centerX - currentBounds.centerX;
      const vectorY = bounds.centerY - currentBounds.centerY;
      const distance = Math.max(1, Math.hypot(vectorX, vectorY));
      const directionalScore = (vectorX * dx + vectorY * dy) / distance;

      if (directionalScore <= 0.35) return;

      const crossAxisPenalty = Math.abs(dx === 0 ? vectorX : vectorY) * 0.003;
      const distancePenalty = distance * 0.001;
      const score = directionalScore - crossAxisPenalty - distancePenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = targetIndex;
      }
    });

    if (bestIndex < 0) {
      bestIndex = Phaser.Math.Wrap(this.index + (dx + dy > 0 ? 1 : -1), 0, this.targets.length);
    }

    this.focus(bestIndex);
  }

  private updateGamepad(_time: number, _delta: number): void {
    if (this.targets.length === 0) {
      this.actionButtonWasDown = false;
      return;
    }

    const now = this.scene.time?.now ?? _time;
    const direction = readGamepadDirection(this.scene);
    if (direction && now >= this.nextGamepadMoveAt) {
      if (direction === 'left') this.move(-1, 0);
      else if (direction === 'right') this.move(1, 0);
      else if (direction === 'up') this.move(0, -1);
      else this.move(0, 1);
      this.nextGamepadMoveAt = now + 180;
    } else if (!direction) {
      this.nextGamepadMoveAt = 0;
    }

    const actionDown = isGamepadButtonPressed(this.scene, 0);
    if (actionDown && !this.actionButtonWasDown) this.activate();
    this.actionButtonWasDown = actionDown;
  }

  private focus(nextIndex: number): void {
    if (nextIndex === this.index || this.targets.length === 0) return;
    const oldTarget = this.getFocusedActivationTarget();
    this.index = Phaser.Math.Clamp(nextIndex, 0, this.targets.length - 1);
    this.emitHover(oldTarget, this.getFocusedActivationTarget());
    this.updateCursor();
    audioManager.playTone(660, 28, 'triangle');
  }

  private activate(): void {
    const focused = this.getFocusedTarget();
    if (!focused) return;

    const activationTarget = this.resolveActivationTarget(focused);
    const bounds = this.getBounds(focused);
    activationTarget.emit('pointerdown');
    activationTarget.emit('pointerup');
    (this.scene as PuzzlePulseScene).emitPuzzleActionPulse?.(bounds.centerX, bounds.centerY, 'neutral');
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 0.86,
      scaleY: 0.86,
      duration: 45,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    JuiceSystem.burst(this.scene, bounds.centerX, bounds.centerY, COLORS.CYAN_GLOW, 5, 22);
  }

  private updateCursor(snap = false): void {
    const focused = this.getFocusedTarget();
    if (!focused) {
      this.container.setVisible(false);
      return;
    }

    const bounds = this.getBounds(focused);
    this.drawReticle(bounds.width, bounds.height);
    this.container.setVisible(true);

    if (snap || !this.container.visible) {
      this.container.setPosition(bounds.centerX, bounds.centerY);
      return;
    }

    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      x: bounds.centerX,
      y: bounds.centerY,
      duration: 80,
      ease: 'Quad.easeOut',
    });
  }

  private drawReticle(targetWidth: number, targetHeight: number): void {
    const width = Phaser.Math.Clamp(targetWidth + 14, MIN_TARGET_SIZE, MAX_TARGET_SIZE);
    const height = Phaser.Math.Clamp(targetHeight + 14, MIN_TARGET_SIZE, MAX_TARGET_SIZE);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const corner = Math.min(10, width / 3, height / 3);

    this.graphics.clear();
    this.graphics.lineStyle(2, COLORS.CYAN_GLOW, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-halfWidth, -halfHeight + corner);
    this.graphics.lineTo(-halfWidth, -halfHeight);
    this.graphics.lineTo(-halfWidth + corner, -halfHeight);
    this.graphics.moveTo(halfWidth - corner, -halfHeight);
    this.graphics.lineTo(halfWidth, -halfHeight);
    this.graphics.lineTo(halfWidth, -halfHeight + corner);
    this.graphics.moveTo(halfWidth, halfHeight - corner);
    this.graphics.lineTo(halfWidth, halfHeight);
    this.graphics.lineTo(halfWidth - corner, halfHeight);
    this.graphics.moveTo(-halfWidth + corner, halfHeight);
    this.graphics.lineTo(-halfWidth, halfHeight);
    this.graphics.lineTo(-halfWidth, halfHeight - corner);
    this.graphics.strokePath();
  }

  private getFocusedTarget(): CursorTarget | undefined {
    if (this.index < 0 || this.index >= this.targets.length) return undefined;
    return this.targets[this.index];
  }

  private getFocusedActivationTarget(): CursorTarget | undefined {
    const target = this.getFocusedTarget();
    return target ? this.resolveActivationTarget(target) : undefined;
  }

  private resolveActivationTarget(target: CursorTarget): CursorTarget {
    return (target.getData?.('cursorTarget') as CursorTarget | undefined)
      ?? (target.getData?.('background') as CursorTarget | undefined)
      ?? target;
  }

  private emitHover(oldTarget?: CursorTarget, nextTarget?: CursorTarget): void {
    if (oldTarget && oldTarget !== nextTarget) oldTarget.emit('pointerout');
    if (nextTarget && oldTarget !== nextTarget) nextTarget.emit('pointerover');
  }

  private getBounds(target: CursorTarget): TargetBounds {
    if (typeof target.getBounds === 'function') {
      const bounds = target.getBounds();
      if (Number.isFinite(bounds.centerX) && Number.isFinite(bounds.centerY) && bounds.width >= 0 && bounds.height >= 0) {
        return {
          centerX: bounds.centerX,
          centerY: bounds.centerY,
          width: Math.max(bounds.width, MIN_TARGET_SIZE),
          height: Math.max(bounds.height, MIN_TARGET_SIZE),
        };
      }
    }

    const position = new Phaser.Math.Vector2((target as unknown as { x?: number }).x ?? 0, (target as unknown as { y?: number }).y ?? 0);
    target.parentContainer?.getWorldTransformMatrix().transformPoint(position.x, position.y, position);
    return {
      centerX: position.x,
      centerY: position.y,
      width: MIN_TARGET_SIZE,
      height: MIN_TARGET_SIZE,
    };
  }

  private hasSameTargets(nextTargets: CursorTarget[]): boolean {
    return this.targets.length === nextTargets.length && this.targets.every((target, index) => target === nextTargets[index]);
  }
}
