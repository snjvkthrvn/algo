/**
 * PrologueScene - Chamber of Flow overworld.
 * Floating platforms, NPCs, atmospheric effects, void respawn.
 */

import Phaser from "phaser";
import {
  COLORS,
  FONTS,
  REGIONS,
  SCENE_KEYS,
  VOID_RESPAWN_CHECK_INTERVAL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../../config/constants";
import {
  PROLOGUE_SCENE_IMAGE_ASSETS,
  PROLOGUE_SCENE_SPRITE_ASSETS,
  PROLOGUE_SHEET_KEYS,
  VISUAL_REVAMP_KEYS,
} from "../../config/assets";
import { Player } from "../../entities/Player";
import { BitCompanion } from "../../entities/BitCompanion";
import { GlitchRival } from "../../entities/GlitchRival";
import { NPC } from "../../entities/NPC";
import { InteractableObject } from "../../entities/InteractableObject";
import { DialogueSystem } from "../../systems/DialogueSystem";
import {
  InteractionSystem,
  type InteractableEntry,
} from "../../systems/InteractionSystem";
import { NPCBehaviorSystem } from "../../systems/NPCBehaviorSystem";
import { progressionSystem } from "../../systems/ProgressionSystem";
import { HUDManager } from "../../systems/HUDManager";
import { TransitionManager } from "../../core/TransitionManager";
import { audioManager } from "../../core/AudioManager";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { gameState } from "../../core/GameStateManager";
import { eventBus, GameEvents } from "../../core/EventBus";
import { BitMood } from "../../data/types";
import {
  GLITCH_DIALOGUE,
  GLITCH_EXIT_LINES,
} from "../../data/dialogue/glitch_dialogue";
import { professorNodeDialogue } from "../../data/dialogue/prologue_dialogue";
import { PROLOGUE_NPCS } from "../../data/npcs/prologue_npcs";
import {
  PROLOGUE_CONFIG,
  PROLOGUE_ROUTE_LANDMARKS,
} from "../../data/regions/prologue";
import {
  buildPrologueTileGrid,
  isNearPrologueTileRoute,
  isPointOnPrologueTileRoute,
  isPrologueStepWalkable,
  type PrologueCollisionBlocker,
} from "../../data/regions/prologueTilemap";
import {
  createPrologueStoryFlags,
  getPendingPrologueBeat,
  shouldTriggerNodeIntroAtPosition,
  shouldTriggerWatcherAtPosition,
} from "../../prologue/prologueScriptState";
import {
  PROLOGUE_ANCHORS,
  proximityRadiusPixels,
} from "../../data/regions/prologueAnchors";
import {
  PrologueTilemapRenderer,
  type PrologueTilemapHandle,
} from "../../systems/PrologueTilemapRenderer";
import {
  PrologueRouteRenderer,
  type PrologueRouteHandle,
} from "../../systems/PrologueRouteRenderer";
import { PROLOGUE_CAMERA_TUNING } from "./cameraTuning";
import { CAMERA_TUNING } from "../../config/constants";
import { setupUICamera } from "../../utils/uiCamera";
import { openPauseOverlay } from "../titleNavigation";
import { ObjectPool } from "../../utils/ObjectPool";
import type { NPCConfig } from "../../entities/NPC";
import { a11yManager } from "../../core/A11yManager";
import { placeRegionProps } from "../../ui/RegionProps";
import { OverworldAmbience } from "../../ui/OverworldAmbience";

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
  private stars: {
    x: number;
    y: number;
    alpha: number;
    speed: number;
    size: number;
  }[] = [];
  private lastStarfieldRedraw = Number.NEGATIVE_INFINITY;
  private moteEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null =
    null;
  private bossGate: InteractableObject | null = null;
  private gateway: InteractableObject | null = null;
  private tilemapHandle: PrologueTilemapHandle | null = null;
  private routeHandle: PrologueRouteHandle | null = null;
  private safePositionTimer!: Phaser.Time.TimerEvent;
  private storyBeatActive = false;
  private inputCooldownUntil = 0;
  private cinematicCleanup: Array<() => void> = [];
  private cleanupActiveWatcherFlyby: (() => void) | null = null;
  private hasShutdown = false;
  private isRespawning = false;
  private interactablePool!: ObjectPool<InteractableObject>;
  private npcPool!: ObjectPool<NPC>;
  private onDialogueAction!: (...args: unknown[]) => void;
  private onGateOpen!: (...args: unknown[]) => void;
  /** Glitch encounter requested while another story beat held the scene — run on next free frame. */
  private deferredGlitchEncounter: 1 | 2 | null = null;
  private readonly onEscPause = () => this.openPauseMenu();
  private readonly onOpenCodex = () => this.openCodex();

  constructor() {
    super({ key: SCENE_KEYS.PROLOGUE });
  }

  init(data: { spawnX?: number; spawnY?: number }): void {
    if (data.spawnX !== undefined && data.spawnY !== undefined) {
      gameState.setPlayerPosition(data.spawnX, data.spawnY);
    }
  }

  preload(): void {
    for (const asset of PROLOGUE_SCENE_SPRITE_ASSETS) {
      if (this.textures.exists(asset.key)) continue;
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth || 32,
        frameHeight: asset.frameHeight || 48,
      });
    }

    for (const asset of PROLOGUE_SCENE_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key))
        this.load.image(asset.key, asset.path);
    }
  }

  create(): void {
    this.hasShutdown = false;
    this.inputCooldownUntil = 0;
    this.cinematicCleanup = [];
    this.npcs = [];
    this.stars = [];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());

    audioManager.setScene(this);
    audioManager.playMusic("prologue-bgm");

    // Set world bounds larger than camera for horizontal scrolling.
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(COLORS.VOID_BLACK);
    this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, COLORS.VOID_BLACK, 1)
      .setOrigin(0)
      .setDepth(-100);
    const chamber = this.add
      .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, VISUAL_REVAMP_KEYS.PROLOGUE_BG)
      .setOrigin(0.5)
      .setDepth(-95)
      .setAlpha(0.46);
    const source = chamber.texture.getSourceImage() as HTMLImageElement;
    const sWidth = source.width || WORLD_WIDTH;
    const sHeight = source.height || WORLD_HEIGHT;
    chamber.setScale(Math.max(WORLD_WIDTH / sWidth, WORLD_HEIGHT / sHeight));

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

    // === OBJECT POOLS ===
    // Must be initialised before createNPCs() and createGates() which call acquire().
    if (!this.interactablePool) {
      this.interactablePool = new ObjectPool(
        (cfg) => new InteractableObject(this, cfg),
        (obj, cfg) => obj.reset(cfg),
      );
    }
    if (!this.npcPool) {
      this.npcPool = new ObjectPool(
        (cfg: NPCConfig) => new NPC(this, cfg),
        (npc, cfg: NPCConfig) => npc.reset(cfg),
      );
    }

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
      if (this.storyBeatActive || this.time.now < this.inputCooldownUntil)
        return;
      if (this.dialogueSystem.isDialogueActive()) return;

      if (entry.type === "npc") {
        const npc = entry.target as NPC;
        this.player.setInteracting(true);

        const tree = this.npcBehavior.getDialogueTree(npc);
        this.dialogueSystem.startDialogue(tree, npc.config.id, () => {
          this.player.setInteracting(false);
        });
      } else if (entry.type === "object") {
        const obj = entry.target as InteractableObject;
        if (obj.config.onInteract) {
          obj.config.onInteract();
        }
      }
    });

    // Listen for puzzle start from dialogue
    this.onDialogueAction = (...args: unknown[]) => {
      const data = args[0] as { type: string; value: string };
      if (data.type === "start_puzzle") {
        this.startPuzzle(data.value);
      }
    };
    eventBus.on("dialogue:action", this.onDialogueAction, this);

    // Listen for gate openings
    this.onGateOpen = (...args: unknown[]) => {
      const data = args[0] as { gateId: string };
      if (data.gateId === "boss_gate" && this.bossGate) {
        this.bossGate.setLocked(false);
        this.bossGate.setVisualState("unlocked");
        this.showGateOpenEffect(this.bossGate);
      }
      if (data.gateId === "array_plains_gateway" && this.gateway) {
        this.gateway.setLocked(false);
        this.gateway.setVisualState("unlocked");
        this.gateway.setPrompt("[SPACE] Enter Gateway");
        this.showGateOpenEffect(this.gateway);
      }
    };
    eventBus.on("progression:gate-open", this.onGateOpen, this);

    // === WATCHER SYSTEM ===
    // Ambient flybys begin only after the scripted first Watcher warning.
    if (gameState.getFlag("watcher_warning_done")) {
      this.scheduleWatcherFlyby(Phaser.Math.Between(25000, 45000));
    }

    // === CAMERA ===
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.setZoom(CAMERA_TUNING.ZOOM);
    camera.startFollow(
      this.player.sprite,
      true,
      CAMERA_TUNING.FOLLOW_LERP,
      CAMERA_TUNING.FOLLOW_LERP,
    );
    camera.setDeadzone(
      CAMERA_TUNING.DEADZONE_WIDTH,
      CAMERA_TUNING.DEADZONE_HEIGHT,
    );

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
    this.inputCooldownUntil = this.time.now + 800;
    const p = gameState.getState().player;
    gameState.setPlayerLocation(REGIONS.PROLOGUE, p.x, p.y);

    const firstVisit = !gameState.getFlag("prologue_visited");
    const showRegionIntro = () => {
      if (firstVisit) {
        this.hud.showRegionCard(
          "Chamber of Flow",
          "Where ancient algorithms still echo...",
        );
      } else {
        this.hud.showRegionName("Chamber of Flow");
      }
      this.time.delayedCall(firstVisit ? 3600 : 700, () =>
        this.handlePendingPrologueBeat(),
      );
    };

    if (firstVisit) {
      gameState.setFlag("prologue_visited", true);
    }

    if (!gameState.getFlag("opening_scene_done")) {
      this.time.delayedCall(300, () => this.playOpeningScene(showRegionIntro));
    } else {
      showRegionIntro();
    }
    this.input.keyboard?.on("keydown-ESC", this.onEscPause);
    this.input.keyboard?.on("keydown-C", this.onOpenCodex);
  }

  update(time: number, delta: number): void {
    this.maybeFlushDeferredGlitchEncounter();

    const dialogueActive = this.dialogueSystem.isDialogueActive();
    const inputCooldownActive = this.time.now < this.inputCooldownUntil;
    const inputBlocked =
      dialogueActive || this.storyBeatActive || inputCooldownActive;

    // The player walks to Professor Node themselves. The Node intro arms
    // once they enter proximity of the central hub — no forced auto-walk.
    const pos = this.player.getPosition();
    if (
      !inputBlocked &&
      shouldTriggerNodeIntroAtPosition(
        this.getPrologueStoryFlags(),
        pos,
        PROLOGUE_ANCHORS.professorNode.position,
        proximityRadiusPixels(PROLOGUE_ANCHORS.professorNode),
      )
    ) {
      this.playNodeIntro();
    }

    // Always update player — auto-walk tweening must continue even while input is blocked.
    this.player.update(time, delta);

    // Update companion — Bit always follows, even during dialogue
    this.bit.update(pos.x, pos.y, delta);
    if (!inputBlocked) {
      this.maybeTriggerWatcherWarning(pos);
    }

    // Update systems
    this.interactionSystem.update(!inputBlocked);
    this.npcBehavior.update(time);

    // Update starfield
    this.updateStarfield();

    // Save player position
    gameState.setPlayerPosition(pos.x, pos.y);

    this.syncPrologueObjectiveHint();

    // The Watcher cinematic is fired by maybeTriggerWatcherWarning above —
    // a second inline trigger here used to bypass the cinematic and just set
    // the flag on the same condition, which produced two paths fighting over
    // when watcher_warning_done is set. Removed.
  }

  /**
   * Bottom HUD objective line for the Chamber of Flow — updates as script flags advance.
   */
  private syncPrologueObjectiveHint(): void {
    if (this.hasShutdown) return;

    const flags = this.getPrologueStoryFlags();
    let line = "";

    if (flags.openingSceneDone && !flags.professorNodeIntroDone) {
      line =
        PROLOGUE_ANCHORS.professorNode.objectiveLabel != null
          ? `Objective: ${PROLOGUE_ANCHORS.professorNode.objectiveLabel}`
          : "Objective: Speak with Professor Node at the central hub.";
    } else if (flags.professorNodeIntroDone && !flags.watcherWarningDone) {
      line =
        "Objective: Follow the lit tiles toward the Rune Keeper (north) or Console Keeper (south).";
    } else if (flags.watcherWarningDone && !flags.puzzleP01Complete) {
      line =
        PROLOGUE_ANCHORS.runeKeeper.objectiveLabel != null
          ? `Objective: ${PROLOGUE_ANCHORS.runeKeeper.objectiveLabel}`
          : "Objective: Meet the Rune Keeper.";
    } else if (flags.puzzleP01Complete && !flags.puzzleP02Complete) {
      line =
        PROLOGUE_ANCHORS.consoleKeeper.objectiveLabel != null
          ? `Objective: ${PROLOGUE_ANCHORS.consoleKeeper.objectiveLabel}`
          : "Objective: Meet the Console Keeper.";
    } else if (
      flags.puzzleP01Complete &&
      flags.puzzleP02Complete &&
      !progressionSystem.isBossGateOpen()
    ) {
      line =
        PROLOGUE_ANCHORS.bossGate.objectiveLabel != null
          ? `Objective: ${PROLOGUE_ANCHORS.bossGate.objectiveLabel}`
          : "Objective: Open both puzzle paths, then approach the Sentinel gate.";
    } else if (
      progressionSystem.isBossGateOpen() &&
      !flags.puzzleBossSentinelComplete
    ) {
      line = "Objective: Defeat the Sentinel beyond the gate.";
    } else if (
      flags.puzzleBossSentinelComplete &&
      !progressionSystem.isGatewayOpen()
    ) {
      line = "Objective: Reach the gateway to the Array Plains.";
    } else if (
      flags.puzzleBossSentinelComplete &&
      progressionSystem.isGatewayOpen()
    ) {
      line =
        PROLOGUE_ANCHORS.arrayGateway.objectiveLabel != null
          ? `Objective: ${PROLOGUE_ANCHORS.arrayGateway.objectiveLabel}`
          : "Objective: Step through the gateway to the Array Plains.";
    }

    this.hud.setObjectiveHint(line);
  }

  private createPlatforms(): void {
    const tilemapRenderer = new PrologueTilemapRenderer(this);
    this.tilemapHandle = tilemapRenderer.build(buildPrologueTileGrid());

    const routeRenderer = new PrologueRouteRenderer(this);
    this.routeHandle = routeRenderer.buildAll(PROLOGUE_ROUTE_LANDMARKS);

    // World-space cosmic props (Phase 10): rune totems flanking the hub,
    // pulsing rune crystals at the branch shrines, floating orbs that
    // drift slowly, vertical energy beams flanking the boss gate. Brings
    // the chamber from "empty dark mandala" to "an inhabited cosmic site".
    placeRegionProps(this, "prologue");

    // Near-camera mana motes — the Prologue was the only overworld without
    // an ambience layer, and the idle-motion audit measured it as the most
    // static region (0.29% pixels moving per half-second).
    new OverworldAmbience(this, "cosmic", { intensity: 1.4 });
  }

  private isPlayerStepWalkable(point: { x: number; y: number }): boolean {
    return isPrologueStepWalkable(point, this.getCollisionBlockers(), 0);
  }

  /**
   * Pick a dramatic-but-valid Glitch spawn position relative to the player.
   * We try the preferred side first (right), then progressively nearer offsets
   * on either side, so Glitch never appears floating in the void off the edge
   * of a narrow platform or right on top of the player.
   */
  private pickGlitchSpawnPosition(playerPos: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    const candidates = [180, -180, 128, -128, 96, -96, 64, -64];
    const blockers = this.getCollisionBlockers();

    for (const dx of candidates) {
      const candidate = { x: playerPos.x + dx, y: playerPos.y };
      if (isPrologueStepWalkable(candidate, blockers, 0)) {
        return candidate;
      }
    }

    // Worst-case fallback: spawn slightly off the player position so at least
    // the encounter is visible even if the player is in a cramped corner.
    return { x: playerPos.x + 48, y: playerPos.y };
  }

  private getCollisionBlockers(): PrologueCollisionBlocker[] {
    const blockers: PrologueCollisionBlocker[] = this.npcs.map((npc) =>
      npc.getPosition(),
    );

    for (const object of [this.bossGate, this.gateway]) {
      if (!object) continue;
      blockers.push(object.getPosition());
    }

    return blockers;
  }

  private maybeFlushDeferredGlitchEncounter(): void {
    if (this.deferredGlitchEncounter === null) return;
    if (this.storyBeatActive) return;
    const n = this.deferredGlitchEncounter;
    this.deferredGlitchEncounter = null;
    this.triggerGlitchEncounter(n);
  }

  private maybeTriggerWatcherWarning(position: { x: number; y: number }): void {
    if (this.storyBeatActive) return;

    const flags = this.getPrologueStoryFlags();
    if (getPendingPrologueBeat(flags) !== "watcher_warning") return;
    if (!shouldTriggerWatcherAtPosition(flags, position)) return;

    this.playWatcherWarning();
  }

  private playWatcherWarning(): void {
    this.beginStoryBeat("watcher_warning");
    const { width, height } = this.cameras.main;
    const hint = this.add
      .text(width / 2, height - 96, "Something crosses the sky.\nHold still.", {
        fontSize: "10px",
        fontFamily: FONTS.RETRO,
        color: "#e0f8d0",
        stroke: "#081820",
        strokeThickness: 4,
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(8500);
    a11yManager.announce("Something crosses the sky. Hold still.", true);

    this.spawnWatcherFlyby(
      false,
      () => {
        hint.destroy();
        this.playCinematicSequence(
          [
            { speaker: "Professor Node", text: "Easy. Do not move." },
            {
              speaker: "Professor Node",
              text: "That was a Watcher. Part of the Pattern. It scans for things that seem out of place.",
            },
            {
              speaker: "Professor Node",
              text: "Things like us. Nothing to fear yet. Keep learning, and you belong here.",
            },
          ],
          () => {
            gameState.setFlag("watcher_warning_done", true);
            this.endStoryBeat("watcher_warning");
            this.scheduleWatcherFlyby(Phaser.Math.Between(60000, 120000));
          },
        );
      },
      2800,
    );
  }

  private createNPCs(): void {
    for (const npcConfig of PROLOGUE_NPCS) {
      const npc = this.npcPool.acquire(npcConfig);

      // Check if NPC should show post-puzzle dialogue
      if (
        npcConfig.id === "rune_keeper" &&
        gameState.getFlag("puzzle_p0_1_complete")
      ) {
        gameState.setNPCState(npcConfig.id, "post_puzzle");
      }
      if (
        npcConfig.id === "console_keeper" &&
        gameState.getFlag("puzzle_p0_2_complete")
      ) {
        gameState.setNPCState(npcConfig.id, "post_puzzle");
      }
      if (
        npcConfig.id === "professor_node" &&
        gameState.getFlag("puzzle_p0_1_complete") &&
        gameState.getFlag("puzzle_p0_2_complete")
      ) {
        gameState.setNPCState(npcConfig.id, "post_puzzle");
      }

      this.npcs.push(npc);
    }
  }

  private createGates(): void {
    // Boss gate
    const bossGateOpen = gameState.getFlag("boss_gate_open");
    const bossGateVisuallyOpen =
      bossGateOpen && gameState.getFlag("boss_gate_cutscene_done");
    this.bossGate = this.interactablePool.acquire({
      id: "boss_gate",
      type: "gate",
      x: PROLOGUE_CONFIG.exitPoints[0].position.x,
      y: PROLOGUE_CONFIG.exitPoints[0].position.y,
      prompt: bossGateOpen ? "[SPACE] Enter" : "Sealed",
      locked: !bossGateOpen,
      imageByState: {
        locked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
        unlocked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_OPEN,
      },
      imageScale: 0.25,
      imageOriginY: 0.84,
      initialState: bossGateVisuallyOpen ? "unlocked" : "locked",
      onInteract: () => {
        if (progressionSystem.isBossGateOpen()) {
          TransitionManager.swirl(this, SCENE_KEYS.BOSS_SENTINEL, {
            returnScene: SCENE_KEYS.PROLOGUE,
          });
        } else {
          this.showLockedMessage("Complete both puzzles to unseal the gate.");
        }
      },
    });
    this.interactionSystem.addObject(this.bossGate);

    // Array Plains gateway
    const gatewayOpen = gameState.getFlag("gateway_open");
    const gatewayVisuallyOpen =
      gatewayOpen && gameState.getFlag("boss_return_cutscene_done");
    this.gateway = this.interactablePool.acquire({
      id: "gateway",
      type: "portal",
      x: PROLOGUE_CONFIG.exitPoints[1].position.x,
      y: PROLOGUE_CONFIG.exitPoints[1].position.y,
      prompt: gatewayOpen ? "[SPACE] Enter Gateway" : "Sealed",
      locked: !gatewayOpen,
      imageByState: {
        locked: VISUAL_REVAMP_KEYS.PROP_BOSS_GATE_LOCKED,
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_FIELD,
      },
      imageScale: 0.25,
      imageOriginY: 0.86,
      initialState: gatewayVisuallyOpen ? "unlocked" : "locked",
      onInteract: () => {
        if (progressionSystem.isGatewayOpen()) {
          TransitionManager.swirl(this, SCENE_KEYS.ARRAY_PLAINS);
        } else {
          this.showLockedMessage("Defeat the Sentinel to unlock the gateway.");
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
    if (
      this.time.now - this.lastStarfieldRedraw <
      PROLOGUE_CAMERA_TUNING.starRedrawIntervalMs
    ) {
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
    const nebula = this.add
      .graphics()
      .setDepth(0)
      .setAlpha(0.15)
      .setScrollFactor(0);

    // Gradient circles for nebula effect
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 100 + Math.random() * 200;
      const color =
        Math.random() > 0.5 ? COLORS.PURPLE_CRYSTAL : COLORS.CYAN_GLOW;
      nebula.fillStyle(color, 0.1);
      nebula.fillCircle(x, y, radius);
    }
  }

  private checkVoidFall(): void {
    if (this.isRespawning || this.storyBeatActive) return;
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
    if (this.isRespawning) return;
    this.isRespawning = true;
    this.player.freeze();

    const { width, height } = this.cameras.main;
    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(10000);

    // Fade out
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.player.setPosition(
          this.player.lastSafePosition.x,
          this.player.lastSafePosition.y,
        );
        // Fade back in
        this.tweens.add({
          targets: overlay,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            overlay.destroy();
            this.player.unfreeze();
            this.isRespawning = false;
          },
        });
      },
    });
  }

  private startPuzzle(puzzleId: string): void {
    this.player.setInteracting(false);

    if (puzzleId === "p0_1") {
      TransitionManager.swirl(this, SCENE_KEYS.PUZZLE_P0_1, {
        returnScene: SCENE_KEYS.PROLOGUE,
      });
    } else if (puzzleId === "p0_2") {
      TransitionManager.swirl(this, SCENE_KEYS.PUZZLE_P0_2, {
        returnScene: SCENE_KEYS.PROLOGUE,
      });
    }
  }

  private showLockedMessage(text: string): void {
    const { width, height } = this.cameras.main;
    const worldPoint = this.cameras.main.getWorldPoint(width / 2, height / 2);
    const msg = this.add
      .text(worldPoint.x, worldPoint.y - 60, text, {
        fontSize: "12px",
        fontFamily: '"Press Start 2P", monospace',
        color: "#ef4444",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5)
      .setDepth(6000);

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
    const flash = this.add
      .circle(pos.x, pos.y, 5, COLORS.CYAN_GLOW, 0.8)
      .setDepth(5000);

    this.tweens.add({
      targets: flash,
      scale: 20,
      alpha: 0,
      duration: 1000,
      onComplete: () => flash.destroy(),
    });

    audioManager.playTone(440, 300, "sine");
    this.time.delayedCall(200, () => audioManager.playTone(554, 300, "sine"));
    this.time.delayedCall(400, () => audioManager.playTone(659, 400, "sine"));
  }

  private trackCinematicCleanup(cleanup: () => void): {
    run: () => void;
    remove: () => void;
  } {
    let active = true;
    let run: () => void = () => {};

    const removeFromSceneCleanup = () => {
      const index = this.cinematicCleanup.indexOf(run);
      if (index >= 0) this.cinematicCleanup.splice(index, 1);
    };

    run = () => {
      if (!active) return;
      active = false;
      removeFromSceneCleanup();
      cleanup();
    };

    const remove = () => {
      if (!active) return;
      active = false;
      removeFromSceneCleanup();
    };

    this.cinematicCleanup.push(run);
    return { run, remove };
  }

  private runCinematicCleanup(): void {
    const cleanups = [...this.cinematicCleanup];
    this.cinematicCleanup.length = 0;
    for (const cleanup of cleanups) cleanup();
  }

  private beginStoryBeat(name: string = "unknown"): void {
    if (import.meta.env.DEV) {
      console.log(`[PrologueScene] Beginning story beat: ${name}`);
    }
    this.storyBeatActive = true;
    this.player.freeze();
    this.interactionSystem?.update(false);
  }

  private endStoryBeat(name: string = "unknown"): void {
    if (import.meta.env.DEV) {
      console.log(`[PrologueScene] Ending story beat: ${name}`);
    }
    this.storyBeatActive = false;
    this.player.unfreeze();
    this.handlePendingPrologueBeat();
  }

  private playCinematicSequence(
    lines: Array<{ speaker: string; text: string; speakerColor?: string }>,
    onComplete: () => void,
  ): void {
    const { width, height } = this.cameras.main;
    const container = this.add
      .container(0, 0)
      .setDepth(9000)
      .setScrollFactor(0);

    const dim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.34)
      .setOrigin(0)
      .setDepth(9000)
      .setScrollFactor(0);
    const panel = this.add
      .rectangle(width / 2, height - 90, width - 104, 120, 0x0a0a1a, 0.92)
      .setDepth(9001)
      .setScrollFactor(0);
    panel.setStrokeStyle(2, COLORS.CYAN_GLOW, 0.82);
    const speakerText = this.add
      .text(74, height - 136, "", {
        fontFamily: FONTS.RETRO,
        fontSize: "12px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setDepth(9002)
      .setScrollFactor(0);
    const bodyText = this.add
      .text(74, height - 108, "", {
        fontFamily: FONTS.MONO,
        fontSize: "15px",
        color: "#e2e8f0",
        wordWrap: { width: width - 164 },
        lineSpacing: 5,
      })
      .setDepth(9002)
      .setScrollFactor(0);
    const promptText = this.add
      .text(width - 84, height - 58, "▶", {
        fontFamily: FONTS.RETRO,
        fontSize: "10px",
        color: "#fbbf24",
      })
      .setDepth(9002)
      .setScrollFactor(0)
      .setAlpha(0);

    container.add([dim, panel, speakerText, bodyText, promptText]);

    let sequenceDone = false;
    const activeLineCleanup: (() => void)[] = [];

    const runActiveLineCleanup = () => {
      for (const fn of activeLineCleanup) fn();
      activeLineCleanup.length = 0;
    };

    const sequenceCleanup = this.trackCinematicCleanup(() => {
      runActiveLineCleanup();
      container.destroy();
    });

    const finishSequence = () => {
      if (sequenceDone) return;
      sequenceDone = true;
      runActiveLineCleanup();
      let fadeTweenCleanup: { remove: () => void } | null = null;
      const fadeTween = this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 260,
        onComplete: () => {
          fadeTweenCleanup?.remove();
          sequenceCleanup.remove();
          container.destroy();
          this.inputCooldownUntil = this.time.now + 1000;
          onComplete();
        },
      });
      fadeTweenCleanup = this.trackCinematicCleanup(() => fadeTween.stop());
    };

    const showLine = (index: number): void => {
      if (index >= lines.length) {
        finishSequence();
        return;
      }

      runActiveLineCleanup();

      const line = lines[index];
      speakerText.setColor(line.speakerColor ?? "#fbbf24");
      speakerText.setText(line.speaker);
      bodyText.setText("");
      promptText.setAlpha(0);

      const fullText = line.text;
      let charIndex = 0;
      let lineComplete = false;
      let typeTimerRef: Phaser.Time.TimerEvent | null = null;

      const completeCurrentLine = () => {
        if (lineComplete) return;
        if (typeTimerRef) {
          typeTimerRef.destroy();
          typeTimerRef = null;
        }
        lineComplete = true;
        charIndex = fullText.length;
        bodyText.setText(fullText);
        promptText.setAlpha(1);
        let blinkOn = true;
        const blinkTimer = this.time.addEvent({
          delay: 400,
          loop: true,
          callback: () => {
            blinkOn = !blinkOn;
            promptText.setAlpha(blinkOn ? 1 : 0);
          },
        });
        const blinkCleanup = this.trackCinematicCleanup(() => {
          blinkTimer.destroy();
          promptText.setAlpha(0);
        });
        activeLineCleanup.push(blinkCleanup.run);
      };

      if (fullText.length === 0) {
        completeCurrentLine();
      } else {
        const textSpeed = Math.max(1, gameState.getSettings().textSpeed || 30);
        typeTimerRef = this.time.addEvent({
          delay: Math.max(8, Math.round(1000 / textSpeed)),
          repeat: fullText.length - 1,
          callback: () => {
            charIndex++;
            bodyText.setText(fullText.slice(0, charIndex));
            if (charIndex >= fullText.length) {
              completeCurrentLine();
            }
          },
        });
        const typeTimerCleanup = this.trackCinematicCleanup(() => {
          typeTimerRef?.destroy();
          typeTimerRef = null;
        });
        activeLineCleanup.push(typeTimerCleanup.run);
      }

      const advanceLine = () => {
        if (!lineComplete) {
          completeCurrentLine();
          return;
        }
        showLine(index + 1);
      };

      const kbd = this.input.keyboard;
      kbd?.on("keydown-SPACE", advanceLine);
      kbd?.on("keydown-ENTER", advanceLine);
      const advanceCleanup = this.trackCinematicCleanup(() => {
        kbd?.off("keydown-SPACE", advanceLine);
        kbd?.off("keydown-ENTER", advanceLine);
      });
      activeLineCleanup.push(advanceCleanup.run);

      const escHandler = () => finishSequence();
      kbd?.on("keydown-ESC", escHandler);
      const escapeCleanup = this.trackCinematicCleanup(() =>
        kbd?.off("keydown-ESC", escHandler),
      );
      activeLineCleanup.push(escapeCleanup.run);
    };

    showLine(0);
  }

  private playNodeIntro(): void {
    if (gameState.getFlag("professor_node_intro_done")) return;
    // The script's Node intro is interactive — three player choices ("Where am I?",
    // "What's that little light?", "What do I do here?"). The dialogue tree at
    // professorNodeDialogue is already authored to the script. Route through it
    // instead of a hardcoded cinematic so the player keeps agency. The tree's
    // intro_end node sets professor_node_intro_done via its set_flag action.
    this.player.setInteracting(true);
    this.dialogueSystem.startDialogue(
      professorNodeDialogue,
      "professor_node",
      () => {
        this.player.setInteracting(false);
        this.handlePendingPrologueBeat();
      },
    );
  }

  private openPauseMenu(): void {
    if (this.storyBeatActive || this.dialogueSystem?.isDialogueActive()) return;
    openPauseOverlay(this, SCENE_KEYS.PROLOGUE);
  }

  private openCodex(): void {
    if (this.storyBeatActive || this.dialogueSystem?.isDialogueActive()) return;
    TransitionManager.fade(
      this,
      SCENE_KEYS.CODEX,
      { returnScene: SCENE_KEYS.PROLOGUE },
      260,
    );
  }

  private getPrologueStoryFlags(): ReturnType<typeof createPrologueStoryFlags> {
    return createPrologueStoryFlags({
      openingSceneDone: gameState.getFlag("opening_scene_done"),
      professorNodeIntroDone: gameState.getFlag("professor_node_intro_done"),
      watcherWarningDone: gameState.getFlag("watcher_warning_done"),
      glitchIntroDone:
        gameState.getFlag("glitch_intro_done") ||
        gameState.getFlag("glitch_encounter_1_done"),
      bossGateCutsceneDone: gameState.getFlag("boss_gate_cutscene_done"),
      bossReturnCutsceneDone: gameState.getFlag("boss_return_cutscene_done"),
      puzzleP01Complete: gameState.getFlag("puzzle_p0_1_complete"),
      puzzleP02Complete: gameState.getFlag("puzzle_p0_2_complete"),
      puzzleBossSentinelComplete: gameState.getFlag(
        "puzzle_boss_sentinel_complete",
      ),
    });
  }

  private handlePendingPrologueBeat(): void {
    if (this.storyBeatActive) return;
    const beat = getPendingPrologueBeat(this.getPrologueStoryFlags());
    if (beat === "opening_scene") {
      this.playOpeningScene(() => this.handlePendingPrologueBeat());
      return;
    }
    if (beat === "node_intro") {
      // Node intro is armed by player proximity to the central hub in update().
      return;
    }
    if (beat === "watcher_warning") {
      return;
    }
    if (beat === "glitch_intro") {
      this.triggerGlitchEncounter(1);
      return;
    }
    if (beat === "boss_gate_cutscene") {
      this.playBossGateCutscene();
      return;
    }
    if (beat === "boss_return_cutscene") {
      this.playBossReturnCutscene();
      return;
    }
    if (gameState.getFlag("glitch_encounter_2_pending")) {
      this.triggerGlitchEncounter(2);
    }
  }

  /**
   * Opening cinematic — the SERENE WAKEUP ("Pallet Town" wonder).
   *
   * Per docs/story/game_script.md Scene 0-1: the void is beautiful, not
   * threatening. The player wakes gently; the world renders in like a
   * painting still being painted; Bit blinks awake as a spark beside them.
   * There are NO alarms, NO screen shake, NO brute-force cold open — that
   * tonal beat lives later, in Scene 0-5 (Glitch's introduction).
   *
   *   Beat 1 (0-4.4s)  : Black void. Cyan motes drift up like inverse snow.
   *                      Three calm OS-restore lines breathe in with soft
   *                      chimes. "> System restored." / "> Memory: fragmented" /
   *                      "> Welcome back."
   *   Beat 2 (5-8s)    : The world renders in — blackout dissolves to reveal
   *                      the Chamber of Flow. A gentle cyan bloom + warm chime
   *                      marks Bit blinking awake beside the player.
   *   Beat 3 (8.2-11s) : Soft tutorial whisper, then handoff to player control.
   *
   * Architectural notes:
   * - The whole cinematic is screen-space (scrollFactor 0) so it works
   *   regardless of where the world camera is parked.
   * - All visuals live in `container`; one master destroy at end cleans up.
   * - The recurring mote spawner is tracked and stopped on cleanup.
   */
  private playOpeningScene(onComplete: () => void): void {
    this.beginStoryBeat("opening_scene");

    const { width, height } = this.cameras.main;
    const container = this.add
      .container(0, 0)
      .setDepth(9500)
      .setScrollFactor(0);

    // --- Beat 0: full-screen blackout — dissolves as the world renders in ---
    const blackout = this.add
      .rectangle(0, 0, width, height, 0x05050f, 1)
      .setOrigin(0)
      .setScrollFactor(0);
    container.add(blackout);

    // Cyan motes drifting upward like inverse snow — the void "still being
    // painted". A gentle recurring spawner; tracked so cleanup can stop it.
    const moteTimer = this.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        const mx = Math.random() * width;
        const my = height + 8;
        const mote = this.add
          .circle(mx, my, 1 + Math.random() * 1.5, 0x7fdfff, 0.9)
          .setScrollFactor(0)
          .setDepth(9520);
        container.add(mote);
        this.tweens.add({
          targets: mote,
          y: my - (120 + Math.random() * 200),
          alpha: 0,
          duration: 2600 + Math.random() * 1600,
          ease: "Sine.easeOut",
          onComplete: () => mote.destroy(),
        });
      },
    });
    this.trackCinematicCleanup(() => moteTimer.remove());

    // --- Beat 1 helper: calm OS-restore line that breathes in ---
    const makeOSLine = (text: string, color: string, y: number, size = 22) => {
      const t = this.add
        .text(width / 2, y, text, {
          fontFamily: FONTS.MONO,
          fontSize: `${size}px`,
          color,
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setAlpha(0);
      container.add(t);
      return t;
    };

    const breatheIn = (line: Phaser.GameObjects.Text, chime: number) => {
      audioManager.playTone(chime, 220, "sine");
      line.setScale(0.98);
      this.tweens.add({
        targets: line,
        alpha: 1,
        duration: 540,
        ease: "Sine.easeOut",
      });
      this.tweens.add({
        targets: line,
        scale: 1,
        duration: 760,
        ease: "Sine.easeOut",
      });
    };

    // Three calm restore lines — soft, no shake, no red.
    const osLine1 = makeOSLine(
      "> System restored.",
      "#88c070",
      height / 2 - 54,
    );
    const osLine2 = makeOSLine(
      "> Memory: fragmented",
      "#7fdfff",
      height / 2 - 14,
    );
    const osLine3 = makeOSLine(
      "> Welcome back.",
      "#e2e8f0",
      height / 2 + 26,
      24,
    );

    // --- Beat 1: the three lines breathe in, one at a time ---
    this.time.delayedCall(700, () => breatheIn(osLine1, 523));
    this.time.delayedCall(1900, () => breatheIn(osLine2, 587));
    this.time.delayedCall(3100, () => breatheIn(osLine3, 698));

    // Hold, then let the lines fade as the world begins to render in.
    this.time.delayedCall(4400, () => {
      this.tweens.add({
        targets: [osLine1, osLine2, osLine3],
        alpha: 0,
        duration: 700,
        ease: "Sine.easeInOut",
      });
    });

    // --- Beat 2: the world renders in + Bit blinks awake ---
    this.time.delayedCall(5000, () => {
      // Blackout dissolves to a faint haze so the chamber shows through —
      // "a painting still being painted".
      this.tweens.add({
        targets: blackout,
        alpha: 0.12,
        duration: 1500,
        ease: "Sine.easeInOut",
      });
    });

    this.time.delayedCall(5800, () => {
      // Soft cyan bloom near screen-centre (where the camera frames the
      // player) — Bit blinking awake. Warm chime + a few gentle sparkles.
      audioManager.playTone(880, 260, "sine");
      const bloom = this.add
        .circle(width / 2, height / 2 - 8, 70, 0x7fdfff, 0)
        .setScrollFactor(0)
        .setDepth(9540);
      container.add(bloom);
      this.tweens.add({
        targets: bloom,
        alpha: 0.42,
        scale: 1.5,
        duration: 760,
        yoyo: true,
        ease: "Sine.easeInOut",
        onComplete: () => bloom.destroy(),
      });
      this.spawnSparkBurst(width / 2, height / 2 - 8, 10, 0x7fdfff);

      const wakeLine = this.add
        .text(
          width / 2,
          height / 2 + 96,
          "A small light blinks awake beside you.",
          {
            fontFamily: FONTS.MONO,
            fontSize: "14px",
            color: "#7fdfff",
            stroke: "#000000",
            strokeThickness: 3,
            fontStyle: "italic",
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setAlpha(0);
      container.add(wakeLine);
      this.tweens.add({ targets: wakeLine, alpha: 1, duration: 520 });
      this.time.delayedCall(2000, () => {
        this.tweens.add({ targets: wakeLine, alpha: 0, duration: 520 });
      });
    });

    // --- Beat 3: clear the haze, soft tutorial whisper, handoff ---
    this.time.delayedCall(8200, () => {
      this.tweens.add({
        targets: blackout,
        alpha: 0,
        duration: 900,
        ease: "Sine.easeInOut",
      });
      moteTimer.remove();
    });

    this.time.delayedCall(8800, () => {
      const tutorial = this.add
        .text(width / 2, height - 70, "[WASD] move   ·   [SPACE] interact", {
          fontFamily: FONTS.MONO,
          fontSize: "14px",
          color: "#e2e8f0",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setAlpha(0);
      container.add(tutorial);
      this.tweens.add({ targets: tutorial, alpha: 1, duration: 400 });
      this.time.delayedCall(2600, () => {
        this.tweens.add({ targets: tutorial, alpha: 0, duration: 500 });
      });
    });

    // --- Cleanup + handoff to game control ---
    this.time.delayedCall(11200, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 400,
        ease: "Cubic.easeOut",
        onComplete: () => container.destroy(),
      });
      gameState.setFlag("opening_scene_done", true);
      this.syncPrologueObjectiveHint();
      this.endStoryBeat("opening_scene");
      onComplete();
    });
  }

  /**
   * One-shot spark burst — N small bright pixels exploding outward from
   * (x, y) and decaying. Optional `color` tints them (e.g. cyan for Bit's
   * wake-sparkle). Particles live on the cinematic depth and clean up.
   */
  private spawnSparkBurst(
    x: number,
    y: number,
    count: number,
    color?: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 80;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed - 30; // upward bias
      const tint = color ?? (Math.random() < 0.5 ? 0xfbbf24 : 0xffffff);
      const spark = this.add
        .rectangle(x, y, 3, 3, Math.random() < 0.5 ? tint : 0xffffff, 1)
        .setScrollFactor(0)
        .setDepth(9650);
      this.tweens.add({
        targets: spark,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        duration: 380 + Math.random() * 220,
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  private playBossGateCutscene(): void {
    this.beginStoryBeat();

    if (this.bossGate) {
      this.bossGate.setLocked(false);
      this.bossGate.setVisualState("unlocked");
      this.showGateOpenEffect(this.bossGate);
    }

    this.playCinematicSequence(
      [
        {
          speaker: "Professor Node",
          text: "Both shards are resonating. The gate recognizes the sequence and the mapping together.",
        },
        {
          speaker: "Professor Node",
          text: "Beyond it waits the Sentinel. It will not teach a new trick. It will test whether you can hold both lessons at once.",
        },
      ],
      () => {
        gameState.setFlag("boss_gate_cutscene_done", true);
        this.endStoryBeat("boss_gate");
      },
    );
  }

  private playBossReturnCutscene(): void {
    this.beginStoryBeat("boss_return");

    if (this.gateway) {
      this.gateway.setLocked(false);
      this.gateway.setVisualState("unlocked");
      this.gateway.setPrompt("[SPACE] Enter Gateway");
      this.showGateOpenEffect(this.gateway);
    }

    this.playCinematicSequence(
      [
        {
          speaker: "Professor Node",
          text: "You did it. The Chamber of Flow is complete, and your Construct has grown from Spark to Byte.",
        },
        {
          speaker: "Professor Node",
          text: "I won't be coming with you. My place is here. But others will guide you — the Village Elder knows the ways of the Plains.",
        },
        {
          speaker: "Professor Node",
          text: "Take this. A cache key — a small piece of structured memory.",
        },
        {
          speaker: "Professor Node",
          text: "Knowledge is not just power in this world. It's protection.",
        },
        {
          speaker: "Professor Node",
          text: "The Array Plains gateway is open. Take care of each other.",
        },
      ],
      () => {
        gameState.setFlag("boss_return_cutscene_pending", false);
        gameState.setFlag("boss_return_cutscene_done", true);

        if (gameState.getFlag("glitch_encounter_2_pending")) {
          this.time.delayedCall(700, () => {
            this.endStoryBeat("boss_return_pre_glitch");
            this.triggerGlitchEncounter(2);
          });
          return;
        }

        this.endStoryBeat("boss_return");
      },
    );
  }

  private triggerGlitchEncounter(encounterNumber: 1 | 2): void {
    if (this.storyBeatActive) {
      this.deferredGlitchEncounter = encounterNumber;
      return;
    }
    this.deferredGlitchEncounter = null;
    this.beginStoryBeat();

    // Narrator-attributed lines (parenthetical asides) render in a muted color so the
    // 4th-wall break reads as commentary rather than something Glitch says aloud.
    const dialogueLines = GLITCH_DIALOGUE[encounterNumber].map((l) => ({
      speaker: l.speaker ?? "Glitch",
      text: l.text,
      speakerColor: l.speaker === "Narrator" ? "#7a7aaa" : "#8b5cf6",
    }));
    const exitLine =
      GLITCH_EXIT_LINES[encounterNumber % GLITCH_EXIT_LINES.length];
    const lines = [
      ...dialogueLines,
      { speaker: "Glitch", text: exitLine, speakerColor: "#8b5cf6" },
    ];

    const playDialogueAndExit = () => {
      this.playCinematicSequence(lines, () => {
        if (encounterNumber === 1) {
          gameState.setFlag("glitch_encounter_1_pending", false);
          gameState.setFlag("glitch_encounter_1_done", true);
          gameState.setFlag("glitch_intro_done", true);
        } else {
          gameState.setFlag("glitch_encounter_2_pending", false);
          gameState.setFlag("glitch_encounter_2_done", true);
        }
        this.glitch.exit(() => {
          this.cameras.main.startFollow(
            this.player.sprite,
            true,
            CAMERA_TUNING.FOLLOW_LERP,
            CAMERA_TUNING.FOLLOW_LERP,
          );
          this.storyBeatActive = false;
          this.player.unfreeze();
          this.handlePendingPrologueBeat();
        });
      });
    };

    if (encounterNumber === 1) {
      // Player just learned ordered traversal in P0_1. Now they observe Glitch
      // brute-forcing the Flow Consoles — failed insertions, sparks — so the
      // motivation for P0_2's mapping lesson lands before the dialogue does.
      this.playGlitchBruteForceBeat(playDialogueAndExit);
      return;
    }

    const pos = this.player.getPosition();
    const spawn = this.pickGlitchSpawnPosition(pos);
    this.time.delayedCall(300, () => {
      this.glitch.spawnIn(spawn.x, spawn.y, playDialogueAndExit);
    });
  }

  /**
   * The post-P0_1 "show, don't tell" moment: Glitch attacks the consoles three
   * times, fails each time with a wrong-burst/shake, then settles into the
   * scripted dialogue. Camera pans to the console branch so the player can
   * see the failure mode before being told about it.
   */
  private playGlitchBruteForceBeat(onDialogueReady: () => void): void {
    const consolePos = PROLOGUE_ANCHORS.p0_2Trigger.position;
    const branchPos = PROLOGUE_ANCHORS.consoleKeeper.position;
    const stageX = branchPos.x - 96;
    const stageY = branchPos.y;

    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(branchPos.x, branchPos.y, 700, "Sine.easeInOut");

    this.time.delayedCall(720, () => {
      this.glitch.spawnIn(stageX, stageY, () => {
        let attempt = 0;
        const tryInsertion = () => {
          attempt += 1;
          this.glitch.tweenTo(
            consolePos.x - 24,
            consolePos.y - 8,
            220,
            "Quad.easeIn",
            () => {
              JuiceSystem.wrongBurst(this, consolePos.x, consolePos.y - 8);
              JuiceSystem.cameraShake(this, 50, 0.0025);
              audioManager.playWrongTone?.();
              this.glitch.tweenTo(stageX, stageY, 240, "Quad.easeOut", () => {
                if (attempt < 3) {
                  this.time.delayedCall(220, tryInsertion);
                } else {
                  this.time.delayedCall(360, onDialogueReady);
                }
              });
            },
          );
        };
        tryInsertion();
      });
    });
  }

  shutdown(): void {
    if (this.hasShutdown) return;
    this.hasShutdown = true;
    this.deferredGlitchEncounter = null;
    this.cleanupActiveWatcherFlyby?.();
    if (gameState.getBitMood() === BitMood.SCARED) {
      gameState.setBitMood(BitMood.NEUTRAL);
    }
    this.storyBeatActive = false;
    this.player?.unfreeze();
    this.runCinematicCleanup();
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.input.keyboard?.off("keydown-ESC", this.onEscPause);
    this.input.keyboard?.off("keydown-C", this.onOpenCodex);
    eventBus.off("dialogue:action", this.onDialogueAction, this);
    eventBus.off("progression:gate-open", this.onGateOpen, this);
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
    this.npcPool.clear();
    this.npcs.length = 0;
    this.bossGate?.destroy();
    this.gateway?.destroy();
    this.interactablePool.clear();
    this.moteEmitter = null;
    this.bossGate = null;
    this.gateway = null;
    this.tilemapHandle = null;
    this.routeHandle = null;
    this.npcs = [];
    this.stars = [];
  }

  // ─── Watcher System ─────────────────────────────────────────────────────────

  private scheduleWatcherFlyby(delay: number): void {
    this.time.delayedCall(delay, () => this.spawnWatcherFlyby());
  }

  /**
   * @param flyDurationMs — Scripted first crossing uses a shorter pass (~2.8s) so
   *   the frozen moment stays readable; ambient flybys keep the longer sweep.
   */
  private spawnWatcherFlyby(
    scheduleNext = true,
    onComplete?: () => void,
    flyDurationMs = 5000,
  ): void {
    if (this.hasShutdown) return;
    this.cleanupActiveWatcherFlyby?.();

    const cam = this.cameras.main;
    const worldView = cam.worldView;

    // Fly left-to-right across the current camera view
    const startX = worldView.left - 50;
    const endX = worldView.right + 50;
    const y = worldView.top + worldView.height * 0.25;

    const watcher = this.createWatcherSprite(startX, y)
      .setDisplaySize(76, 110)
      .setDepth(8)
      .setAlpha(0.9);
    const scanBeam = this.add
      .rectangle(startX, y + 28, 148, 4, COLORS.CYAN_GLOW, 0.38)
      .setDepth(7)
      .setAlpha(0.58);

    const baseScaleX = watcher.scaleX;
    const baseScaleY = watcher.scaleY;

    const watcherAnim = this.tweens.add({
      targets: watcher,
      angle: { from: -4, to: 4 },
      scaleX: baseScaleX * 1.04,
      scaleY: baseScaleY * 1.04,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    const scanBeamAnim = this.tweens.add({
      targets: scanBeam,
      alpha: 0.15,
      scaleX: 1.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Emit Bit scared event as watcher enters view
    eventBus.emit(GameEvents.WATCHER_NEARBY, { distance: 150 });
    gameState.setBitMood(BitMood.SCARED);

    let completed = false;
    let recoveryTimer: Phaser.Time.TimerEvent | null = null;
    let watchdogTimer: Phaser.Time.TimerEvent | null = null;
    let flyTween: Phaser.Tweens.Tween | null = null;
    let cleanupActive: () => void = () => undefined;

    const cleanupVisuals = (resetBitMood: boolean): void => {
      watcherAnim.stop();
      scanBeamAnim.stop();
      flyTween?.stop();
      recoveryTimer?.destroy();
      watchdogTimer?.destroy();
      if (watcher.active) watcher.destroy();
      if (scanBeam.active) scanBeam.destroy();
      if (resetBitMood && gameState.getBitMood() === BitMood.SCARED) {
        gameState.setBitMood(BitMood.NEUTRAL);
      }
    };

    const finishFlyby = (recoverImmediately = false): void => {
      if (completed || this.hasShutdown) return;
      completed = true;
      cleanupVisuals(recoverImmediately);
      if (this.cleanupActiveWatcherFlyby === cleanupActive) {
        this.cleanupActiveWatcherFlyby = null;
      }
      if (!recoverImmediately) {
        recoveryTimer = this.time.delayedCall(1500, () => {
          if (gameState.getBitMood() === BitMood.SCARED) {
            gameState.setBitMood(BitMood.NEUTRAL);
          }
        });
      }
      if (scheduleNext) {
        this.scheduleWatcherFlyby(Phaser.Math.Between(60000, 120000));
      }
      onComplete?.();
    };

    cleanupActive = (): void => {
      completed = true;
      cleanupVisuals(true);
      if (this.cleanupActiveWatcherFlyby === cleanupActive) {
        this.cleanupActiveWatcherFlyby = null;
      }
    };

    this.cleanupActiveWatcherFlyby = cleanupActive;
    watchdogTimer = this.time.delayedCall(flyDurationMs + 1200, () =>
      finishFlyby(true),
    );

    // Fly across
    flyTween = this.tweens.add({
      targets: [watcher, scanBeam],
      x: endX,
      duration: flyDurationMs,
      ease: "Linear",
      onComplete: () => finishFlyby(false),
    });
  }

  private createWatcherSprite(
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
    const textureKey = VISUAL_REVAMP_KEYS.WATCHER;
    const texture = this.textures.get(textureKey);
    const frameCount =
      texture && texture.key !== "__MISSING"
        ? Math.max(0, texture.frameTotal - 1)
        : 0;
    if (frameCount <= 1) return this.add.image(x, y, textureKey);

    const sprite = this.add.sprite(x, y, textureKey, 0);
    const animKey = `${textureKey}-watcher-idle`;
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(textureKey, {
          start: 0,
          end: frameCount - 1,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }
    sprite.anims.play(animKey);
    return sprite;
  }
}
