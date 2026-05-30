/**
 * P1_3_HashHopper — "Organize the Harvest" (AP_3)
 *
 * Overhaul (per puzzles_overhauled.md):
 *   • Falling crops stream from the top of the screen. The player routes each one
 *     into the correct bucket *before* it hits the ground.
 *   • Routing inputs:
 *       – Click / drag a crop onto a bucket
 *       – Number keys 1..4 send the *currently lowest* falling crop to that bucket
 *   • 3 rounds with shrinking fall time and tighter spawn gaps. MASTER deliberately
 *     creates hash collisions (multiple crops legitimately routed to the same bucket)
 *     so the player feels what a collision *is* — not a bug, just two keys colliding
 *     on the same modulo.
 *   • Visible collision counter on each bucket.
 *   • No fail-on-miss timer; missed crops add to mistake count for star rating only.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS, getImageAssetPath } from '../../config/assets';
import { audioManager } from '../../core/AudioManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { BitHint } from '../../entities/BitHint';
import { PuzzleAmbience } from '../../ui/PuzzleAmbience';
import { PuzzlePreviewSidePanel } from '../../ui/PuzzlePreviewSidePanel';
import { showRoundBanner } from '../../ui/RoundBanner';
import { showLessonCard } from '../../ui/LessonCard';
import { BitCompanion } from '../../ui/BitCompanion';
import { ARRAY_PLAINS_PUZZLE_THEME, type PuzzleTheme } from './puzzleTheme';
import type { RegionBackdropId, RegionBackdropOptions } from '../../ui/RegionBackdrop';
import {
  HASH_ROUNDS,
  starsFromMistakesAndHints,
  type FallingCrop,
  type HashRound,
} from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { buildHashRoutingPreview } from '../../data/puzzles/puzzlePreviewLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';
import { BruteForceActor, type BruteForceStrategy } from '../../entities/BruteForceActor';
import { PuzzlePhase } from '../../data/types';

/** Bucket fill colours used for chip backgrounds — one per crop family. */
const CROP_PALETTE: Record<string, { fill: number; stroke: number; glyph: string }> = {
  // Round-4: WHEAT + BEAN palettes shifted from pastel-pill toward warm wood
  // tones so they fit the painted farm backdrop instead of reading as web UI.
  WHEAT: { fill: 0xe8b94a, stroke: 0x8b6914, glyph: 'W' },
  BEAN:  { fill: 0x6cb060, stroke: 0x1a3a08, glyph: 'B' },
  CORN:  { fill: 0xfacc15, stroke: 0x854d0e, glyph: 'C' },
  RICE:  { fill: 0xfafafa, stroke: 0x71717a, glyph: 'R' },
  OAT:   { fill: 0xfcd34d, stroke: 0x92400e, glyph: 'O' },
  PEA:   { fill: 0x4ade80, stroke: 0x166534, glyph: 'P' },
  KALE:  { fill: 0x16a34a, stroke: 0x14532d, glyph: 'K' },
  YAM:   { fill: 0xc2410c, stroke: 0x7c2d12, glyph: 'Y' },
  FIG:   { fill: 0xa78bfa, stroke: 0x5b21b6, glyph: 'F' },
  PLUM:  { fill: 0x9333ea, stroke: 0x581c87, glyph: 'P' },
  BEET:  { fill: 0xb91c1c, stroke: 0x7f1d1d, glyph: 'B' },
  NUT:   { fill: 0x92400e, stroke: 0x451a03, glyph: 'N' },
  RYE:   { fill: 0xd4d4d8, stroke: 0x52525b, glyph: 'R' },
};

function paletteFor(crop: string): { fill: number; stroke: number; glyph: string } {
  return CROP_PALETTE[crop] ?? { fill: 0xe0f8d0, stroke: 0x346856, glyph: crop[0] ?? '?' };
}

