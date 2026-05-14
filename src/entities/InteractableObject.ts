/**
 * InteractableObject - Signs, portals, chests, gates.
 */

import Phaser from 'phaser';
import { COLORS } from '../config/constants';

export interface InteractableConfig {
  id: string;
  type: 'sign' | 'portal' | 'chest' | 'gate';
  x: number;
  y: number;
  prompt?: string;
  locked?: boolean;
  spriteKey?: string;
  spriteScale?: number;
  spriteImageKey?: string;
  imageByState?: Record<string, string>;
  imageScale?: number;
  imageOriginY?: number;
  frameByState?: Record<string, number>;
  initialState?: string;
  onInteract?: () => void;
}

export class InteractableObject {
  sprite: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  body!: Phaser.Physics.Arcade.Body;
  config: InteractableConfig;
  private scene: Phaser.Scene;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private idleTween: Phaser.Tweens.Tween | null = null;
  /** Current visual state (unlocked / locked / …), kept in sync with setVisualState / setLocked. */
  private displayState: string;

  constructor(scene: Phaser.Scene, config: InteractableConfig) {
    this.scene = scene;
    this.config = config;
    this.displayState = config.initialState ?? (config.locked ? 'locked' : 'unlocked');

    this.sprite = this.createVisual(config);
    this.refreshIdleMotion();

    // Glow
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setPosition(config.x, config.y);
    this.glowGraphics.setDepth(3);
    this.glowGraphics.setAlpha(0);
    this.glowGraphics.fillStyle(COLORS.CYAN_GLOW, 0.1);
    this.glowGraphics.fillCircle(0, 0, 36);

    // Physics — body is a position proxy (no colliders in this scene). setSize
    // auto-centers the body on the sprite; do not override with setOffset.
    this.enableBody();
  }

  private createVisual(
    config: InteractableConfig
  ): Phaser.GameObjects.Container | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image {
    if (config.spriteKey) {
      return this.scene.add
        .sprite(
          config.x,
          config.y,
          config.spriteKey,
          config.frameByState?.[config.initialState ?? 'locked'] ?? 0
        )
        .setDepth(4)
        .setScale(config.spriteScale ?? 0.1);
    }

    const stateImageKey = this.getStateImageKey(config.initialState ?? (config.locked ? 'locked' : 'unlocked'));
    const imageKey = config.spriteImageKey ?? stateImageKey;
    if (imageKey) {
      const image = this.scene.add
        .image(config.x, config.y, imageKey)
        .setDepth(4)
        .setScale(config.imageScale ?? 0.16);
      image.setOrigin?.(0.5, config.imageOriginY ?? (config.type === 'portal' || config.type === 'gate' ? 0.82 : 0.5));
      return image;
    }

    const container = this.scene.add.container(config.x, config.y);

    switch (config.type) {
      case 'gate':
        this.drawGate(container, config.locked);
        break;
      case 'portal':
        this.drawPortal(container);
        break;
      case 'sign':
        this.drawSign(container);
        break;
      case 'chest':
        this.drawChest(container);
        break;
    }

    return container;
  }

  private drawGate(container: Phaser.GameObjects.Container, locked?: boolean): void {
    const color = locked ? 0x444466 : COLORS.CYAN_GLOW;
    const pillarL = this.scene.add.rectangle(-16, 0, 8, 48, color);
    const pillarR = this.scene.add.rectangle(16, 0, 8, 48, color);
    const arch = this.scene.add.rectangle(0, -20, 40, 8, color);

    if (locked) {
      const chains = this.scene.add.text(0, 0, 'X', {
        fontSize: '16px',
        color: '#ef4444',
      }).setOrigin(0.5);
      container.add([pillarL, pillarR, arch, chains]);
    } else {
      const glow = this.scene.add.rectangle(0, 0, 24, 36, COLORS.CYAN_GLOW, 0.3);
      container.add([pillarL, pillarR, arch, glow]);
    }
  }

  private drawPortal(container: Phaser.GameObjects.Container): void {
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, COLORS.PURPLE_CRYSTAL, 0.8);
    ring.strokeCircle(0, 0, 20);
    ring.fillStyle(COLORS.PURPLE_CRYSTAL, 0.2);
    ring.fillCircle(0, 0, 18);
    container.add(ring);

