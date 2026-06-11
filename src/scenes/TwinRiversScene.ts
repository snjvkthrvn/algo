import Phaser from "phaser";
import {
  TWIN_RIVERS_SCENE_IMAGE_ASSETS,
  TWIN_RIVERS_SCENE_SPRITE_ASSETS,
  VISUAL_REVAMP_KEYS,
} from "../config/assets";
import {
  CAMERA_TUNING,
  COLORS,
  FONTS,
  REGIONS,
  SCENE_KEYS,
} from "../config/constants";
import { audioManager } from "../core/AudioManager";
import { eventBus } from "../core/EventBus";
import { gameState } from "../core/GameStateManager";
import { TransitionManager } from "../core/TransitionManager";
import { BitCompanion } from "../entities/BitCompanion";
import { GlitchRival } from "../entities/GlitchRival";
import { InteractableObject } from "../entities/InteractableObject";
import { NPC } from "../entities/NPC";
import { Player } from "../entities/Player";
import {
  TWIN_RIVERS_CONFIG,
  TWIN_RIVERS_STONES_RECT,
  TWIN_RIVERS_WORLD_HEIGHT,
  TWIN_RIVERS_WORLD_WIDTH,
  isPointOnTwinRiversRoute,
  isTwinRiversStepWalkable,
  type TwinRiversCollisionBlocker,
} from "../data/regions/twinRivers";
import { DialogueSystem } from "../systems/DialogueSystem";
import { OverworldAmbience } from "../ui/OverworldAmbience";
import { HUDManager } from "../systems/HUDManager";
import { JuiceSystem } from "../systems/JuiceSystem";
import {
  InteractionSystem,
  type InteractableEntry,
} from "../systems/InteractionSystem";
import { NPCBehaviorSystem } from "../systems/NPCBehaviorSystem";
import { a11yManager } from "../core/A11yManager";
import { NPCType, type DialogueTree } from "../data/types";
import { setupUICamera } from "../utils/uiCamera";
import { openPauseOverlay } from "./titleNavigation";
import { ObjectPool } from "../utils/ObjectPool";
import { drawPanel } from "../ui/panel";
import { BaseOverworldScene } from "./BaseOverworldScene";
import { placeRegionProps } from "../ui/RegionProps";
import {
  mirrorWalkerDialogue,
  mirrorWalkerPostDialogue,
  bridgeKeeperDialogue,
  bridgeKeeperPostDialogue,
  windowFisherDialogue,
  windowFisherPostDialogue,
  currentRiderDialogue,
  currentRiderPostDialogue,
  riverGuideIntroDialogue,
  riverGuideMidDialogue,
  riverGuideCompleteDialogue,
} from "../data/dialogue/twin_rivers_dialogue";
import {
  glitchTR1Dialogue,
  glitchTR3Dialogue,
} from "../data/dialogue/glitch_dialogue";

export class TwinRiversScene extends BaseOverworldScene {
  private returnGateway: InteractableObject | null = null;
  private nextGateway: InteractableObject | null = null;
  private puzzleObjects: InteractableObject[] = [];
  private onDialogueAction!: (...args: unknown[]) => void;
  private closeBetaGateModal: (() => void) | null = null;
  private twinRiversClosureStarted = false;
  private twinRiversClosureInProgress = false;

  /** Living-world cast (docs/VISION.md §2): keepers wander their posts. */
  private npcBehavior: NPCBehaviorSystem | null = null;
  private livingNPCs: NPC[] = [];
  /** NPC id → puzzle id, for dialogue routing on interact. */
  private npcPuzzleMap: Record<string, string> = {};
  /** True once two-pointer mastery opened the stepping stones (flag-backed). */
  private stonesUnlocked = false;
  private stonesGate: InteractableObject | null = null;

  // Overworld sequence puzzle
  private sequenceTiles: Phaser.GameObjects.Rectangle[] = [];
  private readonly pointerSequence = [0, 3, 1, 2];
  private currentSequenceIndex = 0;
  private sequenceSolved = false;

  private readonly onEscPause = () => {
    if (this.closeBetaGateModal) {
      this.closeBetaGateModal();
      return;
    }
    if (this.twinRiversClosureInProgress) return;
    if (this.dialogueSystem?.isDialogueActive()) return;
    openPauseOverlay(this, SCENE_KEYS.TWIN_RIVERS);
  };
  private readonly onOpenCodex = () => this.openCodex();

  constructor() {
    super({ key: SCENE_KEYS.TWIN_RIVERS });
  }

  protected getRegionImageAssets(): ReadonlyArray<{
    key: string;
    path: string;
  }> {
    return TWIN_RIVERS_SCENE_IMAGE_ASSETS;
  }

  protected override getRegionSpriteSheetAssets() {
    return TWIN_RIVERS_SCENE_SPRITE_ASSETS;
  }

