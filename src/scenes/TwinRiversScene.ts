import Phaser from 'phaser';
import { TWIN_RIVERS_SCENE_IMAGE_ASSETS, VISUAL_REVAMP_KEYS } from '../config/assets';
import { CAMERA_TUNING, COLORS, FONTS, REGIONS, SCENE_KEYS } from '../config/constants';
import { audioManager } from '../core/AudioManager';
import { eventBus } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import { TransitionManager } from '../core/TransitionManager';
import { BitCompanion } from '../entities/BitCompanion';
import { GlitchRival } from '../entities/GlitchRival';
import { InteractableObject } from '../entities/InteractableObject';
import { Player } from '../entities/Player';
import {
  TWIN_RIVERS_CONFIG,
  TWIN_RIVERS_ROUTE_RECTS,
  TWIN_RIVERS_WORLD_HEIGHT,
  TWIN_RIVERS_WORLD_WIDTH,
  isPointOnTwinRiversRoute,
  isTwinRiversStepWalkable,
  type TwinRiversCollisionBlocker,
} from '../data/regions/twinRivers';
import { DialogueSystem } from '../systems/DialogueSystem';
import { OverworldAmbience } from '../ui/OverworldAmbience';
import { HUDManager } from '../systems/HUDManager';
import { JuiceSystem } from '../systems/JuiceSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import {
  ROUTE_SURFACE_STYLES,
  renderRouteStopPads,
  renderRouteSurfaces,
} from '../systems/RouteSurfaceRenderer';
import type { DialogueTree } from '../data/types';
import { setupUICamera } from '../utils/uiCamera';
import { openPauseOverlay } from './titleNavigation';
import { ObjectPool } from '../utils/ObjectPool';
import { drawPanel } from '../ui/panel';
import { BaseOverworldScene } from './BaseOverworldScene';
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
} from '../data/dialogue/twin_rivers_dialogue';
import {
  glitchTR1Dialogue,
  glitchTR3Dialogue,
} from '../data/dialogue/glitch_dialogue';

export class TwinRiversScene extends BaseOverworldScene {
  private returnGateway: InteractableObject | null = null;
  private nextGateway: InteractableObject | null = null;
  private guide: InteractableObject | null = null;
  private puzzleObjects: InteractableObject[] = [];
  private onDialogueAction!: (...args: any[]) => void;
  private closeBetaGateModal: (() => void) | null = null;
  private twinRiversClosureStarted = false;
  private twinRiversClosureInProgress = false;

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

  protected getRegionImageAssets(): ReadonlyArray<{ key: string; path: string }> {
    return TWIN_RIVERS_SCENE_IMAGE_ASSETS;
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
    this.physics.world.setBounds(0, 0, TWIN_RIVERS_WORLD_WIDTH, TWIN_RIVERS_WORLD_HEIGHT);

    this.renderField();
    this.renderRoute();
    // Foam flecks + drifting leaves over the river ambient layer. Capped to
    // the lower half of the screen so the sky stays uncluttered.
    new OverworldAmbience(this, 'river', {
      intensity: 1,
      yMin: this.cameras.main.height * 0.35,
      yMax: this.cameras.main.height - 30,
    });

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

    this.onDialogueAction = ((...args: unknown[]) => {
      const data = args[0] as { type: string; value: string };
      if (data.type === 'start_puzzle') {
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
    });
    eventBus.on('dialogue:action', this.onDialogueAction, this);

    this.createInteractables();
    this.createSequencePuzzle();
    this.interactionSystem.onInteract((entry) => this.handleInteract(entry));

    this.hud = new HUDManager(this);
    setupUICamera(this);

    this.setupOverworldCamera(TWIN_RIVERS_WORLD_WIDTH, TWIN_RIVERS_WORLD_HEIGHT);

    this.playEntranceFade();
    this.hud.showRegionCard('Twin Rivers', 'Where two paths learn to move as one.');
    this.input.keyboard?.on('keydown-ESC', this.onEscPause);
    this.input.keyboard?.on('keydown-C', this.onOpenCodex);

    this.checkCameos();
  }

  private createSequencePuzzle(): void {
    const startX = 1100;
    const startY = 480;
    const spacing = 64;

    for (let i = 0; i < 4; i++) {
      const tile = this.add.rectangle(startX + i * spacing, startY, 48, 48, 0x1a1a2e, 0.8)
        .setStrokeStyle(2, COLORS.FRAME_BORDER_LIGHT, 0.6)
        .setDepth(2.2);

      this.add.text(startX + i * spacing, startY, `${i}`, {
        fontSize: '12px',
        fontFamily: FONTS.RETRO,
        color: '#5ab7d4',
      }).setOrigin(0.5).setDepth(2.3);

      tile.setData('index', i);
      tile.setData('active', false);
      this.sequenceTiles.push(tile);
    }

    this.add.text(startX + spacing * 1.5, startY - 58, 'OUTSIDE-IN POINTER WALK', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      backgroundColor: '#162536',
      padding: { left: 6, right: 6, top: 3, bottom: 3 },
    }).setOrigin(0.5).setDepth(2.4);
  }

