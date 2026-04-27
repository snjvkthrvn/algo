/**
 * setupUICamera — adds a screen-space camera that renders UI on top of the
 * world camera. Lets the main camera apply zoom/scroll/follow to gameplay
 * objects while UI (dialogue, HUD, modals) stays at 1:1 screen pixels.
 *
 * Classification heuristic: depth >= UI_DEPTH_THRESHOLD AND scrollFactor === 0.
 * That matches existing conventions (HUDManager 3000, InteractionPrompt 4000
 * with scrollFactor 1 — so it stays on the main camera, dialogue 5000).
 *
 * Call once at the end of scene.create(), after every UI container is built.
 */

import Phaser from 'phaser';

const UI_DEPTH_THRESHOLD = 3000;

type ScrollFactorish = { scrollFactorX?: number };
type Depthish = { depth?: number };

export function setupUICamera(scene: Phaser.Scene): Phaser.Cameras.Scene2D.Camera {
  const main = scene.cameras.main;
  const ui = scene.cameras.add(0, 0, main.width, main.height, false, 'ui');
  ui.setZoom(1).setScroll(0, 0);
  ui.transparent = true;

  const isUI = (obj: Phaser.GameObjects.GameObject): boolean => {
    const sf = (obj as ScrollFactorish).scrollFactorX ?? 1;
    const depth = (obj as Depthish).depth ?? 0;
    return depth >= UI_DEPTH_THRESHOLD && sf === 0;
  };

  const split = (obj: Phaser.GameObjects.GameObject) => {
    if (isUI(obj)) {
      main.ignore(obj);
    } else {
      ui.ignore(obj);
    }
  };

  scene.children.list.forEach(split);

  // depth/scrollFactor are typically set after construction (e.g. via chained
  // .setDepth().setScrollFactor()), so reclassify on the next tick.
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, (obj: Phaser.GameObjects.GameObject) => {
    scene.time.delayedCall(0, () => split(obj));
  });

  return ui;
}