interface Bucket {
  index: number;
  container: Phaser.GameObjects.Container;
  rim: Phaser.GameObjects.Rectangle;
  // Round-4 art-pass: `body` is now usually a pixel-art Image (the wooden
  // grain bucket sprite). Type widened to keep the Rectangle fallback path
  // valid when the texture key isn't loaded (extremely defensive — happens
  // only if BootScene preload is skipped, e.g. in a unit-test scene).
  body: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  countLabel: Phaser.GameObjects.Text;
  collidedLabel: Phaser.GameObjects.Text;
  worldX: number;
  worldY: number;
  topY: number;
  count: number;
  hadCollision: boolean;
}

interface ActiveCrop {
  crop: FallingCrop;
  container: Phaser.GameObjects.Container;
  bgChip: Phaser.GameObjects.Rectangle;
  spawnAt: number;
  arrivesAt: number;
  startY: number;
  endY: number;
  startX: number;
  routed: boolean;
  dragging: boolean;
}

const CROP_W = 96;
const CROP_H = 36;
const FALL_TOP_Y = 200;

export class P1_3_HashHopper extends BasePuzzleScene {
  private roundIndex = 0;
  private mistakesTotal = 0;
  private isResolving = false;

  private buckets: Bucket[] = [];
  private activeCrops: ActiveCrop[] = [];
  private spawnQueue: FallingCrop[] = [];
  private spawnTimer: Phaser.Time.TimerEvent | null = null;

  private floorY = 0;
  private bitHint: BitHint | null = null;
  private roundBadge!: Phaser.GameObjects.Text;
  private formulaPill: Phaser.GameObjects.Text | null = null;
  private statusPill!: Phaser.GameObjects.Text;
  private missedCount = 0;
  private routedCount = 0;
  private preview: PuzzlePreviewSidePanel | null = null;
  private bruteForce: BruteForceActor | null = null;
  private namedYet = false;

  constructor() {
    super({ key: SCENE_KEYS.PUZZLE_AP_3 });
    this.puzzleId = 'ap_3';
    this.puzzleName = 'Organize the Harvest';
    this.puzzleDescription = 'Hash each crop with its key % bucketCount. Route before it lands.';
  }

  preload(): void {
    super.preload();
    // Round-4 art-pass: explicitly preload the AP puzzle-prop sprites used by
    // this scene. BasePuzzleScene.preload only loads the backdrop + frame —
    // it doesn't know about puzzle-specific sprites, so without this opt-in
    // the `add.image(KEY)` calls below fall back to the rectangle path and
    // the painted pixel-art never reaches the texture cache.
    const propKeys = [
      VISUAL_REVAMP_KEYS.AP_GRAIN_BUCKET,
      VISUAL_REVAMP_KEYS.AP_CROP_WHEAT,
      VISUAL_REVAMP_KEYS.AP_CROP_BEAN,
    ];
    for (const key of propKeys) {
      const path = getImageAssetPath(key);
      if (path && !this.textures.exists(key)) {
        this.load.image(key, path);
      }
    }
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.ARRAY_PLAINS_BG;
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0;
  }
  protected getPuzzleTheme(): PuzzleTheme {
    return ARRAY_PLAINS_PUZZLE_THEME;
  }
  protected getRegionBackdrop(): { id: RegionBackdropId; options?: RegionBackdropOptions } | null {
    return { id: 'array-plains', options: { intensity: 0.6 } };
  }

  create(): void {
    // FEEL_IT diegetic puzzleDescription override — strip "hash each crop
    // with its key % bucketCount" which is the literal algorithm.
    if (HASH_ROUNDS[0].lesson.phase === PuzzlePhase.FEEL_IT) {
      this.puzzleDescription = 'The harvest is coming in. Each crop has its bucket — land them before they fall.';
    }
    super.create();
    new PuzzleAmbience(this, 'farmland', { intensity: 0.3 });

    const { width } = this.cameras.main;
    this.floorY = this.cameras.main.height - 110;
    new BitCompanion(this, { stage: 'byte', x: width - 92, y: 100, depth: 40, highlight: 3 });
    // GlitchCorner removed — replaced by phase-gated BruteForceActor in
    // mountFeelItPanels (degenerate-row mode: heading + ticking counter).

    this.buildRoundBadge(width);
    if (HASH_ROUNDS[0].lesson.phase !== PuzzlePhase.FEEL_IT) {
      this.buildFormulaPill(width);
    }
    this.buildStatusPill(width);
    // Preview side panel — algorithm-named in FEEL_IT, mount only in USE_IT.

    this.bitHint = new BitHint(this, 90, 260);
    this.bitHint.showNeutral();

    this.startRound(0).catch(() => undefined);

    this.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
      this.bitHint?.destroy();
      this.bitHint = null;
      this.spawnTimer?.destroy();
      this.preview?.destroy();
      this.preview = null;
      this.bruteForce?.destroy();
      this.bruteForce = null;
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.isResolving) return;
      const round = HASH_ROUNDS[this.roundIndex];
      if (!round) return;
      const idx = numberKeyToIndex(event.key, round.bucketCount);
      if (idx !== null) this.routeLowestCropTo(idx);
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Chrome
  // ──────────────────────────────────────────────────────────────────

