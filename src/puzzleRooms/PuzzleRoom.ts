/**
 * PuzzleRoom — the embodiment kit for first-three puzzle scenes
 * (docs/VISION.md §2: every puzzle is a room you walk in; the algorithm
 * happens through your body, not through UI clicks).
 *
 * Composable helper rather than a scene base class: existing puzzle scenes
 * keep extending BasePuzzleScene (stars, naming beat, save flow) and mount
 * a PuzzleRoom for the walkable layer. The same overworld Player entity
 * walks in here — same sprite, same step feel, same shadow — so entering a
 * puzzle never feels like leaving the game.
 *
 * Input parity contract (CLAUDE.md): keyboard moves + SPACE acts, gamepad
 * stick moves + A acts (Player handles both), pointer click auto-walks the
 * player to the clicked point and acts on arrival.
 */

import Phaser from 'phaser';
import { OVERWORLD_PLAYER_SPRITE_ASSETS } from '../config/assets';
import { Player } from '../entities/Player';

export interface PuzzleRoomConfig {
  /** Walkable floor area, in scene pixels. */
  bounds: { x: number; y: number; width: number; height: number };
  /** Player spawn point. */
  spawn: { x: number; y: number };
  /**
   * Extra dynamic blockers (crates, water, keeper). Return true to block.
   * Checked in addition to `bounds`.
   */
  isBlocked?: (point: { x: number; y: number }) => boolean;
  /**
   * The unified act input (SPACE / gamepad A / click-arrival). Fired only
   * while the room is active. What "acting" means is the scene's mechanic.
   */
  onAct?: () => void;
  /** Optional hook fired after every player step lands (for proximity UI). */
  onStep?: (position: { x: number; y: number }) => void;
}

export class PuzzleRoom {
  readonly player: Player;
  private scene: Phaser.Scene;
  private config: PuzzleRoomConfig;
  private active = true;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private lastStepPos = { x: NaN, y: NaN };

  /** Call from the scene's preload() so the shared player sheets exist. */
  static preload(scene: Phaser.Scene): void {
    for (const asset of OVERWORLD_PLAYER_SPRITE_ASSETS) {
      if (scene.textures.exists(asset.key)) continue;
      scene.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth || 32,
        frameHeight: asset.frameHeight || 48,
      });
    }
  }

  constructor(scene: Phaser.Scene, config: PuzzleRoomConfig) {
    this.scene = scene;
    this.config = config;

    this.player = new Player(scene, config.spawn.x, config.spawn.y, {
      canMoveTo: (point) => this.canWalk(point),
    });

    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey?.on('down', this.handleAct, this);
    scene.input.gamepad?.on('down', this.handleGamepadDown, this);
    scene.input.on('pointerdown', this.handlePointer, this);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private canWalk(point: { x: number; y: number }): boolean {
    const b = this.config.bounds;
    const inBounds =
      point.x >= b.x && point.x <= b.x + b.width &&
      point.y >= b.y && point.y <= b.y + b.height;
    if (!inBounds) return false;
    return this.config.isBlocked?.(point) !== true;
  }

  private handleAct(): void {
    if (!this.active) return;
    this.config.onAct?.();
  }

  private handleGamepadDown(
    _pad: Phaser.Input.Gamepad.Gamepad,
    button: Phaser.Input.Gamepad.Button,
  ): void {
    // A / bottom face button acts, matching GamepadActionBridge's mapping.
    if (button.index === 0) this.handleAct();
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (!this.active) return;
    // Clicks on interactive objects (tiles, buttons) belong to those
    // objects — only clicks on open floor steer the player.
    const hits = this.scene.input.hitTestPointer(pointer);
    if (hits.length > 0) return;
    const target = { x: pointer.worldX, y: pointer.worldY };
    if (!this.canWalk(target)) return;
    // Click-to-walk: the player physically travels there, then acts. The
    // mechanic still happens through the body — pointer users just steer
    // differently.
    this.player.walkTo(target.x, target.y, () => this.handleAct());
  }

  /** Scene update() must call this every frame. */
  update(time: number, delta: number): void {
    if (!this.active) return;
    this.player.update(time, delta);
    const pos = this.player.getPosition();
    if (pos.x !== this.lastStepPos.x || pos.y !== this.lastStepPos.y) {
      this.lastStepPos = pos;
      this.config.onStep?.(pos);
    }
  }

  /** Freeze the room (dialogue, recap cards, completion). */
  setActive(active: boolean): void {
    this.active = active;
    this.player.setInteracting(!active);
  }

  destroy(): void {
    this.spaceKey?.off('down', this.handleAct, this);
    this.scene.input.gamepad?.off('down', this.handleGamepadDown, this);
    this.scene.input.off('pointerdown', this.handlePointer, this);
  }
}
