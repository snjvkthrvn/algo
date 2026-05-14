import Phaser from 'phaser';
import { VISUAL_REVAMP_KEYS } from '../config/assets';
import { CAMERA_TUNING, COLORS, FONTS, REGIONS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { eventBus } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import { TransitionManager } from '../core/TransitionManager';
import { BitCompanion } from '../entities/BitCompanion';
import { GlitchRival } from '../entities/GlitchRival';
import { InteractableObject } from '../entities/InteractableObject';
import { Player } from '../entities/Player';
import { GLITCH_DIALOGUE, GLITCH_EXIT_LINES } from '../data/dialogue/glitch_dialogue';
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
import { ObjectPool } from '../utils/ObjectPool';
import { openPauseOverlay } from './titleNavigation';

export class ArrayPlainsScene extends Phaser.Scene {
  private player!: Player;
  private bit!: BitCompanion;
  private interactionSystem!: InteractionSystem;
  private dialogueSystem!: DialogueSystem;
  private hud!: HUDManager;
  private hasShutdown = false;
  private returnGateway: InteractableObject | null = null;
  private twinRiversGateway: InteractableObject | null = null;
  private shufflerGate: InteractableObject | null = null;
  private markerObjects: InteractableObject[] = [];
  private puzzleObjects: InteractableObject[] = [];
  private labelObjects: Phaser.GameObjects.Text[] = [];
  private lastPlayerX: number = NaN;
  private lastPlayerY: number = NaN;
  private interactablePool!: ObjectPool<InteractableObject>;
  private interactionEnabledTime = 0;

  // Overworld sequence puzzle
  private sequenceTiles: Phaser.GameObjects.Rectangle[] = [];
  private currentSequenceIndex = 0;
  private sequenceSolved = false;

  // Glitch cameo (Stage 3 — first AP visit after Sentinel)
  private glitch: GlitchRival | null = null;
  private glitchSpawnPos = { x: 768, y: 384 };
  private glitchProximityTriggered = false;

  private readonly onEscPause = () => {
    if (this.dialogueSystem?.isDialogueActive()) return;
    openPauseOverlay(this, SCENE_KEYS.ARRAY_PLAINS);
  };
  private readonly onOpenCodex = () => this.openCodex();

  constructor() {
    super({ key: SCENE_KEYS.ARRAY_PLAINS });
  }

  init(data: { spawnX?: number; spawnY?: number }): void {
    if (data.spawnX !== undefined && data.spawnY !== undefined) {
      gameState.setPlayerPosition(data.spawnX, data.spawnY);
    }
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
    this.createFarmerNPCs();
    this.renderPortalHaloes();
    this.createSequencePuzzle();
    this.maybeSpawnGlitchCameo();
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
    this.interactionEnabledTime = this.time.now + 700;
    this.hud.showRegionCard('Array Plains', 'Where order becomes addressable.');
    this.input.keyboard?.on('keydown-ESC', this.onEscPause);
    this.input.keyboard?.on('keydown-C', this.onOpenCodex);
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
    }> = [
      {
        farmerId: 'farmer_sorter',
        puzzleId: 'ap_1',
        name: 'Sorting Farmer',
        intro: 'My furrows are tangled. Compare each pair of neighbors — swap the ones in the wrong order. Eventually the row settles.',
        thanks: 'Sorted! Compare and swap. Simple, but the field knows the order now.',
      },
      {
        farmerId: 'farmer_basket',
        puzzleId: 'ap_2',
        name: 'Basket Keeper',
        intro: 'I keep losing my tools. If I just knew the basket number, I could go straight to it instead of rummaging.',
        thanks: 'Right to the slot. Index is everything once you know the address.',
      },
      {
        farmerId: 'farmer_crop',
        puzzleId: 'ap_3',
        name: 'Crop Sorter',
        intro: 'A hundred crops, only four bins. There must be a rule that sends every crop to the same place every time.',
        thanks: 'Every crop hashed to its bin. The formula did the thinking for us.',
      },
      {
        farmerId: 'farmer_tile',
        puzzleId: 'ap_4',
        name: 'Tile Worker',
        intro: "These tiles come in pairs that sum to my target. For any tile I pick, the only partner that fits is the complement.",
        thanks: 'Pairs found, target met. Knowing the complement saved the search.',
      },
    ];

    for (const farmer of farmers) {
      const puzzle = ARRAY_PLAINS_CONFIG.puzzles.find((p) => p.id === farmer.puzzleId);
      if (!puzzle) continue;
      const x = puzzle.position.x - 64;
      const y = puzzle.position.y + 12;

      const obj = this.interactablePool.acquire({
        id: farmer.farmerId,
        type: 'sign',
        x,
        y,
        prompt: `[SPACE] Speak with ${farmer.name}`,
        locked: false,
        spriteImageKey: VISUAL_REVAMP_KEYS.PROP_FIELD_SIGN,
        imageScale: 0.13,
        imageOriginY: 0.86,
        onInteract: () => {
          const completed = gameState.isPuzzleCompleted(farmer.puzzleId);
          this.showFieldNote(farmer.name, completed ? farmer.thanks : farmer.intro);
        },
      });
      this.markerObjects.push(obj);
      this.interactionSystem.addObject(obj);

      // Name plaque so the farmer's identity is unmistakable even with placeholder sprite
      this.labelObjects.push(
        this.add.text(x, y - 60, farmer.name.toUpperCase(), {
          fontSize: '8px',
          fontFamily: FONTS.RETRO,
          color: '#e0f8d0',
          backgroundColor: '#346856',
          padding: { x: 4, y: 3 },
        }).setOrigin(0.5).setDepth(5),
      );
    }
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
      { x: 560, y: 480, radius: 54 }, // sequence puzzle span centre
    ];
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
          TransitionManager.swirl(this, SCENE_KEYS.TWIN_RIVERS, { spawnX: 192, spawnY: 448 });
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

    // Village Elder — first NPC encountered after stepping through the prologue gateway.
    // Position sits on the main east-bound route, just past the spawn point.
    const villageElder = this.interactablePool.acquire({
      id: 'village_elder',
      type: 'sign',
      x: 320,
      y: 384,
      prompt: '[SPACE] Speak with Elder',
      locked: false,
      spriteImageKey: VISUAL_REVAMP_KEYS.VILLAGE_ELDER,
      imageScale: 0.14,
      imageOriginY: 0.86,
      onInteract: () => this.showFieldNote('Village Elder', [
        'A graduate of the Flow Chamber! Welcome, young seeker.',
        'Array Plains — where data grows in rows and every element finds its index. Or... it used to.',
        "A chaotic force called the Shuffler has been terrorizing our farmers. Everything's out of order. Tiles scrambled. Tools misplaced. Crops in the wrong bins. Nobody can find anything.",
        'Four farmers need help. Each faces a different kind of disorder. Help them all, and the path to the Shuffler opens.',
        'Array Plains believes in you.',
      ]),
    });
    this.markerObjects.push(villageElder);
    this.interactionSystem.addObject(villageElder);

    // Name plaque above the Elder so they read as a named character, not generic NPC art
    this.labelObjects.push(
      this.add.text(320, 384 - 152, 'VILLAGE ELDER', {
        fontSize: '8px',
        fontFamily: FONTS.RETRO,
        color: '#e0f8d0',
        backgroundColor: '#346856',
        padding: { x: 5, y: 3 },
      }).setOrigin(0.5).setDepth(5),
    );

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
        onInteract: () => this.startPuzzle(meta.scene),
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

  private openCodex(): void {
    if (this.dialogueSystem?.isDialogueActive()) return;
    TransitionManager.fade(this, SCENE_KEYS.CODEX, { returnScene: SCENE_KEYS.ARRAY_PLAINS }, 260);
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
    this.hasShutdown = true;
    eventBus.off('progression:gate-open', this.onGateOpen, this);
    this.input.keyboard?.off('keydown-ESC', this.onEscPause);
    this.input.keyboard?.off('keydown-C', this.onOpenCodex);

    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.hud?.destroy();

    if (this.returnGateway) { this.interactablePool.release(this.returnGateway); this.returnGateway = null; }
    if (this.twinRiversGateway) { this.interactablePool.release(this.twinRiversGateway); this.twinRiversGateway = null; }
    if (this.shufflerGate) { this.interactablePool.release(this.shufflerGate); this.shufflerGate = null; }

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