  private buildRoundBadge(width: number): void {
    // Round-5: dropped the cyan-bordered dark-navy panel. The painted farm
    // backdrop + translucent title banner now own the top portion of the
    // screen — adding a separate chrome panel here re-introduced the
    // "kid put things together" feel. Round/bucket info now floats as a
    // single line of text under the title, themed per region.
    const theme = this.getPuzzleTheme();
    this.roundBadge = this.add.text(width / 2, 152, '', {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: theme.titleColor,
      stroke: theme.titleStroke,
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20).setAlpha(0.92);
  }

  private buildFormulaPill(width: number): void {
    this.formulaPill = this.add.text(width / 2, 196, '', {
      fontSize: '12px',
      fontFamily: FONTS.MONO,
      color: '#e0f8d0',
      backgroundColor: '#346856',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(20);
  }

  private buildStatusPill(width: number): void {
    this.statusPill = this.add.text(width - 120, 196, '', {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      backgroundColor: '#081820',
      padding: { x: 8, y: 4 },
      align: 'center',
    }).setOrigin(0.5).setDepth(20);
  }

  private updateStatusPill(round: HashRound): void {
    this.statusPill.setText(`ROUTED ${this.routedCount}/${round.stream.length}\nMISSED ${this.missedCount}`);
    this.refreshPreview();
  }

  private refreshPreview(): void {
    if (!this.preview) return;
    const round = HASH_ROUNDS[this.roundIndex];
    const crop = this.nextPreviewCrop();
    const preview = buildHashRoutingPreview({
      crop,
      bucketCount: round?.bucketCount ?? 4,
      routed: this.routedCount,
      missed: this.missedCount,
      total: round?.stream.length ?? 0,
    });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
  }

  private nextPreviewCrop(): FallingCrop | null {
    const lowest = this.activeCrops
      .filter((crop) => !crop.routed && !crop.dragging)
      .sort((a, b) => b.container.y - a.container.y)[0];
    return lowest?.crop ?? this.spawnQueue[0] ?? null;
  }

  // ──────────────────────────────────────────────────────────────────
  // Round lifecycle
  // ──────────────────────────────────────────────────────────────────

  private async startRound(idx: number): Promise<void> {
    this.roundIndex = idx;
    this.routedCount = 0;
    this.missedCount = 0;
    this.isResolving = true;

    const round = HASH_ROUNDS[idx];
    const total = HASH_ROUNDS.length;
    const isFeelIt = round.lesson.phase === PuzzlePhase.FEEL_IT;

    // FEEL_IT strips the formula "bucket = key % N" from chrome — it's
    // exactly what the player should derive.
    this.roundBadge.setText(
      isFeelIt
        ? `ROUND ${idx + 1}/${total}`
        : `ROUND ${idx + 1}/${total} · ${round.label} · bucket = key % ${round.bucketCount}`,
    );
    if (!isFeelIt && this.formulaPill) {
      this.formulaPill.setText(`bucket = letterIndex % ${round.bucketCount}`);
    }
    this.updateStatusPill(round);

    if (isFeelIt) {
      this.mountFeelItPanels();
    } else {
      this.mountUseItPanels();
      this.bruteForce?.fadeTo(0.32);
    }

    this.layoutBuckets(round);
    this.spawnQueue = [...round.stream];
    this.refreshPreview();

    const subtitle = round.hasCollisions
      ? `${round.label}  ·  expect collisions — two keys can hash to one bucket`
      : `${round.label}  ·  ${round.stream.length} crops at speed`;

    await showLessonCard(this, round.lesson, 'parchment');

    await showRoundBanner(this, {
      label: `ROUND ${idx + 1} / ${total}`,
      subtitle,
      accent: idx >= total - 1 ? COLORS.GOLD_ACCENT : COLORS.CYAN_GLOW,
    });

    this.isResolving = false;

    // Spawn loop: drop a crop every `spawnGapMs`. Crops are independent — they
    // don't wait for the prior one to land.
    this.spawnTimer?.destroy();
    this.spawnNext();
    this.spawnTimer = this.time.addEvent({
      delay: round.spawnGapMs, loop: true,
      callback: () => this.spawnNext(),
    });
  }

  private isFeelItRound(): boolean {
    return HASH_ROUNDS[this.roundIndex]?.lesson.phase === PuzzlePhase.FEEL_IT;
  }

  private mountFeelItPanels(): void {
    if (this.bruteForce) return;
    const { height } = this.cameras.main;
    this.bruteForce = new BruteForceActor(this, {
      x: 152, y: height - 92,
      strategy: makeHashingBruteStrategy(),
      heading: "⚠ GLITCH'S APPROACH",
      subtitle: '(tossing crops at random buckets...)',
      notDoneLabel: 'still fumbling',
      doneLabel: 'gave up',
      verbLabel: 'misroutes',
      depth: 40,
    });
  }

  private mountUseItPanels(): void {
    if (!this.preview) {
      this.preview = new PuzzlePreviewSidePanel(this, { side: 'right', yOffset: 24 });
      this.preview.setTitle('HASH PREVIEW');
      this.preview.show();
    }
    if (!this.formulaPill) {
      this.buildFormulaPill(this.cameras.main.width);
    }
  }

  // showNameItBeat lifted to BasePuzzleScene.

  private layoutBuckets(round: HashRound): void {
    this.buckets.forEach((b) => b.container.destroy());
    this.buckets = [];
    this.activeCrops.forEach((c) => c.container.destroy());
    this.activeCrops = [];

    const { width } = this.cameras.main;
    const n = round.bucketCount;
    const bucketW = 130;
    const gap = 24;
    const totalW = n * bucketW + (n - 1) * gap;
    const startX = width / 2 - totalW / 2 + bucketW / 2;
    const y = this.floorY;

    for (let i = 0; i < n; i++) {
      const x = startX + i * (bucketW + gap);
      this.buckets.push(this.createBucket(i, x, y, bucketW));
    }
  }

  private createBucket(index: number, x: number, y: number, w: number): Bucket {
    const h = 108;
    const container = this.add.container(x, y).setDepth(15);

    // Round-4 art-pass: replaced the flat 0x88c070 green HTML-div rectangle
    // with a hand-pixeled wooden grain bucket sprite (96x100 native) — the
    // round-4 in-context fit audit flagged this exact element ("look exactly
    // like raw HTML/CSS divs"). Native sprite is scaled with NN to whatever
    // `w x h` the caller asks for so existing collision math stays valid.
    const shadow = this.add.rectangle(3, 6, w, h, 0x000000, 0.35);
    const bodyKey = VISUAL_REVAMP_KEYS.AP_GRAIN_BUCKET;
    const body = (this.textures.exists(bodyKey)
      ? this.add.image(0, 0, bodyKey).setDisplaySize(w, h) as Phaser.GameObjects.GameObject
      : this.add.rectangle(0, 0, w, h, 0x88c070, 0.86).setStrokeStyle(2, 0x081820, 1) as Phaser.GameObjects.GameObject
    ) as Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    body.setInteractive({ useHandCursor: true });
    // Keep a slim brass-looking rim above the bucket so the round/phase
    // accent color (set elsewhere) still has a clean visual perch.
    const rim = this.add.rectangle(0, -h / 2, w + 6, 8, 0x346856, 1)
      .setOrigin(0.5, 0.5);

    // FEEL_IT strips the "(key % N = i)" formula line — that IS the algorithm.
    const labelText = this.isFeelItRound()
      ? `BUCKET ${index}`
      : `BUCKET ${index}\n(key % ${this.buckets.length || index + 1} = ${index})`;
    // Round-4: text colour changed dark-navy → wheat-cream + black stroke so
    // it stays readable on the new wooden bucket sprite (dark wood interior).
    const label = this.add.text(0, -h / 2 + 22, labelText, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#f0e4c2',
      stroke: '#1a0e04',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5);

    const countLabel = this.add.text(0, h / 2 - 26, 'count 0', {
      fontSize: '10px',
      fontFamily: FONTS.MONO,
      color: '#f0e4c2',
      stroke: '#1a0e04',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const collidedLabel = this.add.text(0, h / 2 - 14, '', {
      fontSize: '9px',
      fontFamily: FONTS.RETRO,
      color: '#ef4444',
    }).setOrigin(0.5);

    container.add([shadow, body, rim, label, countLabel, collidedLabel]);

    body.on('pointerdown', () => this.routeLowestCropTo(index));

    return {
      index, container, rim, body, label, countLabel, collidedLabel,
      worldX: x, worldY: y, topY: y - h / 2,
      count: 0, hadCollision: false,
    };
  }

  // Once buckets are created, refresh their `(key % N = i)` label with the real N.
  private refreshBucketLabels(round: HashRound): void {
    const isFeelIt = round.lesson.phase === PuzzlePhase.FEEL_IT;
    this.buckets.forEach((bucket) => {
      bucket.label.setText(
        isFeelIt
          ? `BUCKET ${bucket.index}`
          : `BUCKET ${bucket.index}\n(key % ${round.bucketCount} = ${bucket.index})`,
      );
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Spawning + falling
  // ──────────────────────────────────────────────────────────────────

  private spawnNext(): void {
    const round = HASH_ROUNDS[this.roundIndex];
    if (!round) return;
    this.refreshBucketLabels(round);

    if (this.spawnQueue.length === 0) {
      this.spawnTimer?.destroy();
      this.spawnTimer = null;
      return;
    }
    const crop = this.spawnQueue.shift()!;

    // Spawn above the target bucket sometimes, but jitter so player must read,
    // not just catch.
    const { width } = this.cameras.main;
    const lane = Phaser.Math.Between(0, round.bucketCount - 1);
    const targetBucket = this.buckets[lane];
    const startX = targetBucket
      ? targetBucket.worldX + Phaser.Math.Between(-30, 30)
      : Phaser.Math.Between(120, width - 120);

    this.activeCrops.push(this.createFallingCrop(crop, startX, round.fallMs));
    this.refreshPreview();
  }

  private createFallingCrop(crop: FallingCrop, startX: number, fallMs: number): ActiveCrop {
    const container = this.add.container(startX, FALL_TOP_Y).setDepth(40);
    const palette = paletteFor(crop.crop);

    // Soft glow halo behind the pouch.
    const halo = this.add.circle(0, 0, 32, palette.fill, 0.25);

    // The pouch — a wide chip drawn from Graphics. Round-4 narrowed the corner
    // radius (10→3) and shrank the alpha so it reads as a hand-pixel plaque
    // backdrop, not a web-UI pill. The audit explicitly called out the prior
    // smooth pastel pills as the worst in-context misfit on this scene.
    const pouch = this.add.graphics();
    pouch.fillStyle(palette.fill, 0.92);
    pouch.fillRoundedRect(-CROP_W / 2, -CROP_H / 2, CROP_W, CROP_H, 3);
    pouch.lineStyle(2, palette.stroke, 1);
    pouch.strokeRoundedRect(-CROP_W / 2, -CROP_H / 2, CROP_W, CROP_H, 3);
    // Pouch drawstring (small notch at top centre).
    pouch.fillStyle(palette.stroke, 1);
    pouch.fillRect(-6, -CROP_H / 2 - 3, 12, 4);

    const bgChip = this.add.rectangle(0, 0, CROP_W + 8, CROP_H + 8, 0xffffff, 0)
      .setInteractive({ useHandCursor: true, draggable: true });

    // Round-4 art-pass: prefer a pixel-art crop icon (wheat sheaf / bean pod)
    // over the prior letter-in-a-circle glyph. The icon reads faster and ties
    // the puzzle pieces to the painted farm backdrop. Falls back to the text
    // glyph when no sprite is registered for the crop type yet.
    const cropSpriteMap: Record<string, string | undefined> = {
      WHEAT: VISUAL_REVAMP_KEYS.AP_CROP_WHEAT,
      BEAN:  VISUAL_REVAMP_KEYS.AP_CROP_BEAN,
    };
    const cropSpriteKey = cropSpriteMap[crop.crop];
    const glyph: Phaser.GameObjects.Image | Phaser.GameObjects.Text =
      cropSpriteKey && this.textures.exists(cropSpriteKey)
        ? this.add.image(-CROP_W / 2 + 14, 0, cropSpriteKey).setDisplaySize(24, 24)
        : this.add.text(-CROP_W / 2 + 14, 0, palette.glyph, {
            fontSize: '11px', fontFamily: FONTS.RETRO, color: '#fffbe0',
          }).setOrigin(0.5);

    const label = this.add.text(8, -8, crop.crop, {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
    }).setOrigin(0.5);
    // FEEL_IT: show only the target bucket ("→ 2"). USE_IT shows the
    // full hash formula ("22 % 4 = 2") so the player can verify the math.
    const keyText = this.isFeelItRound()
      ? `→ ${crop.bucket}`
      : `${crop.letterIndex} % ${HASH_ROUNDS[this.roundIndex].bucketCount} = ${crop.bucket}`;
    const keyLabel = this.add.text(8, 6, keyText, {
      fontSize: '9px',
      fontFamily: FONTS.MONO,
      color: '#3a2418',
    }).setOrigin(0.5);

    container.add([halo, pouch, glyph, label, keyLabel, bgChip]);
    this.input.setDraggable(bgChip, true);

    // Subtle hover-bob so falling crops feel like they have weight.
    this.tweens.add({
      targets: halo, alpha: 0.05,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const active: ActiveCrop = {
      crop,
      container,
      bgChip,
      spawnAt: this.time.now,
      arrivesAt: this.time.now + fallMs,
      startY: FALL_TOP_Y,
      endY: this.floorY - 40,
      startX,
      routed: false,
      dragging: false,
    };

    bgChip.on('dragstart', () => {
      active.dragging = true;
      container.setDepth(60);
    });
    bgChip.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
      container.setPosition(dx, dy);
    });
    bgChip.on('dragend', (pointer: Phaser.Input.Pointer) => {
      active.dragging = false;
      container.setDepth(40);
      const bucket = this.bucketAtPointer(pointer.x, pointer.y);
      if (bucket) {
        this.resolveRouting(active, bucket.index);
      } else {
        // Snapped back to where it was; resume the fall from current y.
        active.startY = container.y;
        active.spawnAt = this.time.now;
        const total = fallMs * (1 - (container.y - FALL_TOP_Y) / (active.endY - FALL_TOP_Y));
        active.arrivesAt = this.time.now + Math.max(800, total);
        active.startX = container.x;
      }
    });

    return active;
  }

  private bucketAtPointer(px: number, py: number): Bucket | null {
    for (const bucket of this.buckets) {
      const dx = Math.abs(px - bucket.worldX);
      const dy = Math.abs(py - bucket.worldY);
      if (dx <= 70 && dy <= 60) return bucket;
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────
  // Tick: per-frame fall + miss detection
  // ──────────────────────────────────────────────────────────────────

  private tick(_time: number, _delta: number): void {
    if (this.isResolving) return;
    const now = this.time.now;

    for (let i = this.activeCrops.length - 1; i >= 0; i--) {
      const active = this.activeCrops[i];
      if (active.routed) continue;
      if (active.dragging) continue;

      const t = Phaser.Math.Clamp((now - active.spawnAt) / (active.arrivesAt - active.spawnAt), 0, 1);
      active.container.y = active.startY + (active.endY - active.startY) * t;

      if (t >= 1) {
        // Crop hit the floor without being routed.
        this.handleMiss(active);
        this.activeCrops.splice(i, 1);
        this.refreshPreview();
      }
    }
  }

  private handleMiss(active: ActiveCrop): void {
    audioManager.playWrongTone();
    JuiceSystem.wrongBurst(this, active.container.x, this.floorY - 10);
    JuiceSystem.cameraShake(this, 50, 0.0015);
    this.missedCount++;
    this.mistakesTotal++;
    this.bitHint?.showCold();
    this.updateStatusPill(HASH_ROUNDS[this.roundIndex]);
    active.container.destroy();

    this.showMessage(`${active.crop.crop} fell — should go in bucket ${active.crop.bucket}.`, COLORS.WARNING);

    this.maybeFinishRound();
  }

  // ──────────────────────────────────────────────────────────────────
  // Routing logic (drop or keypress)
  // ──────────────────────────────────────────────────────────────────

  private routeLowestCropTo(bucketIndex: number): void {
    if (this.activeCrops.length === 0) return;
    let lowest: ActiveCrop | null = null;
    for (const a of this.activeCrops) {
      if (a.routed || a.dragging) continue;
      if (!lowest || a.container.y > lowest.container.y) lowest = a;
    }
    if (lowest) this.resolveRouting(lowest, bucketIndex);
  }

  private resolveRouting(active: ActiveCrop, bucketIndex: number): void {
    if (active.routed) return;
    const round = HASH_ROUNDS[this.roundIndex];
    if (!round) return;
    active.routed = true;

    const expected = active.crop.bucket;
    const bucket = this.buckets[bucketIndex];
    if (!bucket) return;

    if (bucketIndex === expected) {
      // Animate the crop down into the bucket.
      this.tweens.add({
        targets: active.container,
        x: bucket.worldX,
        y: bucket.topY + 8,
        duration: 180,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // "Settle" pulse
          this.tweens.add({
            targets: active.container, scale: 0.6, alpha: 0,
            duration: 220, ease: 'Quad.easeIn',
            onComplete: () => active.container.destroy(),
          });
        },
      });

      audioManager.playCorrectTone();
      JuiceSystem.correctBurst(this, bucket.worldX, bucket.topY);

      bucket.count++;
      const labelBefore = bucket.count;
      bucket.countLabel.setText(`count ${bucket.count}`);
      // Collision viz: 2+ crops legitimately mapping here → mark as collision.
      if (labelBefore >= 2) {
        bucket.hadCollision = true;
        bucket.collidedLabel.setText('COLLISION');
        // Round-4: the body is now an Image (pixel-art bucket sprite) for
        // most code paths — setStrokeStyle only exists on Rectangle. Use
        // tint as the collision accent instead; falls back to setStrokeStyle
        // only when the Rectangle fallback path was taken.
        if (bucket.body instanceof Phaser.GameObjects.Image) {
          bucket.body.setTint(COLORS.GOLD_ACCENT);
        } else {
          bucket.body.setStrokeStyle(3, COLORS.GOLD_ACCENT, 1);
        }
      }
      this.routedCount++;
      this.bitHint?.showWarm();
    } else {
      // Wrong bucket — bounce the crop back to floor and miss it.
      this.tweens.add({
        targets: active.container,
        y: this.floorY - 60, x: active.container.x + Phaser.Math.Between(-30, 30),
        scale: 0.7, alpha: 0.4,
        duration: 320, ease: 'Sine.easeIn',
        onComplete: () => active.container.destroy(),
      });
      audioManager.playWrongTone();
      JuiceSystem.wrongBurst(this, bucket.worldX, bucket.topY);
      JuiceSystem.cameraShake(this, 50, 0.0015);
      this.missedCount++;
      this.mistakesTotal++;
      this.bitHint?.showCold();
      this.showMessage(`${active.crop.crop} hashes to ${expected}, not ${bucketIndex}.`, COLORS.WARNING);
    }

    this.updateStatusPill(round);

    const idx = this.activeCrops.indexOf(active);
    if (idx >= 0) this.activeCrops.splice(idx, 1);
    this.refreshPreview();

    this.maybeFinishRound();
  }

  // ──────────────────────────────────────────────────────────────────
  // Round / puzzle completion
  // ──────────────────────────────────────────────────────────────────

  private maybeFinishRound(): void {
    const round = HASH_ROUNDS[this.roundIndex];
    if (!round) return;
    const totalAccounted = this.routedCount + this.missedCount;
    if (totalAccounted < round.stream.length) return;
    if (this.spawnQueue.length > 0) return;

    this.isResolving = true;
    this.spawnTimer?.destroy();
    this.spawnTimer = null;

    JuiceSystem.screenFlash(this, COLORS.SUCCESS, 0.10, 240);

    const isFinal = this.roundIndex >= HASH_ROUNDS.length - 1;
    const summary = `Round ${this.roundIndex + 1} done · routed ${this.routedCount}, missed ${this.missedCount}`;
    this.showMessage(summary, this.missedCount === 0 ? COLORS.SUCCESS : COLORS.WARNING);

    if (isFinal) {
      this.bitHint?.celebrate();
      this.time.delayedCall(1400, () => {
        const stars = starsFromMistakesAndHints(this.mistakesTotal, this.hintsUsed);
        this.onPuzzleComplete(stars);
      });
      return;
    }

    this.time.delayedCall(1500, async () => {
      // FEEL_IT → fire the NAME_IT script beat once between rounds.
      const round = HASH_ROUNDS[this.roundIndex];
      if (
        round.lesson.phase === PuzzlePhase.FEEL_IT &&
        round.lesson.nameItBeat &&
        !this.namedYet
      ) {
        this.namedYet = true;
        this.bruteForce?.freeze();
        await this.showNameItBeat(round.lesson.nameItBeat);
      }
      this.startRound(this.roundIndex + 1).catch(() => undefined);
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Required hooks
  // ──────────────────────────────────────────────────────────────────

  protected displayHint(hintNumber: number): void {
    const round = HASH_ROUNDS[this.roundIndex];
    const lowest = this.activeCrops
      .filter((c) => !c.routed && !c.dragging)
      .sort((a, b) => b.container.y - a.container.y)[0];

    const messages = this.isFeelItRound()
      ? [
          lowest
            ? `${lowest.crop.crop} belongs in bucket ${lowest.crop.bucket}.`
            : 'A crop will fall soon. Watch its number.',
          'Each crop has its own bucket. Always the same one.',
          `Press 1..${round?.bucketCount ?? 4} to send the lowest crop, or drag it onto a bucket.`,
        ]
      : [
          `bucket = key % ${round?.bucketCount ?? 4}. Drag or press 1..${round?.bucketCount ?? 4}.`,
          lowest
            ? `Lowest crop: ${lowest.crop.crop} (key ${lowest.crop.letterIndex}) → bucket ${lowest.crop.bucket}.`
            : 'Wait for a crop to fall, then route it before it lands.',
          'Two keys hitting the same bucket is a hash collision. The formula still worked.',
        ];
    this.showMessage(messages[hintNumber - 1] ?? messages[0], COLORS.GOLD_ACCENT);
  }

  protected getConceptName(): string {
    return 'Hash Functions';
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Brute-force strategy — fed to BruteForceActor during FEEL_IT round 1.
//
// Hashing's brute-force foil is "toss into a random bucket and hope". We
// run BruteForceActor in degenerate-row mode (no tile row); the counter
// ticks up as Glitch racks up misroutes. The visible chaos is implied —
// while the player is routing crops to their rightful homes via the
// number on the sack, Glitch is making things worse over there.
// ──────────────────────────────────────────────────────────────────────────

function makeHashingBruteStrategy(): BruteForceStrategy {
  return {
    initialValues: [],
    nextMove: (vals) => vals,
    isSolved: () => false,
    tickIntervalMs: 800,
  };
}
