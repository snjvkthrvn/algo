import Phaser from 'phaser';

/**
 * Mini-game state singleton.
 *
 * Run state: score, combo, lives, per-round mistake count, per-round timer.
 * Bonuses (time, perfect) are awarded on endRound. Penalties subtract directly
 * from score without going negative. Score events always emit through the
 * shared emitter; the UI scene listens.
 *
 * Combo math: multiplier = 1 + floor(combo / 3). Combo only breaks on a P0_1
 * wrong hop (which is also the only life-losing event). Dead-end pulses in
 * P0_2 / P0_F cost score and break combo, but do NOT cost a life.
 */

export type ScoreReason =
  | 'step'
  | 'pulse'
  | 'altar'
  | 'finale'
  | 'timeBonus'
  | 'perfect'
  | 'penalty';

export type ScoreEvent = {
  amount: number;
  base: number;
  multiplier: number;
  reason: ScoreReason;
};

export const MAX_LIVES = 3;

export const POINTS = {
  step: 60,
  pulse: 240,
  altar: 300,
  finale: 1200,
} as const;

export const PENALTIES = {
  p1Miss: 40,
  p2DeadEnd: 50,
  pfDeadEnd: 80,
  pfMissedAltars: 120,
} as const;

class GameState {
  score = 0;
  combo = 0;
  bestCombo = 0;
  lives = MAX_LIVES;
  readonly maxLives = MAX_LIVES;
  currentPuzzle = '';
  scoreByPuzzle: Record<string, number> = {};

  roundStartedAt = 0;
  roundDuration = 0;
  roundMistakes = 0;
  roundActive = false;

  readonly emitter = new Phaser.Events.EventEmitter();

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.lives = this.maxLives;
    this.currentPuzzle = '';
    this.scoreByPuzzle = {};
    this.stopRoundSilent();
    this.emitter.emit('reset');
  }

  restoreLives(): void {
    this.lives = this.maxLives;
    this.emitter.emit('lives', this.lives);
  }

  setCurrentPuzzle(key: string): void {
    this.currentPuzzle = key;
    this.emitter.emit('puzzle', key);
  }

  bumpCombo(): void {
    this.combo += 1;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    this.emitter.emit('combo', this.combo);
  }

  breakCombo(): void {
    if (this.combo === 0) return;
    this.combo = 0;
    this.emitter.emit('combo', this.combo);
  }

  addScore(base: number, reason: ScoreReason): number {
    const multiplier = 1 + Math.floor(this.combo / 3);
    const awarded = base * multiplier;
    this.score += awarded;
    this.scoreByPuzzle[this.currentPuzzle] =
      (this.scoreByPuzzle[this.currentPuzzle] ?? 0) + awarded;
    const event: ScoreEvent = { amount: awarded, base, multiplier, reason };
    this.emitter.emit('score', event);
    return awarded;
  }

  awardBonus(amount: number, reason: ScoreReason): void {
    if (amount <= 0) return;
    this.score += amount;
    this.scoreByPuzzle[this.currentPuzzle] =
      (this.scoreByPuzzle[this.currentPuzzle] ?? 0) + amount;
    this.emitter.emit('score', {
      amount,
      base: amount,
      multiplier: 1,
      reason,
    } satisfies ScoreEvent);
  }

  losePoints(amount: number): number {
    const actual = Math.min(this.score, Math.max(0, amount));
    if (actual === 0) return 0;
    this.score -= actual;
    const cur = this.scoreByPuzzle[this.currentPuzzle] ?? 0;
    this.scoreByPuzzle[this.currentPuzzle] = Math.max(0, cur - actual);
    this.emitter.emit('score', {
      amount: -actual,
      base: -actual,
      multiplier: 1,
      reason: 'penalty',
    } satisfies ScoreEvent);
    return actual;
  }

  loseLife(): boolean {
    if (this.lives <= 0) return true;
    this.lives -= 1;
    this.breakCombo();
    this.emitter.emit('lives', this.lives);
    return this.lives <= 0;
  }

  startRound(duration: number): void {
    this.roundStartedAt = performance.now();
    this.roundDuration = duration;
    this.roundMistakes = 0;
    this.roundActive = true;
    this.emitter.emit('roundStart', duration);
  }

  recordMistake(): void {
    if (!this.roundActive) return;
    this.roundMistakes += 1;
  }

  endRound(maxTimeBonus: number, perfectBonus: number): {
    timeBonus: number;
    perfectBonus: number;
    wasPerfect: boolean;
  } {
    if (!this.roundActive) return { timeBonus: 0, perfectBonus: 0, wasPerfect: false };
    const elapsed = performance.now() - this.roundStartedAt;
    const remaining = Math.max(0, this.roundDuration - elapsed);
    const ratio = this.roundDuration > 0 ? remaining / this.roundDuration : 0;
    const timeBonus = Math.floor(maxTimeBonus * ratio);
    const wasPerfect = this.roundMistakes === 0;
    const perfectBonusAwarded = wasPerfect ? perfectBonus : 0;

    if (timeBonus > 0) this.awardBonus(timeBonus, 'timeBonus');
    if (perfectBonusAwarded > 0) this.awardBonus(perfectBonusAwarded, 'perfect');

    this.roundActive = false;
    this.emitter.emit('roundEnd');
    return { timeBonus, perfectBonus: perfectBonusAwarded, wasPerfect };
  }

  private stopRoundSilent(): void {
    if (!this.roundActive) return;
    this.roundActive = false;
    this.emitter.emit('roundEnd');
  }
}

export const GAME = new GameState();
