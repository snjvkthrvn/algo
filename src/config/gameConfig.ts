import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { PrologueScene } from '../scenes/prologue/PrologueScene';
import { ArrayPlainsScene } from '../scenes/ArrayPlainsScene';
import { TwinRiversScene } from '../scenes/TwinRiversScene';
import {
  CoreScene,
  GraphNexusScene,
  HashHighlandsScene,
  QueueCanalsScene,
  StackSpiresScene,
  TreeCanopyScene,
} from '../scenes/FutureRegionScene';
import { P0_1_FollowThePath } from '../scenes/puzzles/P0_1_FollowThePath';
import { P0_2_FlowConsoles } from '../scenes/puzzles/P0_2_FlowConsoles';
import { Boss_Sentinel } from '../scenes/puzzles/Boss_Sentinel';
import { P1_1_BubbleSort } from '../scenes/puzzles/P1_1_BubbleSort';
import { P1_2_BasketIndexing } from '../scenes/puzzles/P1_2_BasketIndexing';
import { P1_3_HashHopper } from '../scenes/puzzles/P1_3_HashHopper';
import { P1_4_TwoSum } from '../scenes/puzzles/P1_4_TwoSum';
import { Boss_Shuffler } from '../scenes/puzzles/Boss_Shuffler';
import { ConceptBridgeScene } from '../scenes/ConceptBridgeScene';
import { CodexScene } from '../scenes/CodexScene';
import { CRTScene } from '../scenes/CRTScene';

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
    CRTScene,
    MenuScene,
    PrologueScene,
    ArrayPlainsScene,
    TwinRiversScene,
    HashHighlandsScene,
    StackSpiresScene,
    QueueCanalsScene,
    TreeCanopyScene,
    GraphNexusScene,
    CoreScene,
    P0_1_FollowThePath,
    P0_2_FlowConsoles,
    Boss_Sentinel,
    P1_1_BubbleSort,
    P1_2_BasketIndexing,
    P1_3_HashHopper,
    P1_4_TwoSum,
    Boss_Shuffler,
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
