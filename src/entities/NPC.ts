/**
 * NPC - Behavior states, dialogue trigger, procedural appearance.
 */

import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { PROLOGUE_REWORK_KEYS, PROLOGUE_SHEET_KEYS, VISUAL_REVAMP_KEYS } from '../config/assets';
import type { NPCConfig } from '../data/types';

const STATIC_NPC_SCALES: Record<string, number> = {
  [PROLOGUE_REWORK_KEYS.PROFESSOR_NODE]: 0.32,
  [PROLOGUE_REWORK_KEYS.RUNE_KEEPER]: 0.3,
  [PROLOGUE_REWORK_KEYS.CONSOLE_KEEPER]: 0.3,
  [PROLOGUE_SHEET_KEYS.NPCS]: 0.22,
  [VISUAL_REVAMP_KEYS.PROFESSOR_NODE]: 0.34,
  [VISUAL_REVAMP_KEYS.RUNE_KEEPER]: 0.32,
  [VISUAL_REVAMP_KEYS.CONSOLE_KEEPER]: 0.31,
  [VISUAL_REVAMP_KEYS.GLITCH]: 0.3,
};

export class NPC {
  sprite: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite;
  body: Phaser.Physics.Arcade.Body;
  config: NPCConfig;
  private scene: Phaser.Scene;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private isHighlighted: boolean = false;
  private nameTag: Phaser.GameObjects.Text;

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
      fontFamily: '"Press Start 2P", monospace',
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

    // Idle bob animation
    scene.tweens.add({
      targets: this.sprite,
      y: y - 2,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
    this.sprite.destroy();
    this.glowGraphics.destroy();
    this.nameTag.destroy();
  }
}
