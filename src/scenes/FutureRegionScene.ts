import Phaser from 'phaser';
import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { COLORS, FONTS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { gameState } from '../core/GameStateManager';
import { TransitionManager } from '../core/TransitionManager';
import { BitCompanion } from '../entities/BitCompanion';
import { InteractableObject } from '../entities/InteractableObject';
import { Player } from '../entities/Player';
import {
  FUTURE_REGION_ROUTE_RECTS,
  FUTURE_REGION_SCENE_CONFIGS,
  FUTURE_REGION_WORLD_HEIGHT,
  FUTURE_REGION_WORLD_WIDTH,
  isPointOnFutureRegionRoute,
  type FutureRegionSceneConfig,
} from '../data/regions/futureRegions';
import { DialogueSystem } from '../systems/DialogueSystem';
import { HUDManager } from '../systems/HUDManager';
import { InteractionSystem, type InteractableEntry } from '../systems/InteractionSystem';
import type { DialogueTree } from '../data/types';
import { setupUICamera } from '../utils/uiCamera';
import { PAUSE_OVERLAY_KEY } from './PauseOverlayScene';

type SpawnData = { spawnX?: number; spawnY?: number };

abstract class BaseFutureRegionScene extends Phaser.Scene {
  private player!: Player;
  private bit!: BitCompanion;
  private hud!: HUDManager;
  private interactionSystem!: InteractionSystem;
  private dialogueSystem!: DialogueSystem;
  private readonly regionConfig: FutureRegionSceneConfig;
  private readonly interactables: InteractableObject[] = [];
  private readonly encounterObjects: InteractableObject[] = [];
  private readonly labelObjects: Phaser.GameObjects.Text[] = [];
  private lastPlayerX: number = NaN;
  private lastPlayerY: number = NaN;

  private readonly onEscPause = () => this.openPauseOverlay();

  protected constructor(regionConfig: FutureRegionSceneConfig) {
    super({ key: regionConfig.sceneKey });
    this.regionConfig = regionConfig;
  }

  init(data: SpawnData): void {
    if (data.spawnX !== undefined && data.spawnY !== undefined) {
      gameState.setPlayerPosition(data.spawnX, data.spawnY);
    }
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    audioManager.setScene(this);
    audioManager.playMusic('prologue-bgm');

    let px = gameState.getState().player.x;
    let py = gameState.getState().player.y;
    if (!isPointOnFutureRegionRoute({ x: px, y: py }, 0)) {
      px = 192;
      py = 448;
      gameState.setPlayerPosition(px, py);
    }
    gameState.setPlayerLocation(this.regionConfig.regionId, px, py);

    this.physics.world.setBounds(0, 0, FUTURE_REGION_WORLD_WIDTH, FUTURE_REGION_WORLD_HEIGHT);
    this.renderField();
    this.renderRoute();
    this.createAmbientLayer();

    this.player = new Player(this, px, py, {
      canMoveTo: (point) => isPointOnFutureRegionRoute(point, 0),
    });
    this.bit = new BitCompanion(this, px, py);

    this.interactionSystem = new InteractionSystem(this, this.player);
    this.dialogueSystem = new DialogueSystem(this);
    this.createInteractables();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));

    this.hud = new HUDManager(this);
    setupUICamera(this);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, FUTURE_REGION_WORLD_WIDTH, FUTURE_REGION_WORLD_HEIGHT);
    camera.setZoom(2);
    camera.startFollow(this.player.sprite, true, 1, 1);
    camera.setDeadzone(96, 64);

    TransitionManager.fadeIn(this, 700);
    this.hud.showRegionCard(this.regionConfig.title, this.regionConfig.subtitle);
    this.input.keyboard?.on('keydown-ESC', this.onEscPause);
  }

  private openPauseOverlay(): void {
    if (this.dialogueSystem?.isDialogueActive()) return;
    if (this.scene.isPaused()) return;
    this.scene.pause();
    this.scene.launch(PAUSE_OVERLAY_KEY, { parentSceneKey: this.regionConfig.sceneKey });
  }

  update(): void {
    const dialogueActive = this.dialogueSystem?.isDialogueActive() ?? false;
    if (!dialogueActive) this.player.update();

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y);
    this.interactionSystem.update(!dialogueActive);
    if (pos.x !== this.lastPlayerX || pos.y !== this.lastPlayerY) {
      gameState.setPlayerPosition(pos.x, pos.y);
      this.lastPlayerX = pos.x;
      this.lastPlayerY = pos.y;
    }
  }

  private renderField(): void {
    this.cameras.main.setBackgroundColor(0x0a0a1a);
    const bg = this.add.image(
      FUTURE_REGION_WORLD_WIDTH / 2,
      FUTURE_REGION_WORLD_HEIGHT / 2,
      this.regionConfig.backgroundKey
    ).setOrigin(0.5).setDepth(0);
    const source = bg.texture.getSourceImage() as HTMLImageElement;
    bg.setScale(Math.max(FUTURE_REGION_WORLD_WIDTH / source.width, FUTURE_REGION_WORLD_HEIGHT / source.height));
    bg.setAlpha(0.96);

    this.add.rectangle(0, 0, FUTURE_REGION_WORLD_WIDTH, FUTURE_REGION_WORLD_HEIGHT, 0xffffff, 0.025)
      .setOrigin(0)
      .setDepth(0.5);
  }

  private renderRoute(): void {
    const route = this.add.graphics().setDepth(1);
    for (const rect of FUTURE_REGION_ROUTE_RECTS) {
      route.lineStyle(1, this.regionConfig.accentColor, 0.035);
      route.beginPath();
      route.moveTo(rect.x + 16, rect.y + rect.height / 2);
      route.lineTo(rect.x + rect.width - 16, rect.y + rect.height / 2);
      route.strokePath();
    }

    if (this.prefersReducedMotion()) return;

    for (const rect of FUTURE_REGION_ROUTE_RECTS) {
      const count = Math.max(2, Math.floor(rect.width / 220));
      for (let i = 0; i < count; i++) {
        const glint = this.add.circle(
          rect.x + 42 + i * 212,
          rect.y + rect.height / 2 + Phaser.Math.Between(-12, 12),
          Phaser.Math.FloatBetween(1.1, 1.8),
          this.regionConfig.accentColor,
          0.22
        ).setDepth(2);
        this.tweens.add({
          targets: glint,
          alpha: 0.02,
          scale: 1.8,
          duration: Phaser.Math.Between(900, 1600),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 900),
        });
      }
    }
  }

  private createAmbientLayer(): void {
    if (this.prefersReducedMotion()) return;

    if (this.regionConfig.ambient === 'water' || this.regionConfig.ambient === 'canal') {
      this.createFlowLines();
      return;
    }
    if (this.regionConfig.ambient === 'leaves') {
      this.createDriftingLeaves();
      return;
    }
    if (this.regionConfig.ambient === 'data') {
      this.createGraphPulse();
      return;
    }
    if (this.regionConfig.ambient === 'core') {
      this.createCorePulse();
      return;
    }
    this.createWindMotes();
  }

  private createFlowLines(): void {
    for (const y of [300, 468]) {
      for (let i = 0; i < 9; i++) {
        const line = this.add.rectangle(392 + i * 142, y + Phaser.Math.Between(-10, 10), 82, 3, COLORS.CYAN_GLOW, 0.24)
          .setDepth(2);
        this.tweens.add({
          targets: line,
          x: line.x + 112,
          alpha: 0.06,
          duration: Phaser.Math.Between(1100, 1900),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: i * 70,
        });
      }
    }
  }

  private createDriftingLeaves(): void {
    for (let i = 0; i < 22; i++) {
      const leaf = this.add.ellipse(
        Phaser.Math.Between(160, FUTURE_REGION_WORLD_WIDTH - 160),
        Phaser.Math.Between(110, FUTURE_REGION_WORLD_HEIGHT - 120),
        5,
        2,
        i % 2 === 0 ? 0x22c55e : 0xfbbf24,
        0.2
      ).setDepth(2);
      this.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(-24, 36),
        y: leaf.y + Phaser.Math.Between(12, 38),
        angle: Phaser.Math.Between(80, 210),
        duration: Phaser.Math.Between(2200, 4200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1200),
      });
    }
  }

  private createGraphPulse(): void {
    for (let i = 0; i < 10; i++) {
      const node = this.add.circle(
        520 + i * 92,
        i % 2 === 0 ? 296 : 472,
        4,
        COLORS.CYAN_GLOW,
        0.3
      ).setDepth(2);
      this.tweens.add({
        targets: node,
        scale: 1.9,
        alpha: 0.05,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 120,
      });
    }
  }

  private createCorePulse(): void {
    for (let i = 0; i < 4; i++) {
      const ring = this.add.circle(960, 388, 46 + i * 32, this.regionConfig.accentColor, 0)
        .setStrokeStyle(2, this.regionConfig.accentColor, 0.26)
        .setDepth(2);
      this.tweens.add({
        targets: ring,
        scale: 1.55,
        alpha: 0,
        duration: 1800,
        repeat: -1,
        ease: 'Sine.easeOut',
        delay: i * 320,
      });
    }
  }

  private createWindMotes(): void {
    for (let i = 0; i < 16; i++) {
      const mote = this.add.circle(
        Phaser.Math.Between(180, FUTURE_REGION_WORLD_WIDTH - 180),
        Phaser.Math.Between(130, FUTURE_REGION_WORLD_HEIGHT - 110),
        Phaser.Math.FloatBetween(1.2, 2.2),
        this.regionConfig.accentColor,
        Phaser.Math.FloatBetween(0.12, 0.24)
      ).setDepth(2);
      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-24, 52),
        y: mote.y - Phaser.Math.Between(8, 28),
        alpha: 0.04,
        duration: Phaser.Math.Between(1900, 3600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1200),
      });
    }
  }

  private createInteractables(): void {
    const back = new InteractableObject(this, {
      id: 'back_gateway',
      type: 'portal',
      x: 112,
      y: 448,
      prompt: this.regionConfig.back.label,
      locked: false,
      imageByState: { unlocked: this.regionConfig.back.portalKey },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: 'unlocked',
      onInteract: () => {
        this.scene.launch(this.regionConfig.back.sceneKey, {
          spawnX: this.regionConfig.back.spawnX,
          spawnY: this.regionConfig.back.spawnY,
        });
        this.scene.stop(this.regionConfig.sceneKey);
      },
    });
    this.addInteractable(back);

    if (this.regionConfig.next) {
      const next = this.regionConfig.next;
      const locked = !!next.requiresPuzzleId && !gameState.isPuzzleCompleted(next.requiresPuzzleId);
      const gateway = new InteractableObject(this, {
        id: 'next_gateway',
        type: 'portal',
        x: 1784,
        y: 416,
        prompt: locked ? (next.lockedLabel ?? '[LOCKED] Complete region') : next.label,
        locked,
        imageByState: {
          locked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
          unlocked: next.portalKey,
        },
        imageScale: 0.24,
        imageOriginY: 0.86,
        initialState: locked ? 'locked' : 'unlocked',
        onInteract: () => {
          if (locked) {
            this.showNote(this.regionConfig.title, 'The next road is sealed until this region settles.');
            return;
          }

          this.scene.launch(next.sceneKey, {
            spawnX: next.spawnX,
            spawnY: next.spawnY,
          });
          this.scene.stop(this.regionConfig.sceneKey);
        },
      });
      this.addInteractable(gateway);
    }

    const guide = new InteractableObject(this, {
      id: 'region_guide',
      type: 'sign',
      x: 960,
      y: 336,
      prompt: '[SPACE] Listen',
      locked: false,
      spriteImageKey: this.regionConfig.guide.assetKey,
      imageScale: 0.14,
      imageOriginY: 0.84,
      onInteract: () => this.showNote(this.regionConfig.guide.title, this.regionConfig.guide.body),
    });
    this.addInteractable(guide);

    const shrine = new InteractableObject(this, {
      id: 'region_shrine',
      type: 'sign',
      x: 960,
      y: 536,
      prompt: '[SPACE] Inspect',
      locked: false,
      spriteImageKey: this.regionConfig.ambient === 'core'
        ? VISUAL_REVAMP_KEYS.PROP_CORE_TERMINAL
        : VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE,
      imageScale: 0.12,
      imageOriginY: 0.84,
      onInteract: () => this.showNote(this.regionConfig.title, this.regionConfig.subtitle),
    });
    this.addInteractable(shrine);

    this.createEncounterObjects();
  }

  private createEncounterObjects(): void {
    for (const encounter of this.regionConfig.encounters ?? []) {
      const completed = gameState.isPuzzleCompleted(encounter.id);
      const locked = encounter.requiresPuzzleIds?.some((id) => !gameState.isPuzzleCompleted(id)) ?? false;
      const isBoss = encounter.kind === 'boss';
      const object = new InteractableObject(this, {
        id: encounter.id,
        type: isBoss ? 'gate' : 'sign',
        x: encounter.position.x,
        y: encounter.position.y,
        prompt: locked ? (encounter.lockedPrompt ?? '[LOCKED] Complete lessons') : completed ? '[SPACE] Replay' : encounter.prompt,
        locked,
        spriteImageKey: isBoss ? undefined : VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE,
        imageByState: isBoss
          ? {
              locked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
              unlocked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN,
            }
          : undefined,
        imageScale: isBoss ? 0.19 : 0.12,
        imageOriginY: 0.84,
        initialState: locked ? 'locked' : 'unlocked',
        onInteract: () => {
          if (locked) {
            this.showNote(encounter.title, 'Complete the four teachings before this challenge opens.');
            return;
          }

          this.startPuzzle(encounter.sceneKey);
        },
      });
      this.encounterObjects.push(object);
      this.interactionSystem.addObject(object);

      const label = this.add.text(encounter.position.x, encounter.position.y - 52, encounter.title, {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: completed ? '#e0f8d0' : '#081820',
        backgroundColor: completed ? '#4a3821' : '#e0f8d0',
        padding: { x: 4, y: 3 },
      }).setOrigin(0.5).setDepth(5);
      this.labelObjects.push(label);
    }
  }

  private addInteractable(object: InteractableObject): void {
    this.interactables.push(object);
    this.interactionSystem.addObject(object);
  }

  private handleInteract(entry: InteractableEntry): void {
    if (this.dialogueSystem.isDialogueActive()) return;
    if (entry.type !== 'object') return;
    const object = entry.target as InteractableObject;
    object.config.onInteract?.();
  }

  private startPuzzle(sceneKey: string): void {
    TransitionManager.pixelDissolve(this, sceneKey, { returnScene: this.regionConfig.sceneKey });
  }

  private showNote(speaker: string, body: string | string[]): void {
    if (this.dialogueSystem.isDialogueActive()) return;
    const tree: DialogueTree = {
      startNodeId: 'note',
      nodes: [{ id: 'note', speaker, text: body }],
    };
    this.dialogueSystem.startDialogue(tree, `field_${speaker.toLowerCase().replace(/\s+/g, '_')}`);
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  shutdown(): void {
    this.input.keyboard?.off('keydown-ESC', this.onEscPause);
    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.hud?.destroy();
    for (const object of this.interactables) object.destroy();
    this.interactables.length = 0;
    for (const object of this.encounterObjects) object.destroy();
    this.encounterObjects.length = 0;
    for (const label of this.labelObjects) label.destroy();
    this.labelObjects.length = 0;
    this.bit?.destroy();
    this.player?.destroy();
  }
}

export class HashHighlandsScene extends BaseFutureRegionScene {
  constructor() {
    super(FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.HASH_HIGHLANDS]);
  }
}

export class StackSpiresScene extends BaseFutureRegionScene {
  constructor() {
    super(FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.STACK_SPIRES]);
  }
}

export class QueueCanalsScene extends BaseFutureRegionScene {
  constructor() {
    super(FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.QUEUE_CANALS]);
  }
}

export class TreeCanopyScene extends BaseFutureRegionScene {
  constructor() {
    super(FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.TREE_CANOPY]);
  }
}

export class GraphNexusScene extends BaseFutureRegionScene {
  constructor() {
    super(FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.GRAPH_NEXUS]);
  }
}

export class CoreScene extends BaseFutureRegionScene {
  constructor() {
    super(FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.CORE]);
  }
}
