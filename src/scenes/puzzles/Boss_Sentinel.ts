/**
 * Boss: The Fractured Sentinel
 * Script-aligned three-phase boss:
 * 1. Sequence test with slow orbs
 * 2. Mapping test while the arena shifts
 * 3. Combined test requiring both sequence memory and shard placement
 */

import Phaser from 'phaser';
import { BasePuzzleScene } from './BasePuzzleScene';
import { SCENE_KEYS, COLORS } from '../../config/constants';
import { adjustBrightness } from '../../utils/colors';
import { audioManager } from '../../core/AudioManager';
import { shuffleArray } from '../../utils/math';
import { FLOW_CONSOLE_CANON } from '../../prologue/flowConsoleCanon';
import {
  SENTINEL_SCRIPT_PHASES,
  getNextSentinelPhase,
  type SentinelScriptPhase,
} from '../../prologue/sentinelScriptRules';

type BossPhase = 'INTRO' | 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | 'VICTORY';
type PhaseState = 'SHOWING' | 'PLAYER_TURN' | 'WAITING';

interface ArenaTile {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  index: number;
  x: number;
  y: number;
}

interface Socket {
  container: Phaser.GameObjects.Container;
  index: number;
  filled: boolean;
  shardColor: number;
  x: number;
  y: number;
}

interface BossShard {
  color: number;
  placed: boolean;
  container: Phaser.GameObjects.Container;
}

export class Boss_Sentinel extends BasePuzzleScene {
  private arenaTiles: ArenaTile[] = [];
  private sockets: Socket[] = [];
  private sentinelContainer!: Phaser.GameObjects.Container;

  private bossPhase: BossPhase = 'INTRO';
  private phaseState: PhaseState = 'WAITING';
  private scriptPhase: SentinelScriptPhase = 'sequence_test';

  private p1Sequences: number[][] = [];
  private p1CurrentSeq = 0;
  private p1PlayerInput: number[] = [];
  private p1SequencesComplete = 0;

  private p2Shards: BossShard[] = [];
  private heldP2Shard: BossShard | null = null;
  private hazardOrbTimer: Phaser.Time.TimerEvent | null = null;

  private p3Round = 0;
  private p3MaxRounds = 3;
  private combinedRoundSolved = false;
  private combinedShardPlaced = false;
  private combinedTargetSocketIndex: number | null = null;

