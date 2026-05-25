/**
 * HashHighlandsScene — Region 4 standalone overworld.
 *
 * Extends BaseOverworldScene to leverage shared player movement, bit tracking,
 * interaction plumbing, dialogue overlays, and transition fades.
 *
 * Pedagogical contract (FEEL → NAME):
 *   The four trial keepers (Nameplate Warden, Forge Tallyer, Garden
 *   Anagramist, Cavern Echo) describe the puzzle in physical/diegetic
 *   terms before solving, then name the algorithm (Direct-Address Hash,
 *   Frequency Map, Canonical-Key Grouping, LRU Cache) in their post-puzzle
 *   beat. Dialogue trees live in src/data/dialogue/hash_highlands_dialogue.ts.
 *
 * Glitch cameo cadence:
 *   Spawns once when the player returns to the region after completing HH-1
 *   or HH-3. Single-use per save (gated by hh_glitch_<id>_done flags) so the
 *   beat lands as a milestone, not wallpaper.
 */

import Phaser from 'phaser';
import { HASH_HIGHLANDS_SCENE_IMAGE_ASSETS, VISUAL_REVAMP_KEYS } from '../config/assets';
import { FONTS, REGIONS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { eventBus } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import { TransitionManager } from '../core/TransitionManager';
import { BitCompanion } from '../entities/BitCompanion';
import { GlitchRival } from '../entities/GlitchRival';
import { InteractableObject } from '../entities/InteractableObject';
import { Player } from '../entities/Player';
import { BaseOverworldScene } from './BaseOverworldScene';
import {
  cartographerDialogue,
  cavernEchoDialogue,
  cavernEchoPostPuzzle,
  forgeTallyerDialogue,
  forgeTallyerPostPuzzle,
  gardenAnagramistDialogue,
  gardenAnagramistPostPuzzle,
  nameplateWardenDialogue,
  nameplateWardenPostPuzzle,
  HASH_HIGHLANDS_GLITCH_DIALOGUE,
  HASH_HIGHLANDS_GLITCH_EXIT_LINES,
} from '../data/dialogue/hash_highlands_dialogue';
import {
  FUTURE_REGION_ROUTE_RECTS,
  FUTURE_REGION_SCENE_CONFIGS,
  FUTURE_REGION_WORLD_HEIGHT,
  FUTURE_REGION_WORLD_WIDTH,
  isFutureRegionStepWalkable,
  isPointOnFutureRegionRoute,
  type FutureRegionCollisionBlocker,
} from '../data/regions/futureRegions';
import { DialogueSystem } from '../systems/DialogueSystem';
import { HUDManager } from '../systems/HUDManager';
import { InteractionSystem } from '../systems/InteractionSystem';
import {
  ROUTE_SURFACE_STYLES,
  renderRouteStopPads,
  renderRouteSurfaces,
} from '../systems/RouteSurfaceRenderer';
import type { DialogueTree } from '../data/types';
import { setupUICamera } from '../utils/uiCamera';
import { ObjectPool } from '../utils/ObjectPool';
import { openPauseOverlay } from './titleNavigation';

interface TrialKeeperConfig {
  npcId: string;
  puzzleId: 'hh_1' | 'hh_2' | 'hh_3' | 'hh_4';
  puzzleSceneKey: string;
  puzzleTitle: string;
  puzzlePrompt: string;
  puzzlePosition: { x: number; y: number };
  keeperName: string;
  keeperOffset: { x: number; y: number };
  preDialogue: DialogueTree;
  postDialogue: DialogueTree;
}

const REGION_CONFIG = FUTURE_REGION_SCENE_CONFIGS[SCENE_KEYS.HASH_HIGHLANDS];

const TRIAL_KEEPERS: TrialKeeperConfig[] = [
  {
    npcId: 'hh_keeper_nameplate',
    puzzleId: 'hh_1',
    puzzleSceneKey: SCENE_KEYS.PUZZLE_HH_1,
    puzzleTitle: 'Nameplate Gates',
    puzzlePrompt: '[SPACE] Address',
    puzzlePosition: { x: 480, y: 416 },
    keeperName: 'Nameplate Warden',
    keeperOffset: { x: -84, y: 8 },
    preDialogue: nameplateWardenDialogue,
    postDialogue: nameplateWardenPostPuzzle,
  },
  {
    npcId: 'hh_keeper_forge',
    puzzleId: 'hh_2',
    puzzleSceneKey: SCENE_KEYS.PUZZLE_HH_2,
    puzzleTitle: 'Frequency Forge',
    puzzlePrompt: '[SPACE] Tally',
    puzzlePosition: { x: 720, y: 552 },
    keeperName: 'Forge Tallyer',
    keeperOffset: { x: -84, y: -8 },
    preDialogue: forgeTallyerDialogue,
    postDialogue: forgeTallyerPostPuzzle,
  },
  {
    npcId: 'hh_keeper_garden',
    puzzleId: 'hh_3',
    puzzleSceneKey: SCENE_KEYS.PUZZLE_HH_3,
    puzzleTitle: 'Anagram Gardens',
    puzzlePrompt: '[SPACE] Group',
    puzzlePosition: { x: 960, y: 552 },
    keeperName: 'Garden Anagramist',
    keeperOffset: { x: 84, y: -8 },
    preDialogue: gardenAnagramistDialogue,
    postDialogue: gardenAnagramistPostPuzzle,
  },
  {
    npcId: 'hh_keeper_cavern',
    puzzleId: 'hh_4',
    puzzleSceneKey: SCENE_KEYS.PUZZLE_HH_4,
    puzzleTitle: 'Cache Cavern',
    puzzlePrompt: '[SPACE] Echo',
    puzzlePosition: { x: 1120, y: 304 },
    keeperName: 'Cavern Echo',
    keeperOffset: { x: 0, y: 60 },
    preDialogue: cavernEchoDialogue,
    postDialogue: cavernEchoPostPuzzle,
  },
];

const BOSS_ENCOUNTER = {
  id: 'boss_archivist',
  title: 'The Archivist',
  position: { x: 1456, y: 416 },
  sceneKey: SCENE_KEYS.BOSS_ARCHIVIST,
};

const GLITCH_MILESTONE_SPAWN = { x: 880, y: 432 };

export class HashHighlandsScene extends BaseOverworldScene {
  private returnGateway: InteractableObject | null = null;
  private nextGateway: InteractableObject | null = null;
  private cartographer: InteractableObject | null = null;
  private keeperObjects: InteractableObject[] = [];
  private puzzleObjects: InteractableObject[] = [];
  private archivistGate: InteractableObject | null = null;

  private glitch: GlitchRival | null = null;
  private glitchTriggerId: 'hh_1' | 'hh_3' | null = null;
  private glitchProximityTriggered = false;

  private readonly onEscPause = () => {
    if (this.dialogueSystem?.isDialogueActive()) return;
    openPauseOverlay(this, SCENE_KEYS.HASH_HIGHLANDS);
  };
  private readonly onOpenCodex = () => this.openCodex();
  private readonly onDialogueAction = (...args: unknown[]) => {
    const data = args[0] as { type: string; value: string };
    if (data?.type !== 'start_puzzle') return;
    const trial = TRIAL_KEEPERS.find((t) => t.puzzleId === data.value);
    if (trial) {
      if (this.player) this.player.setInteracting(false);
      this.startPuzzle(trial.puzzleSceneKey);
    }
  };
  private readonly onGateOpen = (...args: unknown[]) => {
    const data = args[0] as { gateId?: string };
    if (data.gateId === 'archivist_gate' && this.archivistGate) {
      this.archivistGate.setLocked(false);
      this.archivistGate.setVisualState('unlocked');
      this.archivistGate.setPrompt('[SPACE] Challenge');
    }
  };

  constructor() {
    super({ key: SCENE_KEYS.HASH_HIGHLANDS });
  }

  protected getRegionImageAssets(): ReadonlyArray<{ key: string; path: string }> {
    return HASH_HIGHLANDS_SCENE_IMAGE_ASSETS;
  }

  create(): void {
    this.hasShutdown = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    audioManager.setScene(this);
    audioManager.playMusic(REGION_CONFIG.backgroundMusic ?? 'prologue-bgm');

    let px = gameState.getState().player.x;
    let py = gameState.getState().player.y;
    if (!isPointOnFutureRegionRoute({ x: px, y: py }, 0, FUTURE_REGION_ROUTE_RECTS)) {
      px = 192;
      py = 448;
      gameState.setPlayerPosition(px, py);
    }
    gameState.setPlayerLocation(REGIONS.HASH_HIGHLANDS, px, py);

    this.physics.world.setBounds(0, 0, FUTURE_REGION_WORLD_WIDTH, FUTURE_REGION_WORLD_HEIGHT);

    this.renderField();
    this.renderRoute();
    this.createWindMotes();

    this.player = new Player(this, px, py, {
      canMoveTo: (point) => this.isPlayerStepWalkable(point),
    });
    this.bit = new BitCompanion(this, px, py);

    if (!this.interactablePool) {
      this.interactablePool = new ObjectPool(
        (cfg) => new InteractableObject(this, cfg),
        (obj, cfg) => obj.reset(cfg)
      );
    }

    this.interactionSystem = new InteractionSystem(this, this.player);
    this.dialogueSystem = new DialogueSystem(this);
    this.createInteractables();
    this.maybeSpawnGlitchCameo();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));

    eventBus.on('dialogue:action', this.onDialogueAction, this);
    eventBus.on('progression:gate-open', this.onGateOpen, this);

    this.hud = new HUDManager(this);
    setupUICamera(this);

    this.setupOverworldCamera(FUTURE_REGION_WORLD_WIDTH, FUTURE_REGION_WORLD_HEIGHT);
    this.playEntranceFade(700);

    this.hud.showRegionCard(REGION_CONFIG.title, REGION_CONFIG.subtitle);
    this.input.keyboard?.on('keydown-ESC', this.onEscPause);
    this.input.keyboard?.on('keydown-C', this.onOpenCodex);
  }

  update(time: number, delta: number): void {
    const dialogueActive = this.dialogueSystem?.isDialogueActive() ?? false;
    if (!dialogueActive) {
      this.player.update(time, delta);
    }

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y, delta);
    const canInteract = !dialogueActive && this.time.now >= this.interactionEnabledTime;
    this.interactionSystem.update(canInteract);
    if (pos.x !== this.lastPlayerX || pos.y !== this.lastPlayerY) {
      gameState.setPlayerPosition(pos.x, pos.y);
      this.lastPlayerX = pos.x;
      this.lastPlayerY = pos.y;
      this.maybeTriggerGlitchDialogue(pos.x, pos.y);
    }

    this.syncObjectiveHint();
  }

  private renderField(): void {
    this.cameras.main.setBackgroundColor(0x1f1b14);
    const bg = this.add.image(
      FUTURE_REGION_WORLD_WIDTH / 2,
      FUTURE_REGION_WORLD_HEIGHT / 2,
      REGION_CONFIG.backgroundKey,
    ).setOrigin(0.5).setDepth(0);
    const source = bg.texture.getSourceImage() as HTMLImageElement;
    const coverScale = Math.max(
      FUTURE_REGION_WORLD_WIDTH / source.width,
      FUTURE_REGION_WORLD_HEIGHT / source.height,
    );
    bg.setScale(coverScale);
    bg.setAlpha(0.96);

    this.add.rectangle(0, 0, FUTURE_REGION_WORLD_WIDTH, FUTURE_REGION_WORLD_HEIGHT, 0xfbbf24, 0.025)
      .setOrigin(0)
      .setDepth(0.5);
  }

  private renderRoute(): void {
    const style = ROUTE_SURFACE_STYLES.highland;
    renderRouteSurfaces(this, FUTURE_REGION_ROUTE_RECTS, style, VISUAL_REVAMP_KEYS.ROUTE_MATERIALS);
    renderRouteStopPads(this, this.getRouteStopPads(), style);

    const route = this.add.graphics().setDepth(1.3);
    for (const rect of FUTURE_REGION_ROUTE_RECTS) {
      route.lineStyle(2, REGION_CONFIG.accentColor, 0.055);
      route.beginPath();
      route.moveTo(rect.x + 16, rect.y + rect.height / 2);
      route.lineTo(rect.x + rect.width - 16, rect.y + rect.height / 2);
      route.strokePath();
    }
  }

  private getRouteStopPads(): Array<{ x: number; y: number; radius?: number }> {
    const pads: Array<{ x: number; y: number; radius?: number }> = [
      { x: 112, y: 448, radius: 58 },
      { x: 1784, y: 416, radius: 58 },
      { x: 320, y: 384, radius: 46 },
    ];
    for (const trial of TRIAL_KEEPERS) {
      pads.push({ x: trial.puzzlePosition.x, y: trial.puzzlePosition.y, radius: 44 });
    }
    pads.push({ x: BOSS_ENCOUNTER.position.x, y: BOSS_ENCOUNTER.position.y, radius: 58 });
    return pads;
  }

  private createWindMotes(): void {
    if (this.prefersReducedMotion()) return;
    for (let i = 0; i < 18; i++) {
      const mote = this.add.circle(
        Phaser.Math.Between(160, FUTURE_REGION_WORLD_WIDTH - 160),
        Phaser.Math.Between(130, FUTURE_REGION_WORLD_HEIGHT - 110),
        Phaser.Math.FloatBetween(1.2, 2.2),
        REGION_CONFIG.accentColor,
        Phaser.Math.FloatBetween(0.12, 0.24),
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
    // Return to Twin Rivers
    this.returnGateway = this.interactablePool.acquire({
      id: 'twin_rivers_gateway',
      type: 'portal',
      x: 112,
      y: 448,
      prompt: '[SPACE] Twin Rivers',
      locked: false,
      imageByState: { unlocked: VISUAL_REVAMP_KEYS.PORTAL_WATER },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: 'unlocked',
      onInteract: () => {
        TransitionManager.swirl(this, SCENE_KEYS.TWIN_RIVERS, { spawnX: 1712, spawnY: 416 });
      },
    });
    this.interactionSystem.addObject(this.returnGateway);

    // Forward to Stack Spires (gated on Archivist defeat)
    const stackSpiresOpen = gameState.isPuzzleCompleted('boss_archivist');
    this.nextGateway = this.interactablePool.acquire({
      id: 'stack_spires_gateway',
      type: 'portal',
      x: 1784,
      y: 416,
      prompt: stackSpiresOpen ? '[SPACE] Stack Spires' : '[LOCKED] Face Archivist',
      locked: !stackSpiresOpen,
      imageByState: {
        locked: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: stackSpiresOpen ? 'unlocked' : 'locked',
      onInteract: () => {
        if (!stackSpiresOpen) {
          this.showFieldNote(
            'Cartographer of Keys',
            'The high road is sealed until the Archivist accepts your name.',
          );
          return;
        }
        TransitionManager.swirl(this, SCENE_KEYS.STACK_SPIRES, { spawnX: 192, spawnY: 448 });
      },
    });
    this.interactionSystem.addObject(this.nextGateway);

    // Cartographer (regional guide near the spawn)
    this.cartographer = this.interactablePool.acquire({
      id: 'hh_cartographer',
      type: 'sign',
      x: 320,
      y: 384,
      prompt: '[SPACE] Speak with Cartographer',
      locked: false,
      spriteImageKey: VISUAL_REVAMP_KEYS.HASH_KEEPER,
      imageScale: 0.14,
      imageOriginY: 0.86,
      onInteract: () => this.openDialogue(cartographerDialogue, 'hh_cartographer'),
    });
    this.interactionSystem.addObject(this.cartographer);

    this.labelObjects.push(
      this.add.text(320, 384 - 152, 'CARTOGRAPHER OF KEYS', {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: '#e0f8d0',
        backgroundColor: '#4a3821',
        padding: { x: 5, y: 3 },
      }).setOrigin(0.5).setDepth(5),
    );

    this.createTrialNPCs();
    this.createPuzzleShrines();
    this.createArchivistGate();
  }

  private createTrialNPCs(): void {
    for (const trial of TRIAL_KEEPERS) {
      const keeperX = trial.puzzlePosition.x + trial.keeperOffset.x;
      const keeperY = trial.puzzlePosition.y + trial.keeperOffset.y;
      const npc = this.interactablePool.acquire({
        id: trial.npcId,
        type: 'sign',
        x: keeperX,
        y: keeperY,
        prompt: `[SPACE] Speak with ${trial.keeperName}`,
        locked: false,
        spriteImageKey: VISUAL_REVAMP_KEYS.HASH_KEEPER,
        imageScale: 0.12,
        imageOriginY: 0.86,
        onInteract: () => {
          const completed = gameState.isPuzzleCompleted(trial.puzzleId);
          const tree = completed ? trial.postDialogue : trial.preDialogue;
          this.openDialogue(tree, trial.npcId);
        },
      });
      this.keeperObjects.push(npc);
      this.interactionSystem.addObject(npc);

      this.labelObjects.push(
        this.add.text(keeperX, keeperY - 72, trial.keeperName.toUpperCase(), {
          fontSize: '8px',
          fontFamily: FONTS.RETRO,
          color: '#e0f8d0',
          backgroundColor: '#4a3821',
          padding: { x: 4, y: 3 },
        }).setOrigin(0.5).setDepth(5),
      );
    }
  }

  private createPuzzleShrines(): void {
    for (const trial of TRIAL_KEEPERS) {
      const completed = gameState.isPuzzleCompleted(trial.puzzleId);
      const shrine = this.interactablePool.acquire({
        id: trial.puzzleId,
        type: 'sign',
        x: trial.puzzlePosition.x,
        y: trial.puzzlePosition.y,
        prompt: completed ? '[SPACE] Replay' : trial.puzzlePrompt,
        locked: false,
        spriteImageKey: VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE,
        imageScale: 0.12,
        imageOriginY: 0.84,
        onInteract: () => this.startPuzzle(trial.puzzleSceneKey),
      });
      this.puzzleObjects.push(shrine);
      this.interactionSystem.addObject(shrine);

      this.labelObjects.push(
        this.add.text(trial.puzzlePosition.x, trial.puzzlePosition.y - 52, trial.puzzleTitle, {
          fontSize: '8px',
          fontFamily: FONTS.RETRO,
          color: completed ? '#e0f8d0' : '#081820',
          backgroundColor: completed ? '#4a3821' : '#e0f8d0',
          padding: { x: 4, y: 3 },
        }).setOrigin(0.5).setDepth(5),
      );
    }
  }

  private createArchivistGate(): void {
    const completed = gameState.isPuzzleCompleted('boss_archivist');
    const allTrialsDone = TRIAL_KEEPERS.every((t) => gameState.isPuzzleCompleted(t.puzzleId));
    const locked = !allTrialsDone && !completed;

    this.archivistGate = this.interactablePool.acquire({
      id: 'boss_archivist',
      type: 'gate',
      x: BOSS_ENCOUNTER.position.x,
      y: BOSS_ENCOUNTER.position.y,
      prompt: completed ? '[SPACE] Replay' : locked ? '[LOCKED] Four teachings' : '[SPACE] Challenge',
      locked,
      imageByState: {
        locked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
        unlocked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN,
      },
      imageScale: 0.2,
      imageOriginY: 0.84,
      initialState: locked ? 'locked' : 'unlocked',
      onInteract: () => {
        if (locked) {
          const doneCount = TRIAL_KEEPERS.filter((t) => gameState.isPuzzleCompleted(t.puzzleId)).length;
          this.showFieldNote(
            'Cartographer of Keys',
            `The Archivist will not see you yet. Complete the four teachings (${doneCount}/4).`,
          );
          return;
        }
        this.startPuzzle(BOSS_ENCOUNTER.sceneKey);
      },
    });
    this.puzzleObjects.push(this.archivistGate);
    this.interactionSystem.addObject(this.archivistGate);

    this.labelObjects.push(
      this.add.text(BOSS_ENCOUNTER.position.x, BOSS_ENCOUNTER.position.y - 52, BOSS_ENCOUNTER.title, {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: locked ? '#9ca3af' : '#fbbf24',
        backgroundColor: '#081820',
        padding: { x: 4, y: 3 },
      }).setOrigin(0.5).setDepth(5),
    );
  }

  private maybeSpawnGlitchCameo(): void {
    if (this.glitch) return;

    const candidates: Array<'hh_1' | 'hh_3'> = ['hh_1', 'hh_3'];
    for (const id of candidates) {
      if (!gameState.isPuzzleCompleted(id)) continue;
      if (gameState.getFlag(`hh_glitch_${id}_done`)) continue;
      this.glitchTriggerId = id;
      this.glitch = new GlitchRival(this);
      this.glitch.spawnIn(GLITCH_MILESTONE_SPAWN.x, GLITCH_MILESTONE_SPAWN.y, () => {
        // idle until proximity-triggered
      });
      return;
    }
  }

  private maybeTriggerGlitchDialogue(px: number, py: number): void {
    if (!this.glitch || this.glitchProximityTriggered || !this.glitchTriggerId) return;
    if (this.dialogueSystem.isDialogueActive()) return;
    const dist = Phaser.Math.Distance.Between(px, py, GLITCH_MILESTONE_SPAWN.x, GLITCH_MILESTONE_SPAWN.y);
    if (dist > 96) return;

    this.glitchProximityTriggered = true;

    const triggerId = this.glitchTriggerId;
    const lines = HASH_HIGHLANDS_GLITCH_DIALOGUE[triggerId] ?? [];
    const exitLine = HASH_HIGHLANDS_GLITCH_EXIT_LINES[
      Math.floor(Math.random() * HASH_HIGHLANDS_GLITCH_EXIT_LINES.length)
    ];

    const tree: DialogueTree = {
      startNodeId: 'glitch_hh_0',
      nodes: [
        ...lines.map((line, idx) => ({
          id: `glitch_hh_${idx}`,
          speaker: line.speaker ?? 'Glitch',
          text: line.text,
          nextNodeId: `glitch_hh_${idx + 1}`,
        })),
        {
          id: `glitch_hh_${lines.length}`,
          speaker: 'Glitch',
          text: exitLine,
        },
      ],
    };

    this.dialogueSystem.startDialogue(tree, `glitch_hh_${triggerId}`, () => {
      this.glitch?.exit(() => {
        this.glitch?.destroy();
        this.glitch = null;
      });
      gameState.setFlag(`hh_glitch_${triggerId}_done`, true);
    });
  }

  private openDialogue(tree: DialogueTree, npcId: string): void {
    if (this.dialogueSystem.isDialogueActive()) return;
    this.dialogueSystem.startDialogue(tree, npcId);
  }

  private syncObjectiveHint(): void {
    if (this.hasShutdown) return;
    const trialsDone = TRIAL_KEEPERS.filter((t) => gameState.isPuzzleCompleted(t.puzzleId)).length;
    let line = '';
    if (trialsDone < 4) {
      line = `Objective: Walk the highlands — speak with each keeper, complete the four teachings (${trialsDone}/4).`;
    } else if (!gameState.isPuzzleCompleted('boss_archivist')) {
      line = 'Objective: All four teachings settled. Approach the Archivist.';
    } else {
      line = 'Objective: Cross east to Stack Spires, replay any trial, or return west to Twin Rivers.';
    }
    this.hud.setObjectiveHint(line);
  }

  private isPlayerStepWalkable(point: { x: number; y: number }): boolean {
    return isFutureRegionStepWalkable(point, this.getCollisionBlockers(), 0, FUTURE_REGION_ROUTE_RECTS);
  }

  private getCollisionBlockers(): FutureRegionCollisionBlocker[] {
    const blockers: FutureRegionCollisionBlocker[] = [];
    if (this.returnGateway) blockers.push(this.returnGateway.getPosition());
    if (this.nextGateway) blockers.push(this.nextGateway.getPosition());
    if (this.cartographer) blockers.push(this.cartographer.getPosition());
    for (const object of this.keeperObjects) blockers.push(object.getPosition());
    for (const object of this.puzzleObjects) blockers.push(object.getPosition());
    return blockers;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  shutdown(): void {
    this.hasShutdown = true;
    this.input.keyboard?.off('keydown-ESC', this.onEscPause);
    this.input.keyboard?.off('keydown-C', this.onOpenCodex);
    eventBus.off('dialogue:action', this.onDialogueAction, this);
    eventBus.off('progression:gate-open', this.onGateOpen, this);

    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.hud?.destroy();

    if (this.returnGateway) { this.interactablePool.release(this.returnGateway); this.returnGateway = null; }
    if (this.nextGateway) { this.interactablePool.release(this.nextGateway); this.nextGateway = null; }
    if (this.cartographer) { this.interactablePool.release(this.cartographer); this.cartographer = null; }

    for (const obj of this.keeperObjects) this.interactablePool.release(obj);
    this.keeperObjects = [];
    for (const obj of this.puzzleObjects) this.interactablePool.release(obj);
    this.puzzleObjects = [];
    this.archivistGate = null;

    for (const label of this.labelObjects) label.destroy();
    this.labelObjects = [];

    this.glitch?.destroy();
    this.glitch = null;
    this.bit?.destroy();
    this.player?.destroy();
  }
}
