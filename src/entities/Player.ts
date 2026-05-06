/**
 * Player - Movement, animation, interaction state.
 * Uses the Prologue player spritesheet for visual state.
 */

import Phaser from 'phaser';
import { PROLOGUE_SHEET_KEYS } from '../config/assets';
import { PlayerState } from '../data/types';
import { audioManager } from '../core/AudioManager';
import { JuiceSystem } from '../systems/JuiceSystem';

const PLAYER_SPRITE_SCALE = 0.25;
export const PLAYER_GRID_STEP = 32;
const PLAYER_STEP_DURATION_MS = 120;
const PLAYER_WALK_FRAME_RATE = 20;

type FacingDirection = 'down' | 'up' | 'left' | 'right';

export interface PlayerOptions {
  canMoveTo?: (position: { x: number; y: number }) => boolean;
}

export class Player {
  sprite: Phaser.GameObjects.Sprite;
  body: Phaser.Physics.Arcade.Body;
  state: PlayerState = PlayerState.IDLE;
  lastSafePosition: { x: number; y: number };
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private facingDirection: FacingDirection = 'down';
  private movementTween: Phaser.Tweens.Tween | null = null;
  private canMoveTo: (position: { x: number; y: number }) => boolean;
  private autoWalkTarget: { x: number; y: number } | null = null;
  private autoWalkCallback: (() => void) | null = null;
  private nextMoveBuffer: FacingDirection | null = null; // buffers input during tween for responsive chaining