  private phaseAttempts: number[] = [0, 0, 0];
  private phaseText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.BOSS_SENTINEL });
    this.puzzleId = 'boss_sentinel';
    this.puzzleName = 'The Fractured Sentinel';
    this.puzzleDescription = 'Face the Sequence Test, the Mapping Test, and the Combined Test.';
    this.maxHints = 2;
  }

  protected shouldSkipConceptBridge(): boolean {
    return true;
  }

  create(): void {
    super.create();

    const { width, height } = this.cameras.main;

    this.phaseText = this.add.text(width / 2, 140, SENTINEL_SCRIPT_PHASES[0].title, {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ef4444',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    this.createArena(width / 2, height / 2 + 30);
    this.createSentinel(width / 2, height / 2 + 30);

    this.showMessage('GUARDIAN: ACTIVE', COLORS.ERROR);
    this.time.delayedCall(1000, () => {
      this.showMessage('Function: AUTHENTICATE', COLORS.CYAN_GLOW);
    });
    this.time.delayedCall(2200, () => {
      this.bossPhase = 'PHASE_1';
      this.startPhase1();
    });
  }

  private createArena(cx: number, cy: number): void {
    const radius = 200;

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 50, 50, COLORS.COSMIC_PURPLE, 0.8);
      bg.setStrokeStyle(2, COLORS.CYAN_GLOW, 0.4);
      bg.setInteractive({ useHandCursor: true });
      container.add(bg);

      const label = this.add.text(0, 0, `${i + 1}`, {
        fontSize: '14px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#4a4a6a',
      }).setOrigin(0.5);
      container.add(label);

      bg.on('pointerdown', () => this.onArenaTileClick(i));
      this.arenaTiles.push({ container, bg, index: i, x, y });
    }

    const socketRadius = 120;
    for (let i = 0; i < FLOW_CONSOLE_CANON.length; i++) {
      const angle = (Math.PI * 2 * i) / FLOW_CONSOLE_CANON.length - Math.PI / 2;
      const x = cx + Math.cos(angle) * socketRadius;
      const y = cy + Math.sin(angle) * socketRadius;
      const color = FLOW_CONSOLE_CANON[i].colorValue;

      const container = this.add.container(x, y);
      container.setVisible(false);

      const socketBg = this.add.rectangle(0, 0, 40, 40, 0x1a1a2e, 0.8);
      socketBg.setStrokeStyle(2, color, 0.6);
      container.add(socketBg);

      const socketCore = this.add.circle(0, 0, 8, color, 0.25);
      container.add(socketCore);

      this.sockets.push({
        container,
        index: i,
        filled: false,
        shardColor: color,
        x,
        y,
      });
    }
  }

  private createSentinel(cx: number, cy: number): void {
    this.sentinelContainer = this.add.container(cx, cy);

    const body = this.add.graphics();
    body.fillStyle(COLORS.ERROR, 0.6);
    body.fillTriangle(0, -30, -25, 20, 25, 20);
    body.lineStyle(2, COLORS.ERROR, 0.8);
    body.strokeTriangle(0, -30, -25, 20, 25, 20);

    const eye = this.add.circle(0, -5, 8, COLORS.ERROR, 0.9);
    const pupil = this.add.circle(0, -5, 4, 0xffffff, 0.9);
    this.sentinelContainer.add([body, eye, pupil]);

    this.tweens.add({
      targets: this.sentinelContainer,
      y: cy - 8,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private advanceScriptPhase(): void {
    if (this.scriptPhase !== 'victory') {
      this.scriptPhase = getNextSentinelPhase(this.scriptPhase);
    }
  }

  private startPhase1(): void {
    this.scriptPhase = 'sequence_test';
    this.phaseText.setText(SENTINEL_SCRIPT_PHASES[0].title);
    this.p1CurrentSeq = 0;
    this.p1SequencesComplete = 0;
    this.p1Sequences = [];

    for (let s = 0; s < 2; s++) {
      const seq: number[] = [];
      for (let i = 0; i < 5; i++) {
        let next: number;
        do {
          next = Math.floor(Math.random() * 8);
        } while (seq.length > 0 && next === seq[seq.length - 1]);
        seq.push(next);
      }
      this.p1Sequences.push(seq);
    }

    this.startSlowOrbPattern();
    this.showP1Sequence();
  }

  private startSlowOrbPattern(): void {
    this.hazardOrbTimer?.destroy();
    this.hazardOrbTimer = this.time.addEvent({
      delay: 2400,
      loop: true,
      callback: () => this.spawnOrb(4200),
    });
  }

  private stopSlowOrbPattern(): void {
    this.hazardOrbTimer?.destroy();
    this.hazardOrbTimer = null;
  }

  private showP1Sequence(): void {
    this.phaseState = 'SHOWING';
    const seq = this.p1Sequences[this.p1CurrentSeq];
    this.p1PlayerInput = [];

    let delay = 500;
    for (const tile of seq) {
      this.time.delayedCall(delay, () => {
        this.flashArenaTile(tile, COLORS.CYAN_GLOW, 550);
        audioManager.playTone(300 + tile * 60, 140, 'sine');
      });
      delay += 800;
    }

    this.time.delayedCall(delay + 200, () => {
      this.phaseState = 'PLAYER_TURN';
      this.showMessage('Repeat the pattern while the orbs drift.', COLORS.GOLD_ACCENT);
    });
  }

  private onArenaTileClick(index: number): void {
    if (this.phaseState !== 'PLAYER_TURN') return;

    if (this.bossPhase === 'PHASE_1') {
      this.handleP1Input(index);
    } else if (this.bossPhase === 'PHASE_3') {
      this.handleP3PatternInput(index);
    }
  }

  private handleP1Input(index: number): void {
    const seq = this.p1Sequences[this.p1CurrentSeq];
    const expected = seq[this.p1PlayerInput.length];

    this.flashArenaTile(index, index === expected ? COLORS.SUCCESS : COLORS.ERROR, 220);

    if (index === expected) {
      audioManager.playTone(300 + index * 60, 100, 'sine');
      this.p1PlayerInput.push(index);

      if (this.p1PlayerInput.length >= seq.length) {
        this.p1SequencesComplete++;
        audioManager.playCorrectTone();

        if (this.p1SequencesComplete >= this.p1Sequences.length) {
          this.showMessage('Sequence accepted.', COLORS.SUCCESS);
          this.time.delayedCall(1000, () => this.transitionToPhase2());
        } else {
          this.p1CurrentSeq++;
          this.showMessage('One more sequence.', COLORS.SUCCESS);
          this.time.delayedCall(800, () => this.showP1Sequence());
        }
      }
    } else {
      this.phaseAttempts[0]++;
      this.attempts++;
      audioManager.playWrongTone();
      this.cameras.main.shake(180, 0.004);
      this.showMessage('Watch the order again.', COLORS.ERROR);
      this.time.delayedCall(800, () => this.showP1Sequence());
    }
  }

  private transitionToPhase2(): void {
    this.stopSlowOrbPattern();
    this.bossPhase = 'PHASE_2';
    this.advanceScriptPhase();
    this.phaseText.setText(SENTINEL_SCRIPT_PHASES[1].title);
    this.resetSockets(true);
    this.startArenaShiftTween();
    this.startMappingTrial();
  }

  private startArenaShiftTween(): void {
    this.tweens.killTweensOf(this.sockets.map((socket) => socket.container));
    this.sockets.forEach((socket, index) => {
      this.tweens.add({
        targets: socket.container,
        x: socket.x + (index - 1) * 18,
        y: socket.y + (index % 2 === 0 ? -10 : 10),
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private stopArenaShiftTween(): void {
    this.tweens.killTweensOf(this.sockets.map((socket) => socket.container));
    for (const socket of this.sockets) {
      socket.container.setPosition(socket.x, socket.y);
    }
  }

  private startMappingTrial(): void {
    this.cleanupShards();

    const { height } = this.cameras.main;
    const shardColors = shuffleArray(FLOW_CONSOLE_CANON.map((entry) => entry.colorValue));

    for (let i = 0; i < shardColors.length; i++) {
      const x = 160 + i * 140;
      const y = height - 120;
      const container = this.createShardContainer(x, y, shardColors[i]);
      const shardData: BossShard = { color: shardColors[i], placed: false, container };
      this.p2Shards.push(shardData);

      const shardCircle = container.getAt(0) as Phaser.GameObjects.Arc;
      shardCircle.setInteractive({ useHandCursor: true });
      shardCircle.on('pointerdown', () => this.pickupP2Shard(shardData));
    }

    this.phaseState = 'PLAYER_TURN';
    this.showMessage('Match the shards while the arena shifts.', COLORS.CYAN_GLOW);

    for (const socket of this.sockets) {
      const bg = socket.container.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.removeAllListeners('pointerdown');
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.tryPlaceP2Shard(socket));
    }
  }

  private createShardContainer(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const shard = this.add.circle(0, 0, 14, color, 0.9);
    shard.setStrokeStyle(2, adjustBrightness(color, 0.6));
    container.add(shard);

    const trail = this.add.graphics();
    trail.lineStyle(2, 0xffffff, 0.2);
    trail.beginPath();
    trail.moveTo(-8, 10);
    trail.lineTo(0, -12);
    trail.lineTo(8, 10);
    trail.strokePath();
    container.add(trail);

    return container;
  }

  private pickupP2Shard(shard: BossShard): void {
    if (shard.placed) return;

    if (this.heldP2Shard && this.heldP2Shard !== shard) {
      this.returnHeldShard(this.heldP2Shard);
    }

    this.heldP2Shard = shard;
    shard.container.setScale(1.2);
    shard.container.setAlpha(0.75);
  }

  private tryPlaceP2Shard(socket: Socket): void {
    if (!this.heldP2Shard || socket.filled) return;

    if (this.bossPhase === 'PHASE_3') {
      this.tryPlaceCombinedShard(socket);
      return;
    }

    if (this.heldP2Shard.color === socket.shardColor) {
      socket.filled = true;
      this.heldP2Shard.placed = true;

      this.tweens.add({
        targets: this.heldP2Shard.container,
        x: socket.container.x,
        y: socket.container.y,
        scale: 0.8,
        alpha: 1,
        duration: 250,
      });

      audioManager.playCorrectTone();
      this.heldP2Shard = null;

      if (this.p2Shards.every((shard) => shard.placed)) {
        this.showMessage('Mapping accepted.', COLORS.SUCCESS);
        this.time.delayedCall(1000, () => this.transitionToPhase3());
      }
    } else {
      this.phaseAttempts[1]++;
      this.attempts++;
      audioManager.playWrongTone();
      this.cameras.main.shake(150, 0.003);
      this.returnHeldShard(this.heldP2Shard);
      this.heldP2Shard = null;
    }
  }

  private transitionToPhase3(): void {
    this.stopArenaShiftTween();
    this.cleanupShards();
    this.resetSockets(true);
    this.bossPhase = 'PHASE_3';
    this.advanceScriptPhase();
    this.phaseText.setText(SENTINEL_SCRIPT_PHASES[2].title);
    this.p3Round = 0;
    this.showMessage('Hold both lessons together.', COLORS.ERROR);
    this.time.delayedCall(1200, () => this.startCombinedTrial());
  }

  private startCombinedTrial(): void {
    if (this.p3Round >= this.p3MaxRounds) {
      this.victory();
      return;
    }

    this.cleanupShards();
    this.resetSockets(true);
    this.combinedRoundSolved = false;
    this.combinedShardPlaced = false;
    this.heldP2Shard = null;
    this.combinedTargetSocketIndex = this.p3Round % this.sockets.length;

    const targetSocket = this.sockets[this.combinedTargetSocketIndex];
    this.highlightSocket(targetSocket);

    const { height } = this.cameras.main;
    const shardContainer = this.createShardContainer(160, height - 120, targetSocket.shardColor);
    const shardData: BossShard = { color: targetSocket.shardColor, placed: false, container: shardContainer };
    this.p2Shards = [shardData];

    const shardCircle = shardContainer.getAt(0) as Phaser.GameObjects.Arc;
    shardCircle.setInteractive({ useHandCursor: true });
    shardCircle.on('pointerdown', () => this.pickupP2Shard(shardData));

    this.showCombinedPattern();
  }

  private showCombinedPattern(): void {
    this.phaseText.setText(`${SENTINEL_SCRIPT_PHASES[2].title} ${this.p3Round + 1}/${this.p3MaxRounds}`);

    const pattern: number[] = [];
    for (let i = 0; i < 3; i++) {
      let next: number;
      do {
        next = Math.floor(Math.random() * 8);
      } while (pattern.length > 0 && next === pattern[pattern.length - 1]);
      pattern.push(next);
    }

    this.p1Sequences = [pattern];
    this.p1PlayerInput = [];
    this.phaseState = 'SHOWING';

    let delay = 400;
    for (const tile of pattern) {
      this.time.delayedCall(delay, () => {
        this.flashArenaTile(tile, COLORS.CYAN_GLOW, 450);
        audioManager.playTone(340 + tile * 55, 100, 'sine');
      });
      delay += 650;
    }

    this.time.delayedCall(delay + 200, () => {
      this.phaseState = 'PLAYER_TURN';
      this.showMessage('Repeat the pattern and place the shard.', COLORS.GOLD_ACCENT);
    });
  }

  private handleP3PatternInput(index: number): void {
    const seq = this.p1Sequences[0];
    const expected = seq[this.p1PlayerInput.length];

    this.flashArenaTile(index, index === expected ? COLORS.SUCCESS : COLORS.ERROR, 200);

    if (index === expected) {
      audioManager.playTone(320 + index * 60, 80, 'sine');
      this.p1PlayerInput.push(index);

      if (this.p1PlayerInput.length >= seq.length) {
        this.combinedRoundSolved = true;
        audioManager.playCorrectTone();
        this.finishCombinedRoundIfReady();
        if (!this.combinedShardPlaced) {
          this.showMessage('Pattern held. Place the shard.', COLORS.SUCCESS);
        }
      }
    } else {
      this.phaseAttempts[2]++;
      this.attempts++;
      audioManager.playWrongTone();
      this.cameras.main.shake(180, 0.004);
      this.showMessage('Both skills slipped. Resetting round.', COLORS.ERROR);
      this.time.delayedCall(900, () => this.startCombinedTrial());
    }
  }

  private tryPlaceCombinedShard(socket: Socket): void {
    if (!this.heldP2Shard || socket.filled || this.combinedTargetSocketIndex === null) return;

    const isCorrectSocket =
      socket.index === this.combinedTargetSocketIndex &&
      this.heldP2Shard.color === socket.shardColor;

    if (!isCorrectSocket) {
      this.phaseAttempts[2]++;
      this.attempts++;
      audioManager.playWrongTone();
      this.cameras.main.shake(180, 0.004);
      this.showMessage('Wrong receptacle. Start the round again.', COLORS.ERROR);
      this.time.delayedCall(700, () => this.startCombinedTrial());
      return;
    }

    socket.filled = true;
    this.heldP2Shard.placed = true;
    this.tweens.add({
      targets: this.heldP2Shard.container,
      x: socket.container.x,
      y: socket.container.y,
      scale: 0.8,
      alpha: 1,
      duration: 250,
    });

    audioManager.playCorrectTone();
    this.heldP2Shard = null;
    this.markCombinedShardPlaced();
  }

  private markCombinedShardPlaced(): void {
    if (this.phaseState !== 'PLAYER_TURN') return;
    this.combinedShardPlaced = true;
    this.finishCombinedRoundIfReady();
    if (!this.combinedRoundSolved) {
      this.showMessage('Shard placed. Finish the pattern.', COLORS.CYAN_GLOW);
    }
  }

  private finishCombinedRoundIfReady(): void {
    if (!this.combinedRoundSolved || !this.combinedShardPlaced) return;

    this.p3Round += 1;
    if (this.p3Round >= this.p3MaxRounds) {
      this.victory();
    } else {
      this.showMessage('Combined round accepted.', COLORS.SUCCESS);
      this.time.delayedCall(900, () => this.startCombinedTrial());
    }
  }

  private highlightSocket(socket: Socket): void {
    for (const current of this.sockets) {
      current.filled = false;
      current.container.setVisible(true);
      current.container.setAlpha(current.index === socket.index ? 1 : 0.7);
      const bg = current.container.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.removeAllListeners('pointerdown');
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.tryPlaceP2Shard(current));
    }

    this.tweens.add({
      targets: socket.container,
      scale: 1.08,
      duration: 350,
      yoyo: true,
      repeat: 3,
    });
  }

  private resetSockets(visible: boolean): void {
    for (const socket of this.sockets) {
      socket.filled = false;
      socket.container.setVisible(visible);
      socket.container.setAlpha(1);
      socket.container.setScale(1);
      socket.container.setPosition(socket.x, socket.y);
      const bg = socket.container.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.removeAllListeners('pointerdown');
    }
  }

  private cleanupShards(): void {
    for (const shard of this.p2Shards) {
      shard.container.destroy();
    }
    this.p2Shards = [];
    this.heldP2Shard = null;
  }

  private returnHeldShard(shard: BossShard): void {
    shard.container.setScale(1);
    shard.container.setAlpha(1);
  }

  private spawnOrb(duration: number): void {
    if (this.bossPhase !== 'PHASE_1') return;

    const { width } = this.cameras.main;
    const side = Math.random() > 0.5 ? 0 : 1;
    const x = side === 0 ? 60 : width - 60;
    const y = 220 + Math.random() * 260;

    const orb = this.add.circle(x, y, 8, COLORS.ERROR, 0.75);
    orb.setStrokeStyle(2, 0xff6666);

    this.tweens.add({
      targets: orb,
      x: side === 0 ? width - 60 : 60,
      duration,
      ease: 'Linear',
      onComplete: () => orb.destroy(),
    });
  }

  private flashArenaTile(index: number, color: number, duration: number): void {
    const tile = this.arenaTiles[index];
    const originalColor = COLORS.COSMIC_PURPLE;

    tile.bg.setFillStyle(color, 1);
    this.tweens.add({
      targets: tile.container,
      scale: 1.12,
      duration: duration / 2,
      yoyo: true,
      onComplete: () => {
        tile.bg.setFillStyle(originalColor, 0.8);
      },
    });
  }

  private victory(): void {
    this.bossPhase = 'VICTORY';
    this.stopSlowOrbPattern();
    this.stopArenaShiftTween();
    this.cleanupShards();
    this.phaseText.setText(SENTINEL_SCRIPT_PHASES[3].title);

    this.tweens.killTweensOf(this.sentinelContainer);
    this.tweens.add({
      targets: this.sentinelContainer,
      alpha: 0,
      scale: 1.8,
      duration: 1200,
    });

    this.showMessage('Authentication: VALID', COLORS.CYAN_GLOW);
    this.time.delayedCall(900, () => {
      this.showMessage('Passage granted.', COLORS.GOLD_ACCENT);
    });
    this.time.delayedCall(2200, () => this.onPuzzleComplete(3));
  }

  protected displayHint(hintNumber: number): void {
    switch (hintNumber) {
      case 1:
        if (this.bossPhase === 'PHASE_1') {
          this.showMessage('Bit would hover by each tile in order. Follow the whole pattern.', COLORS.GOLD_ACCENT);
        } else if (this.bossPhase === 'PHASE_2') {
          this.showMessage('Match each shard color to the glowing socket of the same color.', COLORS.GOLD_ACCENT);
        } else if (this.bossPhase === 'PHASE_3') {
          this.showMessage('Complete the pattern and the shard placement in the same round.', COLORS.GOLD_ACCENT);
        }
        break;
      case 2:
        if (this.bossPhase === 'PHASE_1' && this.p1Sequences[this.p1CurrentSeq]?.length) {
          this.flashArenaTile(this.p1Sequences[this.p1CurrentSeq][0], COLORS.GOLD_ACCENT, 1000);
        }
        if (this.bossPhase === 'PHASE_3' && this.combinedTargetSocketIndex !== null) {
          this.highlightSocket(this.sockets[this.combinedTargetSocketIndex]);
        }
        this.showMessage('The next safe anchor is highlighted.', COLORS.GOLD_ACCENT);
        break;
    }
  }

  protected getConceptName(): string {
    return 'Pattern Recognition & Authentication';
  }
}