    // Rotation animation
    this.scene.tweens.add({
      targets: container,
      angle: 360,
      duration: 8000,
      repeat: -1,
    });
  }

  private drawSign(container: Phaser.GameObjects.Container): void {
    const shadow = this.scene.add.ellipse(0, 24, 32, 10, 0x000000, 0.24);
    const post = this.scene.add.rectangle(0, 11, 5, 28, 0x6b4f1d);
    const board = this.scene.add.rectangle(0, -8, 34, 22, 0xb9893b);
    const inset = this.scene.add.rectangle(0, -8, 24, 12, 0xf3c970, 0.34);
    const gem = this.scene.add.polygon(0, -22, [0, -7, 7, 0, 0, 7, -7, 0], COLORS.CYAN_GLOW, 0.9);
    board.setStrokeStyle(2, 0x3b2b12);
    post.setStrokeStyle(1, 0x2a1f0e);
    container.add([shadow, post, board, inset, gem]);
  }

  private drawChest(container: Phaser.GameObjects.Container): void {
    const body = this.scene.add.rectangle(0, 2, 28, 18, 0x8b6914);
    body.setStrokeStyle(2, 0x5a4510);
    const lid = this.scene.add.rectangle(0, -8, 30, 10, 0xa07828);
    lid.setStrokeStyle(2, 0x5a4510);
    const lock = this.scene.add.rectangle(0, -2, 6, 6, COLORS.GOLD_ACCENT);
    container.add([body, lid, lock]);
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /**
   * Y-offset from the object's origin where an interaction prompt should anchor.
   * Pulled from the actual rendered sprite/image so gates, portals, and future
   * interactables all sit their prompts the same distance above their top edge.
   */
  getPromptOffsetY(): number {
    const displayHeight = (this.sprite as { displayHeight?: number }).displayHeight;
    if (typeof displayHeight === 'number' && displayHeight > 0) {
      return -(displayHeight / 2 + 14);
    }
    // Procedural container fallback — sized to the largest procedural shape (gate pillars ~48 tall).
    return -42;
  }

  setPrompt(prompt: string): void {
    this.config.prompt = prompt;
  }

  setHighlighted(highlighted: boolean): void {
    this.scene.tweens.add({
      targets: this.glowGraphics,
      alpha: highlighted ? 1 : 0,
      duration: 200,
    });
  }

  setLocked(locked: boolean): void {
    this.config.locked = locked;
    this.displayState = locked ? 'locked' : 'unlocked';
    if (this.config.frameByState || this.config.imageByState) {
      this.setVisualState(locked ? 'locked' : 'unlocked');
      return;
    }

    // Redraw gate if type is gate
    if (this.config.type === 'gate') {
      const container = this.sprite as Phaser.GameObjects.Container;
      container.removeAll(true);
      this.drawGate(container, locked);
    }
  }

  setVisualState(state: string): void {
    this.displayState = state;
    const frame = this.config.frameByState?.[state];
    if (frame !== undefined) {
      (this.sprite as Phaser.GameObjects.Sprite).setFrame(frame);
      return;
    }

    const textureKey = this.getStateImageKey(state);
    if (textureKey) {
      this.setImageTexture(textureKey);
    }
    this.refreshIdleMotion();
  }

  setImageTexture(textureKey: string): void {
    if (!('setTexture' in this.sprite)) return;
    (this.sprite as Phaser.GameObjects.Image).setTexture(textureKey);
  }

  private getStateImageKey(state: string): string | undefined {
    return this.config.imageByState?.[state];
  }

  private refreshIdleMotion(): void {
    this.idleTween?.stop();
    this.idleTween = null;

    const isUnlocked = this.displayState === 'unlocked';
    if (!isUnlocked || this.prefersReducedMotion()) return;

    const baseScale = this.config.imageScale ?? this.config.spriteScale ?? 1;
    const target = this.sprite as Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;

    if (this.config.type === 'portal') {
      target.setScale(baseScale);
      this.idleTween = this.scene.tweens.add({
        targets: target,
        scaleX: baseScale * 1.04,
        scaleY: baseScale * 1.04,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  setActive(active: boolean): this {
    this.sprite.setActive(active);
    this.glowGraphics.setActive(active);
    return this;
  }

  setVisible(visible: boolean): this {
    this.sprite.setVisible(visible);
    this.glowGraphics.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.idleTween?.stop();
    this.idleTween = null;
    this.glowGraphics.destroy();
    this.body?.destroy();
    this.sprite.destroy();
  }

  reset(config: InteractableConfig): void {
    this.idleTween?.stop();
    this.idleTween = null;
    this.body?.destroy();
    this.sprite.destroy();

    this.config = config;
    this.displayState = config.initialState ?? (config.locked ? 'locked' : 'unlocked');
    this.sprite = this.createVisual(config);
    this.enableBody();
    this.refreshIdleMotion();

    this.sprite.setActive(true).setVisible(true);
    this.glowGraphics.setPosition(config.x, config.y).setAlpha(0).setActive(true).setVisible(true);
  }

  private enableBody(): void {
    this.scene.physics.world.enable(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(32, 32);
    this.body.setImmovable(true);
  }
}
