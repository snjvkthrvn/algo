import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { COLORS, FONTS } from '../../config/constants';
import { audioManager } from '../../core/AudioManager';
import { colorToHex } from '../../utils/colors';
import { createChoiceButton } from '../../ui/ChoiceButton';

export interface ScriptedChoiceRound {
  title: string;
  prompt: string;
  options: readonly string[];
  correctIndex: number;
  success: string;
}

type Motif = 'queue' | 'tree' | 'graph' | 'core';

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
  private optionContainer!: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Container;

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
      const button = createChoiceButton(this, x, 0, index, option, {
        strokeColor: this.theme.optionStrokeColor,
        wrapWidth: 210,
        onChoose: () => this.choose(index),
      });
      this.optionContainer.add(button);
    });
  }

  private choose(index: number): void {
    const round = this.rounds[this.roundIndex];
    if (!this.isCorrectChoice(round, index)) {
      this.mistakes++;
      this.attempts++;
      audioManager.playWrongTone();
      this.showMessage(this.theme.wrongMessage, COLORS.WARNING);
      return;
    }

    audioManager.playCorrectTone();
    this.showMessage(round.success, COLORS.SUCCESS);
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
      onComplete: () => this.renderRound(),
    });
  }

  private complete(): void {
    const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
    this.onPuzzleComplete(stars);
  }

  protected displayHint(hintNumber: number): void {
    const round = this.rounds[this.roundIndex];
    const hints = [
      this.theme.hintLead,
      `This step wants: ${round.options[round.correctIndex]}.`,
    ];
    this.showMessage(hints[hintNumber - 1] ?? hints[0], COLORS.GOLD_ACCENT);
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
