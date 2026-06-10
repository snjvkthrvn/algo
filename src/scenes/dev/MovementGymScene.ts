/**
 * MovementGymScene — dev-only test region (.claude/plans/
 * 2026-06-10-movement-gym-design.md). A flat checkerboard room wired with
 * the real overworld stack so movement/collision/interaction/camera/anim
 * issues are reproducible outside story content. Reachable only from
 * DebugSelectScene or the dev-only ?scene= warp; never part of progression.
 */

import Phaser from 'phaser';
import { PROLOGUE_SHEET_KEYS, PROLOGUE_SHEET_SPRITE_ASSETS } from '../../config/assets';
import { COLORS, SCENE_KEYS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import { TransitionManager } from '../../core/TransitionManager';
import { NPCType } from '../../data/types';
import { BitCompanion } from '../../entities/BitCompanion';
import { InteractableObject } from '../../entities/InteractableObject';
import { NPC } from '../../entities/NPC';
import { PLAYER_GRID_STEP, Player } from '../../entities/Player';
import { DialogueSystem } from '../../systems/DialogueSystem';
import { HUDManager } from '../../systems/HUDManager';
import { InteractionSystem, type InteractableEntry } from '../../systems/InteractionSystem';
import { ObjectPool } from '../../utils/ObjectPool';
import { setupUICamera } from '../../utils/uiCamera';
import { BaseOverworldScene } from '../BaseOverworldScene';
import { GymReadout } from './GymReadout';

const TILE = PLAYER_GRID_STEP; // 32 — one checkerboard square per step
const WORLD_W = 2560; // ~2x viewport: exercises camera follow + deadzone
const WORLD_H = 1440;
const WALL = TILE; // perimeter ring thickness
const SPAWN = { x: 1280, y: 720 };

/** Interior collision blocks: single block, long bar, tall column. */
const BLOCKS: ReadonlyArray<Phaser.Geom.Rectangle> = [
  new Phaser.Geom.Rectangle(640, 480, 128, 128),
  new Phaser.Geom.Rectangle(1280, 928, 384, 64),
  new Phaser.Geom.Rectangle(1792, 384, 64, 320),
];

export class MovementGymScene extends BaseOverworldScene {
  private readout!: GymReadout;
  private gymNPC: NPC | null = null;
  private sign: InteractableObject | null = null;

  constructor() {
    super({ key: SCENE_KEYS.MOVEMENT_GYM });
  }

  protected getRegionImageAssets(): ReadonlyArray<{ key: string; path: string }> {
    return [];
  }

  /** NPC idle sheet — the only non-shared texture the gym needs. */
  protected override getRegionSpriteSheetAssets() {
    return PROLOGUE_SHEET_SPRITE_ASSETS.filter(
      (asset) => asset.key === PROLOGUE_SHEET_KEYS.NPCS,
    );
  }

  create(): void {
    this.hasShutdown = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    audioManager.setScene(this);

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.drawFloorAndWalls();

    this.player = new Player(this, SPAWN.x, SPAWN.y, {
      canMoveTo: (point) => this.isWalkable(point),
    });
    this.bit = new BitCompanion(this, SPAWN.x, SPAWN.y);

    if (!this.interactablePool) {
      this.interactablePool = new ObjectPool(
        (cfg) => new InteractableObject(this, cfg),
        (obj, cfg) => obj.reset(cfg),
      );
    }
    this.interactionSystem = new InteractionSystem(this, this.player);
    this.dialogueSystem = new DialogueSystem(this);

    this.createSign();
    this.createWanderNPC();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));

    this.hud = new HUDManager(this);
    this.readout = new GymReadout(this);
    setupUICamera(this);
    this.setupOverworldCamera(WORLD_W, WORLD_H);
    this.playEntranceFade();
    this.hud.showRegionCard('Movement Gym', 'Dev-only test region.');
    this.input.keyboard?.on('keydown-ESC', this.onEsc);
  }

  update(time: number, delta: number): void {
    const dialogueActive = this.dialogueSystem?.isDialogueActive() ?? false;
    if (!dialogueActive) {
      this.player.update(time, delta);
    }

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y, delta);
    this.interactionSystem.update(
      !dialogueActive && this.time.now >= this.interactionEnabledTime,
    );

    this.readout.update({
      x: pos.x,
      y: pos.y,
      state: this.player.state,
      facing: this.player.getFacingDirection(),
      animKey: this.player.sprite.anims.currentAnim?.key ?? 'none',
      frameIndex: this.player.sprite.anims.currentFrame?.index ?? 0,
      fps: this.game.loop.actualFps,
    });
  }

  /** Inside the wall ring and outside every collision block. */
  private isWalkable(point: { x: number; y: number }): boolean {
    if (
      point.x < WALL + TILE / 2 ||
      point.x > WORLD_W - WALL - TILE / 2 ||
      point.y < WALL + TILE / 2 ||
      point.y > WORLD_H - WALL - TILE / 2
    ) {
      return false;
    }
    return !BLOCKS.some((block) => block.contains(point.x, point.y));
  }

  private drawFloorAndWalls(): void {
    const g = this.add.graphics().setDepth(0);
    // 32px checkerboard — each square is exactly one player step, so step
    // distance and grid snapping are visually verifiable.
    for (let ty = 0; ty < WORLD_H / TILE; ty++) {
      for (let tx = 0; tx < WORLD_W / TILE; tx++) {
        g.fillStyle((tx + ty) % 2 === 0 ? 0x20303a : 0x243642, 1);
        g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    // Perimeter wall ring.
    g.fillStyle(0x101a20, 1);
    g.fillRect(0, 0, WORLD_W, WALL);
    g.fillRect(0, WORLD_H - WALL, WORLD_W, WALL);
    g.fillRect(0, 0, WALL, WORLD_H);
    g.fillRect(WORLD_W - WALL, 0, WALL, WORLD_H);
    // Interior collision blocks.
    for (const block of BLOCKS) {
      g.fillStyle(0x101a20, 1);
      g.fillRect(block.x, block.y, block.width, block.height);
      g.lineStyle(1, COLORS.FRAME_BORDER_LIGHT, 0.5);
      g.strokeRect(block.x + 0.5, block.y + 0.5, block.width - 1, block.height - 1);
    }
  }

  private createSign(): void {
    this.sign = this.interactablePool.acquire({
      id: 'gym_sign',
      type: 'sign',
      x: SPAWN.x - 160,
      y: SPAWN.y,
      prompt: 'Read',
      onInteract: () =>
        this.showFieldNote('Gym Sign', [
          'Arrows/WASD walk. SHIFT runs.',
          'Bump the dark blocks to test collision.',
          'ESC returns to the debug menu.',
        ]),
    });
    this.interactionSystem.addObject(this.sign);
  }

  private createWanderNPC(): void {
    this.gymNPC = new NPC(this, {
      id: 'gym_walker',
      name: 'Test Walker',
      type: NPCType.VILLAGER,
      spriteKey: PROLOGUE_SHEET_KEYS.NPCS,
      defaultPosition: { x: SPAWN.x + 256, y: SPAWN.y - 128 },
      dialogue: {
        startNodeId: 'hello',
        nodes: [
          {
            id: 'hello',
            speaker: 'Test Walker',
            text: 'I wander so you can test depth sorting and NPC interaction.',
          },
        ],
      },
      movement: {
        kind: 'wander',
        leashRadius: 128,
        canWalk: (point) => this.isWalkable(point),
      },
    });
    this.interactionSystem.addNPC(this.gymNPC);
  }

  /** NPCs open their dialogue; objects keep the base behaviour. */
  protected override handleInteract(entry: InteractableEntry): void {
    if (entry.type !== 'npc') {
      super.handleInteract(entry);
      return;
    }
    if (!this.canOpenOverlay()) return;
    const npc = entry.target as NPC;
    this.dialogueSystem.startDialogue(npc.config.dialogue, npc.config.id);
  }

  private onEsc = (): void => {
    if (!this.canOpenOverlay()) return;
    TransitionManager.fade(this, SCENE_KEYS.DEBUG_SELECT);
  };

  private shutdown(): void {
    this.hasShutdown = true;
    this.input.keyboard?.off('keydown-ESC', this.onEsc);
    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.hud?.destroy();
    if (this.sign) {
      this.interactablePool.release(this.sign);
      this.sign = null;
    }
    this.gymNPC?.destroy();
    this.gymNPC = null;
  }
}
