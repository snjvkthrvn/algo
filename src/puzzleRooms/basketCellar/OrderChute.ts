/**
 * OrderChute — orders arrive as physical wooden tags, not UI panels.
 *
 * A tag drops from the chute in the upper-left wall, bounces once on the
 * floor slot, and stays readable until the order is filled. The words are
 * plain ("THE 4TH BASKET — rope"); the game never says "index".
 *
 * Texture-guarded: wooden rect tag until the art batch lands.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { BASKET_CELLAR_KEYS } from "../../config/assets";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";

const TAG_W = 148;
const TAG_H = 44;
const CHUTE_X = 168;
const CHUTE_TOP_Y = 36;

export class OrderChute {
  private scene: Phaser.Scene;
  private slotY: number;
  private tag: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, slotY: number) {
    this.scene = scene;
    this.slotY = slotY;
  }

  /** Drop the next order tag; resolves when it lands. */
  drop(text: string): Promise<void> {
    this.clear();
    a11yManager.announce(`New order: ${text}.`, true);
    audioManager.playTone(330, 80, "square");

    const tag = this.scene.add.container(CHUTE_X, CHUTE_TOP_Y).setDepth(48);
    if (this.scene.textures.exists(BASKET_CELLAR_KEYS.ORDER_TAG)) {
      tag.add(
        this.scene.add
          .image(0, 0, BASKET_CELLAR_KEYS.ORDER_TAG)
          .setDisplaySize(TAG_W, TAG_H + 12),
      );
    } else {
      tag.add(
        this.scene.add
          .rectangle(0, 0, TAG_W, TAG_H, 0x8a6233, 1)
          .setStrokeStyle(2, 0x5b3f1e, 1),
      );
    }
    tag.add(
      this.scene.add
        .text(0, 0, text, {
          fontSize: "9px",
          fontFamily: FONTS.RETRO,
          color: "#2e2417",
          align: "center",
          wordWrap: { width: TAG_W - 16 },
        })
        .setOrigin(0.5),
    );
    this.tag = tag;

    return new Promise((resolve) => {
      this.scene.tweens.chain({
        targets: tag,
        tweens: [
          { y: this.slotY, duration: 420, ease: "Quad.easeIn" },
          { y: this.slotY - 10, duration: 130, ease: "Quad.easeOut" },
          { y: this.slotY, duration: 110, ease: "Quad.easeIn" },
        ],
        onComplete: () => resolve(),
      });
    });
  }

  /** The order was filled — the tag flips away. */
  clear(): void {
    const tag = this.tag;
    this.tag = null;
    if (!tag) return;
    this.scene.tweens.add({
      targets: tag,
      alpha: 0,
      y: tag.y - 16,
      duration: 260,
      ease: "Sine.easeIn",
      onComplete: () => tag.destroy(),
    });
  }
}