  constructor(scene: Phaser.Scene, x: number, y: number, options: PlayerOptions = {}) {
    this.scene = scene;
    this.lastSafePosition = { x, y };
    this.canMoveTo = options.canMoveTo ?? (() => true);

    this.createAnimations();
    this.sprite = scene.add
      .sprite(x, y, PROLOGUE_SHEET_KEYS.PLAYER, 0)
      .setDepth(5)
      .setScale(PLAYER_SPRITE_SCALE);
    this.sprite.anims.play('player-idle-down');

    // Enable physics so the sprite has an Arcade body that tracks its position
    // (used only as a position proxy — movement is tween-driven, no velocity).
    // setSize's default `center: true` auto-offsets the body around the sprite
    // origin, so we deliberately do not call setOffset.
    scene.physics.world.enable(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(24, 28);

    // Setup input
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  walkTo(x: number, y: number, onComplete?: () => void): void {
    this.autoWalkTarget = { x, y };
    this.autoWalkCallback = onComplete || null;
    this.state = PlayerState.IDLE;
  }

  update(): void {
    if (this.state === PlayerState.FROZEN || this.state === PlayerState.INTERACTING) {
      this.stopMovementTween();
      this.playIdleAnimation();
      return;
    }

    if (this.movementTween) {
      // Buffer latest direction for immediate chaining on step complete (feels responsive)
      const buffered = this.resolveMoveDirection();
      if (buffered) this.nextMoveBuffer = buffered;
      return;
    }

    let direction = this.nextMoveBuffer ?? this.resolveMoveDirection();
    this.nextMoveBuffer = null;

    if (this.autoWalkTarget) {
      const dx = this.autoWalkTarget.x - this.sprite.x;
      const dy = this.autoWalkTarget.y - this.sprite.y;

      if (Math.abs(dx) < PLAYER_GRID_STEP && Math.abs(dy) < PLAYER_GRID_STEP) {
        this.autoWalkTarget = null;
        if (this.autoWalkCallback) {
          const cb = this.autoWalkCallback;
          this.autoWalkCallback = null;
          cb();
        }
      } else {
        if (Math.abs(dx) > Math.abs(dy)) {
          direction = dx > 0 ? 'right' : 'left';
        } else {
          direction = dy > 0 ? 'down' : 'up';
        }
      }
    }

    if (!direction) {
      if (this.state === PlayerState.WALKING) {
        this.state = PlayerState.IDLE;
        this.playIdleAnimation();
      }
      return;
    }

    this.beginTileStep(direction);
  }

  freeze(): void {
    this.stopMovementTween();
    this.state = PlayerState.FROZEN;
    this.playIdleAnimation();
  }

  unfreeze(): void {
    this.state = PlayerState.IDLE;
  }

  setInteracting(interacting: boolean): void {
    if (interacting) this.stopMovementTween();
    this.state = interacting ? PlayerState.INTERACTING : PlayerState.IDLE;
    this.playIdleAnimation();
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setPosition(x: number, y: number): void {
    this.stopMovementTween();
    this.sprite.setPosition(x, y);
    this.body.reset(x, y);
  }

  updateSafePosition(): void {
    this.lastSafePosition = { x: this.sprite.x, y: this.sprite.y };
  }

  getFacingDirection(): string {
    return this.facingDirection;
  }

  private createAnimations(): void {
    this.createAnimationIfMissing('player-idle-down', 0, 0, 1);
    this.createAnimationIfMissing('player-idle-left', 4, 4, 1);
    this.createAnimationIfMissing('player-idle-right', 8, 8, 1);
    this.createAnimationIfMissing('player-idle-up', 12, 12, 1);
    this.createAnimationIfMissing('player-walk-down', 0, 3, PLAYER_WALK_FRAME_RATE, -1);
    this.createAnimationIfMissing('player-walk-left', 4, 7, PLAYER_WALK_FRAME_RATE, -1);
    this.createAnimationIfMissing('player-walk-right', 8, 11, PLAYER_WALK_FRAME_RATE, -1);
    this.createAnimationIfMissing('player-walk-up', 12, 15, PLAYER_WALK_FRAME_RATE, -1);
  }

  private createAnimationIfMissing(
    key: string,
    start: number,
    end: number,
    frameRate: number,
    repeat?: number
  ): void {
    if (this.scene.anims.exists(key)) return;

    this.scene.anims.create({
      key,
      frames: this.scene.anims.generateFrameNumbers(PROLOGUE_SHEET_KEYS.PLAYER, { start, end }),
      frameRate,
      repeat,
    });
  }

  private updateSpriteAnimation(vx: number, vy: number): void {
    if (vx === 0 && vy === 0) {
      this.playIdleAnimation();
      return;
    }

    // The spritesheet ships dedicated left- and right-facing frames, so we
    // never flip the sprite horizontally — flipping mirrors an already-correct
    // left-facing frame into a wrong-facing one.
    this.sprite.setFlipX(false);

    if (Math.abs(vx) > Math.abs(vy)) {
      this.sprite.anims.play(vx < 0 ? 'player-walk-left' : 'player-walk-right', true);
      return;
    }

    this.sprite.anims.play(vy < 0 ? 'player-walk-up' : 'player-walk-down', true);
  }

  private playIdleAnimation(): void {
    this.sprite.setFlipX(false);
    this.sprite.setScale(PLAYER_SPRITE_SCALE);
    this.sprite.anims.play(`player-idle-${this.facingDirection}`, true);
  }

  private beginTileStep(direction: FacingDirection): void {
    const offset = this.getStepOffset(direction);
    const target = {
      x: this.sprite.x + offset.x,
      y: this.sprite.y + offset.y,
    };

    this.facingDirection = direction;

    if (!this.canMoveTo(target)) {
      this.playIdleAnimation();
      return;
    }

    this.state = PlayerState.WALKING;
    this.updateSpriteAnimation(offset.x, offset.y);

    this.movementTween = this.scene.tweens.add({
      targets: this.sprite,
      x: target.x,
      y: target.y,
      duration: PLAYER_STEP_DURATION_MS,
      ease: 'Quad.easeOut', // natural deceleration for weighty, less mechanical steps
      onComplete: () => {
        this.sprite.setPosition(target.x, target.y);
        this.body.reset(target.x, target.y);
        this.movementTween = null;

        if (this.state === PlayerState.WALKING) {
          this.state = PlayerState.IDLE;
          this.playIdleAnimation();
        }

        // Production juice & SFX: micro-shake + footstep particles + soft tone for weighty, satisfying steps
        JuiceSystem.cameraShake(this.scene, 50, 0.0015);
        JuiceSystem.burst(this.scene, target.x, target.y + 10, 0x346856, 5, 16);
        audioManager.playTone(160, 55, 'sawtooth');

        // Buffer will be picked up on the very next update() frame (imperceptible delay, robust)
      },
    });
  }

  private getStepOffset(direction: FacingDirection): { x: number; y: number } {
    if (direction === 'left') return { x: -PLAYER_GRID_STEP, y: 0 };
    if (direction === 'right') return { x: PLAYER_GRID_STEP, y: 0 };
    if (direction === 'up') return { x: 0, y: -PLAYER_GRID_STEP };
    return { x: 0, y: PLAYER_GRID_STEP };
  }

  private resolveMoveDirection(): FacingDirection | null {
    if (!this.cursors || !this.wasd) return null;
    const candidates: Array<{ direction: FacingDirection; time: number | null }> = [
      { direction: 'left', time: this.getLatestDownKeyTime([this.cursors.left, this.wasd.A]) },
      { direction: 'right', time: this.getLatestDownKeyTime([this.cursors.right, this.wasd.D]) },
      { direction: 'up', time: this.getLatestDownKeyTime([this.cursors.up, this.wasd.W]) },
      { direction: 'down', time: this.getLatestDownKeyTime([this.cursors.down, this.wasd.S]) },
    ];

    const active = candidates
      .filter((candidate): candidate is { direction: FacingDirection; time: number } => candidate.time !== null)
      .sort((a, b) => b.time - a.time);

    return active[0]?.direction ?? null;
  }

  private getLatestDownKeyTime(keys: Phaser.Input.Keyboard.Key[]): number | null {
    let latestTime: number | null = null;

    for (const key of keys) {
      if (!key.isDown) continue;
      if (latestTime === null || key.timeDown > latestTime) {
        latestTime = key.timeDown;
      }
    }

    return latestTime;
  }

  private stopMovementTween(): void {
    this.movementTween?.stop();
    this.movementTween = null;
  }

  destroy(): void {
    this.stopMovementTween();
    this.sprite.destroy();
  }
}
