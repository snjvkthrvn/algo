/**
 * ChamberCast — the shared keeper-in-the-room for chamber rooms. Nobody
 * lectures (VISION §3): the keeper putters on a leash loop and reacts
 * line-by-line — a wince at a waste streak, a nod at a clean stretch,
 * applause at the clear — plus the post-clear tally in plain words.
 *
 * Each room passes its own keeper sprite key, entry stakes line, and
 * reaction line pools. Glitch's heckle helper rides along for rooms that
 * stage him without a body of his own.
 */

import Phaser from "phaser";
import { PuzzleRoom } from "../PuzzleRoom";
import { VISUAL_REVAMP_KEYS } from "../../config/assets";
import { GLITCH_FAILURE_TAUNTS } from "../../data/dialogue/glitch_dialogue";
import { FONTS } from "../../config/constants";

function pick(lines: ReadonlyArray<string>): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

export interface ChamberCastConfig {
  keeperKey?: string;
  entryLine?: string;
  reactions?: {
    waste: ReadonlyArray<string>;
    clean: ReadonlyArray<string>;
    clear: ReadonlyArray<string>;
  };
  /** Verb for the tally line ("trades", "openings"). */
  tallyNoun?: string;
}

const GRAIN_DEFAULTS: Required<ChamberCastConfig> = {
  keeperKey: VISUAL_REVAMP_KEYS.SORTING_FARMER,
  entryLine: "The furrows grew out of order. Mind the grain.",
  reactions: {
    waste: [
      "Easy now — that grain feeds the hens.",
      "Every trade shakes a little loose.",
    ],
    clean: [
      "Good eye. Barely a kernel down.",
      "That's the way — let the row tell you.",
    ],
    clear: ["Look at them stand!", "The field remembers that order."],
  },
  tallyNoun: "trades",
};

export class ChamberCast {
  private scene: Phaser.Scene;
  private keeper: Phaser.GameObjects.Sprite | null;
  private speech: Phaser.GameObjects.Text;
  private lastReactionAt = 0;
  private config: Required<ChamberCastConfig>;

  constructor(
    scene: Phaser.Scene,
    keeperX: number,
    keeperY: number,
    config: ChamberCastConfig = {},
  ) {
    this.scene = scene;
    this.config = {
      keeperKey: config.keeperKey ?? GRAIN_DEFAULTS.keeperKey,
      entryLine: config.entryLine ?? GRAIN_DEFAULTS.entryLine,
      reactions: config.reactions ?? GRAIN_DEFAULTS.reactions,
      tallyNoun: config.tallyNoun ?? GRAIN_DEFAULTS.tallyNoun,
    };
    this.keeper = PuzzleRoom.placeKeeper(
      scene,
      this.config.keeperKey,
      keeperX,
      keeperY,
    );
    this.speech = scene.add
      .text(keeperX, keeperY - 64, "", {
        fontSize: "9px",
        fontFamily: FONTS.RETRO,
        color: "#f4e3c1",
        backgroundColor: "#2e2417",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 200 },
      })
      .setOrigin(0.5, 1)
      .setDepth(50)
      .setAlpha(0);
    this.leashLoop(keeperX);
  }

  private leashLoop(homeX: number): void {
    if (!this.keeper) return;
    this.scene.tweens.add({
      targets: this.keeper,
      x: homeX + Phaser.Math.Between(-24, 24),
      duration: Phaser.Math.Between(1600, 2600),
      ease: "Sine.easeInOut",
      onComplete: () => this.leashLoop(homeX),
    });
  }

  private say(line: string, holdMs = 2400): void {
    // Reactions are rate-limited so the keeper never nags.
    const now = this.scene.time.now;
    if (now - this.lastReactionAt < 6000) return;
    this.lastReactionAt = now;
    if (this.keeper)
      this.speech.setPosition(this.keeper.x, this.keeper.y - 64);
    this.speech.setText(line).setAlpha(1);
    this.scene.tweens.add({
      targets: this.speech,
      alpha: 0,
      delay: holdMs,
      duration: 400,
    });
  }

  /** Entry line — stakes only, no mechanics (VISION §3). */
  entry(): void {
    this.lastReactionAt = -10_000;
    this.say(this.config.entryLine, 3200);
  }

  onSpillStreak(): void {
    this.say(pick(this.config.reactions.waste));
  }

  onCleanStretch(): void {
    this.say(pick(this.config.reactions.clean));
  }

  onBloom(): void {
    this.lastReactionAt = -10_000;
    this.say(pick(this.config.reactions.clear), 2000);
  }

  /**
   * Post-clear harvest tally — plain numbers, plain words, after play
   * (FEEL→NAME safe). Bypasses the reaction rate limit.
   */
  tallyLine(count: number, par: number, holdMs = 5200): void {
    this.lastReactionAt = -10_000;
    const noun = this.config.tallyNoun;
    const verdict =
      count <= par + 1
        ? "Hardly a thing wasted."
        : "Pull the lever by the door — Bit knows a thriftier way.";
    this.say(
      `${count} ${noun} to clear the room. Its best is ${par}. ${verdict}`,
      holdMs,
    );
  }

  /** Glitch's loft bark — reuses the existing taunt pool. */
  glitchHeckle(loftX: number, loftY: number): void {
    const bark = this.scene.add
      .text(loftX, loftY, pick(GLITCH_FAILURE_TAUNTS), {
        fontSize: "9px",
        fontFamily: FONTS.RETRO,
        color: "#d8a0a0",
        backgroundColor: "#2e1a1a",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5, 1)
      .setDepth(50);
    // Clamp inside the camera (the BruteForceActor clip bug — don't regress).
    const cam = this.scene.cameras.main;
    bark.x = Phaser.Math.Clamp(
      bark.x,
      bark.width / 2 + 8,
      cam.width - bark.width / 2 - 8,
    );
    this.scene.tweens.add({
      targets: bark,
      alpha: 0,
      delay: 2600,
      duration: 400,
      onComplete: () => bark.destroy(),
    });
  }
}
