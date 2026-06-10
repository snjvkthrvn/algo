/**
 * NPC - Behavior states, dialogue trigger, procedural appearance.
 *
 * Animation layers (each independent, each cleanable):
 *   idleBobTween     y-axis hop (existing)
 *   idleBreathTween  subtle scale breath on top of the bob (Phase 2)
 *   speakingTween    glow + scale pulse while this NPC is the active
 *                    DialogueSystem speaker (Phase 2)
 *
 * All tweens are tracked so destroy()/reset() can stop them cleanly. New
 * tweens added here must be either pushed into the activeTweens list or
 * stored as a single named field that's stopped in destroy().
 */

import Phaser from 'phaser';
import { COLORS, FONTS } from '../config/constants';
import { PROLOGUE_REWORK_KEYS, PROLOGUE_SHEET_KEYS, VISUAL_REVAMP_KEYS } from '../config/assets';
import { eventBus, GameEvents } from '../core/EventBus';
import { gameState } from '../core/GameStateManager';
import type { NPCConfig } from '../data/types';

export type { NPCConfig };

/**
 * Display scale per sprite key. Without an entry here a sprite NPC falls
 * back to ~0.08 (sized for the prologue-sheet imagegen art), which is far
 * too small for the new 192x192 art-direction keepers — leaving them as
 * a default would invert the visual hierarchy (farmers larger than the
 * cosmic Rune Keeper). Each new keeper that gets art must register here.
 */
const STATIC_NPC_SCALES: Record<string, number> = {
  // Prologue cast — kept at 0.22 so the prologue ensemble reads as one
  // visually-cohesive group.
  [PROLOGUE_REWORK_KEYS.PROFESSOR_NODE]: 0.22,
  [PROLOGUE_REWORK_KEYS.RUNE_KEEPER]: 0.22,
  [PROLOGUE_REWORK_KEYS.CONSOLE_KEEPER]: 0.22,
  [PROLOGUE_SHEET_KEYS.NPCS]: 0.22,
  [VISUAL_REVAMP_KEYS.PROFESSOR_NODE]: 0.22,
  [VISUAL_REVAMP_KEYS.RUNE_KEEPER]: 0.22,
  [VISUAL_REVAMP_KEYS.CONSOLE_KEEPER]: 0.22,
  [VISUAL_REVAMP_KEYS.WATCHER]: 0.22,
  [VISUAL_REVAMP_KEYS.VILLAGE_ELDER]: 0.95,
  [VISUAL_REVAMP_KEYS.GLITCH]: 0.22,

  // Array Plains keepers (192x192 downscaled art) — 0.95 lands their head
  // around 180px tall, matching the prologue cast's apparent height when
  // the camera is at the standard overworld zoom.
  [VISUAL_REVAMP_KEYS.SORTING_FARMER]: 0.95,
  [VISUAL_REVAMP_KEYS.BASKET_KEEPER]: 0.95,
  [VISUAL_REVAMP_KEYS.CROP_SORTER]: 0.95,
  [VISUAL_REVAMP_KEYS.TILE_WORKER]: 0.95,

  // Twin Rivers keepers (256x256 placeholders today, real art via
  // codex exec in Phase 5) — 0.78 lands them at roughly the same screen
  // height as the Array Plains cast.
  [VISUAL_REVAMP_KEYS.MIRROR_WALKER]: 0.78,
  [VISUAL_REVAMP_KEYS.BRIDGE_KEEPER]: 0.78,
  [VISUAL_REVAMP_KEYS.WINDOW_FISHER]: 0.78,
  [VISUAL_REVAMP_KEYS.CURRENT_RIDER]: 0.78,

  // Hash Highlands keeper (256x256 draft) — same target screen size as
  // Twin Rivers; revisit once HH gets art.
  [VISUAL_REVAMP_KEYS.HASH_KEEPER]: 0.78,
};

export class NPC {
  sprite: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite;
  body: Phaser.Physics.Arcade.Body;
  config: NPCConfig;
  private scene: Phaser.Scene;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private isHighlighted: boolean = false;
  private nameTag: Phaser.GameObjects.Text;

