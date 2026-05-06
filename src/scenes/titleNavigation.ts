import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/constants';
import { saveLoadManager } from '../core/SaveLoadManager';
import { TransitionManager } from '../core/TransitionManager';

export interface TitleMenuLaunchData {
  preferResume?: boolean;
}

export const TITLE_MENU_RESUME_DATA: TitleMenuLaunchData = {
  preferResume: true,
};

export function saveAndReturnToTitle(
  scene: Phaser.Scene,
  options: { stopSceneKeys?: string[]; duration?: number } = {},
): void {
  saveLoadManager.save();

  for (const key of options.stopSceneKeys ?? []) {
    if (key) scene.scene.stop(key);
  }

  TransitionManager.fade(scene, SCENE_KEYS.MENU, TITLE_MENU_RESUME_DATA, options.duration ?? 400);
}
