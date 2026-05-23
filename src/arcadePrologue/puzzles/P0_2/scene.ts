import Phaser from 'phaser';
import { ARENA, COLORS, MOVE, PLAYER_SCALE, s, STAGE } from './tokens';
import { paintAtmosphere } from '../P0_1/visuals/atmosphere';
import { paintPlatform, paintEdgeVignette } from '../P0_1/visuals/platform';
import { buildPrologueHud, type PrologueHud } from '../P0_1/visuals/prologueHud';
import { createDialogueBox, type DialogueBox } from '../P0_1/visuals/dialogueBox';
import { readReduceMotion, writeReduceMotion } from '../P0_1/prefs';
import { FLOW_ROUNDS, type FlowRound } from './rounds';
import { FLOW_LABEL, canInteract, type FlowState } from './state';
import { bindFlowInput, type FlowInputSampler } from './input';
import { createConsole, type ConsoleEntity } from './entities/console';
import { createShard, type ShardEntity } from './entities/shard';
import { createBitCompanion, type BitCompanion } from './entities/bit';
import { TINT_COLOR } from './entities/symbols';
import {
  carryAura,
  pickupPulse,
  placeRing,
  winCascade,
  wrongShimmer,
} from './feedback';
import { GAME, PENALTIES, POINTS } from '../../game/state';
import {
  completeAlgorithmiaPuzzle,
  PROLOGUE_RUN_UI_KEY,
  resolveReturnScene,
} from '../../game/algorithmiaIntegration';
import { scorePopup } from '../../ui/popups';
import { hexColorToNumber, sparkle } from '../../ui/particles';
import { comboMilestone } from '../../game/milestone';
import {
  OVERWORLD_PLAYER_SPRITE_ASSETS,
  P0_1_PUZZLE_ASSETS,
  P0_2_PUZZLE_ASSETS,
  P0_2_PUZZLE_KEYS,
  PROLOGUE_SHEET_KEYS,
  VISUAL_REVAMP_IMAGE_ASSETS,
  VISUAL_REVAMP_KEYS,
} from '../../../config/assets';
import { SCENE_KEYS } from '../../../config/constants';

const ROUND_TIMERS = [30000, 45000, 60000];
const TIME_BONUS_MAX = [320, 420, 540];
const PERFECT_BONUS = [400, 500, 640];

export class FlowConsolesScene extends Phaser.Scene {
  // ── Persistent layer / UI ────────────────────────────────────────────────
  private hud!: PrologueHud;
  private dialogue!: DialogueBox;
  private hasArenaArt = false;

  // ── Round state ──────────────────────────────────────────────────────────
  private round: FlowRound | null = null;
  private wave = 0;
  private state: FlowState = 'idle';
  private consoles: ConsoleEntity[] = [];
  private shards: ShardEntity[] = [];
  private placedCount = 0;
  private heldShard: ShardEntity | null = null;
  private carryAuraHandle: { destroy: () => void } | null = null;

  // ── Player ───────────────────────────────────────────────────────────────
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerGlow!: Phaser.GameObjects.Arc;
  private playerPos: { x: number; y: number } = { x: ARENA.cx, y: ARENA.cy };
  private playerFacing: 'down' | 'up' | 'left' | 'right' = 'down';
  private bit: BitCompanion | null = null;

  // ── NPCs ────────────────────────────────────────────────────────────────
  private consoleKeeper: Phaser.GameObjects.Image | null = null;
  private trickster: Phaser.GameObjects.Image | null = null;
  private tricksterBubble: Phaser.GameObjects.Text | null = null;

  // ── Interaction prompt ───────────────────────────────────────────────────
  private prompt!: Phaser.GameObjects.Text;
  private nearestShard: ShardEntity | null = null;
  private nearestConsole: ConsoleEntity | null = null;
  /** Dashed hint line drawn while carrying a shard, pointing at its target. */
  private hintLine!: Phaser.GameObjects.Graphics;

