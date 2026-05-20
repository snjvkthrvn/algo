/**
 * RegionBackdrop — procedural animated backdrop per region.
 *
 * Replaces the static `PUZZLE_*_BG` images on the three production regions with
 * a self-rendering animated scene so each puzzle visibly inhabits its region:
 *
 *   prologue     — cosmic void, drifting stars + dust, faint hex grid, distant
 *                  Watcher prism drifting across the top, CRT scanlines.
 *   array-plains — sky gradient, sun, distant hills, rotating windmill, barn,
 *                  drifting dust motes, swaying wheat strip at the bottom,
 *                  rail fence, sun shimmer sweep.
 *   twin-rivers  — sky, dual blue/orange rivers flowing in opposite directions
 *                  (or a single converged river), green/orange banks, willow
 *                  + palm trees, drifting leaves.
 *
 * All layers render below puzzle objects (depth <= -8) and own their own
 * cleanup via SHUTDOWN handler.
 *
 * The backdrop is *purely decorative* — no pointer events, no game logic.
 */

import Phaser from 'phaser';

const DEPTH_SKY = -28;
const DEPTH_SCENERY = -22;
const DEPTH_NEAR = -16;
const DEPTH_HAZE = -10;

export type RegionBackdropId = 'prologue' | 'array-plains' | 'twin-rivers';

export interface RegionBackdropOptions {
  /**
   * Twin Rivers only — show the dual rivers (P2-1) vs. a single converged
   * river (P2-2 / P2-3). Defaults to `'dual'`.
   */
  readonly riverMode?: 'dual' | 'converged';
  /**
   * Density multiplier (stars, motes, leaves). Defaults to 1.
   */
  readonly intensity?: number;
}

export class RegionBackdrop {
  private readonly scene: Phaser.Scene;
  private readonly children: Phaser.GameObjects.GameObject[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];

