/**
 * CartDelivery — the side-gate cart that tips new crates into the lane.
 * Difficulty escalation the player can SEE coming: 4 → 6 → 8 crates.
 * Texture-guarded: a wooden rectangle cart until the art lands.
 */

import Phaser from "phaser";
import { a11yManager } from "../../core/A11yManager";
import { GRAIN_CHAMBER_KEYS } from "../../config/assets";

export class CartDelivery {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Roll in from the right edge, tip at the lane, roll out. Resolves at the
   * tip moment so the scene can rebuild the lane while the cart exits.
   */
  deliver(laneY: number): Promise<void> {
    a11yManager.announce("A cart rolls in with more crates.", false);
    const { width } = this.scene.cameras.main;
    const cart = this.scene.textures.exists(GRAIN_CHAMBER_KEYS.CART)
      ? this.scene.add
          .image(width + 60, laneY - 8, GRAIN_CHAMBER_KEYS.CART)
          .setDepth(24)
      : this.scene.add
          .rectangle(width + 60, laneY - 8, 88, 48, 0x6b4a26, 1)
          .setStrokeStyle(2, 0x43301a, 1)
          .setDepth(24);

    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: cart,
        tweens: [
          { x: width - 110, duration: 700, ease: "Quad.easeOut" },
          { angle: -8, duration: 220, yoyo: true, ease: "Sine.easeInOut" },
          { x: width + 60, duration: 600, ease: "Quad.easeIn", delay: 200 },
        ],
        onComplete: () => cart.destroy(),
      });
      // Resolve at the tip (post roll-in + tip) so the lane rebuild overlaps
      // the cart's exit — reads better than waiting for the full sequence.
      this.scene.time.delayedCall(940, () => resolve());
    });
  }
}
