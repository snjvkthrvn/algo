import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS } from '../../config/constants';
import { colorToHex } from '../../utils/colors';
import { createChoiceButton } from '../../ui/ChoiceButton';

export interface ScriptedChoiceRound {
  title: string;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  success: string;
}

type Motif = 'river' | 'hash' | 'stack' | 'queue' | 'tree' | 'graph' | 'core';

export interface ScriptedChoiceTheme {
  markerLabel: string;
  panelColor: number;
  optionStrokeColor: number;
  accentColor: number;
  secondaryAccentColor: number;
  wrongMessage: string;
  hintLead: string;
  motif: Motif;
}

export abstract class ScriptedChoiceScene<T extends ScriptedChoiceRound> extends BasePuzzleScene {
  private roundIndex = 0;
  private mistakes = 0;
  private roundText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private previewText!: Phaser.GameObjects.Text;
  private optionContainer!: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Container;
  private isTransitioning = false;

  protected abstract rounds: readonly T[];
  protected abstract theme: ScriptedChoiceTheme;

  private readonly onChoiceKey = (event: KeyboardEvent) => {
    const index = Number.parseInt(event.key, 10) - 1;
    const round = this.rounds[this.roundIndex];
    if (!round || index < 0 || index >= round.options.length) return;
    this.choose(index);
  };

