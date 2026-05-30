import Phaser from 'phaser';
import { OVERWORLD_PLAYER_SPRITE_ASSETS } from '../config/assets';
import { CAMERA_TUNING, SCENE_KEYS } from '../config/constants';
import { gameState } from '../core/GameStateManager';
import { TransitionManager } from '../core/TransitionManager';
import { BitCompanion } from '../entities/BitCompanion';
import { InteractableObject } from '../entities/InteractableObject';
import { Player } from '../entities/Player';
import { DialogueSystem } from '../systems/DialogueSystem';
import { HUDManager } from '../systems/HUDManager';
import { InteractionSystem, type InteractableEntry } from '../systems/InteractionSystem';
import { ObjectPool } from '../utils/ObjectPool';
import type { DialogueTree } from '../data/types';

/** Image-asset descriptor as declared per region in config/assets.ts. */
interface RegionImageAsset {
  key: string;
  path: string;
}

/** Sprite-sheet descriptor (image asset + frame dimensions). */
interface RegionSpriteSheetAsset extends RegionImageAsset {
  frameWidth?: number;
  frameHeight?: number;
}

/**
 * Shared base for the post-Prologue overworld regions — Array Plains and Twin
 * Rivers. Those two scenes were ~80% identical; this class owns the surface
 * that was genuinely the same so the regions can no longer silently drift.
 *
 * Region-specific behaviour (route data, collision rules, NPCs, boss gates,
 * the overworld sequence puzzle) stays in each subclass. Divergence the base
 * still has to respect is funnelled through the `canOpenOverlay()` hook.
 */
export abstract class BaseOverworldScene extends Phaser.Scene {
  protected player!: Player;
  protected bit!: BitCompanion;
  protected hud!: HUDManager;
  protected interactionSystem!: InteractionSystem;
  protected dialogueSystem!: DialogueSystem;
  protected interactablePool!: ObjectPool<InteractableObject>;
  protected hasShutdown = false;
  protected lastPlayerX = NaN;
  protected lastPlayerY = NaN;
  protected interactionEnabledTime = 0;
  protected labelObjects: Phaser.GameObjects.Text[] = [];

  /** Region-specific image assets to preload — supplied by each subclass. */
  protected abstract getRegionImageAssets(): ReadonlyArray<RegionImageAsset>;

  /**
   * Region-specific sprite-sheet assets to preload (e.g. animated environmental
   * props consumed by `placeRegionProps`). Default empty — opt-in per subclass.
   * Returning entries here registers them as spritesheets in the texture cache,
   * which `scene.add.sprite` + `anims.generateFrameNumbers` both require to
   * resolve real frames instead of the 1×1 `__MISSING` placeholder.
   */
  protected getRegionSpriteSheetAssets(): ReadonlyArray<RegionSpriteSheetAsset> {
    return [];
  }

  /** Apply a spawn override passed in by a portal transition. */
  init(data: { spawnX?: number; spawnY?: number }): void {
    if (data.spawnX !== undefined && data.spawnY !== undefined) {
      gameState.setPlayerPosition(data.spawnX, data.spawnY);
    }
  }

  /** Load the shared overworld player sheets plus this region's images. */
  preload(): void {
    for (const asset of OVERWORLD_PLAYER_SPRITE_ASSETS) {
      if (this.textures.exists(asset.key)) continue;
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth || 32,
        frameHeight: asset.frameHeight || 48,
      });
    }
    for (const asset of this.getRegionImageAssets()) {
      if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.path);
    }
    for (const asset of this.getRegionSpriteSheetAssets()) {
      if (this.textures.exists(asset.key)) continue;
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth ?? 32,
        frameHeight: asset.frameHeight ?? 32,
      });
    }
  }

  /** Camera follow + zoom + deadzone — identical across overworld regions. */
  protected setupOverworldCamera(worldWidth: number, worldHeight: number): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, worldWidth, worldHeight);
    camera.setZoom(CAMERA_TUNING.ZOOM);
    camera.startFollow(
      this.player.sprite,
      true,
      CAMERA_TUNING.FOLLOW_LERP,
      CAMERA_TUNING.FOLLOW_LERP,
    );
    camera.setDeadzone(CAMERA_TUNING.DEADZONE_WIDTH, CAMERA_TUNING.DEADZONE_HEIGHT);
  }

  /** Fade the region in and hold interaction until the fade clears. */
  protected playEntranceFade(durationMs = 700): void {
    TransitionManager.fadeIn(this, durationMs);
    this.interactionEnabledTime = this.time.now + durationMs;
  }

  /** Show a single speaker note as a one-node dialogue. */
  protected showFieldNote(speaker: string, body: string | string[]): void {
    if (this.dialogueSystem.isDialogueActive()) return;
    const tree: DialogueTree = {
      startNodeId: 'note',
      nodes: [{ id: 'note', speaker, text: body }],
    };
    this.dialogueSystem.startDialogue(
      tree,
      `field_${speaker.toLowerCase().replace(/\s+/g, '_')}`,
    );
  }

  /** Enter a puzzle scene, returning to this region when it completes. */
  protected startPuzzle(sceneKey: string): void {
    TransitionManager.pixelDissolve(this, sceneKey, { returnScene: this.scene.key });
  }

  /** Open the Codex overlay, returning to this region on exit. */
  protected openCodex(): void {
    if (!this.canOpenOverlay()) return;
    TransitionManager.fade(this, SCENE_KEYS.CODEX, { returnScene: this.scene.key }, 260);
  }

  /**
   * Whether a full-screen overlay may open right now. The base only blocks on
   * an active dialogue; subclasses override to also block on region-specific
   * modals or cinematics (e.g. Twin Rivers' beta gate and closure beat).
   */
  protected canOpenOverlay(): boolean {
    return !this.dialogueSystem?.isDialogueActive();
  }

  /** Route a confirmed interaction to the target object's own handler. */
  protected handleInteract(entry: InteractableEntry): void {
    if (!this.canOpenOverlay()) return;
    if (entry.type !== 'object') return;
    (entry.target as InteractableObject).config.onInteract?.();
  }
}
