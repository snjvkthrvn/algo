/**
 * PuzzleAmbience — region-themed ambient particle layers for puzzle scenes.
 *
 * Each flavour is a self-managing layer the scene can spawn once during
 * `create()` and forget about. The layer registers a SHUTDOWN handler so
 * orphan tweens/timers are cleaned up automatically.
 *
 *   cosmic   — drifting cyan/cream motes + faint constellation arcs
 *              (used by Prologue chamber puzzles + Boss Sentinel)
 *   farmland — sun-dappled dust motes drifting down + slow wheat-mote
 *              wash across the bottom third (Array Plains)
 *   river    — soft horizontal ripples + occasional foam flecks (Twin Rivers)
 *
 * All layers respect a depth ceiling well below puzzle objects (DEPTH_BG)
 * so the ambience never intercepts pointer events.
 */

import Phaser from 'phaser';

const DEPTH_BG = -16;
const DEPTH_FG = -10;

export type AmbienceFlavour = 'cosmic' | 'farmland' | 'river';

export interface AmbienceOptions {
  /** How dense the ambient layer should feel. Default 1.0. */
  intensity?: number;
}

export class PuzzleAmbience {
  private readonly scene: Phaser.Scene;
  private readonly children: Phaser.GameObjects.GameObject[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];

  constructor(scene: Phaser.Scene, flavour: AmbienceFlavour, options: AmbienceOptions = {}) {
    this.scene = scene;
    const intensity = options.intensity ?? 1;

    switch (flavour) {
      case 'cosmic':
        this.buildCosmic(intensity);
        break;
      case 'farmland':
        this.buildFarmland(intensity);
        break;
      case 'river':
        this.buildRiver(intensity);
        break;
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
  // Cosmic: drifting cyan/cream motes + soft constellation lines
  // ──────────────────────────────────────────────────────────────────

  private buildCosmic(intensity: number): void {
    const { width, height } = this.scene.cameras.main;
    const motes = Math.floor(80 * intensity);

    for (let i = 0; i < motes; i++) {
      const bright = Math.random() < 0.18;
      const dot = this.scene.add.circle(
        Math.random() * width,
        Math.random() * height,
        bright ? 1.6 : 1,
        bright ? 0x06b6d4 : 0xe0f8d0,
        Math.random() * 0.45 + 0.15,
      ).setDepth(DEPTH_BG);
      this.children.push(dot);
      this.tweens.push(this.scene.tweens.add({
        targets: dot,
        y: dot.y - 18 - Math.random() * 24,
        alpha: 0.05,
        duration: 3500 + Math.random() * 3500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      }));
    }

    // Constellation arcs — faint lines that never animate, drawn once.
    const constellation = this.scene.add.graphics().setDepth(DEPTH_BG + 1);
    constellation.lineStyle(1, 0x346856, 0.18);
    const arcCount = Math.floor(5 * intensity);
    for (let n = 0; n < arcCount; n++) {
      const cx = 80 + Math.random() * (width - 160);
      const cy = 60 + Math.random() * (height - 120);
      const arms = 3 + Math.floor(Math.random() * 2);
      let prev = { x: cx, y: cy };
      for (let i = 0; i < arms; i++) {
        const next = {
          x: prev.x + (Math.random() - 0.5) * 120,
          y: prev.y + (Math.random() - 0.5) * 120,
        };
        constellation.beginPath();
        constellation.moveTo(prev.x, prev.y);
        constellation.lineTo(next.x, next.y);
        constellation.strokePath();
        prev = next;
      }
    }
    this.children.push(constellation);
  }

  // ──────────────────────────────────────────────────────────────────
  // Farmland: sun motes drifting down + occasional warm flecks
  // ──────────────────────────────────────────────────────────────────

  private buildFarmland(intensity: number): void {
    const { width, height } = this.scene.cameras.main;
    const motes = Math.floor(60 * intensity);

    for (let i = 0; i < motes; i++) {
      const warm = Math.random() < 0.3;
      const dot = this.scene.add.circle(
        Math.random() * width,
        Math.random() * height,
        warm ? 1.6 : 1,
        warm ? 0xfde68a : 0xfffbe0,
        Math.random() * 0.4 + 0.12,
      ).setDepth(DEPTH_BG);
      this.children.push(dot);
      this.tweens.push(this.scene.tweens.add({
        targets: dot,
        y: dot.y + 24 + Math.random() * 28,
        x: dot.x + (Math.random() - 0.5) * 14,
        alpha: 0.03,
        duration: 4000 + Math.random() * 3500,
        yoyo: false,
        repeat: -1,
        ease: 'Sine.easeIn',
        delay: Math.random() * 3000,
        onRepeat: () => {
          dot.setPosition(Math.random() * width, -8);
          dot.setAlpha(Math.random() * 0.4 + 0.12);
        },
      }));
    }

    // Soft horizon haze near the floor of the screen.
    const haze = this.scene.add.rectangle(0, height - 70, width, 70, 0xfde68a, 0.05)
      .setOrigin(0)
      .setDepth(DEPTH_FG);
    this.children.push(haze);
    this.tweens.push(this.scene.tweens.add({
      targets: haze,
      alpha: 0.10,
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }));
  }

  // ──────────────────────────────────────────────────────────────────
  // River: horizontal drifting ripples + occasional foam flecks
  // ──────────────────────────────────────────────────────────────────

  private buildRiver(intensity: number): void {
    const { width, height } = this.scene.cameras.main;
    const ripples = Math.floor(28 * intensity);

    for (let i = 0; i < ripples; i++) {
      const y = 120 + Math.random() * (height - 220);
      const lineLen = 18 + Math.random() * 36;
      const goingRight = Math.random() < 0.5;
      const ripple = this.scene.add.rectangle(
        Math.random() * width,
        y,
        lineLen,
        1,
        0xa7e1ff,
        0.35 + Math.random() * 0.25,
      ).setDepth(DEPTH_BG);
      this.children.push(ripple);
      const dx = (goingRight ? 1 : -1) * (180 + Math.random() * 220);
      this.tweens.push(this.scene.tweens.add({
        targets: ripple,
        x: ripple.x + dx,
        alpha: 0.05,
        duration: 5200 + Math.random() * 3000,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 4000,
        onRepeat: () => {
          ripple.setPosition(goingRight ? -lineLen : width + lineLen, 120 + Math.random() * (height - 220));
          ripple.setAlpha(0.35 + Math.random() * 0.25);
        },
      }));
    }

    // Foam flecks: tiny white squares drifting horizontally on a longer cycle.
    const foam = Math.floor(8 * intensity);
    for (let i = 0; i < foam; i++) {
      const fleck = this.scene.add.rectangle(
        Math.random() * width, 140 + Math.random() * (height - 240),
        2, 2, 0xffffff, 0.55,
      ).setDepth(DEPTH_BG);
      this.children.push(fleck);
      this.tweens.push(this.scene.tweens.add({
        targets: fleck,
        x: fleck.x + (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 200),
        y: fleck.y + (Math.random() - 0.5) * 30,
        alpha: 0,
        duration: 6000 + Math.random() * 2500,
        repeat: -1,
        delay: Math.random() * 5000,
        onRepeat: () => {
          fleck.setPosition(Math.random() * width, 140 + Math.random() * (height - 240));
          fleck.setAlpha(0.55);
        },
      }));
    }
  }
}