  create(): void {
    this.hasShutdown = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    audioManager.setScene(this);

    let px = gameState.getState().player.x;
    let py = gameState.getState().player.y;
    if (!isPointOnTwinRiversRoute({ x: px, y: py }, 0)) {
      px = TWIN_RIVERS_CONFIG.spawnPoint.x;
      py = TWIN_RIVERS_CONFIG.spawnPoint.y;
      gameState.setPlayerPosition(px, py);
    }
    gameState.setPlayerLocation(REGIONS.TWIN_RIVERS, px, py);

    audioManager.playMusic(TWIN_RIVERS_CONFIG.backgroundMusic);
    this.physics.world.setBounds(
      0,
      0,
      TWIN_RIVERS_WORLD_WIDTH,
      TWIN_RIVERS_WORLD_HEIGHT,
    );

    this.renderField();
    this.renderRoute();
    // Foam flecks + drifting leaves over the river ambient layer. Capped to
    // the lower half of the screen so the sky stays uncluttered.
    new OverworldAmbience(this, "river", {
      intensity: 1,
      yMin: this.cameras.main.height * 0.35,
      yMax: this.cameras.main.height - 30,
    });
    // World-space river props (Phase 10): drifting boat, lily pads, lantern
    // posts with flickering flame, two dragonflies hovering at varied heights.
    // Brings the river from "pretty static image" to "living waterway".
    placeRegionProps(this, "twin_rivers");

    this.player = new Player(this, px, py, {
      canMoveTo: (point) => this.isPlayerStepWalkable(point),
    });
    this.bit = new BitCompanion(this, px, py);

    if (!this.interactablePool) {
      this.interactablePool = new ObjectPool(
        (cfg) => new InteractableObject(this, cfg),
        (obj, cfg) => obj.reset(cfg),
      );
    }

    this.interactionSystem = new InteractionSystem(this, this.player);
    this.dialogueSystem = new DialogueSystem(this);
    this.npcBehavior = new NPCBehaviorSystem();
    this.stonesUnlocked = gameState.getFlag("tr_stones_unlocked");

    this.onDialogueAction = (...args: unknown[]) => {
      const data = args[0] as { type: string; value: string };
      if (data.type === "start_puzzle") {
        const puzzleId = data.value;
        const puzzleLabels: Record<string, string> = {
          tr_1: SCENE_KEYS.PUZZLE_TR_1,
          tr_2: SCENE_KEYS.PUZZLE_TR_2,
          tr_3: SCENE_KEYS.PUZZLE_TR_3,
          tr_4: SCENE_KEYS.PUZZLE_TR_4,
        };
        const sceneKey = puzzleLabels[puzzleId];
        if (sceneKey) {
          this.player.setInteracting(false);
          this.startPuzzle(sceneKey);
        }
      }
    };
    eventBus.on("dialogue:action", this.onDialogueAction, this);

    this.createInteractables();
    this.createSteppingStones();
    this.createCoveSecret();
    this.createSequencePuzzle();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));

    this.hud = new HUDManager(this);
    setupUICamera(this);

    this.setupOverworldCamera(
      TWIN_RIVERS_WORLD_WIDTH,
      TWIN_RIVERS_WORLD_HEIGHT,
    );

    this.playEntranceFade();
    this.hud.showRegionCard(
      "Twin Rivers",
      "Where two paths learn to move as one.",
    );
    this.input.keyboard?.on("keydown-ESC", this.onEscPause);
    this.input.keyboard?.on("keydown-C", this.onOpenCodex);

    this.checkCameos();
  }

  private createSequencePuzzle(): void {
    // Pointer stones sit on the central band between the rivers, on the
    // way from the gateway to the bridge.
    const startX = 600;
    const startY = 648;
    const spacing = 64;

    for (let i = 0; i < 4; i++) {
      const tile = this.add
        .rectangle(startX + i * spacing, startY, 48, 48, 0x1a1a2e, 0.8)
        .setStrokeStyle(2, COLORS.FRAME_BORDER_LIGHT, 0.6)
        .setDepth(2.2);

      this.add
        .text(startX + i * spacing, startY, `${i}`, {
          fontSize: "12px",
          fontFamily: FONTS.RETRO,
          color: "#5ab7d4",
        })
        .setOrigin(0.5)
        .setDepth(2.3);

      tile.setData("index", i);
      tile.setData("active", false);
      this.sequenceTiles.push(tile);
    }

    // No floating headline. The old permanent "OUTSIDE-IN POINTER WALK"
    // label both broke the no-persistent-chrome rule and named the pattern
    // before the player felt it (docs/VISION.md §3, §5). The stones' own
    // glow feedback in checkSequencePuzzle teaches the order; the field note
    // on completion does the naming, after the solve.
  }

  update(time: number, delta: number): void {
    const dialogueActive = this.dialogueSystem?.isDialogueActive() ?? false;
    const modalActive = this.closeBetaGateModal !== null;
    const inputBlocked =
      dialogueActive || modalActive || this.twinRiversClosureInProgress;
    if (!inputBlocked) this.player.update(time, delta);

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y, delta);
    const canInteract =
      !inputBlocked && this.time.now >= this.interactionEnabledTime;
    this.interactionSystem.update(canInteract);
    this.npcBehavior?.update(time);
    if (pos.x !== this.lastPlayerX || pos.y !== this.lastPlayerY) {
      gameState.setPlayerPosition(pos.x, pos.y);
      this.lastPlayerX = pos.x;
      this.lastPlayerY = pos.y;
      this.checkSequencePuzzle(pos.x, pos.y);
    }

    this.syncTwinRiversObjectiveHint();
    this.maybeStartTwinRiversClosure(dialogueActive);
  }

  private maybeStartTwinRiversClosure(dialogueActive: boolean): void {
    if (this.twinRiversClosureStarted) return;
    if (this.hasShutdown || dialogueActive || this.closeBetaGateModal) return;
    if (this.time.now < this.interactionEnabledTime) return;
    if (gameState.getFlag("twin_rivers_closure_done")) return;
    if (!gameState.getFlag("hash_highlands_gateway_open")) return;
    if (!gameState.isPuzzleCompleted("boss_mirror_serpent")) return;

    this.twinRiversClosureStarted = true;
    this.twinRiversClosureInProgress = true;
    // Flag is set in the dialogue's onEnd callback, not here. If the player
    // navigates away mid-cinematic the flag stays unset so the beat replays
    // on re-entry — they shouldn't permanently lose the polished ending.
    this.playTwinRiversClosureBeat();
  }

  private playTwinRiversClosureBeat(): void {
    const camera = this.cameras.main;
    const playerSprite = this.player.sprite;
    const gatewayPos = this.nextGateway?.getPosition();

    this.player.freeze();
    audioManager.playCorrectTone();
    this.hud.setObjectiveHint(
      "Objective: Twin Rivers is complete. The polished arc ends at the mountain gate.",
    );

    if (gatewayPos && !this.prefersReducedMotion()) {
      camera.stopFollow();
      camera.pan(gatewayPos.x, gatewayPos.y, 640, "Sine.easeInOut", true);
      this.time.delayedCall(220, () => {
        for (let i = 0; i < 3; i++) {
          const ring = this.add
            .circle(
              gatewayPos.x,
              gatewayPos.y,
              42 + i * 12,
              COLORS.CYAN_GLOW,
              0,
            )
            .setStrokeStyle(3, COLORS.CYAN_GLOW, 0.62 - i * 0.12)
            .setDepth(4);
          this.tweens.add({
            targets: ring,
            radius: ring.radius + 24,
            alpha: 0,
            duration: 760,
            delay: i * 110,
            ease: "Sine.easeOut",
            onComplete: () => ring.destroy(),
          });
        }
      });
    } else {
      camera.flash(220, 6, 182, 212);
    }

    this.time.delayedCall(this.prefersReducedMotion() ? 260 : 920, () => {
      this.startTwinRiversClosureDialogue(() => {
        this.twinRiversClosureInProgress = false;
        if (!this.hasShutdown) {
          this.player.unfreeze();
          camera.startFollow(
            playerSprite,
            true,
            CAMERA_TUNING.FOLLOW_LERP,
            CAMERA_TUNING.FOLLOW_LERP,
          );
          this.hud.setObjectiveHint(
            "Objective: Turn back for credits, step east into beta, or replay any river trial.",
          );
        }
      });
    });
  }

  private startTwinRiversClosureDialogue(onEnd: () => void): void {
    const tree: DialogueTree = {
      startNodeId: "complete",
      nodes: [
        {
          id: "complete",
          speaker: "River Guide",
          text: [
            "Twin Rivers is complete. The Mirror Serpent has folded back into the current.",
            "The path from the first chamber through these waters is now a whole polished arc.",
            "Beyond the mountain gate is beta ground. You can step forward, replay trials, or turn back and let the preview close here.",
            "Thanks for playing this demo of Algorithmia: The Path of Logic.",
          ],
        },
      ],
    };

    this.dialogueSystem.startDialogue(tree, "twin_rivers_closure", () => {
      // Commit the persistent flag only after the player actually saw the dialogue.
      gameState.setFlag("twin_rivers_closure_done", true);
      onEnd();
    });
  }

  private syncTwinRiversObjectiveHint(): void {
    if (this.hasShutdown) return;

    const riverIds = ["tr_1", "tr_2", "tr_3", "tr_4"] as const;
    const done = riverIds.filter((id) =>
      gameState.isPuzzleCompleted(id),
    ).length;

    let line = "";
    if (this.twinRiversClosureInProgress) {
      line =
        "Objective: Twin Rivers is complete. The polished arc ends at the mountain gate.";
    } else if (gameState.getFlag("twin_rivers_closure_done")) {
      line =
        "Objective: Turn back for credits, step east into beta, or replay any river trial.";
    } else if (
      gameState.isPuzzleCompleted("boss_mirror_serpent") &&
      gameState.getFlag("hash_highlands_gateway_open")
    ) {
      line =
        "Objective: Twin Rivers is complete. The polished arc ends at the mountain gate.";
    } else if (!this.sequenceSolved) {
      // FEEL→NAME: don't name "pointer order" or hand over the answer —
      // the stones' glow feedback teaches the order through play.
      line =
        "Objective: Four humming stones guard the bend. Find the order the river wants.";
    } else if (done < 4) {
      line = `Objective: Clear the four river trials (${done}/4), then face the Mirror Serpent.`;
    } else if (!gameState.isPuzzleCompleted("boss_mirror_serpent")) {
      line =
        "Objective: Challenge the Mirror Serpent beyond the deep-water gate.";
    } else if (!gameState.getFlag("hash_highlands_gateway_open")) {
      line =
        "Objective: Finish the serpent — the mountain gate opens when the waters settle.";
    } else {
      line =
        "Objective: Continue to Hash Highlands eastward, replay trials, or return to Array Plains.";
    }

    this.hud.setObjectiveHint(line);
  }

  private checkSequencePuzzle(px: number, py: number): void {
    if (this.sequenceSolved) return;

    for (let i = 0; i < this.sequenceTiles.length; i++) {
      const tile = this.sequenceTiles[i];
      const dist = Phaser.Math.Distance.Between(px, py, tile.x, tile.y);

      if (dist < 24) {
        if (!tile.getData("active")) {
          tile.setData("active", true);

          if (i === this.pointerSequence[this.currentSequenceIndex]) {
            // Correct step
            tile.setFillStyle(COLORS.SUCCESS, 0.8);
            audioManager.playTone(300 + i * 50, 100, "sine");
            if (!this.prefersReducedMotion()) {
              JuiceSystem.burst(this, tile.x, tile.y, COLORS.SUCCESS, 8, 34);
            }
            this.currentSequenceIndex++;

            if (this.currentSequenceIndex >= this.sequenceTiles.length) {
              this.sequenceSolved = true;
              audioManager.playCorrectTone();

              // Light them all up
              this.sequenceTiles.forEach((t) =>
                t.setFillStyle(COLORS.GOLD_ACCENT, 0.9),
              );

              if (!this.prefersReducedMotion()) {
                JuiceSystem.cameraShake(this, 200, 0.005);
                JuiceSystem.correctBurst(this, tile.x, tile.y);
              }

              this.showFieldNote(
                "System",
                "Outside pointers met in the middle. Twin traversal complete.",
              );
            }
          } else {
            // Out of order
            audioManager.playWrongTone();
            if (!this.prefersReducedMotion()) {
              JuiceSystem.wrongBurst(this, tile.x, tile.y);
              JuiceSystem.cameraShake(this, 80, 0.003);
            }
            this.currentSequenceIndex = 0;
            this.sequenceTiles.forEach((t) => {
              if (t !== tile) t.setData("active", false);
              t.setFillStyle(0x1a1a2e, 0.8);
            });
            tile.setFillStyle(COLORS.ERROR, 0.8);
            this.time.delayedCall(300, () => {
              if (!this.sequenceSolved) tile.setFillStyle(0x1a1a2e, 0.8);
            });
          }
        }
      } else {
        tile.setData("active", false);
      }
    }
  }

  private renderField(): void {
    this.cameras.main.setBackgroundColor(0x0e2f42);
    const bg = this.add
      .image(
        TWIN_RIVERS_WORLD_WIDTH / 2,
        TWIN_RIVERS_WORLD_HEIGHT / 2,
        VISUAL_REVAMP_KEYS.TWIN_RIVERS_BG,
      )
      .setOrigin(0.5)
      .setDepth(0);
    const source = bg.texture.getSourceImage() as HTMLImageElement;
    const coverScale = Math.max(
      TWIN_RIVERS_WORLD_WIDTH / source.width,
      TWIN_RIVERS_WORLD_HEIGHT / source.height,
    );
    bg.setScale(coverScale);
    bg.setAlpha(0.96);

    this.add
      .rectangle(
        0,
        0,
        TWIN_RIVERS_WORLD_WIDTH,
        TWIN_RIVERS_WORLD_HEIGHT,
        0x9be8ff,
        0.035,
      )
      .setOrigin(0)
      .setDepth(0.5);
  }

  private renderRoute(): void {
    // The living map (twin_rivers_living_v1.png) bakes the paths, bridge,
    // and docks into the art — route rects are collision data only.
    this.createWaterFlow();
  }

  private createInteractables(): void {
    this.returnGateway = this.interactablePool.acquire({
      id: "array_plains_gateway",
      type: "portal",
      x: TWIN_RIVERS_CONFIG.exitPoints[0].position.x,
      y: TWIN_RIVERS_CONFIG.exitPoints[0].position.y,
      prompt: "[SPACE] Array Plains",
      locked: false,
      imageByState: {
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_FIELD,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: "unlocked",
      onInteract: () => {
        TransitionManager.swirl(this, SCENE_KEYS.ARRAY_PLAINS, {
          spawnX: 1664,
          spawnY: 664,
        });
      },
    });
    this.interactionSystem.addObject(this.returnGateway);

    const nextExit = TWIN_RIVERS_CONFIG.exitPoints[1];
    const hashHighlandsOpen = gameState.getFlag("hash_highlands_gateway_open");
    this.nextGateway = this.interactablePool.acquire({
      id: "hash_highlands_gateway",
      type: "portal",
      x: nextExit.position.x,
      y: nextExit.position.y,
      prompt: hashHighlandsOpen
        ? "[SPACE] Hash Highlands"
        : "[LOCKED] Defeat Mirror Serpent",
      locked: !hashHighlandsOpen,
      spriteImageKey: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      imageByState: {
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
        locked: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: hashHighlandsOpen ? "unlocked" : "locked",
      onInteract: () => this.enterHashHighlands(),
    });
    this.interactionSystem.addObject(this.nextGateway);

    // River Guide — a living mentor pacing the central band between the
    // rivers. Their dialogue tree advances with the player's progress.
    const guide = new NPC(this, {
      id: "river_guide",
      name: "River Guide",
      type: NPCType.MENTOR,
      spriteKey: VISUAL_REVAMP_KEYS.VILLAGE_ELDER,
      spriteScale: 0.34,
      defaultPosition: {
        x: TWIN_RIVERS_CONFIG.npcs[0].position.x,
        y: TWIN_RIVERS_CONFIG.npcs[0].position.y,
      },
      dialogue: riverGuideIntroDialogue,
      movement: {
        kind: "wander",
        leashRadius: 72,
        pauseMsRange: [2600, 5200],
        canWalk: (point) => isPointOnTwinRiversRoute(point, 4),
      },
    });
    this.livingNPCs.push(guide);
    this.npcBehavior?.registerNPC(guide);
    this.interactionSystem.addNPC(guide);

    this.createPuzzleObjects();
  }

  /** Route NPC interactions: keepers open their trial dialogue, the guide
   *  speaks by progress; objects keep the base behaviour. */
  protected override handleInteract(entry: InteractableEntry): void {
    if (entry.type !== "npc") {
      super.handleInteract(entry);
      return;
    }
    if (!this.canOpenOverlay()) return;

    const npc = entry.target as NPC;
    let tree: DialogueTree | null = null;

    if (npc.config.id === "river_guide") {
      const riverIds = ["tr_1", "tr_2", "tr_3", "tr_4"] as const;
      const done = riverIds.filter((id) =>
        gameState.isPuzzleCompleted(id),
      ).length;
      tree = riverGuideIntroDialogue;
      if (done >= 4) tree = riverGuideCompleteDialogue;
      else if (done >= 2) tree = riverGuideMidDialogue;
    } else {
      const puzzleId = this.npcPuzzleMap[npc.config.id];
      tree = puzzleId
        ? this.getDialogueTreeForPuzzle(puzzleId)
        : npc.config.dialogue;
    }

    if (!tree || tree.nodes.length === 0) return;
    this.player.setInteracting(true);
    this.dialogueSystem.startDialogue(tree, npc.config.id, () => {
      this.player.setInteracting(false);
    });
  }

  private createPuzzleObjects(): void {
    const puzzleMeta: Record<
      string,
      {
        title: string;
        scene: string;
        prompt: string;
        spriteKey?: string;
        name?: string;
      }
    > = {
      tr_1: {
        title: "Mirror Walk",
        scene: SCENE_KEYS.PUZZLE_TR_1,
        prompt: "[SPACE] Speak with Mirror Walker",
        spriteKey: VISUAL_REVAMP_KEYS.MIRROR_WALKER,
        name: "Mirror Walker",
      },
      tr_2: {
        title: "Pointer Bridge",
        scene: SCENE_KEYS.PUZZLE_TR_2,
        prompt: "[SPACE] Speak with Bridge Keeper",
        spriteKey: VISUAL_REVAMP_KEYS.BRIDGE_KEEPER,
        name: "Bridge Keeper",
      },
      tr_3: {
        title: "Fixed Window Dock",
        scene: SCENE_KEYS.PUZZLE_TR_3,
        prompt: "[SPACE] Speak with Window Fisher",
        spriteKey: VISUAL_REVAMP_KEYS.WINDOW_FISHER,
        name: "Window Fisher",
      },
      tr_4: {
        title: "Current Rider",
        scene: SCENE_KEYS.PUZZLE_TR_4,
        prompt: "[SPACE] Speak with Current Rider",
        spriteKey: VISUAL_REVAMP_KEYS.CURRENT_RIDER,
        name: "Current Rider",
      },
      boss_mirror_serpent: {
        title: "Mirror Serpent",
        scene: SCENE_KEYS.BOSS_MIRROR_SERPENT,
        prompt: "[SPACE] Challenge",
      },
    };

    for (const puzzle of TWIN_RIVERS_CONFIG.puzzles) {
      const meta = puzzleMeta[puzzle.id];
      if (!meta) continue;

      const completed = gameState.isPuzzleCompleted(puzzle.id);
      const isBoss = puzzle.id === "boss_mirror_serpent";

      if (isBoss) {
        const object = this.interactablePool.acquire({
          id: puzzle.id,
          type: "portal",
          x: puzzle.position.x,
          y: puzzle.position.y,
          prompt: completed ? "[SPACE] Replay" : meta.prompt,
          locked: false,
          imageByState: { unlocked: VISUAL_REVAMP_KEYS.PORTAL_WATER },
          imageScale: 0.24,
          imageOriginY: 0.84,
          initialState: "unlocked",
          onInteract: () => this.startPuzzle(meta.scene),
        });
        this.puzzleObjects.push(object);
        this.interactionSystem.addObject(object);
        continue;
      }

      // The keeper IS the trial here: a living NPC at their landmark
      // (court, bridge landing, dock, rapids), wandering on a short leash.
      // Floating title plaques are retired — the NPC name tag on approach
      // and the landmark architecture do the wayfinding.
      const npc = new NPC(this, {
        id: puzzle.id,
        name: meta.name ?? meta.title,
        type: NPCType.VILLAGER,
        spriteKey: meta.spriteKey ?? VISUAL_REVAMP_KEYS.VILLAGE_ELDER,
        spriteScale: 0.34,
        defaultPosition: { x: puzzle.position.x, y: puzzle.position.y },
        dialogue: this.getDialogueTreeForPuzzle(puzzle.id) ?? {
          startNodeId: "",
          nodes: [],
        },
        movement: {
          kind: "wander",
          leashRadius: 52,
          canWalk: (point) => isPointOnTwinRiversRoute(point, 4),
        },
      });
      this.npcPuzzleMap[puzzle.id] = puzzle.id;
      this.livingNPCs.push(npc);
      this.npcBehavior?.registerNPC(npc);
      this.interactionSystem.addNPC(npc);
    }
  }

  /**
   * The stepping stones to the stone-circle island — Twin Rivers' mastery
   * gate (docs/VISION.md §2). Two-pointer mastery (TR-1) teaches your feet
   * to walk both ends; the stones answer by surfacing in pairs.
   */
  private createSteppingStones(): void {
    if (this.stonesUnlocked) return;

    const sx = TWIN_RIVERS_STONES_RECT.x + 18;
    const sy = TWIN_RIVERS_STONES_RECT.y + TWIN_RIVERS_STONES_RECT.height / 2;

    this.stonesGate = this.interactablePool.acquire({
      id: "tr_stepping_stones",
      type: "gate",
      x: sx,
      y: sy,
      prompt: gameState.isPuzzleCompleted("tr_1")
        ? "[SPACE] Cross the stones"
        : "[SPACE] Study the stones",
      locked: true,
      onInteract: () => this.onStonesInteract(),
    });
    this.puzzleObjects.push(this.stonesGate);
    this.interactionSystem.addObject(this.stonesGate);
  }

  private onStonesInteract(): void {
    if (this.stonesUnlocked) return;

    if (!gameState.isPuzzleCompleted("tr_1")) {
      this.showFieldNote("Bit", [
        "Sunken stones, half-drowned. They surface and sink in PAIRS — one near, one far.",
        "Bit watches them rise and fall, then looks at your feet.",
      ]);
      return;
    }

    // The unlock beat: stones surface from both ends toward the middle —
    // the two-pointer walk, performed by the river itself.
    this.player.setInteracting(true);
    const rect = TWIN_RIVERS_STONES_RECT;
    const stoneCount = 6;
    const stones: Phaser.GameObjects.Ellipse[] = [];
    for (let i = 0; i < stoneCount; i++) {
      const t = i / (stoneCount - 1);
      const stone = this.add
        .ellipse(
          rect.x + 12 + t * (rect.width - 24),
          rect.y + rect.height / 2,
          26,
          16,
          0x8fa3ad,
        )
        .setStrokeStyle(2, 0x3d5159)
        .setDepth(2)
        .setAlpha(0)
        .setScale(0.4);
      stones.push(stone);
    }
    // Surface order: outside-in pairs (0,5), (1,4), (2,3).
    const order = [0, stoneCount - 1, 1, stoneCount - 2, 2, stoneCount - 3];
    order.forEach((stoneIndex, step) => {
      this.tweens.add({
        targets: stones[stoneIndex],
        alpha: 1,
        scale: 1,
        duration: 360,
        delay: 300 * Math.floor(step / 2) + (step % 2) * 90,
        ease: "Back.easeOut",
        onStart: () => audioManager.playTone(420 + step * 40, 80, "sine"),
      });
    });

    this.time.delayedCall(300 * 3 + 700, () => {
      this.stonesUnlocked = true;
      gameState.setFlag("tr_stones_unlocked", true);
      audioManager.playCorrectTone();
      JuiceSystem.correctBurst(
        this,
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      a11yManager.announce(
        "The stepping stones have surfaced. The island is reachable.",
        true,
      );
      this.showFieldNote(
        "Bit",
        "Both ends, walking toward the middle. The river understood you.",
      );
      if (this.stonesGate) {
        this.interactionSystem.removeObject(this.stonesGate);
        this.puzzleObjects = this.puzzleObjects.filter(
          (o) => o !== this.stonesGate,
        );
        this.interactablePool.release(this.stonesGate);
        this.stonesGate = null;
      }
      this.player.setInteracting(false);
    });
  }

  /** The fisher's cove behind the reeds — the south loop's hidden reward. */
  private createCoveSecret(): void {
    const hut = this.interactablePool.acquire({
      id: "tr_fisher_cove",
      type: "sign",
      x: 1460,
      y: 1030,
      prompt: "[SPACE] Peek into the hut",
      locked: false,
      onInteract: () => {
        if (!gameState.getFlag("tr_cove_found")) {
          gameState.setFlag("tr_cove_found", true);
          JuiceSystem.correctBurst(this, 1460, 1030);
          audioManager.playCorrectTone();
          this.showFieldNote("Fisher's Hut", [
            "Behind the reeds: a hut nobody mentions, beside a pond that glows faintly.",
            'Inside, a net hangs with exactly one knot repaired. A note: "THE RIVER ONLY LOOKS LIKE TWO. WALK BOTH AND SEE."',
            "Bit dims its light, as if to listen to the water.",
          ]);
          return;
        }
        this.showFieldNote(
          "Fisher's Hut",
          "The pond glows. The reeds keep your secret.",
        );
      },
    });
    this.puzzleObjects.push(hut);
    this.interactionSystem.addObject(hut);
  }

  private createWaterFlow(): void {
    if (this.prefersReducedMotion()) return;

    // Flow streaks ride the two rivers of the living map: the upper river
    // band (~y 330) and the lower river band (~y 960).
    for (const y of [330, 960]) {
      for (let i = 0; i < 8; i++) {
        const stream = this.add
          .rectangle(
            280 + i * 180,
            y + Phaser.Math.Between(-14, 14),
            88,
            3,
            COLORS.CYAN_GLOW,
            0.22,
          )
          .setDepth(2);
        this.tweens.add({
          targets: stream,
          x: stream.x + 132,
          alpha: 0.06,
          duration: Phaser.Math.Between(1300, 2100),
          repeat: -1,
          yoyo: true,
          ease: "Sine.easeInOut",
          delay: i * 95,
        });
      }
    }
  }

  /** Twin Rivers also blocks overlays during the beta-gate modal and closure beat. */
  protected canOpenOverlay(): boolean {
    return (
      super.canOpenOverlay() &&
      !this.closeBetaGateModal &&
      !this.twinRiversClosureInProgress
    );
  }

  private isPlayerStepWalkable(point: { x: number; y: number }): boolean {
    if (isTwinRiversStepWalkable(point, this.getCollisionBlockers(), 0))
      return true;
    // The stepping stones join the walkable world once two-pointer mastery
    // surfaced them (docs/VISION.md §2 — algorithms unlock traversal).
    if (this.stonesUnlocked) {
      const s = TWIN_RIVERS_STONES_RECT;
      return (
        point.x >= s.x &&
        point.x <= s.x + s.width &&
        point.y >= s.y &&
        point.y <= s.y + s.height
      );
    }
    return false;
  }

  private getCollisionBlockers(): TwinRiversCollisionBlocker[] {
    const blockers: TwinRiversCollisionBlocker[] = [];
    if (this.returnGateway) blockers.push(this.returnGateway.getPosition());
    if (this.nextGateway) blockers.push(this.nextGateway.getPosition());
    for (const object of this.puzzleObjects)
      blockers.push(object.getPosition());
    return blockers;
  }

  private enterHashHighlands(): void {
    if (!gameState.getFlag("hash_highlands_gateway_open")) {
      audioManager.playWrongTone();
      this.showFieldNote(
        "River Guide",
        "The mountain road opens after the Mirror Serpent is defeated.",
      );
      return;
    }

    const transit = () =>
      TransitionManager.swirl(this, SCENE_KEYS.HASH_HIGHLANDS, {
        spawnX: 192,
        spawnY: 448,
      });

    if (gameState.getFlag("beta_warning_seen")) {
      transit();
      return;
    }

    this.openBetaGateModal(transit);
  }

  /**
   * In-universe warning that the regions past Twin Rivers are beta content.
   * Shown once per save (gated by the `beta_warning_seen` flag) regardless of choice —
   * either picking "Turn Back" or "Walk Anyway" sets the flag so the player isn't
   * nagged on subsequent crossings.
   */
  private openBetaGateModal(onContinue: () => void): void {
    if (this.closeBetaGateModal) return;

    const { width, height } = this.cameras.main;
    const PANEL_W = 560;
    const PANEL_H = 320;
    const panelX = Math.round(width / 2 - PANEL_W / 2);
    const panelY = Math.round(height / 2 - PANEL_H / 2);

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.74)
      .setOrigin(0)
      .setDepth(100)
      .setScrollFactor(0);

    const panel = drawPanel(this, panelX, panelY, PANEL_W, PANEL_H, {
      depth: 101,
      scrollFactor: 0,
      inner: COLORS.FRAME_BORDER_LIGHT,
    });

    const title = this.add
      .text(width / 2, panelY + 28, "AN UNSTABLE THRESHOLD", {
        fontSize: "16px",
        fontFamily: FONTS.RETRO,
        color: "#081820",
      })
      .setOrigin(0.5, 0)
      .setDepth(102)
      .setScrollFactor(0);

    const body = this.add
      .text(
        width / 2,
        panelY + 72,
        "Beyond this gate, the world is still being woven.\n\n" +
          "Paths flicker. Walls forget where they stand.\n" +
          "The trials waiting in the mountain and beyond\n" +
          "are not yet complete — some hold, others do not.\n\n" +
          "None of what lies past this gate is required of you.\n" +
          "The path you have walked is whole here.\n\n" +
          "Choose freely, traveler.",
        {
          fontSize: "10px",
          fontFamily: FONTS.RETRO,
          color: "#081820",
          align: "center",
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5, 0)
      .setDepth(102)
      .setScrollFactor(0);

    const choices = ["TURN BACK", "WALK ANYWAY"];
    let selected = 0;

    const choiceTexts = choices.map((label, i) =>
      this.add
        .text(
          panelX + (i === 0 ? 128 : PANEL_W - 128),
          panelY + PANEL_H - 56,
          label,
          {
            fontSize: "12px",
            fontFamily: FONTS.RETRO,
            color: "#081820",
          },
        )
        .setOrigin(0.5)
        .setDepth(102)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true }),
    );

    const renderSelection = () => {
      choiceTexts.forEach((text, i) => {
        const isSelected = i === selected;
        text.setText(
          `${isSelected ? "> " : "  "}${choices[i]}${isSelected ? " <" : "  "}`,
        );
        text.setColor(isSelected ? "#081820" : "#346856");
        text.setBackgroundColor(isSelected ? "#e0f8d0" : "transparent");
        text.setPadding(
          isSelected ? 6 : 0,
          isSelected ? 4 : 0,
          isSelected ? 6 : 0,
          isSelected ? 4 : 0,
        );
      });
    };
    renderSelection();

    const move = (dir: -1 | 1) => {
      selected = (selected + dir + choices.length) % choices.length;
      audioManager.playTone(220, 50, "square");
      renderSelection();
    };
    const onLeft = () => move(-1);
    const onRight = () => move(1);
    const onActivate = () => {
      audioManager.playClickTone();
      const walked = selected === 1;
      this.closeBetaGateModal?.();
      gameState.setFlag("beta_warning_seen", true);
      if (walked) onContinue();
    };

    this.input.keyboard?.on("keydown-LEFT", onLeft);
    this.input.keyboard?.on("keydown-RIGHT", onRight);
    this.input.keyboard?.on("keydown-A", onLeft);
    this.input.keyboard?.on("keydown-D", onRight);
    this.input.keyboard?.on("keydown-ENTER", onActivate);
    this.input.keyboard?.on("keydown-SPACE", onActivate);

    choiceTexts.forEach((text, i) => {
      text.on("pointerover", () => {
        selected = i;
        renderSelection();
      });
      text.on("pointerdown", () => {
        selected = i;
        onActivate();
      });
    });

    const allObjects = [overlay, panel, title, body, ...choiceTexts];

    this.closeBetaGateModal = () => {
      this.input.keyboard?.off("keydown-LEFT", onLeft);
      this.input.keyboard?.off("keydown-RIGHT", onRight);
      this.input.keyboard?.off("keydown-A", onLeft);
      this.input.keyboard?.off("keydown-D", onRight);
      this.input.keyboard?.off("keydown-ENTER", onActivate);
      this.input.keyboard?.off("keydown-SPACE", onActivate);
      for (const obj of allObjects) obj.destroy();
      this.closeBetaGateModal = null;
    };
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  private getDialogueTreeForPuzzle(puzzleId: string): DialogueTree | null {
    const completed = gameState.isPuzzleCompleted(puzzleId);
    switch (puzzleId) {
      case "tr_1":
        return completed ? mirrorWalkerPostDialogue : mirrorWalkerDialogue;
      case "tr_2":
        return completed ? bridgeKeeperPostDialogue : bridgeKeeperDialogue;
      case "tr_3":
        return completed ? windowFisherPostDialogue : windowFisherDialogue;
      case "tr_4":
        return completed ? currentRiderPostDialogue : currentRiderDialogue;
      default:
        return null;
    }
  }

  private checkCameos(): void {
    if (
      gameState.isPuzzleCompleted("tr_1") &&
      !gameState.getFlag("glitch_tr_1_done")
    ) {
      this.runGlitchCameo(
        "tr_1",
        glitchTR1Dialogue,
        604,
        384,
        "glitch_tr_1_done",
      );
      return;
    }
    if (
      gameState.isPuzzleCompleted("tr_3") &&
      !gameState.getFlag("glitch_tr_3_done")
    ) {
      this.runGlitchCameo(
        "tr_3",
        glitchTR3Dialogue,
        1068,
        384,
        "glitch_tr_3_done",
      );
      return;
    }
  }

  private runGlitchCameo(
    puzzleId: string,
    dialogueTree: DialogueTree,
    spawnX: number,
    spawnY: number,
    flagKey: string,
  ): void {
    this.player.setInteracting(true);

    const cameoGlitch = new GlitchRival(this);
    cameoGlitch.spawnIn(spawnX, spawnY, () => {
      this.dialogueSystem.startDialogue(
        dialogueTree,
        `glitch_cameo_${puzzleId}`,
        () => {
          cameoGlitch.exit(() => {
            cameoGlitch.destroy();
            this.player.setInteracting(false);
            this.syncTwinRiversObjectiveHint();
          });
          gameState.setFlag(flagKey, true);
        },
      );
    });
  }

  shutdown(): void {
    this.hasShutdown = true;
    eventBus.off("dialogue:action", this.onDialogueAction, this);
    this.input.keyboard?.off("keydown-ESC", this.onEscPause);
    this.input.keyboard?.off("keydown-C", this.onOpenCodex);
    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.hud?.destroy();
    if (this.returnGateway) {
      this.interactablePool.release(this.returnGateway);
      this.returnGateway = null;
    }
    if (this.nextGateway) {
      this.interactablePool.release(this.nextGateway);
      this.nextGateway = null;
    }
    this.stonesGate = null; // released with puzzleObjects below
    for (const object of this.puzzleObjects)
      this.interactablePool.release(object);
    this.puzzleObjects = [];
    for (const label of this.labelObjects) label.destroy();
    this.labelObjects = [];
    for (const npc of this.livingNPCs) npc.destroy();
    this.livingNPCs = [];
    this.npcPuzzleMap = {};
    this.npcBehavior?.destroy();
    this.npcBehavior = null;
    this.bit?.destroy();
    this.player?.destroy();
  }
}
