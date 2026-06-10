import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import type { PuzzleThemeId } from '../scenes/puzzles/puzzleTheme';

export type PuzzleActionKind = 'neutral' | 'correct' | 'wrong' | 'hint' | 'complete';

interface PuzzleKineticsOptions {
  themeId: PuzzleThemeId;
  width: number;
  height: number;
}

interface KineticPalette {
  rail: number;
  core: number;
  correct: number;
  wrong: number;
  hint: number;
  neutral: number;
}

const DEPTH_BACKPLANE = 5;
const DEPTH_ACTION = 4500;

const PALETTES: Record<PuzzleThemeId, KineticPalette> = {
  parchment: {
    rail: COLORS.FRAME_BORDER_LIGHT,
    core: COLORS.CYAN_GLOW,
    correct: COLORS.SUCCESS,
    wrong: COLORS.WARNING,
    hint: COLORS.GOLD_ACCENT,
    neutral: COLORS.CYAN_GLOW,
  },
  chamber: {
    rail: 0x22d3ee,
    core: 0xa78bfa,
    correct: 0x88c070,
    wrong: 0xff6b6b,
    hint: 0xfbbf24,
    neutral: 0x22d3ee,
  },
  prologue: {
    rail: 0x22d3ee,
    core: 0xa78bfa,
    correct: 0x88c070,
    wrong: 0xff6b6b,
    hint: 0xfbbf24,
    neutral: 0x22d3ee,
  },
  'array-plains': {
    rail: 0xf5b820,
    core: 0xc89858,
    correct: 0x88c070,
    wrong: 0xa03830,
    hint: 0xf5b820,
    neutral: 0xc89858,
  },
  'twin-rivers': {
    rail: 0x22d3ee,
    core: 0xf59e0b,
    correct: 0x88c070,
    wrong: 0xe8793d,
    hint: 0xfbbf24,
    neutral: 0x22d3ee,
  },
};

export class PuzzleKinetics {
  private readonly scene: Phaser.Scene;
  private readonly palette: KineticPalette;
  private readonly center: Phaser.Math.Vector2;
  private readonly bounds: Phaser.Geom.Rectangle;
  private readonly core: Phaser.GameObjects.Arc;
  private readonly rail: Phaser.GameObjects.Graphics;
  private readonly orbiters: Phaser.GameObjects.Rectangle[] = [];
  private destroyed = false;

