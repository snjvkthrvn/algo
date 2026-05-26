/**
 * Boss_Shuffler - Array Plains finale (interactive multi-phase).
 *
 * Three phases combine the region's mechanics:
 *   1. Bubble Storm  - sort a row while the Shuffler periodically scrambles it
 *   2. Hash Storm    - rapid-fire crops; press the bucket key matching index%4
 *   3. Pair Lockdown - find target-sum pairs across three rounds
 *
 * No multiple choice. Every phase forces the player to perform the algorithm
 * the region taught them.
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS, SCENE_KEYS } from '../../config/constants';
import { VISUAL_REVAMP_KEYS, getImageAssetPath } from '../../config/assets';
import { audioManager } from '../../core/AudioManager';
import { JuiceSystem } from '../../systems/JuiceSystem';
import { RiverRow } from '../../ui/RiverRow';
import { PuzzleAmbience } from '../../ui/PuzzleAmbience';
import { PuzzlePreviewSidePanel } from '../../ui/PuzzlePreviewSidePanel';
import {
  isSortedAscending,
  swapAdjacent,
  hashBucket,
  isTwoSumPair,
} from '../../data/puzzles/arrayPlainsPuzzleLogic';
import { buildShufflerPreview } from '../../data/puzzles/puzzlePreviewLogic';
import { numberKeyToIndex } from '../../input/NumberKeyCommand';
import { playBossPhaseTransition } from '../../ui/BossPhaseTransition';
import { playBossEntryBanner } from '../../ui/BossEntryBanner';

type ShufflerPhase = 'bubble' | 'hash' | 'pair' | 'won';

const BUBBLE_START = [5, 2, 4, 1, 3];

interface HashRound {
  crop: string;
  letterIndex: number;
}

const HASH_ROUNDS: HashRound[] = [
  { crop: 'WHEAT', letterIndex: 22 },
  { crop: 'BEAN', letterIndex: 1 },
  { crop: 'CORN', letterIndex: 2 },
  { crop: 'RICE', letterIndex: 17 },
];

interface PairRound {
  values: ReadonlyArray<number>;
  target: number;
}

const PAIR_ROUNDS: PairRound[] = [
  { values: [3, 6, 2, 7, 4], target: 9 },
  { values: [5, 1, 8, 4, 2], target: 10 },
  { values: [7, 11, 6, 13, 4], target: 17 },
];

export class Boss_Shuffler extends BasePuzzleScene {
  private phase: ShufflerPhase = 'bubble';
  private mistakes = 0;
  private banner!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private row!: RiverRow;
  private actionLocked = false;
  private preview: PuzzlePreviewSidePanel | null = null;

  // Bubble phase
  private bubbleValues: number[] = [];
  private chaosTimer: Phaser.Time.TimerEvent | null = null;
  private chaosCountdownText: Phaser.GameObjects.Text | null = null;
  private nextChaosIn = 6;
  private bubbleSwaps = 0;

  // Hash phase
  private hashRoundIdx = 0;
  private hashCrop: HashRound | null = null;
  private hashTimer: Phaser.Time.TimerEvent | null = null;
  private hashTimeLeft = 0;

  // Pair phase
  private pairRoundIdx = 0;
  private pairSelected: number[] = [];
  private pairTiles: Phaser.GameObjects.Container[] = [];
  private pairValues: number[] = [];

  constructor() {
    super({ key: SCENE_KEYS.BOSS_SHUFFLER });
    this.puzzleId = 'boss_shuffler';
    this.puzzleName = 'The Shuffler';
    this.puzzleDescription = 'Three storms - sort, hash, pair. Outlast the chaos.';
    this.maxHints = 2;
  }

  protected getPuzzleBackdropKey(): string | null {
    return VISUAL_REVAMP_KEYS.PUZZLE_SHUFFLER_DOMAIN_BG;
  }

  // Preload the visible boss figure (Phase 16) — BasePuzzleScene only
  // loads the puzzle backdrop + chamber frame, not arbitrary asset keys
  // used in create(). Without this override the figure renders as a
  // missing-texture and the audit's "visible serpent/shuffler" fix
  // silently fails.
  preload(): void {
    super.preload();
    const key = VISUAL_REVAMP_KEYS.BOSS_SHUFFLER_FIGURE;
    const path = getImageAssetPath(key);
    if (path && !this.textures.exists(key)) {
      this.load.image(key, path);
    }
  }
  protected getPuzzleFrameFillAlpha(): number {
    return 0.03;
  }
  protected shouldSkipConceptBridge(): boolean {
    return true;
  }
  protected getConceptName(): string {
    return 'Array Plains Mastery';
  }
  // Override title-bar module label so the boss reads as a boss for the
  // entire encounter (not just during the 2.6s entry banner). Pairs with
  // BossEntryBanner for full coverage of the "this is the boss" cue.
  protected getModuleLabel(): string {
    return 'BOSS  •  FARMSTEAD';
  }

  create(): void {
    super.create();
    new PuzzleAmbience(this, 'farmland', { intensity: 1.1 });
    const { width, height } = this.cameras.main;

    // Boss entry banner — gold accent matches the farmland-harvest palette
    // and the chaos-storm theme. Banner overlays on top of the mounting
    // boss mechanic for ~2.6s, then onComplete fires (no-op — boss is
    // already running underneath).
    playBossEntryBanner(this, {
      bossName: 'The Shuffler',
      regionTag: 'Array Plains finale',
      thesis: 'Three storms — sort, hash, pair. Outlast the chaos.',
      accentColor: 0xfbbf24,
      onComplete: () => {},
    });

    // Visible boss figure (Phase 16) — the cloaked Shuffler looms above
    // the play area, juggling crops. Slow hover tween gives an
    // unsettled "watching" presence. Scroll factor 0 so it stays
    // anchored to the camera. Low alpha keeps it from competing with
    // the puzzle UI but still announces "the boss is here".
    const shufflerFigure = this.add.image(width / 2, 130, VISUAL_REVAMP_KEYS.BOSS_SHUFFLER_FIGURE)
      .setOrigin(0.5, 0.5)
      .setScale(0.6)
      .setAlpha(0.78)
      .setDepth(4)
      .setScrollFactor(0);
    this.tweens.add({
      targets: shufflerFigure,
      y: 124,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.banner = this.add.text(width / 2, 156, '', {
      fontSize: '17px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
      backgroundColor: '#1a1a3e',
      padding: { x: 14, y: 8 },
      stroke: '#06b6d4',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);

    this.statusText = this.add.text(width / 2, 196, '', {
      fontSize: '11px',
      fontFamily: FONTS.MONO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(20);

    this.detailText = this.add.text(width / 2, 232, '', {
      fontSize: '14px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
      stroke: '#081820',
      strokeThickness: 2,
      // Word-wrap so phase-1 instructions don't get clipped by the
      // Shuffler-Preview side panel on the right. The 14-px retro font is
      // wide enough that "press 1-4 to swap a tile with its right neighbour"
      // overran the right edge previously.
      wordWrap: { width: width - 360, useAdvancedWrap: true },
      align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.add.text(width / 2, height - 76, this.controlsHelp(), {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#88c070',
      align: 'center',
    }).setOrigin(0.5).setDepth(20);

    // Gold/chaos accent — matches the Shuffler's harvest-storm palette and
    // the Phase II Hash Storm banner.
    this.preview = new PuzzlePreviewSidePanel(this, {
      side: 'right', yOffset: -8,
      accentColor: 0xfbbf24, accentColorHex: '#fbbf24',
    });
    this.preview.setTitle('SHUFFLER PREVIEW');
    this.preview.show();

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.onKey(event));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.preview?.destroy();
      this.preview = null;
    });

    this.startBubblePhase();
  }

  private controlsHelp(): string {
    return 'phase 1 [1]-[4] swap a left tile  -  phase 2 [1]-[4] pick a bucket  -  phase 3 click two tiles';
  }

  // -------- Phase 1: Bubble Storm --------

  private startBubblePhase(): void {
    this.phase = 'bubble';
    this.bubbleValues = [...BUBBLE_START];
    this.bubbleSwaps = 0;
    this.nextChaosIn = 6;
    this.banner.setText('PHASE I  -  BUBBLE STORM');
    this.statusText.setText('Sort the row before the Shuffler scrambles it.');
    this.detailText.setText('press 1-4 to swap with the right neighbour');
    this.cycleRow(this.bubbleValues);
    this.startChaosTimer();
    this.refreshPreview();
  }

  private startChaosTimer(): void {
    this.chaosCountdownText?.destroy();
    this.chaosCountdownText = this.add.text(this.cameras.main.width / 2, 268, '', {
      fontSize: '11px',
      fontFamily: FONTS.RETRO,
      color: '#ef4444',
    }).setOrigin(0.5).setDepth(20);
    this.refreshChaosCountdown();

    this.chaosTimer?.destroy();
    this.chaosTimer = this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        this.nextChaosIn--;
        this.refreshChaosCountdown();
        if (this.nextChaosIn <= 0) {
          this.scrambleOnePair();
          this.nextChaosIn = 6;
          this.refreshChaosCountdown();
        }
      },
    });
  }

  private refreshChaosCountdown(): void {
    if (!this.chaosCountdownText) return;
    this.chaosCountdownText.setText(`SHUFFLE IN ${this.nextChaosIn}s`);
  }

  private scrambleOnePair(): void {
    if (this.phase !== 'bubble' || this.actionLocked) return;
    if (this.bubbleValues.length < 2) return;
    const i = Math.floor(Math.random() * (this.bubbleValues.length - 1));
    void this.row.animateSwap(i, i + 1);
    [this.bubbleValues[i], this.bubbleValues[i + 1]] = [this.bubbleValues[i + 1], this.bubbleValues[i]];
    JuiceSystem.cameraShake(this, 100, 0.0035);
    audioManager.playWrongTone();
    this.statusText.setText('The Shuffler twisted the row!');
    this.refreshPreview();
  }

  private async tryBubbleSwap(leftIndex: number): Promise<void> {
    if (this.phase !== 'bubble' || this.actionLocked) return;
    if (leftIndex < 0 || leftIndex >= this.bubbleValues.length - 1) return;

    this.actionLocked = true;
    const wasUseful = this.bubbleValues[leftIndex] > this.bubbleValues[leftIndex + 1];
    this.bubbleSwaps++;
    await this.row.animateSwap(leftIndex, leftIndex + 1);
    this.bubbleValues = swapAdjacent(this.bubbleValues, leftIndex);
    audioManager.playTone(wasUseful ? 480 : 200, 90, 'square');
    if (!wasUseful) this.mistakes++;

    this.actionLocked = false;
    this.refreshPreview();
    if (isSortedAscending(this.bubbleValues)) {
      this.completeBubblePhase();
    }
  }

  private completeBubblePhase(): void {
    this.chaosTimer?.destroy();
    this.chaosTimer = null;
    this.chaosCountdownText?.destroy();
    this.chaosCountdownText = null;
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
    // Phase transition banner — the Shuffler is shifting from sort to map.
    // Gold accent matches the hashing palette and foreshadows the bucket UI.
    playBossPhaseTransition(this, {
      phaseNumber: 'II',
      phaseName: 'HASH STORM',
      patternHint: 'Crops fall fast. The bucket is the answer.',
      accentColor: 0xfbbf24,
      onComplete: () => this.startHashPhase(),
    });
  }

  // -------- Phase 2: Hash Storm --------

  private startHashPhase(): void {
    this.phase = 'hash';
    this.hashRoundIdx = 0;
    this.banner.setText('PHASE II  -  HASH STORM');
    this.statusText.setText('Compute index % 4 and slam the bucket key.');
    this.cycleHashBuckets();
    this.queueNextHashCrop();
    this.refreshPreview();
  }

  private cycleHashBuckets(): void {
    if (this.row) this.row.destroy();
    this.row = new RiverRow(this, {
      values: ['B 0', 'B 1', 'B 2', 'B 3'],
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 64,
      tileSize: 96,
      gap: 16,
      showIndices: false,
    });
  }

  private queueNextHashCrop(): void {
    if (this.hashRoundIdx >= HASH_ROUNDS.length) {
      this.completeHashPhase();
      return;
    }
    this.hashCrop = HASH_ROUNDS[this.hashRoundIdx];
    this.hashTimeLeft = 5;
    this.detailText.setText(`${this.hashCrop.crop}: index ${this.hashCrop.letterIndex}   -   bucket = ?`);
    this.detailText.setColor('#fbbf24');
    this.refreshPreview();

    this.hashTimer?.destroy();
    this.hashTimer = this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        this.hashTimeLeft--;
        const c = this.hashCrop;
        if (c) {
          this.detailText.setText(`${c.crop}: index ${c.letterIndex}   -   ${this.hashTimeLeft}s`);
        }
        if (this.hashTimeLeft <= 0) this.handleHashTimeout();
      },
    });
  }

  private tryHashChoice(bucketIndex: number): void {
    if (this.phase !== 'hash' || !this.hashCrop) return;
    const crop = this.hashCrop;
    this.hashCrop = null;
    const expected = hashBucket(crop.letterIndex, 4);
    this.hashTimer?.destroy();
    this.hashTimer = null;

    if (bucketIndex === expected) {
      this.row.pulseTile(bucketIndex, COLORS.SUCCESS);
      audioManager.playCorrectTone();
      this.detailText.setText(`${crop.letterIndex} % 4 = ${expected}  -  routed.`);
      this.detailText.setColor('#88c070');
    } else {
      this.row.flashTile(bucketIndex);
      this.row.pulseTile(expected, COLORS.SUCCESS);
      audioManager.playWrongTone();
      this.mistakes++;
      this.detailText.setText(`${crop.letterIndex} % 4 = ${expected}  -  not bucket ${bucketIndex}.`);
      this.detailText.setColor('#ef4444');
    }
    this.hashRoundIdx++;
    this.refreshPreview();
    this.time.delayedCall(900, () => this.queueNextHashCrop());
  }

  private handleHashTimeout(): void {
    if (!this.hashCrop) return;
    const crop = this.hashCrop;
    this.hashCrop = null;
    const expected = hashBucket(crop.letterIndex, 4);
    this.row.flashTile(expected);
    audioManager.playWrongTone();
    this.mistakes++;
    this.detailText.setText(`Time's up. ${crop.letterIndex} % 4 was ${expected}.`);
    this.detailText.setColor('#ef4444');
    this.hashRoundIdx++;
    this.hashTimer?.destroy();
    this.hashTimer = null;
    this.refreshPreview();
    this.time.delayedCall(900, () => this.queueNextHashCrop());
  }

  private completeHashPhase(): void {
    this.hashTimer?.destroy();
    this.hashTimer = null;
    audioManager.playCorrectTone();
    JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
    // Final phase shift — pair lockdown uses complement lookup (two-sum).
    // Cyan accent signals "memory-of-what-you-saw" tools the player used in AP_4.
    playBossPhaseTransition(this, {
      phaseNumber: 'III',
      phaseName: 'PAIR LOCKDOWN',
      patternHint: 'Find the two tiles that complete the target weight.',
      accentColor: 0x06b6d4,
      onComplete: () => this.startPairPhase(),
    });
  }

  // -------- Phase 3: Pair Lockdown --------

  private startPairPhase(): void {
    this.phase = 'pair';
    this.pairRoundIdx = 0;
    this.banner.setText('PHASE III  -  PAIR LOCKDOWN');
    this.statusText.setText('Pick two tiles whose values reach the target.');
    if (this.row) this.row.destroy();
    this.queueNextPairRound();
    this.refreshPreview();
  }

  private queueNextPairRound(): void {
    if (this.pairRoundIdx >= PAIR_ROUNDS.length) {
      this.completePairPhase();
      return;
    }
    const round = PAIR_ROUNDS[this.pairRoundIdx];
    this.pairValues = [...round.values];
    this.pairSelected = [];
    this.detailText.setText(`TARGET = ${round.target}`);
    this.detailText.setColor('#fbbf24');
    this.renderPairTiles();
    this.refreshPreview();
  }

  private renderPairTiles(): void {
    for (const t of this.pairTiles) t.destroy();
    this.pairTiles = [];

    const { width, height } = this.cameras.main;
    const startX = width / 2 - (this.pairValues.length - 1) * 60;
    const y = height / 2 + 80;

    this.pairValues.forEach((value, i) => {
      const container = this.add.container(startX + i * 120, y).setDepth(20);
      const shadow = this.add.rectangle(3, 4, 84, 84, 0x081820, 0.32);
      const box = this.add.rectangle(0, 0, 84, 84, COLORS.FRAME_BG, 0.96)
        .setStrokeStyle(3, COLORS.FRAME_BORDER_LIGHT, 1)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(0, 0, String(value), {
        fontSize: '24px', fontFamily: FONTS.RETRO, color: '#081820',
      }).setOrigin(0.5);
      const key = this.add.text(0, 50, `${i + 1}`, {
        fontSize: '8px', fontFamily: FONTS.RETRO, color: '#346856',
      }).setOrigin(0.5);
      container.add([shadow, box, label, key]);

      box.on('pointerdown', () => this.pickPairTile(i));
      this.pairTiles.push(container);
    });
  }

  private pickPairTile(index: number): void {
    if (this.phase !== 'pair') return;
    if (this.pairSelected.includes(index)) return;
    this.pairSelected.push(index);
    const tile = this.pairTiles[index];
    const box = tile.list[1] as Phaser.GameObjects.Rectangle;
    box.setStrokeStyle(3, COLORS.CYAN_GLOW, 1);
    this.refreshPreview();

    if (this.pairSelected.length === 2) {
      const round = PAIR_ROUNDS[this.pairRoundIdx];
      const values = [this.pairValues[this.pairSelected[0]], this.pairValues[this.pairSelected[1]]];
      const ok = isTwoSumPair(this.pairValues, round.target, values);
      if (ok) {
        for (const i of this.pairSelected) {
          (this.pairTiles[i].list[1] as Phaser.GameObjects.Rectangle)
            .setStrokeStyle(3, COLORS.SUCCESS, 1);
        }
        audioManager.playCorrectTone();
        JuiceSystem.correctBurst(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
        this.pairRoundIdx++;
        this.time.delayedCall(900, () => this.queueNextPairRound());
      } else {
        for (const i of this.pairSelected) {
          (this.pairTiles[i].list[1] as Phaser.GameObjects.Rectangle)
            .setStrokeStyle(3, 0xef4444, 1);
        }
        audioManager.playWrongTone();
        JuiceSystem.cameraShake(this, 80, 0.0024);
        this.mistakes++;
        this.detailText.setText(`Sum was ${values[0] + values[1]}, not ${round.target}.`);
        this.detailText.setColor('#ef4444');
        this.time.delayedCall(700, () => {
          for (const i of this.pairSelected) {
            (this.pairTiles[i].list[1] as Phaser.GameObjects.Rectangle)
              .setStrokeStyle(3, COLORS.FRAME_BORDER_LIGHT, 1);
          }
          this.pairSelected = [];
          this.detailText.setText(`TARGET = ${round.target}`);
          this.detailText.setColor('#fbbf24');
          this.refreshPreview();
        });
      }
    }
  }

  private refreshPreview(): void {
    if (!this.preview) return;
    const selectedValues = this.pairSelected
      .map((index) => this.pairValues[index])
      .filter((value): value is number => value !== undefined);

    const preview = this.phase === 'bubble'
      ? buildShufflerPreview({
        phase: 'bubble',
        values: this.bubbleValues,
        nextChaosIn: this.nextChaosIn,
        swaps: this.bubbleSwaps,
      })
      : this.phase === 'hash'
        ? buildShufflerPreview({
          phase: 'hash',
          crop: this.hashCrop,
          bucketCount: 4,
          roundNumber: Math.min(this.hashRoundIdx + 1, HASH_ROUNDS.length),
          totalRounds: HASH_ROUNDS.length,
        })
        : this.phase === 'pair'
          ? buildShufflerPreview({
            phase: 'pair',
            values: this.pairValues,
            target: PAIR_ROUNDS[this.pairRoundIdx]?.target ?? 0,
            selectedValues,
            roundNumber: Math.min(this.pairRoundIdx + 1, PAIR_ROUNDS.length),
            totalRounds: PAIR_ROUNDS.length,
          })
          : buildShufflerPreview({ phase: 'won' });
    this.preview.setState(preview.state);
    this.preview.setNextAction(preview.next);
  }

  private completePairPhase(): void {
    this.phase = 'won';
    this.refreshPreview();
    this.cameras.main.flash(420, 224, 248, 208);
    const stars = this.mistakes <= 1 ? 3 : this.mistakes <= 4 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  // -------- Helpers --------

  private cycleRow(values: ReadonlyArray<string | number>): void {
    if (this.row) {
      this.cameras.main.flash(220, 6, 182, 212);
      this.row.destroy();
    }
    this.row = new RiverRow(this, {
      values,
      centerX: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 + 64,
      tileSize: 64,
      gap: 8,
    });
  }

  private onKey(event: KeyboardEvent): void {
    if (this.phase === 'bubble') {
      const idx = numberKeyToIndex(event.key, this.bubbleValues.length - 1);
      if (idx !== null) void this.tryBubbleSwap(idx);
      return;
    }
    if (this.phase === 'hash') {
      const idx = numberKeyToIndex(event.key, 4);
      if (idx !== null) this.tryHashChoice(idx);
      return;
    }
    if (this.phase === 'pair') {
      const idx = numberKeyToIndex(event.key, this.pairValues.length);
      if (idx !== null) this.pickPairTile(idx);
    }
  }

  protected displayHint(hintNumber: number): void {
    if (this.phase === 'bubble') {
      this.showMessage(
        hintNumber === 1
          ? 'Bubble sort: only swap when left > right. The Shuffler will retry.'
          : 'Sort fast - the Shuffler scrambles a random pair every 6s.',
        COLORS.GOLD_ACCENT
      );
      return;
    }
    if (this.phase === 'hash') {
      this.showMessage(
        hintNumber === 1
          ? 'bucket = letterIndex modulo 4. Watch the formula.'
          : `Current: ${this.hashCrop?.letterIndex} % 4 = ${this.hashCrop ? hashBucket(this.hashCrop.letterIndex, 4) : '?'}`,
        COLORS.GOLD_ACCENT
      );
      return;
    }
    if (this.phase === 'pair') {
      this.showMessage(
        hintNumber === 1
          ? 'For each value v, you need a partner = target - v.'
          : 'Scan left to right; check each later tile for the complement.',
        COLORS.GOLD_ACCENT
      );
    }
  }
}
