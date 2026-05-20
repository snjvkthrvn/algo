/**
 * OverworldAmbience — drifting ambient particles for non-puzzle scenes.
 *
 * The puzzle scenes already feel alive thanks to `PuzzleAmbience` and the
 * procedural `RegionBackdrop`. Overworld scenes have been mostly static
 * pixel-art tilemaps — this widget layers a thin animated atmosphere on
 * top so the world feels lived-in even when nothing is happening.
 *
 * Five flavours, each tuned to its region:
 *
 *   cosmic   — drifting cyan/cream stars; a slow rotating Watcher prism
 *              passes across the top occasionally.
 *   farmland — pollen + butterflies drifting through the foreground.
 *   river    — foam flecks + drifting leaves at the water level.
 *   meadow   — fireflies (used by Tree Canopy / future regions).
 *   menu     — title-screen variant: dense slow cyan stars + a Bit spark
 *              drifting diagonally across.
 *
 * Cleanup is wired to SHUTDOWN. The widget never blocks input.
 */

import Phaser from 'phaser';

const DEPTH_LOW = -8;
const DEPTH_HIGH = 90;

export type AmbientFlavour = 'cosmic' | 'farmland' | 'river' | 'meadow' | 'menu';

export interface OverworldAmbienceOptions {
  /** Particle density multiplier. Default 1. */
  readonly intensity?: number;
  /**
   * Y range to keep particles inside. Defaults to the full camera height.
   * Use to keep e.g. river foam below the bank line.
   */
  readonly yMin?: number;
  readonly yMax?: number;
}

export class OverworldAmbience {
  private readonly scene: Phaser.Scene;
  private readonly children: Phaser.GameObjects.GameObject[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];