  constructor(scene: Phaser.Scene, options: PuzzleKineticsOptions) {
    this.scene = scene;
    this.palette = PALETTES[options.themeId];
    this.center = new Phaser.Math.Vector2(options.width / 2, options.height / 2 + 28);
    this.bounds = new Phaser.Geom.Rectangle(72, 150, options.width - 144, options.height - 246);

    this.rail = scene.add.graphics().setDepth(DEPTH_BACKPLANE).setAlpha(0.72);
    this.drawRail();

    this.core = scene.add
      .circle(this.center.x, this.center.y, 9, this.palette.core, 0.28)
      .setStrokeStyle(2, this.palette.rail, 0.64)
      .setDepth(DEPTH_BACKPLANE + 1);

    scene.tweens.add({
      targets: this.core,
      alpha: 0.58,
      scale: 1.16,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.spawnOrbiters();

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  pulseAt(x: number, y: number, kind: PuzzleActionKind = 'neutral'): void {
    if (this.destroyed || !Number.isFinite(x) || !Number.isFinite(y)) return;

    const color = this.colorFor(kind);
    this.spawnActionRing(x, y, color, kind);
    this.spawnSignalBolt(x, y, color, kind);
    this.pulseCore(color, kind);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.destroy, this);
    this.scene.tweens.killTweensOf(this.core);
    this.rail.destroy();
    this.core.destroy();
    for (const orb of this.orbiters) {
      this.scene.tweens.killTweensOf(orb);
      orb.destroy();
    }
    this.orbiters.length = 0;
  }

  private drawRail(): void {
    const { x, y, width, height } = this.bounds;
    this.rail.clear();
    this.rail.lineStyle(2, this.palette.rail, 0.18);
    this.rail.strokeRoundedRect(x, y, width, height, 8);
    this.rail.lineStyle(1, this.palette.core, 0.13);
    this.rail.strokeRoundedRect(x + 18, y + 18, width - 36, height - 36, 6);

    this.rail.lineStyle(1, this.palette.rail, 0.12);
    this.rail.beginPath();
    this.rail.moveTo(x + 42, y + height / 2);
    this.rail.lineTo(this.center.x - 28, this.center.y);
    this.rail.moveTo(x + width - 42, y + height / 2);
    this.rail.lineTo(this.center.x + 28, this.center.y);
    this.rail.moveTo(x + width / 2, y + 32);
    this.rail.lineTo(this.center.x, this.center.y - 24);
    this.rail.moveTo(x + width / 2, y + height - 32);
    this.rail.lineTo(this.center.x, this.center.y + 24);
    this.rail.strokePath();
  }

  private spawnOrbiters(): void {
    const path = [
      new Phaser.Math.Vector2(this.bounds.left + 24, this.bounds.top + 24),
      new Phaser.Math.Vector2(this.bounds.right - 24, this.bounds.top + 24),
      new Phaser.Math.Vector2(this.bounds.right - 24, this.bounds.bottom - 24),
      new Phaser.Math.Vector2(this.bounds.left + 24, this.bounds.bottom - 24),
    ];

    for (let i = 0; i < 4; i += 1) {
      const orb = this.scene.add
        .rectangle(path[i].x, path[i].y, 10, 3, this.palette.rail, 0.28)
        .setDepth(DEPTH_BACKPLANE + 1);
      this.orbiters.push(orb);
      this.loopOrbiter(orb, path, i, 0);
    }
  }

  private loopOrbiter(
    orb: Phaser.GameObjects.Rectangle,
    path: Phaser.Math.Vector2[],
    startIndex: number,
    segment: number,
  ): void {
    if (this.destroyed || !orb.active) return;
    const from = path[(startIndex + segment) % path.length];
    const to = path[(startIndex + segment + 1) % path.length];
    orb.setPosition(from.x, from.y);
    this.scene.tweens.add({
      targets: orb,
      x: to.x,
      y: to.y,
      alpha: { from: 0.14, to: 0.42 },
      duration: 1400,
      ease: 'Sine.easeInOut',
      onComplete: () => this.loopOrbiter(orb, path, startIndex, segment + 1),
    });
  }

  private spawnActionRing(x: number, y: number, color: number, kind: PuzzleActionKind): void {
    const radius = kind === 'complete' ? 20 : 12;
    const ring = this.scene.add
      .circle(x, y, radius, color, 0.10)
      .setStrokeStyle(2, color, 0.9)
      .setDepth(DEPTH_ACTION);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: kind === 'complete' ? 2.7 : 1.9,
      duration: kind === 'wrong' ? 240 : 360,
      ease: kind === 'wrong' ? 'Quad.easeOut' : 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnSignalBolt(x: number, y: number, color: number, kind: PuzzleActionKind): void {
    const bolt = this.scene.add.rectangle(x, y, 7, 7, color, 0.92).setDepth(DEPTH_ACTION);
    const line = this.scene.add.graphics().setDepth(DEPTH_ACTION - 1);
    line.lineStyle(kind === 'complete' ? 3 : 2, color, kind === 'wrong' ? 0.45 : 0.32);
    line.beginPath();
    line.moveTo(x, y);
    line.lineTo(this.center.x, this.center.y);
    line.strokePath();

    this.scene.tweens.add({
      targets: bolt,
      x: this.center.x,
      y: this.center.y,
      alpha: 0.18,
      scale: 0.4,
      duration: kind === 'wrong' ? 170 : 260,
      ease: 'Sine.easeIn',
      onComplete: () => bolt.destroy(),
    });

    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => line.destroy(),
    });
  }

  private pulseCore(color: number, kind: PuzzleActionKind): void {
    const halo = this.scene.add
      .circle(this.center.x, this.center.y, kind === 'complete' ? 32 : 18, color, 0.12)
      .setStrokeStyle(2, color, kind === 'wrong' ? 0.55 : 0.72)
      .setDepth(DEPTH_ACTION);
    this.scene.tweens.add({
      targets: halo,
      alpha: 0,
      scale: kind === 'complete' ? 2.2 : 1.7,
      duration: kind === 'wrong' ? 250 : 420,
      ease: 'Sine.easeOut',
      onComplete: () => halo.destroy(),
    });
  }

  private colorFor(kind: PuzzleActionKind): number {
    switch (kind) {
      case 'correct':
      case 'complete':
        return this.palette.correct;
      case 'wrong':
        return this.palette.wrong;
      case 'hint':
        return this.palette.hint;
      default:
        return this.palette.neutral;
    }
  }
}
