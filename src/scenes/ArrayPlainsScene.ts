import Phaser from 'phaser';
import { ARRAY_PLAINS_KEYS, PROLOGUE_REWORK_KEYS } from '../config/assets';
import { COLORS, FONTS, REGIONS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { gameState } from '../core/GameStateManager';
import { TransitionManager } from '../core/TransitionManager';
import { BitCompanion } from '../entities/BitCompanion';
import { InteractableObject } from '../entities/InteractableObject';
import { Player } from '../entities/Player';
import {
  ARRAY_PLAINS_CONFIG,
  ARRAY_PLAINS_ROUTE_RECTS,
  ARRAY_PLAINS_WORLD_HEIGHT,
  ARRAY_PLAINS_WORLD_WIDTH,
  isArrayPlainsStepWalkable,
  isPointOnArrayPlainsRoute,
  type ArrayPlainsCollisionBlocker,
} from '../data/regions/arrayPlains';
import { HUDManager } from '../systems/HUDManager';
import { InteractionSystem, type InteractableEntry } from '../systems/InteractionSystem';
import { drawPanel } from '../ui/panel';
import { setupUICamera } from '../utils/uiCamera';

export class ArrayPlainsScene extends Phaser.Scene {
  private player!: Player;
  private bit!: BitCompanion;
  private interactionSystem!: InteractionSystem;
  private hud!: HUDManager;
  private returnGateway: InteractableObject | null = null;
  private markerObjects: InteractableObject[] = [];
  private infoPanelCleanup: (() => void) | null = null;

  constructor() {
    super({ key: SCENE_KEYS.ARRAY_PLAINS });
  }

  init(data: { spawnX?: number; spawnY?: number }): void {
    if (data.spawnX !== undefined && data.spawnY !== undefined) {
      gameState.setPlayerPosition(data.spawnX, data.spawnY);
    }
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    audioManager.setScene(this);

    let px = gameState.getState().player.x;
    let py = gameState.getState().player.y;
    if (!isPointOnArrayPlainsRoute({ x: px, y: py }, 10)) {
      px = ARRAY_PLAINS_CONFIG.spawnPoint.x;
      py = ARRAY_PLAINS_CONFIG.spawnPoint.y;
      gameState.setPlayerPosition(px, py);
    }
    gameState.setPlayerLocation(REGIONS.ARRAY_PLAINS, px, py);

    audioManager.playMusic(ARRAY_PLAINS_CONFIG.backgroundMusic);

    this.physics.world.setBounds(0, 0, ARRAY_PLAINS_WORLD_WIDTH, ARRAY_PLAINS_WORLD_HEIGHT);
    this.renderField();
    this.renderRoute();

    this.player = new Player(this, px, py, {
      canMoveTo: (point) => this.isPlayerStepWalkable(point),
    });
    this.bit = new BitCompanion(this, px, py);

    this.interactionSystem = new InteractionSystem(this, this.player);
    this.createInteractables();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));

    this.hud = new HUDManager(this);
    setupUICamera(this);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, ARRAY_PLAINS_WORLD_WIDTH, ARRAY_PLAINS_WORLD_HEIGHT);
    camera.setZoom(2);
    camera.startFollow(this.player.sprite, true, 1, 1);
    camera.setDeadzone(96, 64);

    TransitionManager.fadeIn(this, 700);
    this.hud.showRegionCard('Array Plains', 'Where order becomes addressable.');
  }

  update(): void {
    const panelOpen = this.infoPanelCleanup !== null;
    if (!panelOpen) {
      this.player.update();
    }

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y);
    this.interactionSystem.update(!panelOpen);
    gameState.setPlayerPosition(pos.x, pos.y);
  }

  private renderField(): void {
    this.cameras.main.setBackgroundColor(0x102818);
    const bg = this.add.image(ARRAY_PLAINS_WORLD_WIDTH / 2, ARRAY_PLAINS_WORLD_HEIGHT / 2, ARRAY_PLAINS_KEYS.FIELD_BACKGROUND)
      .setOrigin(0.5)
      .setDepth(0);
    const source = bg.texture.getSourceImage() as HTMLImageElement;
    const coverScale = Math.max(
      ARRAY_PLAINS_WORLD_WIDTH / source.width,
      ARRAY_PLAINS_WORLD_HEIGHT / source.height
    );
    bg.setScale(coverScale);
    bg.setAlpha(0.88);

    const wash = this.add.rectangle(0, 0, ARRAY_PLAINS_WORLD_WIDTH, ARRAY_PLAINS_WORLD_HEIGHT, 0x0a1f16, 0.18)
      .setOrigin(0)
      .setDepth(0.5);
    wash.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  private renderRoute(): void {
    const route = this.add.graphics().setDepth(1);

    for (const rect of ARRAY_PLAINS_ROUTE_RECTS) {
      route.fillStyle(0xe0f8d0, 0.12);
      route.fillRect(rect.x, rect.y, rect.width, rect.height);
      route.lineStyle(1, 0x346856, 0.28);
      route.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }

    const cursor = this.add.rectangle(608, 416, 40, 40, COLORS.GOLD_ACCENT, 0.04)
      .setStrokeStyle(1, COLORS.GOLD_ACCENT, 0.42)
      .setDepth(2);

    if (!this.prefersReducedMotion()) {
      this.tweens.add({
        targets: cursor,
        x: 1120,
        alpha: 0.28,
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createInteractables(): void {
    this.returnGateway = new InteractableObject(this, {
      id: 'prologue_gateway',
      type: 'portal',
      x: ARRAY_PLAINS_CONFIG.exitPoints[0].position.x,
      y: ARRAY_PLAINS_CONFIG.exitPoints[0].position.y,
      prompt: '[SPACE] Return',
      locked: false,
      imageByState: {
        unlocked: PROLOGUE_REWORK_KEYS.ARRAY_PORTAL_ACTIVE,
      },
      imageScale: 0.12,
      initialState: 'unlocked',
      onInteract: () => {
        TransitionManager.swirl(this, SCENE_KEYS.PROLOGUE, { spawnX: 1968, spawnY: 395 });
      },
    });
    this.interactionSystem.addObject(this.returnGateway);

    const guide = new InteractableObject(this, {
      id: 'array_guide',
      type: 'sign',
      x: ARRAY_PLAINS_CONFIG.npcs[0].position.x,
      y: ARRAY_PLAINS_CONFIG.npcs[0].position.y,
      prompt: '[SPACE] Listen',
      locked: false,
      onInteract: () => this.showFieldNote('Array Guide', 'Every stone in this row has a position. Arrays remember by index.'),
    });
    this.markerObjects.push(guide);
    this.interactionSystem.addObject(guide);

    ARRAY_PLAINS_CONFIG.interactables.forEach((marker, index) => {
      const object = new InteractableObject(this, {
        id: marker.id,
        type: 'sign',
        x: marker.position.x,
        y: marker.position.y,
        prompt: '[SPACE] Inspect',
        locked: false,
        onInteract: () => this.showFieldNote(`Index ${index}`, `Slot ${index} has one address and one value.`),
      });
      this.markerObjects.push(object);
      this.interactionSystem.addObject(object);

      this.add.text(marker.position.x, marker.position.y + 24, `${index}`, {
        fontSize: '10px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
        backgroundColor: '#e0f8d0',
        padding: { x: 4, y: 3 },
      }).setOrigin(0.5).setDepth(5);
    });
  }

  private handleInteract(entry: InteractableEntry): void {
    if (entry.type !== 'object') return;
    const object = entry.target as InteractableObject;
    object.config.onInteract?.();
  }

  private showFieldNote(title: string, body: string): void {
    if (this.infoPanelCleanup) return;

    const { width, height } = this.cameras.main;
    const panelW = 640;
    const panelH = 128;
    const panelX = Math.round(width / 2 - panelW / 2);
    const panelY = height - panelH - 40;

    const panel = drawPanel(this, panelX, panelY, panelW, panelH, {
      depth: 5000,
      scrollFactor: 0,
      inner: 0x346856,
    });
    const titleText = this.add.text(panelX + 32, panelY + 24, title, {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setDepth(5001).setScrollFactor(0);
    const bodyText = this.add.text(panelX + 32, panelY + 56, body, {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      wordWrap: { width: panelW - 64 },
      lineSpacing: 5,
    }).setDepth(5001).setScrollFactor(0);
    const closeText = this.add.text(panelX + panelW - 32, panelY + panelH - 28, '[SPACE]', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#346856',
    }).setOrigin(1, 0).setDepth(5001).setScrollFactor(0);

    const close = () => {
      panel.destroy();
      titleText.destroy();
      bodyText.destroy();
      closeText.destroy();
      this.infoPanelCleanup = null;
    };

    this.infoPanelCleanup = close;
    this.input.keyboard?.once('keydown-SPACE', close);
    this.input.keyboard?.once('keydown-ENTER', close);
  }

  private isPlayerStepWalkable(point: { x: number; y: number }): boolean {
    return isArrayPlainsStepWalkable(point, this.getCollisionBlockers(), 10);
  }

  private getCollisionBlockers(): ArrayPlainsCollisionBlocker[] {
    const blockers: ArrayPlainsCollisionBlocker[] = [];
    if (this.returnGateway) {
      blockers.push(this.returnGateway.getPosition());
    }
    for (const object of this.markerObjects) {
      blockers.push(object.getPosition());
    }
    return blockers;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  shutdown(): void {
    this.infoPanelCleanup?.();
    this.interactionSystem?.destroy();
    this.hud?.destroy();
    this.returnGateway?.destroy();
    for (const object of this.markerObjects) object.destroy();
    this.bit?.destroy();
    this.player?.destroy();
  }
}
