/**
 * PulseGhost — the post-clear demonstration for the flow rooms: a spectral
 * pulse re-runs the network taking every living fork first try (the
 * pre-solved optimal route from flowRoute). Reuses the live pulse runner
 * with an auto-decide, so the ghost moves exactly like play.
 */

import type Phaser from "phaser";
import { a11yManager } from "../../core/A11yManager";
import { createPulse } from "../puzzles/P0_2/visuals/pulse";
import type { FlowBoard } from "../puzzles/P0_2/board";

const DECIDE_BEAT_MS = 320;

export class PulseGhost {
  private scene: Phaser.Scene;
  private playing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  async play(
    board: FlowBoard,
    outMap: Map<string, string[]>,
    forkKeys: Set<string>,
    choices: ReadonlyMap<string, string>,
  ): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    a11yManager.announce(
      "A spectral pulse runs the network, taking the living fork at every branch.",
      false,
    );
    const ghost = createPulse(this.scene, { color: 0x9fe8f7, alpha: 0.75 });
    await ghost.fireReactive(board, {
      sourceKey: board.sourceKey,
      sinkKey: board.sinkKey,
      outMap,
      forkKeys,
      decideAtFork: (current) =>
        new Promise((resolve) =>
          this.scene.time.delayedCall(DECIDE_BEAT_MS, () =>
            resolve(choices.get(current) ?? null),
          ),
        ),
    });
    this.playing = false;
  }
}