  /** Active per-NPC tweens — stopped on destroy / reset to prevent leaks. */
  private activeTweens: Phaser.Tweens.Tween[] = [];
  /** True while DialogueSystem reports this NPC's id is the active speaker. */
  private isSpeaking = false;

  // ── Living-world wander state (docs/VISION.md §2) ──
  /** Spawn anchor — the leash is measured from here, not the current tile. */
  private homeX = 0;
  private homeY = 0;
  /** Earliest time (scene clock) the next wander step may begin. */
  private nextStepAt = 0;
  /** True while a step tween is in flight. */
  private isStepping = false;
  private stepTween: Phaser.Tweens.Tween | null = null;
  /** Bound listener — must be removed in destroy() or the eventBus leaks refs. */
  private readonly onDialogueStart = (data: unknown): void => {
    const { npcId } = data as { npcId?: string };
    if (npcId && npcId === this.config.id) this.setSpeaking(true);
  };
  private readonly onDialogueEnd = (): void => {
    if (this.isSpeaking) this.setSpeaking(false);
  };

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    this.scene = scene;
    this.config = config;
    const { x, y } = config.defaultPosition;

    this.sprite = this.shouldUseSpriteTexture(config)
      ? this.createSpriteNPC(config)
      : this.createProceduralNPC(config);

    // Glow effect (initially invisible)
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setPosition(x, y);
    this.glowGraphics.setDepth(3);
    this.glowGraphics.setAlpha(0);
    this.updateGlow();

