/**
 * Player - Movement, animation, interaction state.
 * Uses the Prologue player spritesheet for visual state.
 */

import Phaser from 'phaser';
import { PROLOGUE_SHEET_KEYS } from '../config/assets';
import { COLORS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { PlayerState } from '../data/types';
import { JuiceSystem } from '../systems/JuiceSystem';
import { isGamepadButtonPressed, readGamepadDirection } from '../input/GamepadInput';

const PLAYER_SPRITE_SCALE = 0.25;
export const PLAYER_GRID_STEP = 32;
const PLAYER_STEP_DURATION_MS = 160;
const PLAYER_RUN_STEP_DURATION_MS = 112;
const PLAYER_WALK_FRAME_RATE = 50; // 8 frames per 160ms step — one FULL footfall cycle per tile. Halves perceived foot-glide vs 4 frames/step.
const SHADOW_BASE_ALPHA = 0.28;
const SHADOW_BASE_SCALE = 1;
const COLLISION_BUMP_DISTANCE = 6;
const COLLISION_BUMP_DURATION_MS = 58;
const COLLISION_BUMP_COOLDOWN_MS = 135;

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
  private shadow: Phaser.GameObjects.Ellipse;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private runKeys?: { SHIFT: Phaser.Input.Keyboard.Key; B: Phaser.Input.Keyboard.Key };
  private facingDirection: FacingDirection = 'down';
  private movementTween: Phaser.Tweens.Tween | null = null;
  private collisionBumpTween: Phaser.Tweens.Tween | null = null;
  private collisionBumpAnchor: { x: number; y: number } | null = null;
  private collisionBumpCooldownUntil = 0;
  private canMoveTo: (position: { x: number; y: number }) => boolean;
  private autoWalkTarget: { x: number; y: number } | null = null;
  private autoWalkCallback: (() => void) | null = null;
  private nextMoveBuffer: FacingDirection | null = null; // buffers input during tween for responsive chaining
  private walkStepElapsedMs = 0;
  private activeStepDurationMs = PLAYER_STEP_DURATION_MS;
  private lastFootstepLift = 0; // tracks bob envelope so we can fire one audio tic per contact phase
  private stepCount = 0; // every other step landing emits a dust puff (avoids clutter)

  constructor(scene: Phaser.Scene, x: number, y: number, options: PlayerOptions = {}) {
    this.scene = scene;
    this.lastSafePosition = { x, y };
    this.canMoveTo = options.canMoveTo ?? (() => true);

    this.createAnimations();
    this.shadow = scene.add.ellipse(x, y + 14, 20, 7, 0x000000, SHADOW_BASE_ALPHA).setDepth(4.8);
    this.sprite = scene.add
      .sprite(x, y, PROLOGUE_SHEET_KEYS.PLAYER, 0)
      .setDepth(5)
      .setScale(PLAYER_SPRITE_SCALE);
    // setOrigin defaults to (0.5, 0.5); we shift origin.y at walk apex for a sub-pixel
    // visual bob that doesn't pollute sprite.y / body / shadow position.
    if (typeof this.sprite.setOrigin === 'function') this.sprite.setOrigin(0.5, 0.5);
    this.sprite.anims.play('player-idle-down');

    // Enable physics so the sprite has an Arcade body that tracks its position
    // (used only as a position proxy — movement is tween-driven, no velocity).
    // setSize's default `center: true` auto-offsets the body around the sprite
    // origin, so we deliberately do not call setOffset.
    scene.physics.world.enable(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(24, 28);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setCollideWorldBounds(true);

    // Setup input
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.runKeys = {
        SHIFT: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        B: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
      };
    }
  }

  walkTo(x: number, y: number, onComplete?: () => void): void {
    this.autoWalkTarget = { x, y };
    this.autoWalkCallback = onComplete || null;
    this.state = PlayerState.IDLE;
  }

  update(_time: number, _delta: number): void {
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 14);

    if (this.state === PlayerState.FROZEN || this.state === PlayerState.INTERACTING) {
      this.stopMovementTween();
      this.playIdleAnimation();
      return;
    }

    if (this.movementTween) {
      this.walkStepElapsedMs = Math.min(this.activeStepDurationMs, this.walkStepElapsedMs + _delta);
      this.applyWalkPolish();
      // Buffer latest direction for immediate chaining on step complete (feels responsive)
      const buffered = this.resolveMoveDirection();
      if (buffered) this.nextMoveBuffer = buffered;
      return;
    }

    if (this.collisionBumpTween) {
      this.keepBodyOnCollisionAnchor();
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
    this.stopCollisionBumpTween();
    this.stopMovementTween();
    this.state = PlayerState.FROZEN;
    this.playIdleAnimation();
  }

  unfreeze(): void {
    this.state = PlayerState.IDLE;
  }

  setInteracting(interacting: boolean): void {
    if (interacting) this.stopCollisionBumpTween();
    if (interacting) this.stopMovementTween();
    this.state = interacting ? PlayerState.INTERACTING : PlayerState.IDLE;
    this.playIdleAnimation();
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setPosition(x: number, y: number): void {
    this.stopCollisionBumpTween();
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
    this.createAnimationIfMissing('player-idle-left', 8, 8, 1);
    this.createAnimationIfMissing('player-idle-right', 16, 16, 1);
    this.createAnimationIfMissing('player-idle-up', 24, 24, 1);
    this.createAnimationIfMissing('player-walk-down', 0, 7, PLAYER_WALK_FRAME_RATE, -1);
    this.createAnimationIfMissing('player-walk-left', 8, 15, PLAYER_WALK_FRAME_RATE, -1);
    this.createAnimationIfMissing('player-walk-right', 16, 23, PLAYER_WALK_FRAME_RATE, -1);
    this.createAnimationIfMissing('player-walk-up', 24, 31, PLAYER_WALK_FRAME_RATE, -1);
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
      this.playCollisionBump(direction, offset);
      return;
    }

    this.state = PlayerState.WALKING;
    this.walkStepElapsedMs = 0;
    this.activeStepDurationMs = this.isRunHeld() ? PLAYER_RUN_STEP_DURATION_MS : PLAYER_STEP_DURATION_MS;
    this.updateSpriteAnimation(offset.x, offset.y);

    this.movementTween = this.scene.tweens.add({
      targets: this.sprite,
      x: target.x,
      y: target.y,
      duration: this.activeStepDurationMs,
      ease: 'Linear', // Linear movement removes start/stop stutter for smooth contiguous tile steps
      onUpdate: () => {
        this.body.reset(this.sprite.x, this.sprite.y);
      },
      onComplete: () => {
        this.sprite.setPosition(target.x, target.y);
        this.sprite.setScale(PLAYER_SPRITE_SCALE);
        if (typeof this.sprite.setOrigin === 'function') this.sprite.setOrigin(0.5, 0.5);
        this.body.reset(target.x, target.y);
        this.movementTween = null;

        // Dust puff on every other landing — small pixel-rect cluster in our
        // medium-dark GB green so it reads against the lighter floor tiles
        // without breaking palette.
        this.stepCount += 1;
        if (this.stepCount % 2 === 0) {
          JuiceSystem.burst?.(this.scene, target.x, target.y + 14, COLORS.WARNING, 3, 14);
        }

        // Only fall back to idle when there's no input or auto-walk pending.
        // Otherwise leaving the animation as walk-{dir} lets `update()`'s next
        // beginTileStep call the same anim with `ignoreIfPlaying=true`, so the
        // walk cycle plays continuously across chained steps instead of
        // restarting from frame 0 every 120ms.
        if (this.state === PlayerState.WALKING) {
          const stillMoving =
            this.autoWalkTarget !== null ||
            this.nextMoveBuffer !== null ||
            this.resolveMoveDirection() !== null;
          if (!stillMoving) {
            this.state = PlayerState.IDLE;
            this.playIdleAnimation();
          }
        }

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

  private applyWalkPolish(): void {
    const phase = Math.min(1, this.walkStepElapsedMs / this.activeStepDurationMs);

    // Two footfalls per tile step → 2π over one phase. |sin| gives a peaked
    // envelope at phase 0.25 and 0.75 (mid-stride apex), zero at contact.
    const lift = Math.abs(Math.sin(phase * Math.PI * 2));

    // Root-motion compensation. Body tween is linear (32 px / step) but the
    // sprite's leg swing covers less ground per frame, so feet "glide" if not
    // countered. We anchor the rendered sprite BEHIND its natural position at
    // each mid-stance moment, returning to zero at the three contact moments
    // (t=0, 0.5, 1.0). |sin(2π·t)| gives this exact pattern: two peaks per
    // step at t=0.25 and t=0.75 — synced with foot A's mid-stance and foot
    // B's mid-stance respectively. ANCHOR_PX must stay ≤ ~5 to avoid the
    // sprite-velocity going negative (rubber-band effect).
    const planted = lift; // identical envelope: |sin(2π·t)|, two peaks per step
    const ANCHOR_PX = 5;
    const SPRITE_DISPLAY = 64; // 256 source × 0.25 scale
    const facingX = this.facingDirection === 'left' ? -1 : this.facingDirection === 'right' ? 1 : 0;
    const facingY = this.facingDirection === 'up' ? -1 : this.facingDirection === 'down' ? 1 : 0;
    // originX > 0.5 shifts the rendered sprite LEFT (pivot column is right of center).
    // To draw BEHIND motion direction, push origin AWAY along facing axis.
    const anchorOriginX = (facingX * planted * ANCHOR_PX) / SPRITE_DISPLAY;
    const anchorOriginY = (facingY * planted * ANCHOR_PX) / SPRITE_DISPLAY;

    // Visual Y bob via originY shift — purely render-side, so sprite.y / body /
    // shadow position all stay authoritative. originY > 0.5 shifts the rendered
    // sprite UPWARD because the pivot row anchors lower in the sprite.
    if (typeof this.sprite.setOrigin === 'function') {
      this.sprite.setOrigin(0.5 + anchorOriginX, 0.5 + lift * 0.012 + anchorOriginY);
    }

    // Squash on contact (wider/shorter) and stretch mid-stride (narrower/taller).
    this.sprite.setScale(
      PLAYER_SPRITE_SCALE * (1 + (1 - lift) * 0.02),
      PLAYER_SPRITE_SCALE * (1 + lift * 0.018)
    );

    // Shadow tightens & fades at apex, spreads & darkens at contact — sells weight.
    if (typeof this.shadow.setScale === 'function' && typeof this.shadow.setAlpha === 'function') {
      this.shadow.setScale(SHADOW_BASE_SCALE - lift * 0.22, SHADOW_BASE_SCALE - lift * 0.18);
      this.shadow.setAlpha(SHADOW_BASE_ALPHA + (1 - lift) * 0.10);
    }

    // Footstep audio: fire one tic per contact moment (when lift dips through ~zero
    // from a high value). 110Hz triangle, 35ms — reads as a soft thud, not melodic.
    if (this.lastFootstepLift > 0.45 && lift < 0.18) {
      audioManager.playTone?.(110, 35, 'triangle');
    }
    this.lastFootstepLift = lift;
  }

  private resolveMoveDirection(): FacingDirection | null {
    const keyboardDirection = this.resolveKeyboardDirection();
    if (keyboardDirection) return keyboardDirection;

    return readGamepadDirection(this.scene) as FacingDirection | null;
  }

  private resolveKeyboardDirection(): FacingDirection | null {
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

  private isRunHeld(): boolean {
    return Boolean(this.runKeys?.SHIFT.isDown || this.runKeys?.B.isDown || isGamepadButtonPressed(this.scene, 1));
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
    if (!this.movementTween) return;
    this.movementTween.stop();
    this.movementTween = null;
    this.nextMoveBuffer = null;
    this.walkStepElapsedMs = 0;
    this.lastFootstepLift = 0;
    this.sprite.setScale(PLAYER_SPRITE_SCALE);
    if (typeof this.sprite.setOrigin === 'function') this.sprite.setOrigin(0.5, 0.5);
    if (typeof this.shadow.setScale === 'function' && typeof this.shadow.setAlpha === 'function') {
      this.shadow.setScale(SHADOW_BASE_SCALE, SHADOW_BASE_SCALE);
      this.shadow.setAlpha(SHADOW_BASE_ALPHA);
    }
    this.body.reset(this.sprite.x, this.sprite.y);
  }

  private playCollisionBump(direction: FacingDirection, offset: { x: number; y: number }): void {
    this.state = PlayerState.IDLE;
    this.walkStepElapsedMs = 0;
    this.lastFootstepLift = 0;
    this.playIdleAnimation();

    if (this.collisionBumpTween) return;
    const now = this.scene.time?.now ?? 0;
    if (now < this.collisionBumpCooldownUntil) {
      this.body.reset(this.sprite.x, this.sprite.y);
      return;
    }

    const anchor = { x: this.sprite.x, y: this.sprite.y };
    const bumpTarget = {
      x: anchor.x + Math.sign(offset.x) * COLLISION_BUMP_DISTANCE,
      y: anchor.y + Math.sign(offset.y) * COLLISION_BUMP_DISTANCE,
    };
    this.collisionBumpAnchor = anchor;
    this.collisionBumpCooldownUntil = now + COLLISION_BUMP_COOLDOWN_MS;

    audioManager.playTone(92, 46, 'triangle');
    JuiceSystem.cameraShake(this.scene, 42, 0.0014);
    JuiceSystem.burst(
      this.scene,
      anchor.x + Math.sign(offset.x) * 14,
      anchor.y + Math.sign(offset.y) * 14 + 10,
      COLORS.WARNING,
      2,
      8,
    );

    this.collisionBumpTween = this.scene.tweens.add({
      targets: this.sprite,
      x: bumpTarget.x,
      y: bumpTarget.y,
      duration: COLLISION_BUMP_DURATION_MS,
      yoyo: true,
      ease: 'Quad.easeOut',
      onUpdate: () => this.keepBodyOnCollisionAnchor(),
      onComplete: () => {
        this.sprite.setPosition(anchor.x, anchor.y);
        this.body.reset(anchor.x, anchor.y);
        this.collisionBumpTween = null;
        this.collisionBumpAnchor = null;
        if (this.nextMoveBuffer === direction) this.nextMoveBuffer = null;
      },
    });
  }

  private keepBodyOnCollisionAnchor(): void {
    if (!this.collisionBumpAnchor) return;
    this.body.reset(this.collisionBumpAnchor.x, this.collisionBumpAnchor.y);
  }

  private stopCollisionBumpTween(): void {
    if (!this.collisionBumpTween) return;
    this.collisionBumpTween.stop();
    const anchor = this.collisionBumpAnchor ?? { x: this.sprite.x, y: this.sprite.y };
    this.sprite.setPosition(anchor.x, anchor.y);
    this.body.reset(anchor.x, anchor.y);
    this.collisionBumpTween = null;
    this.collisionBumpAnchor = null;
  }

  destroy(): void {
    this.stopCollisionBumpTween();
    this.stopMovementTween();
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