  constructor(scene: Phaser.Scene, id: RegionBackdropId, options: RegionBackdropOptions = {}) {
    this.scene = scene;
    const intensity = options.intensity ?? 1;
    switch (id) {
      case 'prologue':
        this.buildPrologue(intensity);
        break;
      case 'array-plains':
        this.buildArrayPlains(intensity);
        break;
      case 'twin-rivers':
        this.buildTwinRivers(options.riverMode ?? 'dual', intensity);
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
  // Prologue · cosmic void
  // ──────────────────────────────────────────────────────────────────

  private buildPrologue(intensity: number): void {
    const { width, height } = this.scene.cameras.main;

    // Base nebula gradient — three radial passes painted via graphics.
    const sky = this.scene.add.graphics().setDepth(DEPTH_SKY).setScrollFactor(0);
    sky.fillStyle(0x06061a, 1);
    sky.fillRect(0, 0, width, height);
    sky.fillStyle(0x2a1a5a, 0.40);
    sky.fillEllipse(width * 0.30, height * 0.20, width * 0.70, height * 0.50);
    sky.fillStyle(0x3a1a6a, 0.55);
    sky.fillEllipse(width * 0.80, height * 0.80, width * 0.60, height * 0.60);
    sky.fillStyle(0x0d0a2a, 0.40);
    sky.fillRect(0, height * 0.60, width, height * 0.40);
    this.children.push(sky);

    // Hex grid — diagonal subtle lattice.
    const grid = this.scene.add.graphics().setDepth(DEPTH_SKY + 1).setScrollFactor(0).setAlpha(0.08);
    grid.lineStyle(1, 0x22d3ee, 0.6);
    for (let y = 0; y < height; y += 40) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(width, y);
      grid.strokePath();
    }
    for (let x = 0; x < width; x += 40) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
      grid.strokePath();
    }
    this.children.push(grid);

    // Drifting stars — three hues, varying speeds.
    const starCount = Math.floor(140 * intensity);
    for (let i = 0; i < starCount; i++) {
      const r = Math.random();
      const hue = r > 0.7 ? 0xa78bfa : r > 0.4 ? 0x22d3ee : 0xffffff;
      const size = 1 + Math.floor(Math.random() * 2);
      const x = Math.random() * width;
      const y = Math.random() * height;
      const star = this.scene.add.rectangle(x, y, size, size, hue, 0.85)
        .setDepth(DEPTH_SCENERY)
        .setScrollFactor(0);
      this.children.push(star);
      // Slow upward drift with twinkle.
      const dur = 6000 + Math.random() * 8000;
      this.tweens.push(this.scene.tweens.add({
        targets: star,
        y: -10,
        alpha: { from: 0.85, to: 0 },
        duration: dur,
        delay: Math.random() * 4000,
        repeat: -1,
        onRepeat: () => {
          star.setPosition(Math.random() * width, height + 10);
          star.setAlpha(0.85);
        },
      }));
    }

    // Faint floor platform glow at the bottom-center.
    const floor = this.scene.add.graphics().setDepth(DEPTH_HAZE).setScrollFactor(0);
    floor.fillStyle(0x22d3ee, 0.10);
    floor.fillEllipse(width / 2, height + 40, width * 0.85, 160);
    this.children.push(floor);

    // Distant Watcher prism — small diamond drifting slowly across the top.
    const prism = this.scene.add.container(-80, height * 0.18).setDepth(DEPTH_SCENERY + 1).setScrollFactor(0);
    const prismGfx = this.scene.add.graphics();
    prismGfx.fillStyle(0xa78bfa, 0.32);
    prismGfx.fillTriangle(0, -16, 16, 0, 0, 16);
    prismGfx.fillTriangle(0, -16, -16, 0, 0, 16);
    prismGfx.lineStyle(1, 0xa78bfa, 0.7);
    prismGfx.strokeTriangle(0, -16, 16, 0, 0, 16);
    prismGfx.strokeTriangle(0, -16, -16, 0, 0, 16);
    prismGfx.fillStyle(0xa78bfa, 0.6);
    prismGfx.fillRect(-3, -3, 6, 6);
    prism.add(prismGfx);
    prism.setAlpha(0.45);
    this.children.push(prism);
    this.tweens.push(this.scene.tweens.add({
      targets: prism,
      x: width + 120,
      duration: 38000,
      repeat: -1,
      ease: 'Linear',
      delay: -8000,
    }));
    this.tweens.push(this.scene.tweens.add({
      targets: prismGfx,
      angle: 360,
      duration: 16000,
      repeat: -1,
      ease: 'Linear',
    }));

    // CRT scanlines (soft).
    this.addScanlines(0.12);
  }

  // ──────────────────────────────────────────────────────────────────
  // Array Plains · pastoral farmland
  // ──────────────────────────────────────────────────────────────────

