import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { PrologueScene } from '../scenes/prologue/PrologueScene';
import { P0_1_FollowThePath } from '../scenes/puzzles/P0_1_FollowThePath';
import { P0_2_FlowConsoles } from '../scenes/puzzles/P0_2_FlowConsoles';
import { Boss_Sentinel } from '../scenes/puzzles/Boss_Sentinel';
import { ConceptBridgeScene } from '../scenes/ConceptBridgeScene';
import { CodexScene } from '../scenes/CodexScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#0a0a1a',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },

  scene: [
    BootScene,
    MenuScene,
    PrologueScene,
    P0_1_FollowThePath,
    P0_2_FlowConsoles,
    Boss_Sentinel,
    ConceptBridgeScene,
    CodexScene,
  ],

  pixelArt: true,
  antialias: false,
  roundPixels: true,

  render: {
    pixelArt: true,
    antialias: false,
  },

  audio: {
    disableWebAudio: false,
  },
};
