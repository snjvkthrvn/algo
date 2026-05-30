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

// Depth ladder for the additive particle/atmospheric overlays. The painted
// region backdrop (rendered by BasePuzzleScene) sits at depth -29; these
// constants leave room above it for layered motion (sky-level → scenery-level
// → haze/particle-level) without conflicting with puzzle UI at depth >= 0.
const DEPTH_SKY = -28;
const DEPTH_SCENERY = -22;
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

    // Round-3 art-pass strip-down: the painted `prologue_chamber.png` texture
    // (loaded by BasePuzzleScene at depth -29) now owns the nebula surface.
    // The earlier opaque `fillRect(0,0,width,height)` here completely covered
    // that painted backdrop — keep only the additive overlays now: faint hex
    // grid + drifting stars + floor glow + Watcher prism + scanlines.

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

    // Round-3 art-pass strip-down: the static `array_plains_grounded_v1.png`
    // texture (loaded by BasePuzzleScene at depth -29) now owns ALL scenery —
    // sky, sun, hills, clouds, windmill, barn, fence, wheat. This pass keeps
    // only the ambient motion overlay: drifting wheat-dust motes + a soft
    // sun-ray shimmer. See .tmp/audit_round3_phase2_visual.txt for the
    // before-state — Gemini scored procedural shots 1/5 ("MS Paint farm").

    // Drifting dust motes — keep them in the upper-middle band so they read
    // as airborne wheat dust drifting past the static backdrop.
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

    // Sun-ray shimmer sweep — a faint diagonal warm wash that drifts across,
    // implying late-afternoon sun across the farmland.
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

    // Round-3 art-pass strip-down: the static `twin_rivers_grounded_v1.png`
    // texture (loaded by BasePuzzleScene at depth -29) now owns ALL scenery —
    // sky, banks, river bodies, willow, palm, bridge. This pass keeps only
    // the ambient motion overlay: drifting leaves down the river-band and
    // (in dual mode) a faint center-seam mist that pulses. See
    // .tmp/audit_round3_phase2_visual.txt for the before-state — Gemini
    // scored procedural shots 1/5 ("literal solid blocks of color").

    // Approximate where the painted river-band sits in the texture so the
    // ambient leaves drift over water, not sky. The static backdrops are
    // composed so the rivers occupy roughly y=[34%, height-60].
    const riverTop = height * 0.34;
    const riverBottom = height - 60;

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

    // Mist along center seam (dual only) — reads as the contact line between
    // the two rivers' opposed currents.
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
