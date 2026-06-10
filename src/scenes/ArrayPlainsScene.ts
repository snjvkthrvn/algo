import Phaser from 'phaser';
import { ARRAY_PLAINS_SCENE_IMAGE_ASSETS, ARRAY_PLAINS_SCENE_SPRITE_ASSETS, VISUAL_REVAMP_KEYS } from '../config/assets';
import { COLORS, FONTS, REGIONS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { eventBus } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import { TransitionManager } from '../core/TransitionManager';
import { BitCompanion } from '../entities/BitCompanion';
import { GlitchRival } from '../entities/GlitchRival';
import { InteractableObject } from '../entities/InteractableObject';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import {
  ARRAY_PLAINS_BRIDGE_RECT,
  ARRAY_PLAINS_CONFIG,
  ARRAY_PLAINS_WORLD_HEIGHT,
  ARRAY_PLAINS_WORLD_WIDTH,
  isArrayPlainsStepWalkable,
  isPointOnArrayPlainsRoute,
  type ArrayPlainsCollisionBlocker,
} from '../data/regions/arrayPlains';
import { DialogueSystem } from '../systems/DialogueSystem';
import { HUDManager } from '../systems/HUDManager';
import { JuiceSystem } from '../systems/JuiceSystem';
import { OverworldAmbience } from '../ui/OverworldAmbience';
import { InteractionSystem, type InteractableEntry } from '../systems/InteractionSystem';
import { NPCBehaviorSystem } from '../systems/NPCBehaviorSystem';
import { progressionSystem } from '../systems/ProgressionSystem';
import { a11yManager } from '../core/A11yManager';
import { NPCType, type DialogueTree } from '../data/types';
import { setupUICamera } from '../utils/uiCamera';
import { ObjectPool } from '../utils/ObjectPool';
import { openPauseOverlay } from './titleNavigation';
import { BaseOverworldScene } from './BaseOverworldScene';
import { placeRegionProps } from '../ui/RegionProps';
import {
  sortingFarmerDialogue,
  sortingFarmerPostDialogue,
  basketKeeperDialogue,
  basketKeeperPostDialogue,
  cropSorterDialogue,
  cropSorterPostDialogue,
  tileWorkerDialogue,
  tileWorkerPostDialogue,
} from '../data/dialogue/array_plains_dialogue';
import {
  GLITCH_DIALOGUE,
  GLITCH_EXIT_LINES,
  glitchAP1Dialogue,
  glitchAP4Dialogue,
} from '../data/dialogue/glitch_dialogue';

export class ArrayPlainsScene extends BaseOverworldScene {
  private returnGateway: InteractableObject | null = null;
  private twinRiversGateway: InteractableObject | null = null;
  private shufflerGate: InteractableObject | null = null;
  private bridgeGate: InteractableObject | null = null;
  private markerObjects: InteractableObject[] = [];
  private puzzleObjects: InteractableObject[] = [];
  private onDialogueAction!: (...args: unknown[]) => void;

  /** Living-world cast (docs/VISION.md §2): keepers wander their posts. */
  private npcBehavior: NPCBehaviorSystem | null = null;
  private livingNPCs: NPC[] = [];
  /** NPC id → puzzle id, for dialogue routing on interact. */
  private npcPuzzleMap: Record<string, string> = {};
  /** True once the sorting-mastery bridge repair has run (flag-backed). */
  private bridgeRepaired = false;

  // Overworld sequence puzzle
  private sequenceTiles: Phaser.GameObjects.Rectangle[] = [];
  private currentSequenceIndex = 0;
  private sequenceSolved = false;


  // Glitch cameo (Stage 3 — first AP visit after Sentinel)
  private glitch: GlitchRival | null = null;
  private glitchSpawnPos = { x: 1240, y: 664 };
  private glitchProximityTriggered = false;

  private readonly onEscPause = () => {
    if (this.dialogueSystem?.isDialogueActive()) return;
    openPauseOverlay(this, SCENE_KEYS.ARRAY_PLAINS);
  };
  private readonly onOpenCodex = () => this.openCodex();

  constructor() {
    super({ key: SCENE_KEYS.ARRAY_PLAINS });
  }

  protected getRegionImageAssets(): ReadonlyArray<{ key: string; path: string }> {
    return ARRAY_PLAINS_SCENE_IMAGE_ASSETS;
  }

  protected override getRegionSpriteSheetAssets() {
    return ARRAY_PLAINS_SCENE_SPRITE_ASSETS;
  }

  create(): void {
    this.hasShutdown = false;
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
    // Drifting pollen, dust motes, and a couple of butterflies layered over
    // the static pixel-art tilemap. Scroll factor 0 so the ambience sits in
    // screen space; the player never out-runs the atmosphere.
    new OverworldAmbience(this, 'farmland', { intensity: 0.85 });
    // Static + animated farm props (Phase 10): pecking chickens, scarecrow,
    // hay bale + cat, watering can. World-space — they sit at fixed
    // positions and parallax with the player like any other entity.
    // Depth 1-3 keeps them below the player (depth ~4) for correct silhouette.
    placeRegionProps(this, 'array_plains');

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
    this.npcBehavior = new NPCBehaviorSystem();
    this.bridgeRepaired = gameState.getFlag('ap_bridge_repaired');

    this.onDialogueAction = ((...args: unknown[]) => {
      const data = args[0] as { type: string; value: string };
      if (data.type === 'start_puzzle') {
        const puzzleId = data.value;
        const puzzleLabels: Record<string, string> = {
          ap_1: SCENE_KEYS.PUZZLE_AP_1,
          ap_2: SCENE_KEYS.PUZZLE_AP_2,
          ap_3: SCENE_KEYS.PUZZLE_AP_3,
          ap_4: SCENE_KEYS.PUZZLE_AP_4,
        };
        const sceneKey = puzzleLabels[puzzleId];
        if (sceneKey) {
          this.player.setInteracting(false);
          this.startPuzzle(sceneKey);
        }
      }
    });
    eventBus.on('dialogue:action', this.onDialogueAction, this);

    this.createInteractables();
    this.createFarmerNPCs();
    this.createBridgeGate();
    this.createGroveShrine();
    this.renderPortalHaloes();
    this.createSequencePuzzle();
    this.maybeSpawnGlitchCameo();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));
    eventBus.on('progression:gate-open', this.onGateOpen, this);

    this.hud = new HUDManager(this);
    setupUICamera(this);

    this.setupOverworldCamera(ARRAY_PLAINS_WORLD_WIDTH, ARRAY_PLAINS_WORLD_HEIGHT);

    this.playEntranceFade();
    this.hud.showRegionCard('Array Plains', 'Where order becomes addressable.');
    this.input.keyboard?.on('keydown-ESC', this.onEscPause);
    this.input.keyboard?.on('keydown-C', this.onOpenCodex);

    this.checkCameos();
  }


  private createSequencePuzzle(): void {
    // Index stones sit on the main road just east of the spawn — the
    // region's first footsteps walk straight across them.
    const startX = 480;
    const startY = 672;
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

  update(time: number, delta: number): void {
    const dialogueActive = this.dialogueSystem?.isDialogueActive() ?? false;
    if (!dialogueActive) {
      this.player.update(time, delta);
    }

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y, delta);
    const canInteract = !dialogueActive && this.time.now >= this.interactionEnabledTime;
    this.interactionSystem.update(canInteract);
    this.npcBehavior?.update(time);
    if (pos.x !== this.lastPlayerX || pos.y !== this.lastPlayerY) {
      gameState.setPlayerPosition(pos.x, pos.y);
      this.lastPlayerX = pos.x;
      this.lastPlayerY = pos.y;
      this.checkSequencePuzzle(pos.x, pos.y);
      this.maybeTriggerGlitchDialogue(pos.x, pos.y);
    }

    this.syncArrayPlainsObjectiveHint();
  }

  /**
   * Place 4 named farmer NPCs alongside their puzzle shrines. Each farmer's intro
   * line frames the algorithmic problem; their post-puzzle thanks line ties the
   * felt experience back to the concept name (matches the FEEL → NAME teaching arc).
   *
   * Uses PROP_FIELD_SIGN as a placeholder sprite — bespoke farmer sprites are
   * queued as a follow-up imagegen pass once concurrent Codex work clears.
   */
  private createFarmerNPCs(): void {
    const farmers: Array<{
      farmerId: string;
      puzzleId: string;
      name: string;
      intro: string;
      thanks: string;
      spriteKey: string;
    }> = [
      {
        farmerId: 'farmer_sorter',
        puzzleId: 'ap_1',
        name: 'Sorting Farmer',
        intro: 'My furrows are tangled. Compare each pair of neighbors — swap the ones in the wrong order. Eventually the row settles.',
        thanks: 'Sorted! Compare and swap. Simple, but the field knows the order now.',
        spriteKey: VISUAL_REVAMP_KEYS.SORTING_FARMER,
      },
      {
        farmerId: 'farmer_basket',
        puzzleId: 'ap_2',
        name: 'Basket Keeper',
        intro: 'I keep losing my tools. If I just knew the basket number, I could go straight to it instead of rummaging.',
        thanks: 'Right to the slot. Index is everything once you know the address.',
        spriteKey: VISUAL_REVAMP_KEYS.BASKET_KEEPER,
      },
      {
        farmerId: 'farmer_crop',
        puzzleId: 'ap_3',
        name: 'Crop Sorter',
        intro: 'A hundred crops, only four bins. There must be a rule that sends every crop to the same place every time.',
        thanks: 'Every crop hashed to its bin. The formula did the thinking for us.',
        spriteKey: VISUAL_REVAMP_KEYS.CROP_SORTER,
      },
      {
        farmerId: 'farmer_tile',
        puzzleId: 'ap_4',
        name: 'Tile Worker',
        intro: "These tiles come in pairs that sum to my target. For any tile I pick, the only partner that fits is the complement.",
        thanks: 'Pairs found, target met. Knowing the complement saved the search.',
        spriteKey: VISUAL_REVAMP_KEYS.TILE_WORKER,
      },
    ];

    // Living NPCs (docs/VISION.md §2): the keepers wander their own yards,
    // pause to talk, and resume. No more `type: 'sign'` text dispensers and
    // no floating name plaques — the NPC's own name tag appears on approach.
    for (const farmer of farmers) {
      const puzzle = ARRAY_PLAINS_CONFIG.puzzles.find((p) => p.id === farmer.puzzleId);
      if (!puzzle) continue;
      const x = puzzle.position.x - 72;
      const y = puzzle.position.y + 16;

      const npc = new NPC(this, {
        id: farmer.farmerId,
        name: farmer.name,
        type: NPCType.VILLAGER,
        spriteKey: farmer.spriteKey,
        spriteScale: 0.34,
        defaultPosition: { x, y },
        dialogue: this.getDialogueTreeForPuzzle(farmer.puzzleId) ?? { startNodeId: '', nodes: [] },
        movement: {
          kind: 'wander',
          leashRadius: 56,
          canWalk: (point) => isPointOnArrayPlainsRoute(point, 4),
        },
      });
      this.npcPuzzleMap[farmer.farmerId] = farmer.puzzleId;
      this.livingNPCs.push(npc);
      this.npcBehavior?.registerNPC(npc);
      this.interactionSystem.addNPC(npc);
    }
  }

  /** Route NPC interactions to the right keeper dialogue; objects keep the
   *  base behaviour. */
  protected override handleInteract(entry: InteractableEntry): void {
    if (entry.type !== 'npc') {
      super.handleInteract(entry);
      return;
    }
    if (!this.canOpenOverlay()) return;

    const npc = entry.target as NPC;
    const puzzleId = this.npcPuzzleMap[npc.config.id];
    const tree = puzzleId
      ? this.getDialogueTreeForPuzzle(puzzleId)
      : npc.config.dialogue;
    if (!tree || tree.nodes.length === 0) return;

    this.player.setInteracting(true);
    this.dialogueSystem.startDialogue(tree, npc.config.id, () => {
      this.player.setInteracting(false);
    });
  }

  /**
   * The broken plank bridge over the hopper stream — the script's HM
   * parallel made real: sorting mastery repairs it. Before AP-1 is solved
   * the planks just lie scattered; after, interacting plays the repair
   * beat (planks assemble shortest-to-tallest, because of course they do)
   * and the crossing becomes walkable for the rest of the save.
   */
  private createBridgeGate(): void {
    const bx = ARRAY_PLAINS_BRIDGE_RECT.x + ARRAY_PLAINS_BRIDGE_RECT.width / 2;
    const by = ARRAY_PLAINS_BRIDGE_RECT.y + ARRAY_PLAINS_BRIDGE_RECT.height / 2;

    if (this.bridgeRepaired) return; // crossing already open — art shows planks

    // The prompt anchor sits at the bridge's west landing, a step from the
    // hopper-yard edge — close enough for the proximity prompt to fire
    // while the crossing itself stays unwalkable.
    this.bridgeGate = this.interactablePool.acquire({
      id: 'ap_broken_bridge',
      type: 'gate',
      x: ARRAY_PLAINS_BRIDGE_RECT.x + 28,
      y: by,
      prompt: gameState.isPuzzleCompleted('ap_1') ? '[SPACE] Repair bridge' : '[SPACE] Inspect planks',
      locked: true,
      onInteract: () => this.onBridgeInteract(bx, by),
    });
    this.markerObjects.push(this.bridgeGate);
    this.interactionSystem.addObject(this.bridgeGate);
  }

  private onBridgeInteract(bx: number, by: number): void {
    if (this.bridgeRepaired) return;

    if (!gameState.isPuzzleCompleted('ap_1')) {
      this.showFieldNote('Bit', [
        'Scattered planks. Short ones, long ones — all jumbled.',
        'Bit hovers over them, dims, and looks at you. They seem to WANT an order.',
      ]);
      return;
    }

    // The repair beat: planks rise and settle shortest to tallest. The
    // mechanic the player mastered IS the thing fixing the world.
    this.player.setInteracting(true);
    const plankLengths = [18, 26, 34, 42, 50];
    const planks: Phaser.GameObjects.Rectangle[] = plankLengths.map((len, i) =>
      this.add
        .rectangle(bx - 48 + i * 24, by + 20, len, 8, 0x8a5a2a)
        .setStrokeStyle(1, 0x3b2510)
        .setDepth(3)
        .setAngle(Phaser.Math.Between(-40, 40)),
    );

    planks.forEach((plank, i) => {
      this.tweens.add({
        targets: plank,
        angle: 0,
        x: bx - 48 + i * 24,
        y: by - 4,
        duration: 420,
        delay: 280 * i,
        ease: 'Back.easeOut',
        onStart: () => audioManager.playTone(320 + i * 60, 90, 'square'),
        onComplete: () => {
          JuiceSystem.burst(this, plank.x, plank.y, 0xfbbf24, 4, 18);
        },
      });
    });

    this.time.delayedCall(280 * plankLengths.length + 500, () => {
      this.bridgeRepaired = true;
      gameState.setFlag('ap_bridge_repaired', true);
      audioManager.playCorrectTone();
      JuiceSystem.correctBurst(this, bx, by);
      a11yManager.announce('The bridge is repaired. The stream crossing is open.', true);
      this.showFieldNote('Bit', 'Shortest to tallest — the planks remember order now. The crossing holds.');
      if (this.bridgeGate) {
        this.interactionSystem.removeObject(this.bridgeGate);
        this.markerObjects = this.markerObjects.filter((o) => o !== this.bridgeGate);
        this.interactablePool.release(this.bridgeGate);
        this.bridgeGate = null;
      }
      this.player.setInteracting(false);
    });
  }

  /**
   * The hidden grove shrine in the northeast wheat (docs/VISION.md §2:
   * secrets reward wandering). One-time discovery beat, then it stays as
   * quiet lore.
   */
  private createGroveShrine(): void {
    const shrine = this.interactablePool.acquire({
      id: 'ap_grove_shrine',
      type: 'sign',
      x: 1492,
      y: 220,
      prompt: '[SPACE] Touch the old stone',
      locked: false,
      onInteract: () => {
        if (!gameState.getFlag('ap_grove_found')) {
          gameState.setFlag('ap_grove_found', true);
          JuiceSystem.correctBurst(this, 1492, 220);
          audioManager.playCorrectTone();
          this.showFieldNote('Old Stone', [
            'You found the grove the wheat keeps hidden.',
            'Carved into the stone, worn almost smooth: "BEFORE THE FIRST SORT, THE WORLD WAS ONLY NOISE."',
            'Bit spins once, slowly, like a held breath.',
          ]);
          return;
        }
        this.showFieldNote('Old Stone', 'The grove is quiet. The wheat keeps its secret with you now.');
      },
    });
    this.markerObjects.push(shrine);
    this.interactionSystem.addObject(shrine);
  }

  /**
   * Stage 3 Glitch encounter. Fires once per save, only after the Sentinel boss
   * has been defeated (Bit has visibly evolved by then, which is what triggers
   * Glitch's dialogue beat about Bit "looking different").
   */
  private maybeSpawnGlitchCameo(): void {
    if (!gameState.isPuzzleCompleted('boss_sentinel')) return;
    if (gameState.getFlag('glitch_encounter_3_done')) return;
    if (this.glitch) return;

    this.glitch = new GlitchRival(this);
    this.glitch.spawnIn(this.glitchSpawnPos.x, this.glitchSpawnPos.y, () => {
      // Glitch idles in the field; trigger fires when the player walks close.
    });
  }

  /** Proximity check — opens the Stage 3 dialogue when the player walks near Glitch. */
  private maybeTriggerGlitchDialogue(px: number, py: number): void {
    if (!this.glitch || this.glitchProximityTriggered) return;
    if (this.dialogueSystem.isDialogueActive()) return;
    const dist = Phaser.Math.Distance.Between(px, py, this.glitchSpawnPos.x, this.glitchSpawnPos.y);
    if (dist > 96) return;

    this.glitchProximityTriggered = true;

    const lines = GLITCH_DIALOGUE[3];
    const exitLine = GLITCH_EXIT_LINES[2 % GLITCH_EXIT_LINES.length];

    // Per-line nodes so the Narrator aside reads in its own attributed bubble
    // instead of being misattributed to Glitch.
    const tree: DialogueTree = {
      startNodeId: 'glitch_ap_0',
      nodes: [
        ...lines.map((l, i) => ({
          id: `glitch_ap_${i}`,
          speaker: l.speaker ?? 'Glitch',
          text: l.text,
          nextNodeId: `glitch_ap_${i + 1}`,
        })),
        {
          id: `glitch_ap_${lines.length}`,
          speaker: 'Glitch',
          text: exitLine,
        },
      ],
    };

    this.dialogueSystem.startDialogue(tree, 'glitch_ap_encounter', () => {
      this.glitch?.exit(() => {
        this.glitch?.destroy();
        this.glitch = null;
      });
      gameState.setFlag('glitch_encounter_3_done', true);
    });
  }

  private syncArrayPlainsObjectiveHint(): void {
    if (this.hasShutdown) return;

    let line = '';
    if (!this.sequenceSolved) {
      line =
        'Objective: Step on the index tiles in order — 0, then 1, 2, 3 — along the lit path.';
    } else {
      const farmersDone = ['ap_1', 'ap_2', 'ap_3', 'ap_4'].filter((id) =>
        gameState.isPuzzleCompleted(id),
      ).length;
      if (farmersDone < 4) {
        line = `Objective: Restore all four field shrines (${farmersDone}/4). The Shuffler gate opens when every field is done.`;
      } else if (!gameState.isPuzzleCompleted('boss_shuffler')) {
        line = 'Objective: Enter the Shuffler Domain and win the trial.';
      } else {
        line =
          'Objective: Cross east to Twin Rivers, replay shrines, or take the void gate back to the Chamber.';
      }
    }

    this.hud.setObjectiveHint(line);
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
            if (!this.prefersReducedMotion()) {
              JuiceSystem.burst(this, tile.x, tile.y, COLORS.SUCCESS, 8, 34);
            }
            this.currentSequenceIndex++;

            if (this.currentSequenceIndex >= this.sequenceTiles.length) {
              this.sequenceSolved = true;
              audioManager.playCorrectTone();

              // Light them all up
              this.sequenceTiles.forEach(t => t.setFillStyle(COLORS.GOLD_ACCENT, 0.9));

              if (!this.prefersReducedMotion()) {
                JuiceSystem.cameraShake(this, 200, 0.005);
                JuiceSystem.correctBurst(this, tile.x, tile.y);
              }

              this.showFieldNote('Array Guide', 'The index stones wake in order. The field will let you deeper now.');
            }
          } else if (i > this.currentSequenceIndex) {
            // Out of order
            audioManager.playWrongTone();
            if (!this.prefersReducedMotion()) {
              JuiceSystem.wrongBurst(this, tile.x, tile.y);
              JuiceSystem.cameraShake(this, 80, 0.003);
            }
            this.currentSequenceIndex = 0;
            this.sequenceTiles.forEach(t => {
              if (t !== tile) t.setData('active', false);
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
    // The living map (array_plains_living_v1.png) bakes the roads into the
    // art itself — walkable lanes are readable because they ARE the dirt
    // paths the painter drew. Procedural route surfaces, stop pads, and the
    // scanning cursor are retired with the corridor map; route rects now
    // exist purely as collision data.
  }

  private createInteractables(): void {
    this.returnGateway = this.interactablePool.acquire({
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

    this.twinRiversGateway = this.interactablePool.acquire({
      id: 'twin_rivers_gateway',
      type: 'portal',
      x: ARRAY_PLAINS_CONFIG.exitPoints[1].position.x,
      y: ARRAY_PLAINS_CONFIG.exitPoints[1].position.y,
      prompt: progressionSystem.isTwinRiversGatewayOpen() ? '[SPACE] Twin Rivers' : '[LOCKED] Defeat Shuffler',
      locked: !progressionSystem.isTwinRiversGatewayOpen(),
      imageByState: {
        // Same water-portal sprite either way — the halo + LOCKED label conveys state,
        // so the gate doesn't visually masquerade as a stone boss door when locked.
        locked: VISUAL_REVAMP_KEYS.PORTAL_WATER,
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_WATER,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: progressionSystem.isTwinRiversGatewayOpen() ? 'unlocked' : 'locked',
      onInteract: () => {
        if (progressionSystem.isTwinRiversGatewayOpen()) {
          TransitionManager.swirl(this, SCENE_KEYS.TWIN_RIVERS, { spawnX: 160, spawnY: 624 });
          return;
        }

        this.showFieldNote('Notice', 'The water-road to Twin Rivers is locked until the Shuffler settles.');
      },
    });
    this.interactionSystem.addObject(this.twinRiversGateway);

    const guide = this.interactablePool.acquire({
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

    // Village Elder — a living resident now: paces the main road near the
    // gateway so new arrivals meet them first, and their welcome carries the
    // whole region setup that used to live on a static sign.
    const elderDialogue: DialogueTree = {
      startNodeId: 'elder_0',
      nodes: [
        { id: 'elder_0', speaker: 'Village Elder', text: 'A graduate of the Flow Chamber! Welcome, young seeker.', nextNodeId: 'elder_1' },
        { id: 'elder_1', speaker: 'Village Elder', text: 'Array Plains — where data grows in rows and every element finds its index. Or... it used to.', nextNodeId: 'elder_2' },
        { id: 'elder_2', speaker: 'Village Elder', text: "A chaotic force called the Shuffler has been terrorizing our farmers. Everything's out of order. Tiles scrambled. Tools misplaced. Crops in the wrong bins.", nextNodeId: 'elder_3' },
        { id: 'elder_3', speaker: 'Village Elder', text: 'Four farmers need help — north at the shed and barn, south at the silo and the stone field. Help them all, and the palisade to the Shuffler opens.', nextNodeId: 'elder_4' },
        { id: 'elder_4', speaker: 'Village Elder', text: 'Wander. Poke around. The Plains reward the curious. And... if you ever learn to put things in ORDER, that broken bridge by the silo might remember how to be a bridge.' },
      ],
    };
    const elder = new NPC(this, {
      id: 'village_elder',
      name: 'Village Elder',
      type: NPCType.MENTOR,
      spriteKey: VISUAL_REVAMP_KEYS.VILLAGE_ELDER,
      spriteScale: 0.34,
      defaultPosition: { x: 300, y: 668 },
      dialogue: elderDialogue,
      movement: {
        kind: 'wander',
        leashRadius: 72,
        pauseMsRange: [2600, 5200],
        canWalk: (point) => isPointOnArrayPlainsRoute(point, 4),
      },
    });
    this.livingNPCs.push(elder);
    this.npcBehavior?.registerNPC(elder);
    this.interactionSystem.addNPC(elder);

    ARRAY_PLAINS_CONFIG.interactables.forEach((marker, index) => {
      const object = this.interactablePool.acquire({
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
      const object = this.interactablePool.acquire({
        id: puzzle.id,
        type: 'sign',
        x: puzzle.position.x,
        y: puzzle.position.y,
        prompt: completed ? '[SPACE] Replay' : meta.prompt,
        locked: false,
        spriteImageKey: VISUAL_REVAMP_KEYS.PROP_PUZZLE_SHRINE,
        imageScale: 0.13,
        imageOriginY: 0.84,
        onInteract: () => {
          const tree = this.getDialogueTreeForPuzzle(puzzle.id);
          if (tree) {
            this.player.setInteracting(true);
            this.dialogueSystem.startDialogue(tree, puzzle.id, () => {
              this.player.setInteracting(false);
            });
          }
        },
      });
      this.puzzleObjects.push(object);
      this.interactionSystem.addObject(object);

      const label = this.add.text(puzzle.position.x, puzzle.position.y - 42, meta.title, {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: completed ? '#e0f8d0' : '#081820',
        backgroundColor: completed ? '#346856' : '#e0f8d0',
        padding: { x: 4, y: 3 },
      }).setOrigin(0.5).setDepth(5);
      this.labelObjects.push(label);
    }

    const boss = ARRAY_PLAINS_CONFIG.puzzles.find((puzzle) => puzzle.id === 'boss_shuffler');
    if (!boss) return;

    this.shufflerGate = this.interactablePool.acquire({
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
        this.showFieldNote('Notice', `Shuffler's Domain is sealed. ${progress.puzzles}/4 farmer puzzles complete — restore every field first.`);
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

  private renderPortalHaloes(): void {
    const twinRiversOpen = progressionSystem.isTwinRiversGatewayOpen();
    const portals: Array<{
      x: number;
      y: number;
      label: string;
      color: number;
      locked: boolean;
    }> = [
      {
        x: ARRAY_PLAINS_CONFIG.exitPoints[0].position.x,
        y: ARRAY_PLAINS_CONFIG.exitPoints[0].position.y,
        label: '← PROLOGUE',
        color: 0x88c070,
        locked: false,
      },
      {
        x: ARRAY_PLAINS_CONFIG.exitPoints[1].position.x,
        y: ARRAY_PLAINS_CONFIG.exitPoints[1].position.y,
        label: twinRiversOpen ? 'TWIN RIVERS →' : 'TWIN RIVERS — LOCKED',
        color: twinRiversOpen ? COLORS.CYAN_GLOW : COLORS.FRAME_BORDER_LIGHT,
        locked: !twinRiversOpen,
      },
    ];

    const reducedMotion = this.prefersReducedMotion();

    for (const portal of portals) {
      const baseY = portal.y + 12;
      const alpha = portal.locked ? 0.32 : 0.78;

      // Outer ground glow — large, dim ellipse to anchor the portal in the world
      const outerRing = this.add.graphics().setDepth(1.8);
      outerRing.lineStyle(2, portal.color, alpha * 0.5);
      outerRing.strokeEllipse(portal.x, baseY, 104, 40);
      outerRing.fillStyle(portal.color, alpha * 0.12);
      outerRing.fillEllipse(portal.x, baseY, 104, 40);

      // Inner crisp ring — pixel-snapped accent
      const innerRing = this.add.graphics().setDepth(1.9);
      innerRing.lineStyle(1, portal.color, alpha);
      innerRing.strokeEllipse(portal.x, baseY, 64, 24);

      // Breathing pulse — only when motion is allowed
      if (!reducedMotion) {
        this.tweens.add({
          targets: outerRing,
          alpha: alpha * 0.35,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      // Destination plaque — sits well above the portal art (origin 0.86 means sprite is mostly above y)
      this.add.text(portal.x, portal.y - 176, portal.label, {
        fontSize: '9px',
        fontFamily: FONTS.RETRO,
        color: portal.locked ? '#7a7aaa' : '#e0f8d0',
        backgroundColor: '#081820',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setDepth(5);

      // Orbiting motes — small pulsing dots ringing the base; only on unlocked portals
      if (!portal.locked && !reducedMotion) {
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5;
          const mx = portal.x + Math.cos(angle) * 30;
          const my = baseY + Math.sin(angle) * 11;
          const mote = this.add.circle(mx, my, 1.6, portal.color, 0.85).setDepth(1.95);
          this.tweens.add({
            targets: mote,
            alpha: 0.12,
            duration: 1100 + i * 180,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: i * 90,
          });
        }
      }
    }
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
    if (isArrayPlainsStepWalkable(point, this.getCollisionBlockers(), 0)) return true;
    // The stream crossing joins the walkable world once sorting mastery
    // repaired it (docs/VISION.md §2 — algorithms unlock traversal).
    if (this.bridgeRepaired) {
      const b = ARRAY_PLAINS_BRIDGE_RECT;
      return (
        point.x >= b.x && point.x <= b.x + b.width &&
        point.y >= b.y && point.y <= b.y + b.height
      );
    }
    return false;
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

  private getDialogueTreeForPuzzle(puzzleId: string): DialogueTree | null {
    const completed = gameState.isPuzzleCompleted(puzzleId);
    switch (puzzleId) {
      case 'ap_1': return completed ? sortingFarmerPostDialogue : sortingFarmerDialogue;
      case 'ap_2': return completed ? basketKeeperPostDialogue : basketKeeperDialogue;
      case 'ap_3': return completed ? cropSorterPostDialogue : cropSorterDialogue;
      case 'ap_4': return completed ? tileWorkerPostDialogue : tileWorkerDialogue;
      default: return null;
    }
  }

  private checkCameos(): void {
    if (gameState.isPuzzleCompleted('ap_1') && !gameState.getFlag('glitch_ap_1_done')) {
      this.runGlitchCameo('ap_1', glitchAP1Dialogue, 472, 444, 'glitch_ap_1_done');
      return;
    }
    if (gameState.isPuzzleCompleted('ap_4') && !gameState.getFlag('glitch_ap_4_done')) {
      this.runGlitchCameo('ap_4', glitchAP4Dialogue, 1496, 1060, 'glitch_ap_4_done');
      return;
    }
  }

  private runGlitchCameo(puzzleId: string, dialogueTree: DialogueTree, spawnX: number, spawnY: number, flagKey: string): void {
    this.player.setInteracting(true);

    const cameoGlitch = new GlitchRival(this);
    cameoGlitch.spawnIn(spawnX, spawnY, () => {
      this.dialogueSystem.startDialogue(dialogueTree, `glitch_cameo_${puzzleId}`, () => {
        cameoGlitch.exit(() => {
          cameoGlitch.destroy();
          this.player.setInteracting(false);
          this.syncArrayPlainsObjectiveHint();
        });
        gameState.setFlag(flagKey, true);
      });
    });
  }

  shutdown(): void {
    this.hasShutdown = true;
    eventBus.off('progression:gate-open', this.onGateOpen, this);
    eventBus.off('dialogue:action', this.onDialogueAction, this);
    this.input.keyboard?.off('keydown-ESC', this.onEscPause);
    this.input.keyboard?.off('keydown-C', this.onOpenCodex);

    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.hud?.destroy();

    if (this.returnGateway) { this.interactablePool.release(this.returnGateway); this.returnGateway = null; }
    if (this.twinRiversGateway) { this.interactablePool.release(this.twinRiversGateway); this.twinRiversGateway = null; }
    if (this.shufflerGate) { this.interactablePool.release(this.shufflerGate); this.shufflerGate = null; }
    if (this.bridgeGate) { this.interactablePool.release(this.bridgeGate); this.bridgeGate = null; }

    for (const npc of this.livingNPCs) npc.destroy();
    this.livingNPCs = [];
    this.npcPuzzleMap = {};
    this.npcBehavior?.destroy();
    this.npcBehavior = null;

    for (const object of this.markerObjects) this.interactablePool.release(object);
    this.markerObjects = [];

    for (const object of this.puzzleObjects) this.interactablePool.release(object);
    this.puzzleObjects = [];

    for (const label of this.labelObjects) label.destroy();
    this.labelObjects = [];

    this.glitch?.destroy();
    this.glitch = null;
    this.bit?.destroy();
    this.player?.destroy();
  }
}