  update(time: number, delta: number): void {
    const dialogueActive = this.dialogueSystem?.isDialogueActive() ?? false;
    const modalActive = this.closeBetaGateModal !== null;
    const inputBlocked = dialogueActive || modalActive || this.twinRiversClosureInProgress;
    if (!inputBlocked) this.player.update(time, delta);

    const pos = this.player.getPosition();
    this.bit.update(pos.x, pos.y, delta);
    const canInteract = !inputBlocked && this.time.now >= this.interactionEnabledTime;
    this.interactionSystem.update(canInteract);
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
    if (gameState.getFlag('twin_rivers_closure_done')) return;
    if (!gameState.getFlag('hash_highlands_gateway_open')) return;
    if (!gameState.isPuzzleCompleted('boss_mirror_serpent')) return;

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
    this.hud.setObjectiveHint('Objective: Twin Rivers is complete. The polished arc ends at the mountain gate.');

    if (gatewayPos && !this.prefersReducedMotion()) {
      camera.stopFollow();
      camera.pan(gatewayPos.x, gatewayPos.y, 640, 'Sine.easeInOut', true);
      this.time.delayedCall(220, () => {
        for (let i = 0; i < 3; i++) {
          const ring = this.add.circle(gatewayPos.x, gatewayPos.y, 42 + i * 12, COLORS.CYAN_GLOW, 0)
            .setStrokeStyle(3, COLORS.CYAN_GLOW, 0.62 - i * 0.12)
            .setDepth(4);
          this.tweens.add({
            targets: ring,
            radius: ring.radius + 24,
            alpha: 0,
            duration: 760,
            delay: i * 110,
            ease: 'Sine.easeOut',
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
          camera.startFollow(playerSprite, true, CAMERA_TUNING.FOLLOW_LERP, CAMERA_TUNING.FOLLOW_LERP);
          this.hud.setObjectiveHint('Objective: Turn back for credits, step east into beta, or replay any river trial.');
        }
      });
    });
  }

  private startTwinRiversClosureDialogue(onEnd: () => void): void {
    const tree: DialogueTree = {
      startNodeId: 'complete',
      nodes: [
        {
          id: 'complete',
          speaker: 'River Guide',
          text: [
            'Twin Rivers is complete. The Mirror Serpent has folded back into the current.',
            'The path from the first chamber through these waters is now a whole polished arc.',
            'Beyond the mountain gate is beta ground. You can step forward, replay trials, or turn back and let the preview close here.',
            'Thanks for playing this demo of Algorithmia: The Path of Logic.',
          ],
        },
      ],
    };

    this.dialogueSystem.startDialogue(tree, 'twin_rivers_closure', () => {
      // Commit the persistent flag only after the player actually saw the dialogue.
      gameState.setFlag('twin_rivers_closure_done', true);
      onEnd();
    });
  }

  private syncTwinRiversObjectiveHint(): void {
    if (this.hasShutdown) return;

    const riverIds = ['tr_1', 'tr_2', 'tr_3', 'tr_4'] as const;
    const done = riverIds.filter((id) => gameState.isPuzzleCompleted(id)).length;

    let line = '';
    if (this.twinRiversClosureInProgress) {
      line = 'Objective: Twin Rivers is complete. The polished arc ends at the mountain gate.';
    } else if (gameState.getFlag('twin_rivers_closure_done')) {
      line = 'Objective: Turn back for credits, step east into beta, or replay any river trial.';
    } else if (gameState.isPuzzleCompleted('boss_mirror_serpent') && gameState.getFlag('hash_highlands_gateway_open')) {
      line = 'Objective: Twin Rivers is complete. The polished arc ends at the mountain gate.';
    } else if (!this.sequenceSolved) {
      line =
        'Objective: Walk the outside-in pointer order on the tiles — 0, then 3, 1, 2.';
    } else if (done < 4) {
      line = `Objective: Clear the four river trials (${done}/4), then face the Mirror Serpent.`;
    } else if (!gameState.isPuzzleCompleted('boss_mirror_serpent')) {
      line = 'Objective: Challenge the Mirror Serpent beyond the deep-water gate.';
    } else if (!gameState.getFlag('hash_highlands_gateway_open')) {
      line = 'Objective: Finish the serpent — the mountain gate opens when the waters settle.';
    } else {
      line =
        'Objective: Continue to Hash Highlands eastward, replay trials, or return to Array Plains.';
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

          if (i === this.pointerSequence[this.currentSequenceIndex]) {
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

              this.showFieldNote('System', 'Outside pointers met in the middle. Twin traversal complete.');
            }
          } else {
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
    const style = ROUTE_SURFACE_STYLES.river;
    renderRouteSurfaces(this, TWIN_RIVERS_ROUTE_RECTS, style, VISUAL_REVAMP_KEYS.ROUTE_MATERIALS);
    renderRouteStopPads(this, this.getRouteStopPads(), style);

    const route = this.add.graphics().setDepth(1.3);
    for (const rect of TWIN_RIVERS_ROUTE_RECTS) {
      route.lineStyle(2, 0x9be8ff, 0.055);
      route.beginPath();
      route.moveTo(rect.x + 14, rect.y + rect.height / 2);
      route.lineTo(rect.x + rect.width - 14, rect.y + rect.height / 2);
      route.strokePath();
    }

    this.createWaterFlow();
  }

  private getRouteStopPads(): Array<{ x: number; y: number; radius?: number }> {
    return [
      ...TWIN_RIVERS_CONFIG.exitPoints.map((exit) => ({
        x: exit.position.x,
        y: exit.position.y,
        radius: 58,
      })),
      ...TWIN_RIVERS_CONFIG.npcs.map((npc) => ({
        x: npc.position.x,
        y: npc.position.y,
        radius: 46,
      })),
      ...TWIN_RIVERS_CONFIG.puzzles.map((puzzle) => ({
        x: puzzle.position.x,
        y: puzzle.position.y,
        radius: puzzle.id === 'boss_mirror_serpent' ? 58 : 44,
      })),
      { x: 1196, y: 480, radius: 54 },
    ];
  }

  private createInteractables(): void {
    this.returnGateway = this.interactablePool.acquire({
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
    const hashHighlandsOpen = gameState.getFlag('hash_highlands_gateway_open');
    this.nextGateway = this.interactablePool.acquire({
      id: 'hash_highlands_gateway',
      type: 'portal',
      x: nextExit.position.x,
      y: nextExit.position.y,
      prompt: hashHighlandsOpen ? '[SPACE] Hash Highlands' : '[LOCKED] Defeat Mirror Serpent',
      locked: !hashHighlandsOpen,
      spriteImageKey: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      imageByState: {
        unlocked: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
        locked: VISUAL_REVAMP_KEYS.PORTAL_MOUNTAIN,
      },
      imageScale: 0.24,
      imageOriginY: 0.86,
      initialState: hashHighlandsOpen ? 'unlocked' : 'locked',
      onInteract: () => this.enterHashHighlands(),
    });
    this.interactionSystem.addObject(this.nextGateway);

    this.guide = this.interactablePool.acquire({
      id: 'river_guide',
      type: 'sign',
      x: TWIN_RIVERS_CONFIG.npcs[0].position.x,
      y: TWIN_RIVERS_CONFIG.npcs[0].position.y,
      prompt: '[SPACE] Speak with River Guide',
      locked: false,
      spriteImageKey: VISUAL_REVAMP_KEYS.VILLAGE_ELDER,
      imageScale: 0.14,
      imageOriginY: 0.86,
      onInteract: () => {
        const riverIds = ['tr_1', 'tr_2', 'tr_3', 'tr_4'] as const;
        const done = riverIds.filter((id) => gameState.isPuzzleCompleted(id)).length;
        let tree = riverGuideIntroDialogue;
        if (done >= 4) {
          tree = riverGuideCompleteDialogue;
        } else if (done >= 2) {
          tree = riverGuideMidDialogue;
        }
        this.player.setInteracting(true);
        this.dialogueSystem.startDialogue(tree, 'river_guide', () => {
          this.player.setInteracting(false);
        });
      },
    });
    this.interactionSystem.addObject(this.guide);

    this.createPuzzleObjects();
  }

  private createPuzzleObjects(): void {
    const puzzleMeta: Record<
      string,
      { title: string; scene: string; prompt: string; spriteKey?: string; name?: string }
    > = {
      tr_1: {
        title: 'Mirror Walk',
        scene: SCENE_KEYS.PUZZLE_TR_1,
        prompt: '[SPACE] Speak with Mirror Walker',
        spriteKey: VISUAL_REVAMP_KEYS.MIRROR_WALKER,
        name: 'Mirror Walker',
      },
      tr_2: {
        title: 'Pointer Bridge',
        scene: SCENE_KEYS.PUZZLE_TR_2,
        prompt: '[SPACE] Speak with Bridge Keeper',
        spriteKey: VISUAL_REVAMP_KEYS.BRIDGE_KEEPER,
        name: 'Bridge Keeper',
      },
      tr_3: {
        title: 'Fixed Window Dock',
        scene: SCENE_KEYS.PUZZLE_TR_3,
        prompt: '[SPACE] Speak with Window Fisher',
        spriteKey: VISUAL_REVAMP_KEYS.WINDOW_FISHER,
        name: 'Window Fisher',
      },
      tr_4: {
        title: 'Current Rider',
        scene: SCENE_KEYS.PUZZLE_TR_4,
        prompt: '[SPACE] Speak with Current Rider',
        spriteKey: VISUAL_REVAMP_KEYS.CURRENT_RIDER,
        name: 'Current Rider',
      },
      boss_mirror_serpent: {
        title: 'Mirror Serpent',
        scene: SCENE_KEYS.BOSS_MIRROR_SERPENT,
        prompt: '[SPACE] Challenge',
      },
    };

    for (const puzzle of TWIN_RIVERS_CONFIG.puzzles) {
      const meta = puzzleMeta[puzzle.id];
      if (!meta) continue;

      const completed = gameState.isPuzzleCompleted(puzzle.id);
      const isBoss = puzzle.id === 'boss_mirror_serpent';

      const object = this.interactablePool.acquire({
        id: puzzle.id,
        type: isBoss ? 'portal' : 'sign',
        x: puzzle.position.x,
        y: puzzle.position.y,
        prompt: isBoss ? (completed ? '[SPACE] Replay' : meta.prompt) : meta.prompt,
        locked: false,
        spriteImageKey: isBoss ? undefined : meta.spriteKey,
        imageByState: isBoss ? { unlocked: VISUAL_REVAMP_KEYS.PORTAL_WATER } : undefined,
        imageScale: isBoss ? 0.24 : 0.14,
        imageOriginY: isBoss ? 0.84 : 0.86,
        initialState: 'unlocked',
        onInteract: () => {
          if (isBoss) {
            this.startPuzzle(meta.scene);
          } else {
            const tree = this.getDialogueTreeForPuzzle(puzzle.id);
            if (tree) {
              this.player.setInteracting(true);
              this.dialogueSystem.startDialogue(tree, puzzle.id, () => {
                this.player.setInteracting(false);
              });
            }
          }
        },
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

  /** Twin Rivers also blocks overlays during the beta-gate modal and closure beat. */
  protected canOpenOverlay(): boolean {
    return (
      super.canOpenOverlay() &&
      !this.closeBetaGateModal &&
      !this.twinRiversClosureInProgress
    );
  }

  private isPlayerStepWalkable(point: { x: number; y: number }): boolean {
    return isTwinRiversStepWalkable(point, this.getCollisionBlockers(), 0);
  }

  private getCollisionBlockers(): TwinRiversCollisionBlocker[] {
    const blockers: TwinRiversCollisionBlocker[] = [];
    if (this.returnGateway) blockers.push(this.returnGateway.getPosition());
    if (this.nextGateway) blockers.push(this.nextGateway.getPosition());
    if (this.guide) blockers.push(this.guide.getPosition());
    for (const object of this.puzzleObjects) blockers.push(object.getPosition());
    return blockers;
  }

  private enterHashHighlands(): void {
    if (!gameState.getFlag('hash_highlands_gateway_open')) {
      audioManager.playWrongTone();
      this.showFieldNote('River Guide', 'The mountain road opens after the Mirror Serpent is defeated.');
      return;
    }

    const transit = () =>
      TransitionManager.swirl(this, SCENE_KEYS.HASH_HIGHLANDS, { spawnX: 192, spawnY: 448 });

    if (gameState.getFlag('beta_warning_seen')) {
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
      .text(width / 2, panelY + 28, 'AN UNSTABLE THRESHOLD', {
        fontSize: '16px',
        fontFamily: FONTS.RETRO,
        color: '#081820',
      })
      .setOrigin(0.5, 0)
      .setDepth(102)
      .setScrollFactor(0);

    const body = this.add
      .text(
        width / 2,
        panelY + 72,
        'Beyond this gate, the world is still being woven.\n\n' +
          'Paths flicker. Walls forget where they stand.\n' +
          'The trials waiting in the mountain and beyond\n' +
          'are not yet complete — some hold, others do not.\n\n' +
          'None of what lies past this gate is required of you.\n' +
          'The path you have walked is whole here.\n\n' +
          'Choose freely, traveler.',
        {
          fontSize: '10px',
          fontFamily: FONTS.RETRO,
          color: '#081820',
          align: 'center',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5, 0)
      .setDepth(102)
      .setScrollFactor(0);

    const choices = ['TURN BACK', 'WALK ANYWAY'];
    let selected = 0;

    const choiceTexts = choices.map((label, i) =>
      this.add
        .text(
          panelX + (i === 0 ? 128 : PANEL_W - 128),
          panelY + PANEL_H - 56,
          label,
          {
            fontSize: '12px',
            fontFamily: FONTS.RETRO,
            color: '#081820',
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
        text.setText(`${isSelected ? '> ' : '  '}${choices[i]}${isSelected ? ' <' : '  '}`);
        text.setColor(isSelected ? '#081820' : '#346856');
        text.setBackgroundColor(isSelected ? '#e0f8d0' : 'transparent');
        text.setPadding(isSelected ? 6 : 0, isSelected ? 4 : 0, isSelected ? 6 : 0, isSelected ? 4 : 0);
      });
    };
    renderSelection();

    const move = (dir: -1 | 1) => {
      selected = (selected + dir + choices.length) % choices.length;
      audioManager.playTone(220, 50, 'square');
      renderSelection();
    };
    const onLeft = () => move(-1);
    const onRight = () => move(1);
    const onActivate = () => {
      audioManager.playClickTone();
      const walked = selected === 1;
      this.closeBetaGateModal?.();
      gameState.setFlag('beta_warning_seen', true);
      if (walked) onContinue();
    };

    this.input.keyboard?.on('keydown-LEFT', onLeft);
    this.input.keyboard?.on('keydown-RIGHT', onRight);
    this.input.keyboard?.on('keydown-A', onLeft);
    this.input.keyboard?.on('keydown-D', onRight);
    this.input.keyboard?.on('keydown-ENTER', onActivate);
    this.input.keyboard?.on('keydown-SPACE', onActivate);

    choiceTexts.forEach((text, i) => {
      text.on('pointerover', () => {
        selected = i;
        renderSelection();
      });
      text.on('pointerdown', () => {
        selected = i;
        onActivate();
      });
    });

    const allObjects = [overlay, panel, title, body, ...choiceTexts];

    this.closeBetaGateModal = () => {
      this.input.keyboard?.off('keydown-LEFT', onLeft);
      this.input.keyboard?.off('keydown-RIGHT', onRight);
      this.input.keyboard?.off('keydown-A', onLeft);
      this.input.keyboard?.off('keydown-D', onRight);
      this.input.keyboard?.off('keydown-ENTER', onActivate);
      this.input.keyboard?.off('keydown-SPACE', onActivate);
      for (const obj of allObjects) obj.destroy();
      this.closeBetaGateModal = null;
    };
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private getDialogueTreeForPuzzle(puzzleId: string): DialogueTree | null {
    const completed = gameState.isPuzzleCompleted(puzzleId);
    switch (puzzleId) {
      case 'tr_1': return completed ? mirrorWalkerPostDialogue : mirrorWalkerDialogue;
      case 'tr_2': return completed ? bridgeKeeperPostDialogue : bridgeKeeperDialogue;
      case 'tr_3': return completed ? windowFisherPostDialogue : windowFisherDialogue;
      case 'tr_4': return completed ? currentRiderPostDialogue : currentRiderDialogue;
      default: return null;
    }
  }

  private checkCameos(): void {
    if (gameState.isPuzzleCompleted('tr_1') && !gameState.getFlag('glitch_tr_1_done')) {
      this.runGlitchCameo('tr_1', glitchTR1Dialogue, 604, 384, 'glitch_tr_1_done');
      return;
    }
    if (gameState.isPuzzleCompleted('tr_3') && !gameState.getFlag('glitch_tr_3_done')) {
      this.runGlitchCameo('tr_3', glitchTR3Dialogue, 1068, 384, 'glitch_tr_3_done');
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
          this.syncTwinRiversObjectiveHint();
        });
        gameState.setFlag(flagKey, true);
      });
    });
  }

  shutdown(): void {
    this.hasShutdown = true;
    eventBus.off('dialogue:action', this.onDialogueAction, this);
    this.input.keyboard?.off('keydown-ESC', this.onEscPause);
    this.input.keyboard?.off('keydown-C', this.onOpenCodex);
    this.dialogueSystem?.destroy();
    this.interactionSystem?.destroy();
    this.hud?.destroy();
    if (this.returnGateway) { this.interactablePool.release(this.returnGateway); this.returnGateway = null; }
    if (this.nextGateway) { this.interactablePool.release(this.nextGateway); this.nextGateway = null; }
    if (this.guide) { this.interactablePool.release(this.guide); this.guide = null; }
    for (const object of this.puzzleObjects) this.interactablePool.release(object);
    this.puzzleObjects = [];
    for (const label of this.labelObjects) label.destroy();
    this.labelObjects = [];
    this.bit?.destroy();
    this.player?.destroy();
  }
}