    // Name tag
    this.nameTag = scene.add.text(x, y - 46, config.name, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#9ca3af',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);
    this.nameTag.setVisible(false);

    // Physics — body is a position proxy (no colliders in this scene). setSize
    // auto-centers the body on the sprite; do not override with setOffset.
    scene.physics.world.enable(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(28, 32);
    this.body.setImmovable(true);

    // Idle bob + breath — skipped under reduceMotion. The setting is read
    // at construction time; toggling mid-session won't retroactively start
    // bobbing previously-quiet NPCs (next region transition picks up the
    // new value when scenes rebuild).
    this.homeX = x;
    this.homeY = y;
    this.nextStepAt = Number.MAX_SAFE_INTEGER;
    if (config.movement) {
      // First step lands 0.5-3s after spawn so a crowd doesn't move in sync.
      this.nextStepAt = 500 + Math.random() * 2500;
    }

    if (!gameState.getSettings().reduceMotion) {
      // Idle bob — gentle vertical hop. Skipped for wandering NPCs: their
      // step tween owns the y axis (the hop arc), and two tweens fighting
      // over y makes the sprite shiver. Wanderers breathe; sitters bob.
      const bobOffset = Math.random() * 600;
      if (!config.movement) {
        this.activeTweens.push(scene.tweens.add({
          targets: this.sprite,
          y: y - 2,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: bobOffset,
        }));
      }

      // Idle breath — subtle scale tween layered on top of the bob so NPCs
      // feel alive even when motionless. The breath rate is slower than the
      // bob so the two combine asymmetrically (no obvious rhythm) — this is
      // the cheapest possible "this character is breathing" effect.
      const baseScale = this.sprite.scaleX || 1;
      this.activeTweens.push(scene.tweens.add({
        targets: this.sprite,
        scaleX: baseScale * 1.015,
        scaleY: baseScale * 1.015,
        duration: 2800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: bobOffset + 350,
      }));
    }

    // Subscribe to dialogue lifecycle so this NPC can pulse when speaking.
    eventBus.on(GameEvents.DIALOGUE_START, this.onDialogueStart, this);
    eventBus.on(GameEvents.DIALOGUE_END, this.onDialogueEnd, this);
  }

  /**
   * Pulse the glow and gently emphasize the sprite while this NPC is the
   * active DialogueSystem speaker. The effect is intentionally restrained —
   * the player's focus should be on the dialogue text, not the NPC body
   * doing a jig. The glow is the primary cue; scale is a supporting note.
   */
  setSpeaking(active: boolean): void {
    if (this.isSpeaking === active) return;
    this.isSpeaking = active;

    if (active) {
      this.glowGraphics.setAlpha(1);
      this.activeTweens.push(this.scene.tweens.add({
        targets: this.glowGraphics,
        alpha: { from: 0.55, to: 1 },
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    } else {
      // Stop the speaking-pulse tween (last one added; safe to filter on
      // target). The glow drops back to whatever the highlight state asks.
      const remaining: Phaser.Tweens.Tween[] = [];
      for (const t of this.activeTweens) {
        const targets = (t as unknown as { targets?: unknown[] }).targets ?? [];
        if (targets[0] === this.glowGraphics) {
          t.stop();
        } else {
          remaining.push(t);
        }
      }
      this.activeTweens = remaining;
      this.glowGraphics.setAlpha(this.isHighlighted ? 1 : 0);
    }
  }

  private getNPCColor(): number {
    switch (this.config.type) {
      case 'mentor': return 0x4488aa;
      case 'guide': return 0x6644aa;
      case 'villager': return 0x44aa66;
      case 'boss': return 0xaa4444;
      default: return 0x888888;
    }
  }

  private createSpriteNPC(config: NPCConfig): Phaser.GameObjects.Sprite {
    const firstFrame = config.idleFrames?.[0];
    const sprite = this.scene.add
      .sprite(config.defaultPosition.x, config.defaultPosition.y, config.spriteKey, firstFrame)
      .setDepth(4)
      .setScale(this.getSpriteScale(config.spriteKey));

    const animKey = `${config.id}-idle`;
    if (!this.scene.anims.exists(animKey) && config.idleFrames && config.idleFrames.length > 0) {
      this.scene.anims.create({
        key: animKey,
        frames: this.scene.anims.generateFrameNumbers(config.spriteKey, { frames: config.idleFrames }),
        frameRate: 4,
        repeat: -1,
      });
    }

    if (config.idleFrames && config.idleFrames.length > 0) {
      sprite.anims.play(animKey);
    }

    return sprite;
  }

  private shouldUseSpriteTexture(config: NPCConfig): boolean {
    return (
      config.spriteKey.startsWith('prologue-') ||
      Boolean(config.idleFrames?.length) ||
      Boolean(this.scene.textures?.exists(config.spriteKey))
    );
  }

  private getSpriteScale(spriteKey: string): number {
    if (STATIC_NPC_SCALES[spriteKey] !== undefined) {
      return STATIC_NPC_SCALES[spriteKey];
    }

    return spriteKey === 'prologue-node' ? 0.15 : 0.08;
  }

  private createProceduralNPC(config: NPCConfig): Phaser.GameObjects.Container {
    const { x, y } = config.defaultPosition;
    const container = this.scene.add.container(x, y);

    const shadow = this.scene.add.ellipse(0, 20, 28, 12, 0x000000, 0.3);
    container.add(shadow);

    const bodyColor = this.getNPCColor();
    const body = this.scene.add.rectangle(0, 4, 22, 26, bodyColor);
    body.setStrokeStyle(2, 0x333366);
    container.add(body);

    const head = this.scene.add.rectangle(0, -14, 18, 18, bodyColor);
    head.setStrokeStyle(2, 0x333366);
    container.add(head);

    const eyeL = this.scene.add.rectangle(-3, -15, 3, 4, 0xffffff);
    const eyeR = this.scene.add.rectangle(3, -15, 3, 4, 0xffffff);
    container.add([eyeL, eyeR]);

    if (config.type === 'mentor') {
      const hat = this.scene.add.rectangle(0, -26, 22, 6, COLORS.GOLD_ACCENT);
      hat.setStrokeStyle(1, 0x996600);
      container.add(hat);
    } else if (config.type === 'guide') {
      const cape = this.scene.add.triangle(0, 12, -14, 0, 14, 0, 0, 14, COLORS.PURPLE_CRYSTAL, 0.6);
      container.add(cape);
    }

    return container;
  }

  private updateGlow(): void {
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(COLORS.CYAN_GLOW, 0.15);
    this.glowGraphics.fillCircle(0, 0, 32);
  }

  setHighlighted(highlighted: boolean): void {
    if (this.isHighlighted === highlighted) return;
    this.isHighlighted = highlighted;

    this.scene.tweens.add({
      targets: this.glowGraphics,
      alpha: highlighted ? 1 : 0,
      duration: 200,
    });
    this.nameTag.setVisible(highlighted);
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /**
   * Living-world tick (docs/VISION.md §2): Pokemon-style ambient wandering.
   * One 32px hop in a cardinal direction, then a pause. Movement yields to
   * conversation — a speaking or player-adjacent NPC stands still, and the
   * leash keeps every wanderer near their post so quest geography stays
   * readable.
   */
  update(time: number): void {
    const movement = this.config.movement;
    if (!movement || this.isStepping) return;

    if (this.isSpeaking || this.isHighlighted) {
      // Don't step the instant a conversation ends — it reads as fleeing.
      this.nextStepAt = time + 900;
      return;
    }

    if (time < this.nextStepAt) return;

    const STEP = 32;
    const directions = Phaser.Utils.Array.Shuffle([
      { dx: STEP, dy: 0 },
      { dx: -STEP, dy: 0 },
      { dx: 0, dy: STEP },
      { dx: 0, dy: -STEP },
    ]);

    const fromX = this.sprite.x;
    const fromY = this.sprite.y;
    let target: { x: number; y: number } | null = null;
    for (const dir of directions) {
      const candidate = { x: fromX + dir.dx, y: fromY + dir.dy };
      const leashOk =
        Phaser.Math.Distance.Between(this.homeX, this.homeY, candidate.x, candidate.y) <=
        movement.leashRadius;
      if (leashOk && movement.canWalk?.(candidate) !== false) {
        target = candidate;
        break;
      }
    }

    const [pauseMin, pauseMax] = movement.pauseMsRange ?? [1800, 4200];
    this.nextStepAt = time + pauseMin + Math.random() * (pauseMax - pauseMin);
    if (!target) return;

    this.isStepping = true;
    const reduceMotion = gameState.getSettings().reduceMotion;
    this.stepTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 420,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const hop = reduceMotion ? 0 : Math.sin(t * Math.PI) * 4;
        const x = Phaser.Math.Linear(fromX, target.x, t);
        const y = Phaser.Math.Linear(fromY, target.y, t) - hop;
        this.sprite.setPosition(x, y);
        this.glowGraphics.setPosition(x, y + hop);
        this.nameTag.setPosition(x, y + hop - 46);
      },
      onComplete: () => {
        this.sprite.setPosition(target.x, target.y);
        this.glowGraphics.setPosition(target.x, target.y);
        this.nameTag.setPosition(target.x, target.y - 46);
        this.isStepping = false;
        this.stepTween = null;
      },
    });
  }

  /**
   * Y-offset from the NPC's origin where an interaction prompt should anchor.
   * Derived from the actual rendered sprite so prompt framing stays correct
   * whenever NPC art is rescaled or regenerated at a new size.
   */
  getPromptOffsetY(): number {
    const displayHeight = (this.sprite as { displayHeight?: number }).displayHeight;
    const visualHeight = typeof displayHeight === 'number' && displayHeight > 0
      ? displayHeight
      : 50; // procedural container fallback (shadow + body + head)
    return -(visualHeight / 2 + 14);
  }

  destroy(): void {
    eventBus.off(GameEvents.DIALOGUE_START, this.onDialogueStart, this);
    eventBus.off(GameEvents.DIALOGUE_END, this.onDialogueEnd, this);
    this.stepTween?.stop();
    this.stepTween = null;
    for (const t of this.activeTweens) t.stop();
    this.activeTweens.length = 0;
    this.sprite.destroy();
    this.glowGraphics.destroy();
    this.nameTag.destroy();
  }

  reset(config: NPCConfig): void {
    this.config = config;
    const { x, y } = config.defaultPosition;
    this.stepTween?.stop();
    this.stepTween = null;
    this.isStepping = false;
    this.homeX = x;
    this.homeY = y;
    this.nextStepAt = config.movement ? 500 + Math.random() * 2500 : Number.MAX_SAFE_INTEGER;
    this.sprite.setPosition(x, y);
    this.sprite.setActive(true).setVisible(true);
    this.glowGraphics.setPosition(x, y).setAlpha(0).setVisible(true);
    this.nameTag.setText(config.name).setPosition(x, y - 46).setVisible(false);
    this.isHighlighted = false;
    this.isSpeaking = false;
  }
}
