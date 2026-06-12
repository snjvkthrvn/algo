/**
 * prologueShell — the chamber beats in Prologue dress, shared by all three
 * rooms: ChamberShell with rune-gate/stone-plaque textures, the ghost-replay
 * lever, the post-clear exit channel, and the homeward pulse that carries
 * the flow rooms' walk-out verb. Texture-guarded throughout.
 */

import Phaser from "phaser";
import { ChamberShell } from "../../puzzleRooms/chamber/ChamberShell";
import {
  PROLOGUE_CHAMBER_IMAGE_ASSETS,
  PROLOGUE_CHAMBER_KEYS,
  PROLOGUE_CHAMBER_SHEET_ASSETS,
} from "../../config/assets";
import { audioManager } from "../../core/AudioManager";

/** Texture-guarded preload of the chamber dressing (call from preload()). */
export function loadPrologueChamberAssets(scene: Phaser.Scene): void {
  for (const asset of PROLOGUE_CHAMBER_IMAGE_ASSETS) {
    if (!scene.textures.exists(asset.key))
      scene.load.image(asset.key, asset.path);
  }
  for (const asset of PROLOGUE_CHAMBER_SHEET_ASSETS) {
    if (!scene.textures.exists(asset.key))
      scene.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth ?? 32,
        frameHeight: asset.frameHeight ?? 32,
      });
  }
}

export function createPrologueShell(
  scene: Phaser.Scene,
  fieldPar: number,
): ChamberShell {
  return new ChamberShell(scene, fieldPar, {
    doorTexture: PROLOGUE_CHAMBER_KEYS.GATE_DOOR,
    plaqueTexture: PROLOGUE_CHAMBER_KEYS.PAR_PLAQUE,
    plaqueTextColor: "#9fb8d8",
  });
}

export type RuneLever = {
  readonly x: number;
  readonly y: number;
  pull(): void;
  destroy(): void;
};

/** The replay lever beside the north gate. Caller wires activation. */
export function placeRuneLever(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onPull: () => void,
): RuneLever {
  const parts: Phaser.GameObjects.GameObject[] = [];
  let handle: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  if (scene.textures.exists(PROLOGUE_CHAMBER_KEYS.LEVER)) {
    const img = scene.add.image(x, y, PROLOGUE_CHAMBER_KEYS.LEVER).setDepth(13);
    parts.push(img);
    handle = img;
  } else {
    const base = scene.add
      .rectangle(x, y + 6, 10, 22, 0x2a3a6f, 1)
      .setStrokeStyle(2, 0x7fd9e8, 0.8)
      .setDepth(12);
    const stick = scene.add
      .rectangle(x, y - 8, 4, 16, 0x9fe8f7, 1)
      .setAngle(-30)
      .setDepth(13);
    parts.push(base, stick);
    handle = stick;
  }
  for (const part of parts) {
    const fadeable = part as Phaser.GameObjects.Image;
    fadeable.setAlpha(0);
    scene.tweens.add({ targets: part, alpha: 1, duration: 400 });
  }
  const zone = scene.add
    .zone(x, y, 56, 56)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  zone.on("pointerdown", onPull);
  parts.push(zone);
  return {
    x,
    y,
    pull() {
      audioManager.playTone(220, 90, "square");
      scene.tweens.add({
        targets: handle,
        angle: 30,
        duration: 180,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    },
    destroy: () => parts.forEach((p) => p.destroy()),
  };
}

/** Lit channel from the sink up through the unbarred north gate. */
export function paintExitChannel(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
): Phaser.GameObjects.Graphics {
  const { width } = scene.cameras.main;
  const g = scene.add.graphics().setDepth(9).setAlpha(0);
  g.lineStyle(6, 0x9fe8f7, 0.28);
  g.lineBetween(fromX, fromY, width / 2, 16);
  g.lineStyle(2, 0xe7fbff, 0.6);
  g.lineBetween(fromX, fromY, width / 2, 16);
  scene.tweens.add({
    targets: g,
    alpha: { from: 0, to: 1 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  return g;
}

/** The flow rooms' walk-out: the pulse sails home through the open gate. */
export function launchHomewardPulse(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  onOut: () => void,
): void {
  const { width } = scene.cameras.main;
  audioManager.playTone(523, 120, "triangle");
  const dot = scene.add.circle(fromX, fromY, 7, 0x9fe8f7, 1).setDepth(61);
  const halo = scene.add.circle(fromX, fromY, 15, 0x9fe8f7, 0.2).setDepth(60);
  scene.tweens.add({
    targets: [dot, halo],
    x: width / 2,
    y: -20,
    duration: 900,
    ease: "Cubic.easeIn",
    onComplete: () => {
      dot.destroy();
      halo.destroy();
      onOut();
    },
  });
}
