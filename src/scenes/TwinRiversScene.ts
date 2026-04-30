import Phaser from 'phaser';
import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { COLORS, FONTS, REGIONS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { gameState } from '../core/GameStateManager';
import { TransitionManager } from '../core/TransitionManager';
import { BitCompanion } from '../entities/BitCompanion';
import { InteractableObject } from '../entities/InteractableObject';
import { Player } from '../entities/Player';
import {
  TWIN_RIVERS_CONFIG,
  TWIN_RIVERS_ROUTE_RECTS,
  TWIN_RIVERS_WORLD_HEIGHT,
  TWIN_RIVERS_WORLD_WIDTH,
  isPointOnTwinRiversRoute,
} from '../data/regions/twinRivers';
import { HUDManager } from '../systems/HUDManager';
import { InteractionSystem, type InteractableEntry } from '../systems/InteractionSystem';
import { drawPanel } from '../ui/panel';
import { setupUICamera } from '../utils/uiCamera';

export class TwinRiversScene extends Phaser.Scene {
  private player!: Player;
  private bit!: BitCompanion;
  private hud!: HUDManager;
  private interactionSystem!: InteractionSystem;
  private returnGateway: InteractableObject | null = null;
  private nextGateway: InteractableObject | null = null;
  private guide: InteractableObject | null = null;
  private puzzleObjects: InteractableObject[] = [];
  private labelObjects: Phaser.GameObjects.Text[] = [];
  private infoPanelCleanup: (() => void) | null = null;

  constructor() {
    super({ key: SCENE_KEYS.TWIN_RIVERS });
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
    if (!isPointOnTwinRiversRoute({ x: px, y: py }, 10)) {
      px = TWIN_RIVERS_CONFIG.spawnPoint.x;
      py = TWIN_RIVERS_CONFIG.spawnPoint.y;
      gameState.setPlayerPosition(px, py);
    }
    gameState.setPlayerLocation(REGIONS.TWIN_RIVERS, px, py);

    audioManager.playMusic(TWIN_RIVERS_CONFIG.backgroundMusic);
    this.physics.world.setBounds(0, 0, TWIN_RIVERS_WORLD_WIDTH, TWIN_RIVERS_WORLD_HEIGHT);

    this.renderField();
    this.renderRoute();

    this.player = new Player(this, px, py, {
      canMoveTo: (point) => isPointOnTwinRiversRoute(point, 10),
    });
    this.bit = new BitCompanion(this, px, py);

    this.interactionSystem = new InteractionSystem(this, this.player);
    this.createInteractables();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));

    this.hud = new HUDManager(this);
    setupUICamera(this);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, TWIN_RIVERS_WORLD_WIDTH, TWIN_RIVERS_WORLD_HEIGHT);
    camera.setZoom(2);
    camera.startFollow(this.player.sprite, true, 1, 1);
    camera.setDeadzone(96, 64);

    TransitionManager.fadeIn(this, 700);
    this.hud.showRegionCard('Twin Rivers', 'Where two paths learn to move as one.');
  }

  update(): void {
    const panelOpen = this.infoPanelCleanup !== null;
    if (!panelOpen) this.player.update();

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y);
    this.interactionSystem.update(!panelOpen);
    gameState.setPlayerPosition(pos.x, pos.y);
  }

  private renderField(): void {
    this.cameras.main.setBackgroundColor(0x0e2f42);
    const bg = this.add.image(TWIN_RIVERS_WORLD_WIDTH / 2, TWIN_RIVERS_WORLD_HEIGHT / 2, VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG)
      .setOrigin(0.5)
      .setDepth(0);
    const source = bg.texture.getSourceImage() as HTMLImageElement;
    const coverScale = Math.max(
      TWIN_RIVERS_WORLD_WIDTH / source.width,
      TWIN_RIVERS_WORLD_HEIGHT / source.height
    );
    bg.setScale(coverScale);
    bg.setAlpha(0.96);

    this.add.rectangle(0, 0, TWIN_RIVERS_WORLD_WIDTH, TWIN_RIVERS_WORLD_HEIGHT, 0x9be8ff, 0.035)
      .setOrigin(0)
      .setDepth(0.5);
  }

  private renderRoute(): void {
    const route = this.add.graphics().setDepth(1);
    for (const rect of TWIN_RIVERS_ROUTE_RECTS) {
      route.lineStyle(1, 0x9be8ff, 0.035);
      route.beginPath();
      route.moveTo(rect.x + 14, rect.y + rect.height / 2);
      route.lineTo(rect.x + rect.width - 14, rect.y + rect.height / 2);
      route.strokePath();
    }

    this.createWaterFlow();
  }

  private createInteractables(): void {
    this.returnGateway = new InteractableObject(this, {
      id: 'array_plains_gateway',
      type: 'portal',
      x: TWIN_RIVERS_CONFIG.exitPoints[0].position.x,
      y: TWIN_RIVERS_CONFIG.exitPoints[0].position.y,
      prompt: '[SPACE] Array Plains',
      locked: false,
      imageByState: {
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_FIELD,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: 'unlocked',
      onInteract: () => {
        TransitionManager.swirl(this, SCENE_KEYS.ARRAY_PLAINS, { spawnX: 1712, spawnY: 416 });
      },
    });
    this.interactionSystem.addObject(this.returnGateway);

    const nextExit = TWIN_RIVERS_CONFIG.exitPoints[1];
    this.nextGateway = new InteractableObject(this, {
      id: 'hash_highlands_gateway',
      type: 'portal',
      x: nextExit.position.x,
      y: nextExit.position.y,
      prompt: '[SPACE] Hash Highlands',
      locked: false,
      imageByState: {
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: 'unlocked',
      onInteract: () => {
        TransitionManager.swirl(this, SCENE_KEYS.HASH_HIGHLANDS, { spawnX: 192, spawnY: 448 });
      },
    });
    this.interactionSystem.addObject(this.nextGateway);

    this.guide = new InteractableObject(this, {
      id: 'river_guide',
      type: 'sign',
      x: TWIN_RIVERS_CONFIG.npcs[0].position.x,
      y: TWIN_RIVERS_CONFIG.npcs[0].position.y,
      prompt: '[SPACE] Listen',
      locked: false,
      spriteImageKey: VISUAL_REVAMP_KEYS.PROP_WATER_BUOY,
      imageScale: 0.13,
      imageOriginY: 0.82,
      onInteract: () => this.showFieldNote(
        'River Guide',
        'Twin Rivers is alive now: two paths, one current, and the mountain road opening beyond the water.'
      ),
    });
    this.interactionSystem.addObject(this.guide);

    this.createPuzzleObjects();
  }

  private createPuzzleObjects(): void {
    const puzzleLabels: Record<string, { title: string; scene: string; prompt: string }> = {
      tr_1: { title: 'Mirror Walk', scene: SCENE_KEYS.PUZZLE_TR_1, prompt: '[SPACE] Mirror' },
      tr_2: { title: 'Pointer Bridge', scene: SCENE_KEYS.PUZZLE_TR_2, prompt: '[SPACE] Pair' },
      tr_3: { title: 'Fixed Window Dock', scene: SCENE_KEYS.PUZZLE_TR_3, prompt: '[SPACE] Window' },
      tr_4: { title: 'Current Rider', scene: SCENE_KEYS.PUZZLE_TR_4, prompt: '[SPACE] Ride' },
      boss_mirror_serpent: { title: 'Mirror Serpent', scene: SCENE_KEYS.BOSS_MIRROR_SERPENT, prompt: '[SPACE] Challenge' },
    };

    for (const puzzle of TWIN_RIVERS_CONFIG.puzzles) {
      const meta = puzzleLabels[puzzle.id];
      if (!meta) continue;

      const completed = gameState.isPuzzleCompleted(puzzle.id);
      const object = new InteractableObject(this, {
        id: puzzle.id,
        type: puzzle.id === 'boss_mirror_serpent' ? 'portal' : 'sign',
        x: puzzle.position.x,
        y: puzzle.position.y,
        prompt: completed ? '[SPACE] Replay' : meta.prompt,
        locked: false,
        spriteImageKey: puzzle.id === 'boss_mirror_serpent'
          ? undefined
          : VISUAL_REVAMP_KEYS.PROP_WATER_BUOY,
        imageByState: puzzle.id === 'boss_mirror_serpent'
          ? { unlocked: VISUAL_REVAMP_KEYS.PORTAL_WATER }
          : undefined,
        imageScale: puzzle.id === 'boss_mirror_serpent' ? 0.24 : 0.13,
        imageOriginY: 0.84,
        initialState: 'unlocked',
        onInteract: () => this.startPuzzle(meta.scene),
      });
      this.puzzleObjects.push(object);
      this.interactionSystem.addObject(object);

      const label = this.add.text(puzzle.position.x, puzzle.position.y - 52, meta.title, {
        fontSize: '10px',
        fontFamily: FONTS.RETRO,
        color: completed ? '#e0f8d0' : '#081820',
        backgroundColor: completed ? '#28698a' : '#e0f8d0',
        padding: { x: 5, y: 4 },
      }).setOrigin(0.5).setDepth(5);
      this.labelObjects.push(label);
    }
  }

  private createWaterFlow(): void {
    if (this.prefersReducedMotion()) return;

    for (const y of [300, 468]) {
      for (let i = 0; i < 8; i++) {
        const stream = this.add.rectangle(420 + i * 160, y + Phaser.Math.Between(-8, 8), 88, 3, COLORS.CYAN_GLOW, 0.28)
          .setDepth(2);
        this.tweens.add({
          targets: stream,
          x: stream.x + 132,
          alpha: 0.08,
          duration: Phaser.Math.Between(1300, 2100),
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
          delay: i * 95,
        });
      }
    }
  }

  private handleInteract(entry: InteractableEntry): void {
    if (entry.type !== 'object') return;
    const object = entry.target as InteractableObject;
    object.config.onInteract?.();
  }

  private startPuzzle(sceneKey: string): void {
    this.scene.start(sceneKey, { returnScene: SCENE_KEYS.TWIN_RIVERS });
  }

  private showFieldNote(title: string, body: string): void {
    if (this.infoPanelCleanup) return;

    const { width, height } = this.cameras.main;
    const panelW = 680;
    const panelH = 128;
    const panelX = Math.round(width / 2 - panelW / 2);
    const panelY = height - panelH - 40;
    const panel = drawPanel(this, panelX, panelY, panelW, panelH, {
      depth: 5000,
      scrollFactor: 0,
      inner: 0x5ab7d4,
    });
    const titleText = this.add.text(panelX + 32, panelY + 24, title, {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#082736',
    }).setDepth(5001).setScrollFactor(0);
    const bodyText = this.add.text(panelX + 32, panelY + 56, body, {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#082736',
      wordWrap: { width: panelW - 64 },
      lineSpacing: 5,
    }).setDepth(5001).setScrollFactor(0);

    const close = () => {
      panel.destroy();
      titleText.destroy();
      bodyText.destroy();
      this.infoPanelCleanup = null;
    };

    this.infoPanelCleanup = close;
    this.input.keyboard?.once('keydown-SPACE', close);
    this.input.keyboard?.once('keydown-ENTER', close);
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  shutdown(): void {
    this.infoPanelCleanup?.();
    this.infoPanelCleanup = null;
    this.interactionSystem?.destroy();
    this.hud?.destroy();
    this.returnGateway?.destroy();
    this.returnGateway = null;
    this.nextGateway?.destroy();
    this.nextGateway = null;
    this.guide?.destroy();
    this.guide = null;
    for (const object of this.puzzleObjects) object.destroy();
    this.puzzleObjects = [];
    for (const label of this.labelObjects) label.destroy();
    this.labelObjects = [];
    this.bit?.destroy();
    this.player?.destroy();
  }
}