  create(): void {
    super.create();
    this.createMarker();
    this.createChoiceUi();
    this.renderRound();
    this.input.keyboard?.on('keydown', this.onChoiceKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.onChoiceKey);
    });
  }

  protected getPuzzleFrameFillAlpha(): number {
    return 0.03;
  }

  protected isCorrectChoice(round: T, choiceIndex: number): boolean {
    return choiceIndex === round.correctIndex;
  }

  private createMarker(): void {
    const { width, height } = this.cameras.main;
    this.marker = this.add.container(width / 2, height / 2 + 44);

    const base = this.add.rectangle(0, 0, 250, 118, this.theme.panelColor, 0.9)
      .setStrokeStyle(3, 0xe0f8d0, 0.84);
    const label = this.add.text(0, 42, this.theme.markerLabel, {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#e0f8d0',
    }).setOrigin(0.5);

    const motif = this.createMotif();
    this.marker.add([base, ...motif, label]);

    if (!this.prefersReducedMotion()) {
      this.tweens.add({
        targets: motif,
        alpha: 0.45,
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 100,
      });
    }
  }

  private createMotif(): Phaser.GameObjects.GameObject[] {
    switch (this.theme.motif) {
      case 'river':
        return this.createRiverMotif();
      case 'hash':
        return this.createHashMotif();
      case 'stack':
        return this.createStackMotif();
      case 'queue':
        return this.createQueueMotif();
      case 'tree':
        return this.createTreeMotif();
      case 'graph':
        return this.createGraphMotif();
      case 'core':
        return this.createCoreMotif();
    }
  }

  private createRiverMotif(): Phaser.GameObjects.GameObject[] {
    const blue = this.add.circle(-48, -18, 24, this.theme.secondaryAccentColor, 0.9)
      .setStrokeStyle(3, 0xe0f8d0, 0.88);
    const orange = this.add.circle(48, -18, 24, this.theme.accentColor, 0.9)
      .setStrokeStyle(3, 0xe0f8d0, 0.88);
    const link = this.add.rectangle(0, -18, 72, 8, 0xe0f8d0, 0.88)
      .setStrokeStyle(1, 0x081820, 0.5);
    const pointer = this.add.triangle(0, 18, -14, -10, 14, -10, 0, 12, this.theme.accentColor, 0.82)
      .setStrokeStyle(2, 0x081820, 0.52);
    return [link, blue, orange, pointer];
  }

  private createHashMotif(): Phaser.GameObjects.GameObject[] {
    const buckets = [-84, -42, 42, 84].map((x, index) => {
      const bucket = this.add.rectangle(x, -14, 28, 28, index % 2 === 0 ? this.theme.accentColor : this.theme.secondaryAccentColor, 0.78)
        .setStrokeStyle(2, 0x081820, 0.7)
        .setData('bucketIndex', index);
      bucket.setInteractive({ useHandCursor: true });
      bucket.on('pointerover', () => {
        bucket.setStrokeStyle(3, 0xe0f8d0, 1);
        this.showHashTooltip(bucket, index);
      });
      bucket.on('pointerout', () => {
        bucket.setStrokeStyle(2, 0x081820, 0.7);
        this.hideHashTooltip();
      });
      return bucket;
    });
    const items = [
      this.add.circle(-78, -20, 5, 0x081820, 0.9),
      this.add.circle(-38, -8, 5, 0x081820, 0.9),
      this.add.circle(46, -20, 5, 0x081820, 0.9),
      this.add.circle(86, -8, 5, 0x081820, 0.9),
      this.add.circle(-38, -20, 5, 0x081820, 0.9),
    ];
    return [...buckets, ...items];
  }

  private hashTooltip?: Phaser.GameObjects.Text;

  private showHashTooltip(bucket: Phaser.GameObjects.Rectangle, index: number): void {
    this.hideHashTooltip();
    const labels = ['key % 4 = 0', 'key % 4 = 1', 'key % 4 = 2', 'key % 4 = 3'];
    const { x, y } = bucket;
    this.hashTooltip = this.add.text(x, y + 28, labels[index], {
      fontSize: '8px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
  }

  private hideHashTooltip(): void {
    this.hashTooltip?.destroy();
    this.hashTooltip = undefined;
  }

  private highlightHashBucket(): void {
    if (this.theme.motif !== 'hash' || !this.marker) return;
    const buckets = this.marker.list.filter((obj): obj is Phaser.GameObjects.Rectangle =>
      obj instanceof Phaser.GameObjects.Rectangle && obj.getData('bucketIndex') !== undefined
    );
    if (buckets.length === 0) return;
    const target = buckets[Math.floor(Math.random() * buckets.length)];
    const orig = target.fillColor;
    target.setFillStyle(0xe0f8d0, 1);
    if (!this.prefersReducedMotion()) {
      this.tweens.add({
        targets: target,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => target.setFillStyle(orig, 0.78),
      });
    } else {
      this.time.delayedCall(220, () => target.setFillStyle(orig, 0.78));
    }
  }

  private createStackMotif(): Phaser.GameObjects.GameObject[] {
    return [-36, -12, 12, 36].map((y, index) => {
      const color = index === 0 ? this.theme.accentColor : index % 2 === 0 ? this.theme.secondaryAccentColor : 0xfbbf24;
      return this.add.rectangle(0, y - 20, 92, 18, color, 0.74)
        .setStrokeStyle(2, 0x081820, 0.7);
    });
  }

  private createQueueMotif(): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];
    const lane = this.add.rectangle(0, -18, 182, 28, 0xe0f8d0, 0.18)
      .setStrokeStyle(2, this.theme.secondaryAccentColor, 0.8);
    items.push(lane);
    [-72, -36, 0, 36, 72].forEach((x, index) => {
      const color = index === 0 ? this.theme.accentColor : this.theme.secondaryAccentColor;
      items.push(this.add.circle(x, -18, 11, color, 0.84)
        .setStrokeStyle(2, 0x081820, 0.7));
    });
    items.push(this.add.triangle(105, -18, 0, -12, 0, 12, 18, 0, this.theme.accentColor, 0.75));
    return items;
  }

  private createTreeMotif(): Phaser.GameObjects.GameObject[] {
    const g = this.add.graphics();
    g.lineStyle(3, this.theme.secondaryAccentColor, 0.74);
    g.beginPath();
    g.moveTo(0, -44);
    g.lineTo(-52, -10);
    g.moveTo(0, -44);
    g.lineTo(52, -10);
    g.moveTo(-52, -10);
    g.lineTo(-80, 20);
    g.moveTo(-52, -10);
    g.lineTo(-24, 20);
    g.moveTo(52, -10);
    g.lineTo(24, 20);
    g.moveTo(52, -10);
    g.lineTo(80, 20);
    g.strokePath();

    const nodes = [
      [0, -44],
      [-52, -10],
      [52, -10],
      [-80, 20],
      [-24, 20],
      [24, 20],
      [80, 20],
    ].map(([x, y], index) =>
      this.add.circle(x, y, index === 0 ? 12 : 9, index === 0 ? this.theme.accentColor : this.theme.secondaryAccentColor, 0.84)
        .setStrokeStyle(2, 0x081820, 0.7));
    return [g, ...nodes];
  }

  private createGraphMotif(): Phaser.GameObjects.GameObject[] {
    const points = [
      [-78, -28],
      [-28, -46],
      [28, -28],
      [76, -8],
      [18, 20],
      [-52, 20],
    ];
    const g = this.add.graphics();
    g.lineStyle(3, this.theme.secondaryAccentColor, 0.72);
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 4], [2, 5]].forEach(([a, b]) => {
      const [x1, y1] = points[a];
      const [x2, y2] = points[b];
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    });

    const nodes = points.map(([x, y], index) =>
      this.add.circle(x, y, index === 1 ? 12 : 9, index === 1 ? this.theme.accentColor : this.theme.secondaryAccentColor, 0.86)
        .setStrokeStyle(2, 0x081820, 0.72));
    return [g, ...nodes];
  }

  private createCoreMotif(): Phaser.GameObjects.GameObject[] {
    const items: Phaser.GameObjects.GameObject[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const isActive = row + col <= 3;
        items.push(this.add.rectangle(-72 + col * 36, -42 + row * 28, 26, 18, isActive ? this.theme.accentColor : this.theme.secondaryAccentColor, isActive ? 0.86 : 0.44)
          .setStrokeStyle(2, 0x081820, 0.7));
      }
    }
    items.push(this.add.circle(92, 0, 22, this.theme.accentColor, 0.34)
      .setStrokeStyle(3, this.theme.accentColor, 0.8));
    return items;
  }

  private createChoiceUi(): void {
    const { width, height } = this.cameras.main;

    this.roundText = this.add.text(width / 2, 156, '', {
      fontSize: '12px',
      fontFamily: FONTS.RETRO,
      color: '#081820',
      backgroundColor: '#e0f8d0',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5);

    this.promptText = this.add.text(width / 2, 206, '', {
      fontSize: '13px',
      fontFamily: FONTS.MONO,
      color: '#e0f8d0',
      backgroundColor: colorToHex(this.theme.panelColor),
      align: 'center',
      wordWrap: { width: 800 },
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5);

    this.optionContainer = this.add.container(0, height - 128);

    this.previewText = this.add.text(width / 2, height / 2 + 130, '', {
      fontSize: '10px',
      fontFamily: FONTS.RETRO,
      color: '#fbbf24',
      backgroundColor: '#081820',
      align: 'center',
      wordWrap: { width: 720 },
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setAlpha(0);
  }

  private renderRound(): void {
    const round = this.rounds[this.roundIndex];
    this.roundText.setText(round.title);
    this.promptText.setText(round.prompt);
    this.optionContainer.removeAll(true);

    const { width } = this.cameras.main;
    const startX = width / 2 - 300;
    round.options.forEach((option, index) => {
      const x = startX + index * 300;
      const handle = createChoiceButton(this, x, 0, index, option, {
        strokeColor: this.theme.optionStrokeColor,
        wrapWidth: 210,
        onPreviewStart: () => this.previewChoice(index),
        onPreviewEnd: () => this.clearChoicePreview(),
        onChoose: () => this.choose(index),
      });
      this.optionContainer.add(handle.container);
      handle.reveal(120 + index * 80);
    });
  }

  private choose(index: number): void {
    if (this.isTransitioning) return;
    const round = this.rounds[this.roundIndex];
    if (!round) return;
    if (!this.isCorrectChoice(round, index)) {
      this.isTransitioning = true;
      this.mistakes++;
      this.onWrongAnswer(this.theme.wrongMessage);
      this.time.delayedCall(600, () => {
        this.isTransitioning = false;
      });
      return;
    }

    this.isTransitioning = true;
    this.onCorrectAnswer(round.success);
    this.highlightHashBucket();
    this.roundIndex++;

    if (this.roundIndex >= this.rounds.length) {
      this.time.delayedCall(700, () => this.complete());
      return;
    }

    this.tweens.add({
      targets: this.marker,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 160,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.renderRound();
        this.isTransitioning = false;
      },
    });
  }

  private previewChoice(index: number): void {
    if (this.isTransitioning) return;
    if (this.mistakes === 0) return;
    const action = this.getPreviewAction(index);
    this.previewText.setText(`PREVIEW ${index + 1}: ${action}`);
    this.previewText.setAlpha(1);
    this.tweens.killTweensOf(this.marker);
    this.marker.setScale(1.04);
  }

  private clearChoicePreview(): void {
    if (!this.previewText || this.isTransitioning) return;
    this.previewText.setAlpha(0);
    this.tweens.killTweensOf(this.marker);
    this.marker.setScale(1);
  }

  private getPreviewAction(index: number): string {
    const labels: Record<Motif, string[]> = {
      river: ['moves the left pointer', 'moves the right pointer', 'locks a pair', 'resets the current'],
      hash: ['routes by key % bucket count', 'tests a collision bucket', 'stores the keyed value', 'retrieves from memory'],
      stack: ['touches the top frame first', 'pushes a new frame', 'pops the recent frame', 'checks the base case'],
      queue: ['serves the front item', 'enqueues at the back', 'prioritizes without losing order', 'rotates the next turn'],
      tree: ['compares at the root', 'branches left or right', 'visits a child node', 'balances by depth'],
      graph: ['lights a neighbor edge', 'marks a visited node', 'tests for a cycle', 'connects a component'],
      core: ['updates a subproblem cell', 'reuses cached state', 'chooses the recurrence', 'combines earlier patterns'],
    };
    const actions = labels[this.theme.motif];
    return actions[index % actions.length];
  }

  private complete(): void {
    const stars = this.mistakes === 0 && this.hintsUsed === 0 ? 3
      : this.mistakes <= 2 && this.hintsUsed <= 1 ? 2
        : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const hints = [
      this.theme.hintLead,
      'Trace the state change first: reject any option that breaks the invariant named in the prompt.',
    ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
