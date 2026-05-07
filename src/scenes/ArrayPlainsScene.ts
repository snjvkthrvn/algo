import Phaser from 'phaser';
import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { CAMERA_TUNING, COLORS, FONTS, REGIONS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { eventBus } from '../core/EventBus';
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
import { DialogueSystem } from '../systems/DialogueSystem';
import { HUDManager } from '../systems/HUDManager';
import { InteractionSystem, type InteractableEntry } from '../systems/InteractionSystem';
import { progressionSystem } from '../systems/ProgressionSystem';
import {
  ROUTE_SURFACE_STYLES,
  renderRouteStopPads,
  renderRouteSurfaces,
} from '../systems/RouteSurfaceRenderer';
import type { DialogueTree } from '../data/types';
import { setupUICamera } from '../utils/uiCamera';
import { saveAndReturnToTitle } from './titleNavigation';

export class ArrayPlainsScene extends Phaser.Scene {
  private player!: Player;
  private bit!: BitCompanion;
  private interactionSystem!: InteractionSystem;
  private dialogueSystem!: DialogueSystem;
  private hud!: HUDManager;
  private returnGateway: InteractableObject | null = null;
  private twinRiversGateway: InteractableObject | null = null;
  private shufflerGate: InteractableObject | null = null;
  private markerObjects: InteractableObject[] = [];
  private puzzleObjects: InteractableObject[] = [];
  private labelObjects: Phaser.GameObjects.Text[] = [];
  private lastPlayerX: number = NaN;
  private lastPlayerY: number = NaN;

  // Overworld sequence puzzle
  private sequenceTiles: Phaser.GameObjects.Rectangle[] = [];
  private currentSequenceIndex = 0;
  private sequenceSolved = false;

  private readonly onEscReturnToTitle = () => saveAndReturnToTitle(this);

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
    this.dialogueSystem = new DialogueSystem(this);
    this.createInteractables();
    this.createSequencePuzzle();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));
    eventBus.on('progression:gate-open', this.onGateOpen, this);

    this.hud = new HUDManager(this);
    setupUICamera(this);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, ARRAY_PLAINS_WORLD_WIDTH, ARRAY_PLAINS_WORLD_HEIGHT);
    camera.setZoom(CAMERA_TUNING.ZOOM);
    camera.startFollow(this.player.sprite, true, CAMERA_TUNING.FOLLOW_LERP, CAMERA_TUNING.FOLLOW_LERP);
    camera.setDeadzone(CAMERA_TUNING.DEADZONE_WIDTH, CAMERA_TUNING.DEADZONE_HEIGHT);

    TransitionManager.fadeIn(this, 700);
    this.hud.showRegionCard('Array Plains', 'Where order becomes addressable.');
    this.input.keyboard?.on('keydown-ESC', this.onEscReturnToTitle);
  }

  private createSequencePuzzle(): void {
    const startX = 460;
    const startY = 480;
    const spacing = 64;

    for (let i = 0; i < 4; i++) {
      const tile = this.add.rectangle(startX + i * spacing, startY, 48, 48, 0x1a1a2e, 0.8)
        .setStrokeStyle(2, COLORS.FRAME_BORDER_LIGHT, 0.6)
        .setDepth(2.2);

      this.add.text(startX + i * spacing, startY, `${i}`, {
        fontSize: '12px',
        fontFamily: FONTS.RETRO,
        color: '#346856',
      }).setOrigin(0.5).setDepth(2.3);

      // Store a custom property to track if it's currently active/stepped on
      tile.setData('index', i);
      tile.setData('active', false);
      this.sequenceTiles.push(tile);
    }
  }

  update(): void {
    const dialogueActive = this.dialogueSystem?.isDialogueActive() ?? false;
    if (!dialogueActive) {
      this.player.update();
    }

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y);
    this.interactionSystem.update(!dialogueActive);
    if (pos.x !== this.lastPlayerX || pos.y !== this.lastPlayerY) {
      gameState.setPlayerPosition(pos.x, pos.y);
      this.lastPlayerX = pos.x;
      this.lastPlayerY = pos.y;
      this.checkSequencePuzzle(pos.x, pos.y);
    }
  }

  private checkSequencePuzzle(px: number, py: number): void {
    if (this.sequenceSolved) return;

    for (let i = 0; i < this.sequenceTiles.length; i++) {
      const tile = this.sequenceTiles[i];
      const dist = Phaser.Math.Distance.Between(px, py, tile.x, tile.y);

      if (dist < 24) {
        if (!tile.getData('active')) {
          tile.setData('active', true);

          if (i === this.currentSequenceIndex) {
            // Correct step
            tile.setFillStyle(COLORS.SUCCESS, 0.8);
            audioManager.playTone(300 + i * 50, 100, 'sine');
            this.currentSequenceIndex++;

            if (this.currentSequenceIndex >= this.sequenceTiles.length) {
              this.sequenceSolved = true;
              audioManager.playCorrectTone();
              this.cameras.main.shake(200, 0.005);
              this.showFieldNote('System', 'Sequence recognized. Overworld traversal complete.');

              // Light them all up
              this.sequenceTiles.forEach(t => t.setFillStyle(COLORS.GOLD_ACCENT, 0.9));
            }
          } else if (i > this.currentSequenceIndex) {
            // Out of order
            audioManager.playWrongTone();
            this.currentSequenceIndex = 0;
            this.sequenceTiles.forEach(t => {
              t.setData('active', false);
              t.setFillStyle(0x1a1a2e, 0.8);
            });
            tile.setFillStyle(COLORS.ERROR, 0.8);
            this.time.delayedCall(300, () => {
              if (!this.sequenceSolved) tile.setFillStyle(0x1a1a2e, 0.8);
            });
          }
        }
      } else {
        tile.setData('active', false);
      }
    }
  }

  private renderField(): void {
    this.cameras.main.setBackgroundColor(0x102818);
    const bg = this.add.image(ARRAY_PLAINS_WORLD_WIDTH / 2, ARRAY_PLAINS_WORLD_HEIGHT / 2, VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG)
      .setOrigin(0.5)
      .setDepth(0);
    const source = bg.texture.getSourceImage() as HTMLImageElement;
    const coverScale = Math.max(
      ARRAY_PLAINS_WORLD_WIDTH / source.width,
      ARRAY_PLAINS_WORLD_HEIGHT / source.height
    );
    bg.setScale(coverScale);
    bg.setAlpha(0.96);

    this.add.rectangle(0, 0, ARRAY_PLAINS_WORLD_WIDTH, ARRAY_PLAINS_WORLD_HEIGHT, 0xe0f8d0, 0.03)
      .setOrigin(0)
      .setDepth(0.5);
    this.createFieldAmbient();
  }

  private renderRoute(): void {
    const style = ROUTE_SURFACE_STYLES.field;
    renderRouteSurfaces(this, ARRAY_PLAINS_ROUTE_RECTS, style, VISUAL_REVAMP_KEYS.ROUTE_MATERIALS);
    renderRouteStopPads(this, this.getRouteStopPads(), style);

    const route = this.add.graphics().setDepth(1.3);

    for (const rect of ARRAY_PLAINS_ROUTE_RECTS) {
      route.lineStyle(2, 0xe0f8d0, 0.055);
      route.beginPath();
      route.moveTo(rect.x + 14, rect.y + rect.height / 2);
      route.lineTo(rect.x + rect.width - 14, rect.y + rect.height / 2);
      route.strokePath();
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

  private getRouteStopPads(): Array<{ x: number; y: number; radius?: number }> {
    return [
      ...ARRAY_PLAINS_CONFIG.exitPoints.map((exit) => ({
        x: exit.position.x,
        y: exit.position.y,
        radius: 58,
      })),
      ...ARRAY_PLAINS_CONFIG.npcs.map((npc) => ({
        x: npc.position.x,
        y: npc.position.y,
        radius: 46,
      })),
      ...ARRAY_PLAINS_CONFIG.interactables.map((interactable) => ({
        x: interactable.position.x,
        y: interactable.position.y,
        radius: 38,
      })),
      ...ARRAY_PLAINS_CONFIG.puzzles.map((puzzle) => ({
        x: puzzle.position.x,
        y: puzzle.position.y,
        radius: puzzle.id === 'boss_shuffler' ? 58 : 44,
      })),
      { x: 560, y: 480, radius: 54 },
    ];
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
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_VOID,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: 'unlocked',
      onInteract: () => {
        TransitionManager.swirl(this, SCENE_KEYS.PROLOGUE, { spawnX: 1968, spawnY: 395 });
      },
    });
    this.interactionSystem.addObject(this.returnGateway);

    this.twinRiversGateway = new InteractableObject(this, {
      id: 'twin_rivers_gateway',
      type: 'portal',
      x: ARRAY_PLAINS_CONFIG.exitPoints[1].position.x,
      y: ARRAY_PLAINS_CONFIG.exitPoints[1].position.y,
      prompt: progressionSystem.isTwinRiversGatewayOpen() ? '[SPACE] Twin Rivers' : '[LOCKED] Defeat Shuffler',
      locked: !progressionSystem.isTwinRiversGatewayOpen(),
      imageByState: {
        locked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_WATER,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: progressionSystem.isTwinRiversGatewayOpen() ? 'unlocked' : 'locked',
      onInteract: () => {
        if (progressionSystem.isTwinRiversGatewayOpen()) {
          TransitionManager.swirl(this, SCENE_KEYS.TWIN_RIVERS, { spawnX: 192, spawnY: 448 });
          return;
        }

        this.showFieldNote('Twin Rivers Gate', 'The water-road is locked until the Shuffler settles.');
      },
    });
    this.interactionSystem.addObject(this.twinRiversGateway);

    const guide = new InteractableObject(this, {
      id: 'array_guide',
      type: 'sign',
      x: ARRAY_PLAINS_CONFIG.npcs[0].position.x,
      y: ARRAY_PLAINS_CONFIG.npcs[0].position.y,
      prompt: '[SPACE] Listen',
      locked: false,
      spriteImageKey: VISUAL_REVAMP_KEYS.PROP_FIELD_SIGN,
      imageScale: 0.13,
      imageOriginY: 0.86,
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
        spriteImageKey: VISUAL_REVAMP_KEYS.PROP_ARRAY_MARKER,
        imageScale: 0.12,
        imageOriginY: 0.84,
        onInteract: () => this.showFieldNote(`Index ${index}`, `Slot ${index} has one address and one value.`),
      });
      this.markerObjects.push(object);
      this.interactionSystem.addObject(object);

      const label = this.add.text(marker.position.x, marker.position.y + 24, `${index}`, {
        fontSize: '10px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
        backgroundColor: '#e0f8d0',
        padding: { x: 4, y: 3 },
      }).setOrigin(0.5).setDepth(5);
      this.labelObjects.push(label);
    });

    this.createPuzzleObjects();
  }

  private createPuzzleObjects(): void {
    const puzzleLabels: Record<string, { title: string; scene: string; prompt: string }> = {
      ap_1: { title: 'Sorting Shed', scene: SCENE_KEYS.PUZZLE_AP_1, prompt: '[SPACE] Sort' },
      ap_2: { title: 'Indexing Barn', scene: SCENE_KEYS.PUZZLE_AP_2, prompt: '[SPACE] Index' },
      ap_3: { title: 'Grain Hopper', scene: SCENE_KEYS.PUZZLE_AP_3, prompt: '[SPACE] Hash' },
      ap_4: { title: 'Pairing Grounds', scene: SCENE_KEYS.PUZZLE_AP_4, prompt: '[SPACE] Pair' },
    };

    for (const puzzle of ARRAY_PLAINS_CONFIG.puzzles) {
      if (puzzle.id === 'boss_shuffler') continue;
      const meta = puzzleLabels[puzzle.id];
      if (!meta) continue;

      const completed = gameState.isPuzzleCompleted(puzzle.id);
      const object = new InteractableObject(this, {
        id: puzzle.id,
        type: 'sign',
        x: puzzle.position.x,
        y: puzzle.position.y,
        prompt: completed ? '[SPACE] Replay' : meta.prompt,
        locked: false,
        spriteImageKey: VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE,
        imageScale: 0.13,
        imageOriginY: 0.84,
        onInteract: () => this.startPuzzle(meta.scene),
      });
      this.puzzleObjects.push(object);
      this.interactionSystem.addObject(object);

      const label = this.add.text(puzzle.position.x, puzzle.position.y - 42, meta.title, {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: completed ? '#22c55e' : '#e0f8d0',
        backgroundColor: '#081820',
        padding: { x: 4, y: 3 },
      }).setOrigin(0.5).setDepth(5);
      this.labelObjects.push(label);
    }

    const boss = ARRAY_PLAINS_CONFIG.puzzles.find((puzzle) => puzzle.id === 'boss_shuffler');
    if (!boss) return;

    this.shufflerGate = new InteractableObject(this, {
      id: 'boss_shuffler',
      type: 'gate',
      x: boss.position.x,
      y: boss.position.y,
      prompt: progressionSystem.isShufflerGateOpen() ? '[SPACE] Challenge' : '[LOCKED] Help farmers',
      locked: !progressionSystem.isShufflerGateOpen(),
      imageByState: {
        locked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
        unlocked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN,
      },
      imageScale: 0.2,
      imageOriginY: 0.84,
      initialState: progressionSystem.isShufflerGateOpen() ? 'unlocked' : 'locked',
      onInteract: () => {
        if (progressionSystem.isShufflerGateOpen()) {
          this.startPuzzle(SCENE_KEYS.BOSS_SHUFFLER);
          return;
        }

        const progress = progressionSystem.getArrayPlainsProgress();
        this.showFieldNote('Shuffler Domain', `${progress.puzzles}/4 farmer puzzles complete. Restore every field first.`);
      },
    });
    this.puzzleObjects.push(this.shufflerGate);
    this.interactionSystem.addObject(this.shufflerGate);

    const bossLabel = this.add.text(boss.position.x, boss.position.y - 52, 'Shuffler Domain', {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: progressionSystem.isShufflerGateOpen() ? '#fbbf24' : '#9ca3af',
      backgroundColor: '#081820',
      padding: { x: 4, y: 3 },
    }).setOrigin(0.5).setDepth(5);
    this.labelObjects.push(bossLabel);
  }

  private createFieldAmbient(): void {
    if (this.prefersReducedMotion()) return;

    for (let i = 0; i < 18; i++) {
      const mote = this.add.circle(
        Phaser.Math.Between(160, ARRAY_PLAINS_WORLD_WIDTH - 160),
        Phaser.Math.Between(150, ARRAY_PLAINS_WORLD_HEIGHT - 90),
        Phaser.Math.FloatBetween(1.2, 2.4),
        i % 3 === 0 ? 0xfbbf24 : 0xe0f8d0,
        Phaser.Math.FloatBetween(0.12, 0.28)
      ).setDepth(2.5);

      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(10, 28),
        alpha: Phaser.Math.FloatBetween(0.03, 0.18),
        duration: Phaser.Math.Between(1800, 3600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1200),
      });
    }
  }

  private handleInteract(entry: InteractableEntry): void {
    if (this.dialogueSystem.isDialogueActive()) return;
    if (entry.type !== 'object') return;
    const object = entry.target as InteractableObject;
    object.config.onInteract?.();
  }

  private showFieldNote(speaker: string, body: string | string[]): void {
    if (this.dialogueSystem.isDialogueActive()) return;
    const tree: DialogueTree = {
      startNodeId: 'note',
      nodes: [{ id: 'note', speaker, text: body }],
    };
    this.dialogueSystem.startDialogue(tree, `field_${speaker.toLowerCase().replace(/\s+/g, '_')}`);
  }

  private startPuzzle(sceneKey: string): void {
    TransitionManager.pixelDissolve(this, sceneKey, { returnScene: SCENE_KEYS.ARRAY_PLAINS });
  }

  private onGateOpen(data: unknown): void {
    const gateId = (data as { gateId?: string }).gateId;
    if (gateId === 'shuffler_gate') {
      this.shufflerGate?.setLocked(false);
      this.shufflerGate?.setPrompt('[SPACE] Challenge');
    }

    if (gateId === 'twin_rivers_gateway') {
      this.twinRiversGateway?.setLocked(false);
      this.twinRiversGateway?.setPrompt('[SPACE] Twin Rivers');
    }
  }

  private isPlayerStepWalkable(point: { x: number; y: number }): boolean {
    return isArrayPlainsStepWalkable(point, this.getCollisionBlockers(), 0);
  }

  private getCollisionBlockers(): ArrayPlainsCollisionBlocker[] {
    const blockers: ArrayPlainsCollisionBlocker[] = [];
    if (this.returnGateway) {
      blockers.push(this.returnGateway.getPosition());
    }
    if (this.twinRiversGateway) {
      blockers.push(this.twinRiversGateway.getPosition());
    }
    for (const object of this.markerObjects) {
      blockers.push(object.getPosition());
    }
    for (const object of this.puzzleObjects) {
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
    eventBus.off('progression:gate-open', this.onGateOpen, this);
    this.input.keyboard?.off('keydown-ESC', this.onEscReturnToTitle);

    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.hud?.destroy();

    this.returnGateway?.destroy();
    this.returnGateway = null;

    this.twinRiversGateway?.destroy();
    this.twinRiversGateway = null;
    this.shufflerGate = null;

    for (const object of this.markerObjects) object.destroy();
    this.markerObjects = [];

    for (const object of this.puzzleObjects) object.destroy();
    this.puzzleObjects = [];

    for (const label of this.labelObjects) label.destroy();
    this.labelObjects = [];

    this.bit?.destroy();
    this.player?.destroy();
  }
}