  private buildArrayPlains(intensity: number): void {
    const { width, height } = this.scene.cameras.main;

    // Sky gradient — sky / horizon / wheat / grass via four stacked rectangles.
    const sky = this.scene.add.graphics().setDepth(DEPTH_SKY).setScrollFactor(0);
    sky.fillGradientStyle(0x7fb8e0, 0x7fb8e0, 0xa0d8f0, 0xa0d8f0, 1);
    sky.fillRect(0, 0, width, height * 0.40);
    sky.fillGradientStyle(0xa0d8f0, 0xa0d8f0, 0xf5e0a4, 0xf5e0a4, 1);
    sky.fillRect(0, height * 0.40, width, height * 0.30);
    sky.fillGradientStyle(0xf5e0a4, 0xf5e0a4, 0x5b9a3c, 0x5b9a3c, 1);
    sky.fillRect(0, height * 0.70, width, height * 0.08);
    sky.fillStyle(0x2a5a1c, 1);
    sky.fillRect(0, height * 0.78, width, height * 0.22);
    this.children.push(sky);

    // Sun — bright disc top-right.
    const sun = this.scene.add.graphics().setDepth(DEPTH_SKY + 1).setScrollFactor(0);
    sun.fillStyle(0xfbbf24, 0.4);
    sun.fillCircle(width * 0.72, height * 0.18, 90);
    sun.fillStyle(0xfff5c2, 1);
    sun.fillCircle(width * 0.72, height * 0.18, 36);
    sun.fillStyle(0xfbbf24, 0.7);
    sun.fillCircle(width * 0.72, height * 0.18, 28);
    this.children.push(sun);

    // Distant hills.
    const hills = this.scene.add.graphics().setDepth(DEPTH_SCENERY).setScrollFactor(0);
    hills.fillStyle(0x2a5a1c, 0.55);
    hills.fillEllipse(width * 0.15, height * 0.62, 220, 90);
    hills.fillEllipse(width * 0.35, height * 0.62, 180, 70);
    hills.fillEllipse(width * 0.55, height * 0.62, 260, 100);
    hills.fillEllipse(width * 0.85, height * 0.62, 200, 80);
    this.children.push(hills);

    // Pixel clouds — small rectangles.
    const clouds: { x: number; y: number; w: number }[] = [
      { x: 80, y: 70, w: 140 },
      { x: 360, y: 50, w: 180 },
      { x: 700, y: 90, w: 120 },
      { x: 980, y: 60, w: 160 },
    ];
    for (const c of clouds) {
      const cloud = this.scene.add.graphics().setDepth(DEPTH_SCENERY + 1).setScrollFactor(0);
      cloud.fillStyle(0xf4f6fa, 1);
      cloud.fillRect(c.x, c.y, c.w, 22);
      cloud.fillRect(c.x + 12, c.y - 8, c.w - 24, 14);
      cloud.fillRect(c.x + 30, c.y - 14, c.w - 60, 10);
      this.children.push(cloud);
      // Drift slowly.
      this.tweens.push(this.scene.tweens.add({
        targets: cloud,
        x: '+=80',
        duration: 18000 + Math.random() * 8000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }

    // Windmill (left side) — rotating blades.
    const mx = width * 0.13;
    const my = height * 0.50;
    const tower = this.scene.add.graphics().setDepth(DEPTH_SCENERY + 2).setScrollFactor(0);
    tower.fillStyle(0xa06e3c, 1);
    tower.fillRect(mx - 11, my, 22, 110);
    tower.lineStyle(2, 0x3a1c0a, 1);
    tower.strokeRect(mx - 11, my, 22, 110);
    tower.fillStyle(0xa03830, 1);
    tower.fillTriangle(mx - 18, my, mx + 18, my, mx, my - 24);
    tower.lineStyle(2, 0x3a1c0a, 1);
    tower.strokeTriangle(mx - 18, my, mx + 18, my, mx, my - 24);
    this.children.push(tower);
    const blades = this.scene.add.container(mx, my - 8).setDepth(DEPTH_SCENERY + 3).setScrollFactor(0);
    const bladeGfx = this.scene.add.graphics();
    bladeGfx.fillStyle(0xf0e4c2, 1);
    bladeGfx.lineStyle(2, 0x3a1c0a, 1);
    bladeGfx.fillRect(-3, -32, 6, 64);
    bladeGfx.strokeRect(-3, -32, 6, 64);
    bladeGfx.fillRect(-32, -3, 64, 6);
    bladeGfx.strokeRect(-32, -3, 64, 6);
    bladeGfx.fillStyle(0x3a1c0a, 1);
    bladeGfx.fillCircle(0, 0, 4);
    blades.add(bladeGfx);
    this.children.push(blades);
    this.tweens.push(this.scene.tweens.add({
      targets: blades,
      angle: 360,
      duration: 8000,
      repeat: -1,
      ease: 'Linear',
    }));

    // Barn (right side).
    const bx = width * 0.84;
    const by = height * 0.48;
    const barn = this.scene.add.graphics().setDepth(DEPTH_SCENERY + 2).setScrollFactor(0);
    barn.fillStyle(0xa03830, 1);
    barn.fillRect(bx - 90, by + 30, 180, 110);
    barn.lineStyle(3, 0x3a1c0a, 1);
    barn.strokeRect(bx - 90, by + 30, 180, 110);
    barn.fillStyle(0x6a4220, 1);
    barn.fillTriangle(bx - 98, by + 30, bx + 98, by + 30, bx, by + 2);
    barn.lineStyle(3, 0x3a1c0a, 1);
    barn.strokeTriangle(bx - 98, by + 30, bx + 98, by + 30, bx, by + 2);
    // Siding lines.
    barn.lineStyle(2, 0x6a1c14, 0.55);
    for (const yOff of [50, 70, 90, 110]) {
      barn.beginPath();
      barn.moveTo(bx - 86, by + yOff);
      barn.lineTo(bx + 86, by + yOff);
      barn.strokePath();
    }
    // Doors.
    barn.fillStyle(0x3a1c0a, 1);
    barn.fillRect(bx - 20, by + 70, 40, 70);
    barn.lineStyle(1, 0x6a1c14, 1);
    barn.beginPath();
    barn.moveTo(bx, by + 70);
    barn.lineTo(bx, by + 140);
    barn.strokePath();
    this.children.push(barn);

    // Fence — across the wheat field top edge.
    const fy = height * 0.74;
    const fence = this.scene.add.graphics().setDepth(DEPTH_NEAR).setScrollFactor(0);
    fence.fillStyle(0x3a1c0a, 1);
    fence.fillRect(0, fy + 2, width, 2);
    fence.fillRect(0, fy + 9, width, 2);
    fence.fillStyle(0x6a4220, 1);
    for (let x = 12; x < width; x += 50) {
      fence.fillRect(x, fy - 2, 4, 16);
    }
    this.children.push(fence);

    // Wheat field — swaying strokes along the bottom.
    const wheatY = height * 0.82;
    const wheatCount = Math.floor(80 * intensity);
    for (let i = 0; i < wheatCount; i++) {
      const x = (i * 17) % width;
      const stalkH = 22 + ((i * 7) % 18);
      const stalk = this.scene.add.container(x, wheatY).setDepth(DEPTH_NEAR + 1).setScrollFactor(0);
      const stalkGfx = this.scene.add.graphics();
      stalkGfx.fillStyle(0xa06e1a, 1);
      stalkGfx.fillRect(-1, -stalkH * 0.7, 2, stalkH * 0.7);
      stalkGfx.fillStyle(0xe8b94a, 1);
      stalkGfx.fillRect(-2, -stalkH, 4, stalkH * 0.4);
      stalk.add(stalkGfx);
      this.children.push(stalk);
      this.tweens.push(this.scene.tweens.add({
        targets: stalk,
        angle: { from: -3, to: 3 },
        duration: 2200 + (i % 6) * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: (i % 6) * 180,
      }));
    }

    // Drifting dust motes.
    const motes = Math.floor(28 * intensity);
    for (let i = 0; i < motes; i++) {
      const mote = this.scene.add.rectangle(
        Math.random() * width,
        100 + Math.random() * (height * 0.5),
        2, 2,
        Math.random() < 0.3 ? 0xfde68a : 0xfffbe0,
        0.55,
      ).setDepth(DEPTH_HAZE).setScrollFactor(0);
      this.children.push(mote);
      this.tweens.push(this.scene.tweens.add({
        targets: mote,
        x: mote.x + (Math.random() - 0.5) * 80,
        y: mote.y - 80 - Math.random() * 60,
        alpha: 0,
        duration: 8000 + Math.random() * 6000,
        repeat: -1,
        delay: Math.random() * 4000,
        onRepeat: () => {
          mote.setPosition(Math.random() * width, height * 0.6 + Math.random() * (height * 0.2));
          mote.setAlpha(0.55);
        },
      }));
    }

    // Sun-ray shimmer sweep.
    const shimmer = this.scene.add.rectangle(0, 0, width, height * 0.35, 0xfff5c2, 0.10)
      .setOrigin(0, 0)
      .setDepth(DEPTH_HAZE + 1)
      .setScrollFactor(0)
      .setAngle(-12);
    shimmer.setAlpha(0);
    this.children.push(shimmer);
    this.tweens.push(this.scene.tweens.add({
      targets: shimmer,
      x: width,
      alpha: { from: 0.20, to: 0 },
      duration: 6000,
      repeat: -1,
      delay: 1500,
      ease: 'Sine.easeInOut',
    }));
  }

  // ──────────────────────────────────────────────────────────────────
  // Twin Rivers · dual/single river
  // ──────────────────────────────────────────────────────────────────

  private buildTwinRivers(mode: 'dual' | 'converged', intensity: number): void {
    const { width, height } = this.scene.cameras.main;

    // Sky.
    const sky = this.scene.add.graphics().setDepth(DEPTH_SKY).setScrollFactor(0);
    sky.fillGradientStyle(0xc8e8f8, 0xc8e8f8, 0xf6dca0, 0xf6dca0, 1);
    sky.fillRect(0, 0, width, height * 0.60);
    sky.fillGradientStyle(0xf6dca0, 0xf6dca0, 0xf0c7a0, 0xf0c7a0, 1);
    sky.fillRect(0, height * 0.60, width, height * 0.10);
    this.children.push(sky);

    // Banks (top strip).
    const bankTop = height * 0.25;
    const bankBottom = height * 0.34;
    const banks = this.scene.add.graphics().setDepth(DEPTH_SCENERY).setScrollFactor(0);
    if (mode === 'dual') {
      banks.fillStyle(0x5a8a6c, 1);
      banks.fillRect(0, bankTop, width / 2, bankBottom - bankTop);
      banks.fillStyle(0x3a6c4e, 1);
      banks.fillRect(0, bankBottom - 8, width / 2, 8);
      banks.fillStyle(0xa06832, 1);
      banks.fillRect(width / 2, bankTop, width / 2, bankBottom - bankTop);
      banks.fillStyle(0x6a4220, 1);
      banks.fillRect(width / 2, bankBottom - 8, width / 2, 8);
    } else {
      banks.fillStyle(0x5a8a6c, 1);
      banks.fillRect(0, bankTop, width, bankBottom - bankTop);
      banks.fillStyle(0x3a6c4e, 1);
      banks.fillRect(0, bankBottom - 8, width, 8);
    }
    this.children.push(banks);

    // Rivers — animated horizontal stripes via tile sprites would be ideal,
    // but we use a Graphics + tween of a tiled rectangle pattern via timer.
    const riverTop = bankBottom;
    const riverBottom = height - 60;
    if (mode === 'dual') {
      this.paintRiver(0, riverTop, width / 2, riverBottom - riverTop, 0x3a78a8, 0x2a5680, /*reverse*/ false, intensity);
      this.paintRiver(width / 2, riverTop, width / 2, riverBottom - riverTop, 0xd97a3a, 0xa04818, /*reverse*/ true, intensity);
      // Bridge.
      const bridge = this.scene.add.graphics().setDepth(DEPTH_SCENERY + 2).setScrollFactor(0);
      bridge.fillStyle(0x5a3a1a, 1);
      bridge.fillRect(width / 2 - 6, bankTop - 4, 12, riverBottom - bankTop + 8);
      bridge.fillStyle(0xa06a3c, 1);
      bridge.fillRect(width / 2 - 4, bankTop - 2, 8, riverBottom - bankTop + 4);
      this.children.push(bridge);
    } else {
      this.paintRiver(0, riverTop, width, riverBottom - riverTop, 0x3a78a8, 0x2a5680, /*reverse*/ false, intensity);
    }

    // Willow (left).
    const willow = this.scene.add.graphics().setDepth(DEPTH_SCENERY + 1).setScrollFactor(0);
    willow.fillStyle(0x3a2410, 1);
    willow.fillRect(width * 0.09, height * 0.20, 6, 60);
    willow.fillStyle(0x4a8a3a, 1);
    willow.fillRect(width * 0.07, height * 0.14, 36, 36);
    willow.fillStyle(0x5b9f50, 1);
    willow.fillRect(width * 0.075, height * 0.10, 32, 28);
    willow.fillStyle(0x6cb060, 1);
    willow.fillRect(width * 0.085, height * 0.075, 22, 20);
    this.children.push(willow);

    // Palm (right).
    const palm = this.scene.add.graphics().setDepth(DEPTH_SCENERY + 1).setScrollFactor(0);
    palm.fillStyle(0x6a3818, 1);
    palm.fillRect(width * 0.90, height * 0.18, 6, 70);
    palm.fillStyle(0x3c8038, 1);
    palm.fillRect(width * 0.86, height * 0.13, 14, 8);
    palm.fillRect(width * 0.91, height * 0.13, 14, 8);
    palm.fillRect(width * 0.88, height * 0.10, 16, 8);
    palm.fillStyle(0x4a9a3a, 1);
    palm.fillRect(width * 0.87, height * 0.14, 12, 6);
    palm.fillRect(width * 0.92, height * 0.14, 12, 6);
    palm.fillStyle(0x3a2010, 1);
    palm.fillCircle(width * 0.905, height * 0.17, 2);
    palm.fillCircle(width * 0.920, height * 0.17, 2);
    this.children.push(palm);

    // Drifting leaves on the rivers — left to right and right to left.
    const leafCount = Math.floor(6 * intensity);
    for (let i = 0; i < leafCount; i++) {
      const goingRight = mode === 'converged' || Math.random() < (i % 2 === 0 ? 0.7 : 0.3);
      const leafColor = (i % 3 === 0) ? 0xf5b06a : (i % 3 === 1) ? 0x6cb060 : 0xd97a3a;
      const y = riverTop + 20 + Math.random() * (riverBottom - riverTop - 40);
      const leaf = this.scene.add.rectangle(
        goingRight ? -10 : width + 10,
        y, 8, 4, leafColor, 0.85,
      ).setDepth(DEPTH_HAZE).setScrollFactor(0);
      this.children.push(leaf);
      this.tweens.push(this.scene.tweens.add({
        targets: leaf,
        x: goingRight ? width + 10 : -10,
        y: y + (Math.random() - 0.5) * 12,
        angle: 360,
        duration: 14000 + Math.random() * 6000,
        repeat: -1,
        delay: i * 1400,
        ease: 'Linear',
        onRepeat: () => {
          leaf.setPosition(goingRight ? -10 : width + 10, riverTop + 20 + Math.random() * (riverBottom - riverTop - 40));
        },
      }));
    }

    // Mist along center seam (dual only).
    if (mode === 'dual') {
      const mist = this.scene.add.rectangle(
        width / 2, (riverTop + riverBottom) / 2,
        80, riverBottom - riverTop, 0xffffff, 0.18,
      ).setOrigin(0.5, 0.5).setDepth(DEPTH_HAZE + 1).setScrollFactor(0);
      this.children.push(mist);
      this.tweens.push(this.scene.tweens.add({
        targets: mist,
        alpha: { from: 0.18, to: 0.06 },
        duration: 3200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }
  }

  private paintRiver(
    x: number, y: number, w: number, h: number,
    fillTop: number, fillBottom: number,
    reverse: boolean, intensity: number,
  ): void {
    // Base water gradient.
    const base = this.scene.add.graphics().setDepth(DEPTH_SCENERY + 1).setScrollFactor(0);
    base.fillGradientStyle(fillTop, fillTop, fillBottom, fillBottom, 1);
    base.fillRect(x, y, w, h);
    this.children.push(base);

    // Animated foam stripes — short rectangles that drift across.
    const stripeCount = Math.floor(28 * intensity);
    for (let i = 0; i < stripeCount; i++) {
      const sy = y + 10 + Math.random() * (h - 20);
      const sw = 12 + Math.random() * 28;
      const stripe = this.scene.add.rectangle(
        reverse ? x + w + sw : x - sw,
        sy, sw, 1.5,
        0xffffff,
        0.18 + Math.random() * 0.18,
      ).setDepth(DEPTH_SCENERY + 2).setScrollFactor(0);
      this.children.push(stripe);
      const dur = 6500 + Math.random() * 3500;
      this.tweens.push(this.scene.tweens.add({
        targets: stripe,
        x: reverse ? x - sw : x + w + sw,
        duration: dur,
        repeat: -1,
        delay: Math.random() * dur,
        ease: 'Linear',
        onRepeat: () => {
          stripe.setPosition(
            reverse ? x + w + sw : x - sw,
            y + 10 + Math.random() * (h - 20),
          );
          stripe.setAlpha(0.18 + Math.random() * 0.18);
        },
      }));
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private addScanlines(alpha: number): void {
    const { width, height } = this.scene.cameras.main;
    const g = this.scene.add.graphics().setDepth(DEPTH_HAZE + 2).setScrollFactor(0);
    g.fillStyle(0x000000, alpha);
    for (let y = 0; y < height; y += 3) {
      g.fillRect(0, y, width, 1);
    }
    this.children.push(g);
  }
}