  constructor(scene: Phaser.Scene, flavour: AmbientFlavour, options: OverworldAmbienceOptions = {}) {
    this.scene = scene;
    switch (flavour) {
      case 'cosmic':   this.buildCosmic(options);   break;
      case 'farmland': this.buildFarmland(options); break;
      case 'river':    this.buildRiver(options);    break;
      case 'meadow':   this.buildMeadow(options);   break;
      case 'menu':     this.buildMenu(options);     break;
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  destroy(): void {
    for (const t of this.tweens) t.stop();
    for (const t of this.timers) t.destroy();
    for (const c of this.children) c.destroy();
    this.tweens.length = 0;
    this.timers.length = 0;
    this.children.length = 0;
  }

  // ──────────────────────────────────────────────────────────────────
  // Flavours
  // ──────────────────────────────────────────────────────────────────

  private buildCosmic(opts: OverworldAmbienceOptions): void {
    const { width, height } = this.scene.cameras.main;
    const intensity = opts.intensity ?? 1;
    const yMin = opts.yMin ?? 0;
    const yMax = opts.yMax ?? height;

    // Drifting stars — three hues, varied speeds.
    const count = Math.floor(60 * intensity);
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const hue = r > 0.7 ? 0xa78bfa : r > 0.4 ? 0x22d3ee : 0xffffff;
      const size = 1 + Math.floor(Math.random() * 2);
      const star = this.scene.add.rectangle(
        Math.random() * width,
        yMin + Math.random() * (yMax - yMin),
        size, size, hue, 0.7,
      ).setDepth(DEPTH_LOW).setScrollFactor(0);
      this.children.push(star);
      const dur = 7000 + Math.random() * 8000;
      this.tweens.push(this.scene.tweens.add({
        targets: star,
        y: yMin - 6,
        alpha: { from: 0.7, to: 0 },
        duration: dur,
        delay: Math.random() * 5000,
        repeat: -1,
        onRepeat: () => {
          star.setPosition(Math.random() * width, yMax + 6);
          star.setAlpha(0.7);
        },
      }));
    }
  }

  private buildFarmland(opts: OverworldAmbienceOptions): void {
    const { width, height } = this.scene.cameras.main;
    const intensity = opts.intensity ?? 1;
    const yMin = opts.yMin ?? 0;
    const yMax = opts.yMax ?? height;

    // Pollen / dust motes drifting upward.
    const motes = Math.floor(28 * intensity);
    for (let i = 0; i < motes; i++) {
      const warm = Math.random() < 0.35;
      const mote = this.scene.add.rectangle(
        Math.random() * width,
        yMin + Math.random() * (yMax - yMin),
        2, 2,
        warm ? 0xfde68a : 0xfffbe0,
        0.55,
      ).setDepth(DEPTH_LOW).setScrollFactor(0);
      this.children.push(mote);
      this.tweens.push(this.scene.tweens.add({
        targets: mote,
        x: mote.x + (Math.random() - 0.5) * 80,
        y: mote.y - 80 - Math.random() * 70,
        alpha: 0,
        duration: 8000 + Math.random() * 5000,
        repeat: -1,
        delay: Math.random() * 4000,
        onRepeat: () => {
          mote.setPosition(Math.random() * width, yMax - Math.random() * 80);
          mote.setAlpha(0.55);
        },
      }));
    }

    // Occasional butterflies — small sprites that bob in a wandering path.
    const butterflies = Math.max(2, Math.floor(3 * intensity));
    for (let i = 0; i < butterflies; i++) {
      const colors = [0xf97316, 0xfbbf24, 0xa78bfa, 0xef4444];
      const color = colors[i % colors.length];
      const b = this.scene.add.rectangle(
        Math.random() * width,
        yMin + Math.random() * (yMax - yMin),
        4, 3, color, 0.85,
      ).setDepth(DEPTH_LOW + 1).setScrollFactor(0);
      this.children.push(b);
      // Wandering path: long horizontal sweep + small vertical bob.
      const goingRight = Math.random() < 0.5;
      const sweep = goingRight ? width + 20 : -20;
      this.tweens.push(this.scene.tweens.add({
        targets: b,
        x: sweep,
        duration: 14000 + Math.random() * 6000,
        repeat: -1,
        delay: i * 2200,
        ease: 'Sine.easeInOut',
        onRepeat: () => {
          b.setPosition(goingRight ? -20 : width + 20, yMin + Math.random() * (yMax - yMin));
        },
      }));
      this.tweens.push(this.scene.tweens.add({
        targets: b,
        y: '+=20',
        duration: 700 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }
  }

  private buildRiver(opts: OverworldAmbienceOptions): void {
    const { width, height } = this.scene.cameras.main;
    const intensity = opts.intensity ?? 1;
    const yMin = opts.yMin ?? height * 0.4;
    const yMax = opts.yMax ?? height - 40;

    // Foam flecks — small white squares drifting horizontally.
    const flecks = Math.floor(18 * intensity);
    for (let i = 0; i < flecks; i++) {
      const goingRight = Math.random() < 0.5;
      const fleck = this.scene.add.rectangle(
        goingRight ? -8 : width + 8,
        yMin + Math.random() * (yMax - yMin),
        3, 1.5, 0xffffff, 0.7,
      ).setDepth(DEPTH_LOW).setScrollFactor(0);
      this.children.push(fleck);
      const dur = 6000 + Math.random() * 3500;
      this.tweens.push(this.scene.tweens.add({
        targets: fleck,
        x: goingRight ? width + 8 : -8,
        alpha: { from: 0.7, to: 0.2 },
        duration: dur,
        repeat: -1,
        delay: Math.random() * dur,
        ease: 'Linear',
        onRepeat: () => {
          fleck.setPosition(goingRight ? -8 : width + 8, yMin + Math.random() * (yMax - yMin));
          fleck.setAlpha(0.7);
        },
      }));
    }

    // Drifting leaves — coloured 4×2 sprites.
    const leaves = Math.max(2, Math.floor(4 * intensity));
    for (let i = 0; i < leaves; i++) {
      const palette = [0x6cb060, 0xf5b06a, 0xd97a3a, 0x4a8a3a];
      const color = palette[i % palette.length];
      const leaf = this.scene.add.rectangle(
        -10, yMin + Math.random() * (yMax - yMin),
        6, 3, color, 0.85,
      ).setDepth(DEPTH_LOW + 1).setScrollFactor(0);
      this.children.push(leaf);
      this.tweens.push(this.scene.tweens.add({
        targets: leaf,
        x: width + 10,
        angle: 360,
        duration: 16000 + Math.random() * 6000,
        delay: i * 2400,
        repeat: -1,
        ease: 'Linear',
        onRepeat: () => leaf.setPosition(-10, yMin + Math.random() * (yMax - yMin)),
      }));
    }
  }

  private buildMeadow(opts: OverworldAmbienceOptions): void {
    const { width, height } = this.scene.cameras.main;
    const intensity = opts.intensity ?? 1;
    const yMin = opts.yMin ?? height * 0.3;
    const yMax = opts.yMax ?? height - 60;

    // Fireflies — small glowing dots that pulse + wander.
    const flies = Math.floor(20 * intensity);
    for (let i = 0; i < flies; i++) {
      const fly = this.scene.add.circle(
        Math.random() * width,
        yMin + Math.random() * (yMax - yMin),
        1.6, 0x86efac, 0.85,
      ).setDepth(DEPTH_LOW + 1).setScrollFactor(0);
      this.children.push(fly);
      this.tweens.push(this.scene.tweens.add({
        targets: fly,
        alpha: { from: 0.85, to: 0.15 },
        duration: 900 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 800,
        ease: 'Sine.easeInOut',
      }));
      this.tweens.push(this.scene.tweens.add({
        targets: fly,
        x: fly.x + (Math.random() - 0.5) * 80,
        y: fly.y + (Math.random() - 0.5) * 40,
        duration: 4000 + Math.random() * 2500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }
  }

  /**
   * Menu variant — dense slow cyan stars + a single Bit-spark that drifts
   * diagonally across the title area on a long loop. Designed so the
   * player's first impression of the game is "this thing is alive".
   */
  private buildMenu(opts: OverworldAmbienceOptions): void {
    const { width, height } = this.scene.cameras.main;
    const intensity = opts.intensity ?? 1;

    // Dense slow cyan stars across the whole screen.
    const stars = Math.floor(80 * intensity);
    for (let i = 0; i < stars; i++) {
      const r = Math.random();
      const hue = r > 0.7 ? 0xa78bfa : r > 0.4 ? 0x22d3ee : 0xffffff;
      const size = 1 + (Math.random() < 0.2 ? 1 : 0);
      const star = this.scene.add.rectangle(
        Math.random() * width,
        Math.random() * height,
        size, size, hue, 0.55,
      ).setDepth(DEPTH_LOW).setScrollFactor(0);
      this.children.push(star);
      // Long slow upward drift + twinkle.
      this.tweens.push(this.scene.tweens.add({
        targets: star,
        alpha: { from: 0.55, to: 0.15 },
        duration: 1500 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      }));
      this.tweens.push(this.scene.tweens.add({
        targets: star,
        y: '-=20',
        duration: 12000 + Math.random() * 8000,
        repeat: -1,
        ease: 'Linear',
        onRepeat: () => star.setPosition(Math.random() * width, height + 5),
      }));
    }

    // Bit-spark — single drifting glow with a small particle trail.
    const bitContainer = this.scene.add.container(-40, height * 0.4).setDepth(DEPTH_HIGH).setScrollFactor(0);
    const halo = this.scene.add.circle(0, 0, 12, 0x22d3ee, 0.22);
    const core = this.scene.add.circle(0, 0, 4, 0xffffff, 1);
    const mid = this.scene.add.circle(0, 0, 7, 0x22d3ee, 0.6);
    bitContainer.add([halo, mid, core]);
    this.children.push(bitContainer);
    this.tweens.push(this.scene.tweens.add({
      targets: [halo, mid],
      scale: { from: 1, to: 1.4 },
      alpha: { from: 0.6, to: 0.20 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
    // Diagonal drift across the title area; gentle vertical bob meantime.
    this.tweens.push(this.scene.tweens.add({
      targets: bitContainer,
      x: width + 40,
      duration: 28000,
      repeat: -1,
      ease: 'Linear',
      onRepeat: () => bitContainer.setPosition(-40, 80 + Math.random() * (height * 0.5)),
    }));
    this.tweens.push(this.scene.tweens.add({
      targets: bitContainer,
      y: '+=18',
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
  }
}
