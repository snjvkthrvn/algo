/**
 * PrologueScene - Chamber of Flow overworld.
 * Floating platforms, NPCs, atmospheric effects, void respawn.
 */

import Phaser from 'phaser';
import {
  COLORS,
  SCENE_KEYS,
  VOID_RESPAWN_CHECK_INTERVAL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../config/constants';
import { PROLOGUE_SHEET_KEYS } from '../../config/assets';
import { Player } from '../../entities/Player';
import { BitCompanion } from '../../entities/BitCompanion';
import { GlitchRival } from '../../entities/GlitchRival';
import { NPC } from '../../entities/NPC';
import { InteractableObject } from '../../entities/InteractableObject';
import { DialogueSystem } from '../../systems/DialogueSystem';
import { InteractionSystem, type InteractableEntry } from '../../systems/InteractionSystem';
import { NPCBehaviorSystem } from '../../systems/NPCBehaviorSystem';
import { progressionSystem } from '../../systems/ProgressionSystem';
import { HUDManager } from '../../systems/HUDManager';
import { TransitionManager } from '../../core/TransitionManager';
import { audioManager } from '../../core/AudioManager';
import { gameState } from '../../core/GameStateManager';
import { eventBus, GameEvents } from '../../core/EventBus';
import { BitMood } from '../../data/types';
import { PROLOGUE_NPCS } from '../../data/npcs/prologue_npcs';
import { PROLOGUE_CONFIG, PROLOGUE_ROUTE_LANDMARKS } from '../../data/regions/prologue';
import {
  buildPrologueTileGrid,
  isNearPrologueTileRoute,
  isPointOnPrologueTileRoute,
  isPrologueStepWalkable,
  type PrologueCollisionBlocker,
} from '../../data/regions/prologueTilemap';
import { PrologueTilemapRenderer, type PrologueTilemapHandle } from '../../systems/PrologueTilemapRenderer';
import { PrologueRouteRenderer, type PrologueRouteHandle } from '../../systems/PrologueRouteRenderer';
import { PROLOGUE_CAMERA_TUNING } from './cameraTuning';
import { setupUICamera } from '../../utils/uiCamera';
import { createPrologueStoryFlags, getPendingPrologueBeat } from '../../prologue/prologueScriptState';

const NODE_INTRO_LINES = [
  { speaker: 'Professor Node', text: 'Ah. There you are. I was beginning to wonder.' },
  { speaker: 'Professor Node', text: 'I am Professor Node. This is the Chamber of Flow — where the oldest algorithms still run.' },
  { speaker: 'Professor Node', text: 'That small light beside you is Bit. It grows as you learn. Right now it is a Spark — the simplest form.' },
  { speaker: 'Professor Node', text: 'Two lessons wait for you here. Find the Rune Keeper and the Console Keeper. They will show you the way.' },
  { speaker: 'Professor Node', text: 'The Chamber is yours to explore. I will be here if you need me.' },
];

export class PrologueScene extends Phaser.Scene {
  private player!: Player;
  private bit!: BitCompanion;
  private glitch!: GlitchRival;
  private npcs: NPC[] = [];
  private dialogueSystem!: DialogueSystem;
  private interactionSystem!: InteractionSystem;
  private npcBehavior!: NPCBehaviorSystem;
  private hud!: HUDManager;
  private starGraphics!: Phaser.GameObjects.Graphics;
  private stars: { x: number; y: number; alpha: number; speed: number; size: number }[] = [];
  private lastStarfieldRedraw = Number.NEGATIVE_INFINITY;
  private moteEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bossGate: InteractableObject | null = null;
  private gateway: InteractableObject | null = null;
  private tilemapHandle: PrologueTilemapHandle | null = null;
  private routeHandle: PrologueRouteHandle | null = null;
  private safePositionTimer!: Phaser.Time.TimerEvent;
  private onDialogueAction!: (...args: unknown[]) => void;
  private onGateOpen!: (...args: unknown[]) => void;
  private onGlitchSpawn!: (...args: unknown[]) => void;
  private storyBeatActive = false;

  constructor() {
    super({ key: SCENE_KEYS.PROLOGUE });
  }

  init(data: { spawnX?: number; spawnY?: number }): void {
    if (data.spawnX !== undefined && data.spawnY !== undefined) {
      gameState.setPlayerPosition(data.spawnX, data.spawnY);
    }
  }

  create(): void {
    audioManager.setScene(this);
    audioManager.playMusic('prologue-bgm');

    // Set world bounds larger than camera for horizontal scrolling.
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // === ATMOSPHERE ===
    this.createStarfield(WORLD_WIDTH, WORLD_HEIGHT);
    this.createMotes();
    this.createNebulaOverlay(WORLD_WIDTH, WORLD_HEIGHT);

    // === PLATFORMS ===
    // Platforms are walkable ground in this top-down game.
    // No physics colliders — void check system handles boundaries.
    this.createPlatforms();

    // === PLAYER ===
    const state = gameState.getState();
    this.player = new Player(this, state.player.x, state.player.y, {
      canMoveTo: (point) => this.isPlayerStepWalkable(point),
    });

    // === COMPANIONS ===
    this.bit = new BitCompanion(this, state.player.x, state.player.y);
    this.glitch = new GlitchRival(this);

    // === NPCS ===
    this.npcBehavior = new NPCBehaviorSystem();
    this.createNPCs();

    // NPCs are placed on platforms — no colliders needed for top-down movement.

    // === SYSTEMS ===
    this.dialogueSystem = new DialogueSystem(this);
    this.interactionSystem = new InteractionSystem(this, this.player);
    // progressionSystem is a singleton — already active, no instantiation needed
    this.hud = new HUDManager(this);

    // Register NPCs with systems
    for (const npc of this.npcs) {
      this.interactionSystem.addNPC(npc);
      this.npcBehavior.registerNPC(npc);
    }

    // === GATES ===
    this.createGates();

    // === INTERACTION HANDLER ===
    this.interactionSystem.onInteract((entry: InteractableEntry) => {
      if (this.dialogueSystem.isDialogueActive()) return;

      if (entry.type === 'npc') {
        const npc = entry.target as NPC;
        this.player.setInteracting(true);

        const tree = this.npcBehavior.getDialogueTree(npc);
        this.dialogueSystem.startDialogue(tree, npc.config.id, () => {
          this.player.setInteracting(false);
        });
      } else if (entry.type === 'object') {
        const obj = entry.target as InteractableObject;
        if (obj.config.onInteract) {
          obj.config.onInteract();
        }
      }
    });

    // Listen for puzzle start from dialogue
    this.onDialogueAction = ((...args: unknown[]) => {
      const data = args[0] as { type: string; value: string };
      if (data.type === 'start_puzzle') {
        this.startPuzzle(data.value);
      }
    });
    eventBus.on('dialogue:action', this.onDialogueAction, this);

    // Listen for gate openings
    this.onGateOpen = ((...args: unknown[]) => {
      const data = args[0] as { gateId: string };
      if (data.gateId === 'boss_gate' && this.bossGate) {
        this.bossGate.setLocked(false);
        this.bossGate.setVisualState('unlocked');
        this.showGateOpenEffect(this.bossGate);
      }
      if (data.gateId === 'array_plains_gateway' && this.gateway) {
        this.gateway.setLocked(false);
        this.gateway.setVisualState('unlocked');
        this.showGateOpenEffect(this.gateway);
      }
    });
    eventBus.on('progression:gate-open', this.onGateOpen, this);

    // Listen for Glitch encounter triggers from ProgressionSystem
    this.onGlitchSpawn = (() => {
      const pos = this.player.getPosition();
      const spawn = this.pickGlitchSpawnPosition(pos);
      this.glitch.triggerEncounter(spawn.x, spawn.y);
    });
    eventBus.on('progression:glitch-spawn', this.onGlitchSpawn, this);

    // === WATCHER SYSTEM ===
    this.scheduleWatcherFlyby(Phaser.Math.Between(25000, 45000));

    // === CAMERA ===
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setZoom(PROLOGUE_CAMERA_TUNING.zoom);
    camera.startFollow(
      this.player.sprite,
      true,
      PROLOGUE_CAMERA_TUNING.followLerpX,
      PROLOGUE_CAMERA_TUNING.followLerpY
    );
    camera.setDeadzone(PROLOGUE_CAMERA_TUNING.deadzoneWidth, PROLOGUE_CAMERA_TUNING.deadzoneHeight);

    // === VOID RESPAWN ===
    this.safePositionTimer = this.time.addEvent({
      delay: VOID_RESPAWN_CHECK_INTERVAL,
      loop: true,
      callback: () => this.checkVoidFall(),
    });

    // === UI CAMERA ===
    // World camera runs at zoom 2 (cameraTuning.ts) — UI elements with
    // setScrollFactor(0) still get scaled by zoom. A second camera at zoom 1
    // renders UI in screen-space so dialogue and HUD aren't pushed off-screen.
    setupUICamera(this);

    // === INTRO ===
    TransitionManager.fadeIn(this, 800);
    gameState.setPlayerRegion('prologue');

    if (!gameState.getFlag('prologue_visited')) {
      gameState.setFlag('prologue_visited', true);
      this.hud.showRegionCard('Chamber of Flow', 'Where ancient algorithms still echo...');
    } else {
      this.hud.showRegionName('Chamber of Flow');
    }

    // === STORY BEAT HANDLING ===
    this.handlePendingPrologueBeat();
  }

  update(): void {
    const dialogueActive = this.dialogueSystem.isDialogueActive();

    // Update player
    if (!dialogueActive) {
      this.player.update();
    }

    // Update companion — Bit always follows, even during dialogue
    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y);

    // Update systems
    this.interactionSystem.update(!dialogueActive);
    this.npcBehavior.update();

    // Update starfield
    this.updateStarfield();

    // Save player position
    gameState.setPlayerPosition(pos.x, pos.y);
  }

  private createPlatforms(): void {
    const tilemapRenderer = new PrologueTilemapRenderer(this);
    this.tilemapHandle = tilemapRenderer.build(buildPrologueTileGrid());

    const routeRenderer = new PrologueRouteRenderer(this);
    this.routeHandle = routeRenderer.buildAll(PROLOGUE_ROUTE_LANDMARKS);
  }

  private isPlayerStepWalkable(point: { x: number; y: number }): boolean {
    return isPrologueStepWalkable(point, this.getCollisionBlockers(), 10);
  }

  /**
   * Pick a dramatic-but-valid Glitch spawn position relative to the player.
   * We try the preferred side first (right), then progressively nearer offsets
   * on either side, so Glitch never appears floating in the void off the edge
   * of a narrow platform or right on top of the player.
   */
  private pickGlitchSpawnPosition(playerPos: { x: number; y: number }): { x: number; y: number } {
    const candidates = [180, -180, 128, -128, 96, -96, 64, -64];
    const blockers = this.getCollisionBlockers();

    for (const dx of candidates) {
      const candidate = { x: playerPos.x + dx, y: playerPos.y };
      if (isPrologueStepWalkable(candidate, blockers, 10)) {
        return candidate;
      }
    }

    // Worst-case fallback: spawn slightly off the player position so at least
    // the encounter is visible even if the player is in a cramped corner.
    return { x: playerPos.x + 48, y: playerPos.y };
  }

  private getCollisionBlockers(): PrologueCollisionBlocker[] {
    const blockers: PrologueCollisionBlocker[] = this.npcs.map((npc) => npc.getPosition());

    for (const object of [this.bossGate, this.gateway]) {
      if (!object) continue;
      blockers.push({ ...object.getPosition(), radiusTiles: 1 });
    }

    return blockers;
  }

  private createNPCs(): void {
    for (const npcConfig of PROLOGUE_NPCS) {
      const npc = new NPC(this, npcConfig);

      // Check if NPC should show post-puzzle dialogue
      if (npcConfig.id === 'rune_keeper' && gameState.getFlag('puzzle_p0_1_complete')) {
        gameState.setNPCState(npcConfig.id, 'post_puzzle');
      }
      if (npcConfig.id === 'console_keeper' && gameState.getFlag('puzzle_p0_2_complete')) {
        gameState.setNPCState(npcConfig.id, 'post_puzzle');
      }
      if (npcConfig.id === 'professor_node' &&
          gameState.getFlag('puzzle_p0_1_complete') &&
          gameState.getFlag('puzzle_p0_2_complete')) {
        gameState.setNPCState(npcConfig.id, 'post_puzzle');
      }

      this.npcs.push(npc);
    }
  }

  private createGates(): void {
    // Boss gate
    const bossGateOpen = gameState.getFlag('boss_gate_open');
    this.bossGate = new InteractableObject(this, {
      id: 'boss_gate',
      type: 'gate',
      x: PROLOGUE_CONFIG.exitPoints[0].position.x,
      y: PROLOGUE_CONFIG.exitPoints[0].position.y,
      prompt: bossGateOpen ? '[SPACE] Enter' : 'Sealed',
      locked: !bossGateOpen,
      spriteKey: PROLOGUE_SHEET_KEYS.OBJECTS,
      frameByState: {
        locked: 0,
        unlocked: 2,
      },
      spriteScale: 0.34,
      initialState: bossGateOpen ? 'unlocked' : 'locked',
      onInteract: () => {
        if (progressionSystem.isBossGateOpen()) {
          TransitionManager.swirl(this, SCENE_KEYS.BOSS_SENTINEL, {
            returnScene: SCENE_KEYS.PROLOGUE,
          });
        } else {
          this.showLockedMessage('Complete both puzzles to unseal the gate.');
        }
      },
    });
    this.interactionSystem.addObject(this.bossGate);

    // Array Plains gateway
    const gatewayOpen = gameState.getFlag('gateway_open');
    this.gateway = new InteractableObject(this, {
      id: 'gateway',
      type: 'portal',
      x: PROLOGUE_CONFIG.exitPoints[1].position.x,
      y: PROLOGUE_CONFIG.exitPoints[1].position.y,
      prompt: gatewayOpen ? '[SPACE] Enter Gateway' : 'Sealed',
      locked: !gatewayOpen,
      spriteKey: PROLOGUE_SHEET_KEYS.OBJECTS,
      frameByState: {
        locked: 4,
        unlocked: 5,
      },
      spriteScale: 0.34,
      initialState: gatewayOpen ? 'unlocked' : 'locked',
      onInteract: () => {
        if (progressionSystem.isGatewayOpen()) {
          this.showComingSoon();
        } else {
          this.showLockedMessage('Defeat the Sentinel to unlock the gateway.');
        }
      },
    });
    this.interactionSystem.addObject(this.gateway);
  }

  private createStarfield(_worldWidth: number, _worldHeight: number): void {
    const { width, height } = this.cameras.main;
    this.starGraphics = this.add.graphics().setDepth(0).setScrollFactor(0);

    for (let i = 0; i < PROLOGUE_CAMERA_TUNING.starCount; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        alpha: Math.random() * 0.6 + 0.1,
        speed: Math.random() * 3 + 0.5,
        size: Math.random() < 0.1 ? 2 : 1,
      });
    }
  }

  private updateStarfield(): void {
    if (this.time.now - this.lastStarfieldRedraw < PROLOGUE_CAMERA_TUNING.starRedrawIntervalMs) {
      return;
    }
    this.lastStarfieldRedraw = this.time.now;

    this.starGraphics.clear();
    const time = this.time.now;

    for (const star of this.stars) {
      const twinkle = Math.sin(time * star.speed * 0.001) * 0.3;
      const alpha = Math.max(0.05, Math.min(0.9, star.alpha + twinkle));
      this.starGraphics.fillStyle(0xffffff, alpha);
      this.starGraphics.fillCircle(star.x, star.y, star.size);
    }
  }

  private createMotes(): void {
    const { width, height } = this.cameras.main;
    const emitter = this.add.particles(0, 0, PROLOGUE_SHEET_KEYS.COMPANIONS, {
      frame: [8, 9, 10, 11],
      x: { min: 0, max: width },
      y: height + 30,
      lifespan: 6000,
      speedY: { min: -20, max: -40 },
      speedX: { min: -5, max: 5 },
      alpha: { start: 0.36, end: 0 },
      scale: { start: 0.012, end: 0.03 },
      quantity: 1,
      frequency: PROLOGUE_CAMERA_TUNING.moteFrequencyMs,
    });
    emitter.setDepth(1).setScrollFactor(0);
    this.moteEmitter = emitter;
  }

  private createNebulaOverlay(_worldWidth: number, _worldHeight: number): void {
    const { width, height } = this.cameras.main;
    const nebula = this.add.graphics().setDepth(0).setAlpha(0.15).setScrollFactor(0);

    // Gradient circles for nebula effect
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 100 + Math.random() * 200;
      const color = Math.random() > 0.5 ? COLORS.PURPLE_CRYSTAL : COLORS.CYAN_GLOW;
      nebula.fillStyle(color, 0.1);
      nebula.fillCircle(x, y, radius);
    }
  }

  private checkVoidFall(): void {
    const pos = this.player.getPosition();

    if (isPointOnPrologueTileRoute(pos, 10)) {
      this.player.updateSafePosition();
      return;
    }

    if (!isNearPrologueTileRoute(pos)) {
      this.respawnPlayer();
    }
  }

  private respawnPlayer(): void {
    this.player.freeze();

    const { width, height } = this.cameras.main;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(10000);

    // Fade out
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.player.setPosition(
          this.player.lastSafePosition.x,
          this.player.lastSafePosition.y
        );
        // Fade back in
        this.tweens.add({
          targets: overlay,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            overlay.destroy();
            this.player.unfreeze();
          },
        });
      },
    });
  }

  private startPuzzle(puzzleId: string): void {
    this.player.setInteracting(false);

    if (puzzleId === 'p0_1') {
      TransitionManager.swirl(this, SCENE_KEYS.PUZZLE_P0_1, {
        returnScene: SCENE_KEYS.PROLOGUE,
      });
    } else if (puzzleId === 'p0_2') {
      TransitionManager.swirl(this, SCENE_KEYS.PUZZLE_P0_2, {
        returnScene: SCENE_KEYS.PROLOGUE,
      });
    }
  }

  private showLockedMessage(text: string): void {
    const { width, height } = this.cameras.main;
    const worldPoint = this.cameras.main.getWorldPoint(width / 2, height / 2);
    const msg = this.add.text(worldPoint.x, worldPoint.y - 60, text, {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ef4444',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      wordWrap: { width: 400 },
    }).setOrigin(0.5).setDepth(6000);

    this.tweens.add({
      targets: msg,
      y: msg.y - 30,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => msg.destroy(),
    });
  }

  private showGateOpenEffect(gate: InteractableObject): void {
    const pos = gate.getPosition();
    const flash = this.add.circle(pos.x, pos.y, 5, COLORS.CYAN_GLOW, 0.8).setDepth(5000);

    this.tweens.add({
      targets: flash,
      scale: 20,
      alpha: 0,
      duration: 1000,
      onComplete: () => flash.destroy(),
    });

    audioManager.playTone(440, 300, 'sine');
    this.time.delayedCall(200, () => audioManager.playTone(554, 300, 'sine'));
    this.time.delayedCall(400, () => audioManager.playTone(659, 400, 'sine'));
  }

  private showComingSoon(): void {
    const { width, height } = this.cameras.main;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0).setScrollFactor(0).setDepth(8000);

    const text = this.add.text(width / 2, height / 2 - 20, 'ARRAY PLAINS', {
      fontSize: '24px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#06b6d4',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(8001);

    const subtext = this.add.text(width / 2, height / 2 + 30, 'Coming Soon...', {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#9ca3af',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(8001);

    const back = this.add.text(width / 2, height / 2 + 80, '[SPACE] Return', {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#fbbf24',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(8001);

    this.input.keyboard?.once('keydown-SPACE', () => {
      overlay.destroy();
      text.destroy();
      subtext.destroy();
      back.destroy();
    });
  }

  private playCinematicSequence(
    lines: Array<{ speaker: string; text: string }>,
    onComplete: () => void
  ): void {
    let lineIndex = 0;

    const playNextLine = () => {
      if (lineIndex >= lines.length) {
        onComplete();
        return;
      }

      const line = lines[lineIndex];
      this.dialogueSystem.startDialogue(
        {
          startNodeId: 'node_intro_' + lineIndex,
          nodes: [
            {
              id: 'node_intro_' + lineIndex,
              speaker: line.speaker,
              text: line.text,
            },
          ],
        },
        'cinematic',
        () => {
          lineIndex++;
          playNextLine();
        }
      );
    };

    playNextLine();
  }

  private playNodeIntro(): void {
    this.storyBeatActive = true;
    this.player.freeze();
    this.playCinematicSequence(NODE_INTRO_LINES, () => {
      gameState.setFlag('professor_node_intro_done', true);
      this.storyBeatActive = false;
      this.player.unfreeze();
      this.handlePendingPrologueBeat();
    });
  }

  private getPrologueStoryFlags() {
    return createPrologueStoryFlags({
      openingSceneDone: gameState.getFlag('opening_scene_done'),
      professorNodeIntroDone: gameState.getFlag('professor_node_intro_done'),
      watcherWarningDone: gameState.getFlag('watcher_warning_done'),
      glitchIntroDone: gameState.getFlag('glitch_intro_done') || gameState.getFlag('glitch_encounter_1_done'),
      bossGateCutsceneDone: gameState.getFlag('boss_gate_cutscene_done'),
      bossReturnCutsceneDone: gameState.getFlag('boss_return_cutscene_done'),
      puzzleP01Complete: gameState.getFlag('puzzle_p0_1_complete'),
      puzzleP02Complete: gameState.getFlag('puzzle_p0_2_complete'),
      puzzleBossSentinelComplete: gameState.getFlag('puzzle_boss_sentinel_complete'),
    });
  }

  private handlePendingPrologueBeat(): void {
    if (this.storyBeatActive) return;
    const beat = getPendingPrologueBeat(this.getPrologueStoryFlags());
    if (beat === 'opening_scene') {
      this.playOpeningScene(() => this.handlePendingPrologueBeat());
      return;
    }
    if (beat === 'node_intro') {
      this.playNodeIntro();
      return;
    }
    if (beat === 'glitch_intro') {
      this.triggerGlitchEncounter(1);
      return;
    }
    if (beat === 'boss_gate_cutscene') {
      this.playBossGateCutscene();
      return;
    }
    if (beat === 'boss_return_cutscene') {
      this.playBossReturnCutscene();
      return;
    }
    if (gameState.getFlag('glitch_encounter_2_pending')) {
      this.triggerGlitchEncounter(2);
    }
  }

  private playOpeningScene(onComplete: () => void): void {
    this.storyBeatActive = true;
    this.player.freeze();
    this.playCinematicSequence(
      [{ speaker: 'System', text: '> Begin.' }],
      () => {
        gameState.setFlag('opening_scene_done', true);
        this.storyBeatActive = false;
        this.player.unfreeze();
        onComplete();
      }
    );
  }

  private playBossGateCutscene(): void {
    this.storyBeatActive = true;
    this.player.freeze();
    this.playCinematicSequence(
      [{ speaker: 'Professor Node', text: 'Both lessons learned. The Sentinel awaits beyond the gate.' }],
      () => {
        gameState.setFlag('boss_gate_cutscene_done', true);
        this.storyBeatActive = false;
        this.player.unfreeze();
      }
    );
  }

  private playBossReturnCutscene(): void {
    this.storyBeatActive = true;
    this.player.freeze();
    this.playCinematicSequence(
      [{ speaker: 'Professor Node', text: 'You have done it. The path forward is open.' }],
      () => {
        gameState.setFlag('boss_return_cutscene_done', true);
        this.storyBeatActive = false;
        this.player.unfreeze();
      }
    );
  }

  private triggerGlitchEncounter(_encounterNumber: 1 | 2): void {
    const pos = this.player.getPosition();
    const spawn = this.pickGlitchSpawnPosition(pos);
    this.glitch.triggerEncounter(spawn.x, spawn.y);
  }

  shutdown(): void {
    eventBus.off('dialogue:action', this.onDialogueAction, this);
    eventBus.off('progression:gate-open', this.onGateOpen, this);
    eventBus.off('progression:glitch-spawn', this.onGlitchSpawn, this);
    this.safePositionTimer?.destroy();
    this.moteEmitter?.destroy();
    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.npcBehavior?.destroy();
    this.hud?.destroy();
    this.tilemapHandle?.destroy();
    this.routeHandle?.destroy();
    this.bit?.destroy();
    this.glitch?.destroy();
    this.player?.destroy();
    for (const npc of this.npcs) npc.destroy();
  }

  // ─── Watcher System ─────────────────────────────────────────────────────────

  private scheduleWatcherFlyby(delay: number): void {
    this.time.delayedCall(delay, () => this.spawnWatcherFlyby());
  }

  private spawnWatcherFlyby(): void {
    const cam = this.cameras.main;
    const worldView = cam.worldView;

    // Fly left-to-right across the current camera view
    const startX = worldView.left - 50;
    const endX = worldView.right + 50;
    const y = worldView.top + worldView.height * 0.25;

    // Watcher: a rotating crystalline diamond — geometric, cold, scanning
    const watcher = this.add
      .sprite(startX, y, PROLOGUE_SHEET_KEYS.COMPANIONS, 4)
      .setDisplaySize(58, 58)
      .setDepth(8)
      .setAlpha(0.82);

    // Slow rotation tween
    this.tweens.add({
      targets: watcher,
      angle: 360,
      duration: 2400,
      repeat: -1,
    });

    // Emit Bit scared event as watcher enters view
    eventBus.emit(GameEvents.WATCHER_NEARBY, { distance: 150 });
    gameState.setBitMood(BitMood.SCARED);

    // Fly across
    this.tweens.add({
      targets: watcher,
      x: endX,
      duration: 5000,
      ease: 'Linear',
      onComplete: () => {
        watcher.destroy();
        // Bit recovers 1.5s after the watcher leaves
        this.time.delayedCall(1500, () => {
          if (gameState.getBitMood() === BitMood.SCARED) {
            gameState.setBitMood(BitMood.NEUTRAL);
          }
        });
        // Schedule next flyby — 60–120s later
        this.scheduleWatcherFlyby(Phaser.Math.Between(60000, 120000));
      },
    });
  }
}