  // ── Infrastructure ───────────────────────────────────────────────────────
  private flowInput!: FlowInputSampler;
  private reduceMotion = false;
  private returnScene: string = SCENE_KEYS.PROLOGUE;
  private startedAt = Date.now();

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_P0_2 });
  }

  init(data?: { returnScene?: string }): void {
    this.returnScene = resolveReturnScene(data);
  }

  preload(): void {
    for (const asset of OVERWORLD_PLAYER_SPRITE_ASSETS) {
      if (this.textures.exists(asset.key)) continue;
      this.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth ?? 32,
        frameHeight: asset.frameHeight ?? 32,
      });
    }
    for (const asset of [...P0_1_PUZZLE_ASSETS, ...P0_2_PUZZLE_ASSETS]) {
      if (this.textures.exists(asset.key)) continue;
      if (asset.frameWidth && asset.frameHeight) {
        this.load.spritesheet(asset.key, asset.path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
        });
      } else {
        this.load.image(asset.key, asset.path);
      }
    }

    // NPC portraits: load the visual-revamp Console Keeper, Rune Keeper, and
    // Glitch sprites if they're not already in the texture cache (they aren't
    // when we jump straight to P0_2 via a test or browser console).
    const npcAssets = VISUAL_REVAMP_IMAGE_ASSETS.filter((a) =>
      a.key === VISUAL_REVAMP_KEYS.CONSOLE_KEEPER ||
      a.key === VISUAL_REVAMP_KEYS.RUNE_KEEPER ||
      a.key === VISUAL_REVAMP_KEYS.GLITCH ||
      a.key === VISUAL_REVAMP_KEYS.BIT_SPARK,
    );
    for (const asset of npcAssets) {
      if (this.textures.exists(asset.key)) continue;
      this.load.image(asset.key, asset.path);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg.deep);
    this.startedAt = Date.now();
    this.reduceMotion = readReduceMotion();
    GAME.reset();
    GAME.setCurrentPuzzle(this.scene.key);
    if (!this.scene.isActive(PROLOGUE_RUN_UI_KEY)) this.scene.launch(PROLOGUE_RUN_UI_KEY);
    this.scene.bringToTop(PROLOGUE_RUN_UI_KEY);

    // Visual layers
    this.hasArenaArt = paintPlatform(this);
    if (!this.hasArenaArt) {
      paintAtmosphere(this);
      paintEdgeVignette(this);
    }
    this.paintArenaRunes();

    // NPCs sit BEHIND the player sprite but ABOVE the platform
    this.spawnConsoleKeeper();
    this.spawnTrickster();

    this.buildPlayerSprite();
    this.bit = createBitCompanion(this);

    // HUD + dialogue
    this.hud = buildPrologueHud(this, {
      title: 'Puzzle P0-2',
      subtitle: 'The Flow Consoles',
    });
    this.dialogue = createDialogueBox(this, { portrait: 'console_keeper' });

    // Interact prompt (lives just above the player when active)
    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: 'Manrope, system-ui, sans-serif',
        fontSize: s(12) + 'px',
        color: '#7ffcff',
        backgroundColor: '#06101e',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(70)
      .setAlpha(0);

    // Hint line: dashed line from held shard to its target console
    this.hintLine = this.add.graphics().setDepth(48);

    // Input
    this.flowInput = bindFlowInput(this, {
      onInteract: () => this.handleInteract(),
      onToggleReduceMotion: () => this.toggleReduceMotion(),
    });
    const escape = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escape?.on('down', this.exitScene, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escape?.removeAllListeners();
      this.flowInput.unbind();
      this.bit?.destroy();
    });

    void this.runRound(0);
  }

  // ── Round lifecycle ────────────────────────────────────────────────────────

  private async runRound(index: number): Promise<void> {
    this.wave = index;
    this.tearDown();

    const round = FLOW_ROUNDS[index]!;
    this.round = round;
    this.placedCount = 0;

    // Build consoles + shards
    this.consoles = round.consoles.map((def) => createConsole(this, def));
    this.shards = round.shards.map((def) => createShard(this, def));

    // Move player to spawn
    this.playerPos = { ...round.playerSpawn };
    this.playerSprite.setPosition(this.playerPos.x, this.playerPos.y);
    this.playerGlow.setPosition(this.playerPos.x, this.playerPos.y);

    // HUD
    this.hud.setObjective(`Match all ${round.shards.length} shards`, round.shards.length);
    this.hud.showRoundTitle(round.principle);
    this.dialogue.show('Console Keeper', round.npcLine);

    this.setState('instruct');
    await this.wait(900);
    this.setState('playing');
    GAME.startRound(ROUND_TIMERS[index] ?? 45000);
  }

  // ── Per-tick update ────────────────────────────────────────────────────────

  update(_time: number, deltaMs: number): void {
    if (!this.round) return;

    // ── Player movement ─────────────────────────────────────────────────────
    if (canInteract(this.state)) {
      const { dx, dy } = this.flowInput.sample();
      if (dx !== 0 || dy !== 0) {
        const step = (MOVE.speed * deltaMs) / 1000;
        // Resolve x and y independently so the player can slide along an
        // obstacle instead of getting stuck flat against it.
        let nx = this.playerPos.x + dx * step;
        let ny = this.playerPos.y + dy * step;
        if (this.hitsConsoleFootprint(nx, this.playerPos.y)) nx = this.playerPos.x;
        if (this.hitsConsoleFootprint(this.playerPos.x, ny)) ny = this.playerPos.y;
        const clamped = clampToArena(nx, ny);
        this.playerPos.x = clamped.x;
        this.playerPos.y = clamped.y;
        this.playerSprite.setPosition(clamped.x, clamped.y);
        this.playerGlow.setPosition(clamped.x, clamped.y);
        // Depth ordering — sprite Y so it sorts vs consoles
        this.playerSprite.setDepth(50 + clamped.y * 0.001);

        // Pick best animation
        const facing = pickFacing(dx, dy, this.playerFacing);
        if (facing !== this.playerFacing) {
          this.playerFacing = facing;
        }
        const animKey = `p0-walk-${facing}`;
        if (this.playerSprite.anims.currentAnim?.key !== animKey) {
          this.playerSprite.play(animKey, true);
        }
      } else if (this.playerSprite.anims.isPlaying) {
        this.playerSprite.stop().setFrame(0);
      }
    }

    // ── Update held shard position ──────────────────────────────────────────
    if (this.heldShard) {
      this.heldShard.followPlayer(this.playerPos.x, this.playerPos.y);
    }

    // ── Update Bit companion ────────────────────────────────────────────────
    this.bit?.update(this.playerPos.x, this.playerPos.y, deltaMs);

    // ── Hint line from held shard to its target console ─────────────────────
    this.repaintHintLine();

    // ── Find nearest interactable + show prompt ─────────────────────────────
    this.updateInteractionTargets();
  }

  private repaintHintLine(): void {
    this.hintLine.clear();
    const shard = this.heldShard;
    if (!shard) return;
    const target = this.consoles.find((c) => c.def.id === shard.def.targetId);
    if (!target || target.filled) return;

    const sx = shard.container.x;
    const sy = shard.container.y;
    const tx = target.container.x;
    const ty = target.container.y - 40; // panel midpoint
    const color = TINT_COLOR[shard.def.tint];

    // Dashed line — 8px segment, 6px gap
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;
    this.hintLine.lineStyle(2, color, 0.55);
    const seg = 8;
    const gap = 6;
    const step = seg + gap;
    // Animate the dashes along the line using time-based offset
    const offset = (this.time.now / 12) % step;
    for (let d = -offset; d < len; d += step) {
      const start = Math.max(0, d);
      const end = Math.min(len, d + seg);
      if (end <= start) continue;
      this.hintLine.beginPath();
      this.hintLine.moveTo(sx + nx * start, sy + ny * start);
      this.hintLine.lineTo(sx + nx * end, sy + ny * end);
      this.hintLine.strokePath();
    }
  }

  /**
   * Returns true if a player at (x, y) would intrude on a console's pedestal
   * footprint. We model each console base as a small ellipse around its pose,
   * smaller than the visual sprite so the player can still get close enough to
   * trigger the interact prompt without bumping.
   */
  private hitsConsoleFootprint(x: number, y: number): boolean {
    const rx = 38; // pedestal half-width
    const ry = 22; // pedestal half-height (foot of pillar)
    for (const c of this.consoles) {
      const dx = x - c.container.x;
      // The pedestal sits at the bottom of the visual; offset the test centre
      // downward so the bounding ellipse hugs the floor portion.
      const dy = y - (c.container.y + 56);
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) return true;
    }
    return false;
  }

  private updateInteractionTargets(): void {
    if (!canInteract(this.state)) {
      this.prompt.setAlpha(0);
      return;
    }
    const px = this.playerPos.x;
    const py = this.playerPos.y;

    // Clear previous highlights
    if (this.nearestShard) this.nearestShard.setHighlighted(false);
    if (this.nearestConsole) this.nearestConsole.setHighlighted(false);
    this.nearestShard = null;
    this.nearestConsole = null;

    if (this.heldShard === null) {
      // Looking for shard to pick up
      let best: ShardEntity | null = null;
      let bestD2 = MOVE.highlightRadius * MOVE.highlightRadius;
      for (const sh of this.shards) {
        if (sh.state !== 'resting') continue;
        const d2 = (sh.container.x - px) ** 2 + (sh.container.y - py) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = sh;
        }
      }
      if (best) {
        best.setHighlighted(true);
        this.nearestShard = best;
        const inRange = bestD2 < MOVE.pickupRadius * MOVE.pickupRadius;
        this.showPrompt(inRange ? 'E   Pick up shard' : '');
      } else {
        this.showPrompt('');
      }
    } else {
      // Looking for console to place into
      let best: ConsoleEntity | null = null;
      let bestD2 = MOVE.highlightRadius * MOVE.highlightRadius;
      for (const c of this.consoles) {
        if (c.filled) continue;
        const d2 = (c.container.x - px) ** 2 + (c.container.y - py) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = c;
        }
      }
      if (best) {
        best.setHighlighted(true);
        this.nearestConsole = best;
        const inRange = bestD2 < MOVE.pickupRadius * MOVE.pickupRadius;
        this.showPrompt(inRange ? 'E   Place shard' : '');
      } else {
        this.showPrompt('');
      }
    }
  }

  private showPrompt(text: string): void {
    if (!text) {
      this.tweens.add({ targets: this.prompt, alpha: 0, duration: 120 });
      return;
    }
    this.prompt
      .setText(text)
      .setPosition(this.playerPos.x, this.playerPos.y - 90);
    if (this.prompt.alpha < 1) {
      this.tweens.add({ targets: this.prompt, alpha: 1, duration: 140 });
    }
  }

  // ── Interaction ────────────────────────────────────────────────────────────

  private handleInteract(): void {
    if (!canInteract(this.state)) return;
    if (this.heldShard === null) {
      this.tryPickup();
    } else {
      this.tryPlace();
    }
  }

  private tryPickup(): void {
    const target = this.nearestShard;
    if (!target) return;
    // Must be close enough
    const d2 =
      (target.container.x - this.playerPos.x) ** 2 +
      (target.container.y - this.playerPos.y) ** 2;
    if (d2 > MOVE.pickupRadius * MOVE.pickupRadius) return;

    target.lift(this);
    this.heldShard = target;
    target.setHighlighted(false);

    const color = TINT_COLOR[target.def.tint];
    pickupPulse(this, target.container.x, target.container.y, color);
    this.carryAuraHandle = carryAura(
      this,
      () => ({ x: this.playerPos.x, y: this.playerPos.y }),
      color,
    );
    this.bit?.setExcited(true);
  }

  private tryPlace(): void {
    const shard = this.heldShard;
    const target = this.nearestConsole;
    if (!shard || !target) return;
    const d2 =
      (target.container.x - this.playerPos.x) ** 2 +
      (target.container.y - this.playerPos.y) ** 2;
    if (d2 > MOVE.pickupRadius * MOVE.pickupRadius) return;

    if (shard.def.targetId === target.def.id) {
      // ── Correct match ─────────────────────────────────────────────────────
      shard.placeInto(this, target.container.x, target.container.y - 40);
      target.flashCorrect(this);
      placeRing(this, target.container.x, target.container.y - 40, TINT_COLOR[target.def.tint]);
      // Camera juice: tiny shake + brief tinted flash
      this.cameras.main.shake(140, 0.0035);
      this.cameras.main.flash(180, ...hexToRgb(TINT_COLOR[target.def.tint]));

      this.heldShard = null;
      this.carryAuraHandle?.destroy();
      this.carryAuraHandle = null;
      this.bit?.setExcited(false);

      GAME.bumpCombo();
      const awarded = GAME.addScore(POINTS.altar, 'altar');
      scorePopup(this, target.container.x, target.container.y - 80, `+${awarded}`);
      sparkle(this, target.container.x, target.container.y - 40, {
        count: 10,
        color: TINT_COLOR[target.def.tint],
        spread: 32,
      });
      const milestone = comboMilestone(GAME.combo);
      if (milestone) {
        scorePopup(this, target.container.x, target.container.y - 108, milestone.label, {
          color: milestone.color,
          size: 17,
          rise: 38,
          duration: 980,
        });
        sparkle(this, target.container.x, target.container.y - 40, {
          count: 12,
          color: hexColorToNumber(milestone.color),
          spread: 36,
        });
      }

      // NPC reactions
      this.npcReact(this.consoleKeeper, 'correct');

      this.placedCount += 1;
      this.hud.setProgress(this.placedCount);
      if (this.placedCount >= this.round!.shards.length) {
        void this.finishRound();
      }
    } else {
      // ── Wrong match ───────────────────────────────────────────────────────
      target.flashWrong(this);
      wrongShimmer(this, target.container.x, target.container.y - 40);
      // Harder shake + red tint flash to telegraph the mistake
      this.cameras.main.shake(220, 0.008);
      this.cameras.main.flash(200, 255, 60, 80);
      GAME.recordMistake();
      GAME.losePoints(PENALTIES.p2DeadEnd);
      GAME.breakCombo();

      // Snap shard back to its original pedestal
      shard.drop(this, shard.def.pose.x, shard.def.pose.y);
      this.heldShard = null;
      this.carryAuraHandle?.destroy();
      this.carryAuraHandle = null;
      this.bit?.setExcited(false);

      // Trickster cackles, Console Keeper shakes head
      this.tricksterCackle();
      this.npcReact(this.consoleKeeper, 'wrong');
    }
  }

  // ── Win flow ──────────────────────────────────────────────────────────────

  private async finishRound(): Promise<void> {
    if (!this.round) return;
    this.setState('cleared');

    const bonuses = GAME.endRound(
      TIME_BONUS_MAX[this.wave] ?? 420,
      PERFECT_BONUS[this.wave] ?? 500,
    );

    // Win cascade across consoles
    const poses = this.consoles.map((c) => ({ x: c.container.x, y: c.container.y }));
    await winCascade(this, poses, this.reduceMotion);

    // Bonus popups
    const centerX = ARENA.cx;
    const centerY = ARENA.cy - 30;
    let off = 0;
    if (bonuses.timeBonus > 0) {
      scorePopup(this, centerX, centerY - off, `+${bonuses.timeBonus}  TIME`, {
        color: '#fde68a',
        size: 16,
        rise: 36,
        duration: 1100,
      });
      off += 26;
    }
    if (bonuses.wasPerfect && bonuses.perfectBonus > 0) {
      scorePopup(this, centerX, centerY - off, `+${bonuses.perfectBonus}  PERFECT!`, {
        color: '#a3e635',
        size: 17,
        rise: 40,
        duration: 1200,
      });
      sparkle(this, centerX, centerY, { count: 14, color: 0xa3e635, spread: 46 });
    }
    this.npcReact(this.consoleKeeper, 'win');

    await this.wait(620);
    if (this.wave + 1 < FLOW_ROUNDS.length) {
      void this.runRound(this.wave + 1);
      return;
    }
    this.hud.showSummary('Selection learned. Each key has one true door.');
    this.hud.showPromptNext('Return to the Chamber');
    this.time.delayedCall(1700, () =>
      completeAlgorithmiaPuzzle(this, {
        puzzleId: 'p0_2',
        puzzleName: 'Flow Consoles',
        concept: 'Key-Value Mapping',
        returnScene: this.returnScene,
        startedAt: this.startedAt,
      }),
    );
  }

  puzzleComplete(): void {
    completeAlgorithmiaPuzzle(this, {
      puzzleId: 'p0_2',
      puzzleName: 'Flow Consoles',
      concept: 'Key-Value Mapping',
      returnScene: this.returnScene,
      startedAt: this.startedAt,
      delayMs: 0,
    });
  }

  // ── Player sprite ─────────────────────────────────────────────────────────

  private buildPlayerSprite(): void {
    const spawnX = ARENA.cx;
    const spawnY = ARENA.cy + 20;

    this.playerGlow = this.add.circle(spawnX, spawnY, 24, COLORS.accent, 0.22).setDepth(49);
    this.tweens.add({
      targets: this.playerGlow,
      alpha: 0.06,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const playerKey = PROLOGUE_SHEET_KEYS.PLAYER;
    this.playerSprite = this.add
      .sprite(spawnX, spawnY, playerKey, 0)
      .setOrigin(0.5, 1)
      .setScale(PLAYER_SCALE)
      .setDepth(50);

    if (!this.anims.exists('p0-walk-down')) {
      const gen = (start: number, end: number) =>
        this.anims.generateFrameNumbers(playerKey, { start, end });
      this.anims.create({ key: 'p0-walk-down',  frames: gen(0,  7),  frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'p0-walk-left',  frames: gen(8,  15), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'p0-walk-right', frames: gen(16, 23), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'p0-walk-up',    frames: gen(24, 31), frameRate: 10, repeat: -1 });
    }
  }

  // ── NPCs ──────────────────────────────────────────────────────────────────

  private spawnConsoleKeeper(): void {
    // Small stone disk under the NPC for visual grounding
    this.paintNpcPlatform(STAGE.width - 86, 380, 0x06b6d4);

    const key = VISUAL_REVAMP_KEYS.CONSOLE_KEEPER;
    if (this.textures.exists(key)) {
      this.consoleKeeper = this.add
        .image(STAGE.width - 86, 372, key, 0)
        .setScale(0.65)
        .setOrigin(0.5, 1)
        .setDepth(45)
        .setFlipX(true);
    }
  }

  private spawnTrickster(): void {
    // Small stone disk under Glitch — slightly tinted red so the trickster
    // platform reads differently from the helpful Console Keeper's
    this.paintNpcPlatform(82, 380, 0xff5d6c);

    const key = VISUAL_REVAMP_KEYS.GLITCH;
    if (this.textures.exists(key)) {
      this.trickster = this.add
        .image(82, 372, key, 0)
        .setScale(0.55)
        .setOrigin(0.5, 1)
        .setDepth(45);
    }

    // Glitch holds a glowing red shard prop. Anchor it INSIDE his silhouette
    // (Glitch's image is ~72w × 125h at scale 0.55, origin (0.5, 1) at (82, 372)
    // — so his chest is at ~y=300, his hand at the right side ~x=104).
    this.paintGlitchProp(108, 312);
    // The "BZZT!" bubble sits above Glitch's head — hidden until cackle
    this.tricksterBubble = this.add
      .text(82, 230, 'BZZT!', {
        fontFamily: 'Manrope, system-ui, sans-serif',
        fontSize: s(13) + 'px',
        fontStyle: 'bold',
        color: '#ff5d6c',
      })
      .setOrigin(0.5)
      .setDepth(46)
      .setAlpha(0);
  }

  /**
   * Layer the rune-circle overlay on top of the stone arena floor as a SUBTLE
   * texture, not a feature. NORMAL blend (no ADD) at low alpha, very faint
   * breath. Goal: "ancient inscribed stone," not "shield is up."
   */
  private paintArenaRunes(): void {
    const key = P0_2_PUZZLE_KEYS.ARENA_RUNES;
    if (!this.textures.exists(key)) return;
    const img = this.add
      .image(ARENA.cx, ARENA.cy + 2, key)
      .setDisplaySize(ARENA.rx * 2.05, ARENA.ry * 2.05)
      .setDepth(5)
      .setAlpha(0.22);
    if (img.texture) img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.tweens.add({
      targets: img,
      alpha: 0.28,
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Stone disk + accent ring used as a base for the NPC standing outside the
   * arena. Painted procedurally so it adapts to whatever NPC sprite renders
   * on top (which may or may not be loaded).
   */
  private paintNpcPlatform(cx: number, cy: number, accent: number): void {
    const g = this.add.graphics().setDepth(20);
    // Ground shadow
    g.fillStyle(0x000000, 0.55);
    g.fillEllipse(cx + 2, cy + 8, 76, 18);
    // Stone disk
    g.fillStyle(0x0a1428, 1);
    g.fillEllipse(cx, cy, 70, 22);
    g.fillStyle(0x152a4a, 1);
    g.fillEllipse(cx, cy - 3, 64, 18);
    // Accent ring
    g.lineStyle(1.5, accent, 0.7);
    g.strokeEllipse(cx, cy - 3, 64, 18);
    // Small accent dots at the cardinals
    g.fillStyle(accent, 0.9);
    g.fillCircle(cx - 32, cy - 3, 2);
    g.fillCircle(cx + 32, cy - 3, 2);
  }

  /**
   * Glitch's prop — a small red shard with surrounding crackle dashes. Sits
   * in front of Glitch and gently bobs/spins to suggest unstable energy.
   */
  private paintGlitchProp(x: number, y: number): void {
    const g = this.add.graphics().setDepth(46);
    // Crystal body
    g.fillStyle(0x4a1820, 1);
    g.fillTriangle(x - 7, y, x, y - 18, x + 7, y);
    g.fillTriangle(x - 7, y, x + 7, y, x, y + 14);
    g.fillStyle(0xff5d6c, 0.85);
    g.fillTriangle(x - 4, y - 1, x, y - 16, x + 4, y - 1);
    g.fillTriangle(x - 4, y - 1, x + 4, y - 1, x, y + 10);
    g.lineStyle(1, 0xff7a8c, 0.9);
    g.strokeTriangle(x - 7, y, x, y - 18, x + 7, y);
    g.strokeTriangle(x - 7, y, x + 7, y, x, y + 14);

    // Crackle dashes around it — jittery lines
    const crackle = this.add.graphics().setDepth(46);
    const drawCrackle = (): void => {
      crackle.clear();
      crackle.lineStyle(1.2, 0xff5d6c, 0.85);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.4;
        const r1 = 12 + Math.random() * 4;
        const r2 = 18 + Math.random() * 6;
        crackle.beginPath();
        crackle.moveTo(x + Math.cos(angle) * r1, y + Math.sin(angle) * r1);
        crackle.lineTo(x + Math.cos(angle) * r2, y + Math.sin(angle) * r2);
        crackle.strokePath();
      }
    };
    drawCrackle();
    this.time.addEvent({ delay: 140, loop: true, callback: drawCrackle });

    // Subtle bob
    this.tweens.add({
      targets: g,
      y: y - 4,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: crackle,
      y: -4,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private tricksterCackle(): void {
    if (!this.tricksterBubble) return;
    const t = this.tricksterBubble;
    this.tweens.killTweensOf(t);
    t.setAlpha(1).setScale(0.6);
    this.tweens.add({
      targets: t,
      scale: 1.2,
      duration: 140,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 540,
      duration: 280,
    });
    if (this.trickster) {
      const baseY = this.trickster.y;
      this.tweens.add({
        targets: this.trickster,
        y: baseY - 6,
        yoyo: true,
        duration: 120,
        repeat: 2,
        ease: 'Sine.easeInOut',
        onComplete: () => this.trickster?.setY(baseY),
      });
    }
  }

  private npcReact(
    npc: Phaser.GameObjects.Image | null,
    emotion: 'correct' | 'wrong' | 'win',
  ): void {
    if (!npc) return;
    const baseX = npc.x;
    const baseY = npc.y;
    const baseScale = npc.scaleX;
    this.tweens.killTweensOf(npc);

    if (emotion === 'wrong') {
      this.tweens.add({
        targets: npc,
        x: { from: baseX - 6, to: baseX + 6 },
        duration: 60,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
        onComplete: () => npc.setX(baseX),
      });
    } else if (emotion === 'correct') {
      this.tweens.add({
        targets: npc,
        y: baseY - 8,
        scaleX: baseScale * 1.06,
        scaleY: baseScale * 1.06,
        duration: 120,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => npc.setY(baseY).setScale(baseScale),
      });
    } else {
      this.tweens.add({
        targets: npc,
        y: baseY - 20,
        scaleX: baseScale * 1.16,
        scaleY: baseScale * 1.16,
        duration: 260,
        yoyo: true,
        repeat: 1,
        ease: 'Back.easeOut',
        onComplete: () => npc.setY(baseY).setScale(baseScale),
      });
    }
  }

  // ── Plumbing ──────────────────────────────────────────────────────────────

  private setState(next: FlowState): void {
    this.state = next;
    this.hud.setState(FLOW_LABEL[next] ?? '');
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  private toggleReduceMotion(): void {
    this.reduceMotion = !this.reduceMotion;
    writeReduceMotion(this.reduceMotion);
  }

  private exitScene(): void {
    if (this.scene.isActive(PROLOGUE_RUN_UI_KEY)) this.scene.stop(PROLOGUE_RUN_UI_KEY);
    GAME.reset();
    this.scene.start(this.returnScene);
  }

  private tearDown(): void {
    for (const c of this.consoles) c.destroy();
    for (const sh of this.shards) sh.destroy();
    this.consoles = [];
    this.shards = [];
    this.heldShard = null;
    this.carryAuraHandle?.destroy();
    this.carryAuraHandle = null;
    this.nearestShard = null;
    this.nearestConsole = null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clampToArena(x: number, y: number): { x: number; y: number } {
  // Constrain (x, y) so the player's feet stay inside the arena ellipse.
  const dx = x - ARENA.cx;
  const dy = y - ARENA.cy;
  const d2 = (dx * dx) / (ARENA.rx * ARENA.rx) + (dy * dy) / (ARENA.ry * ARENA.ry);
  if (d2 <= 1) return { x, y };
  const inv = 1 / Math.sqrt(d2);
  return {
    x: ARENA.cx + dx * inv,
    y: ARENA.cy + dy * inv,
  };
}

function pickFacing(
  dx: number,
  dy: number,
  prev: 'up' | 'down' | 'left' | 'right',
): 'up' | 'down' | 'left' | 'right' {
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) return 'right';
    if (dx < 0) return 'left';
  } else {
    if (dy > 0) return 'down';
    if (dy < 0) return 'up';
  }
  return prev;
}

/** Split a 0xRRGGBB int into (r, g, b) ints suitable for camera.flash(). */
function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

