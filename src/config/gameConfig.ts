import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { DebugSelectScene } from '../scenes/DebugSelectScene';
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
import {
  Boss_MirrorSerpent,
  P2_1_MirrorWalk,
  P2_2_PointerBridge,
  P2_3_FixedWindowDock,
  P2_4_CurrentRider,
} from '../scenes/puzzles/TwinRiversChoiceScenes';
import {
  Boss_Archivist,
  P3_1_NameplateGates,
  P3_2_FrequencyForge,
  P3_3_AnagramGardens,
  P3_4_CacheCavern,
} from '../scenes/puzzles/HashHighlandsChoiceScenes';
import {
  Boss_Recursion,
  P4_1_ScrollStack,
  P4_2_MirrorStaircase,
  P4_3_MazeOfForks,
  P4_4_TowerOfMemory,
} from '../scenes/puzzles/StackSpiresChoiceScenes';
import {
  Boss_Reconciler,
  P5_1_FerryQueue,
  P5_2_BfsLocks,
  P5_3_PriorityHarbor,
  P5_4_SchedulerOffice,
} from '../scenes/puzzles/QueueCanalsChoiceScenes';
import {
  Boss_Pattern,
  P6_1_RootWalk,
  P6_2_BstGrove,
  P6_3_DfsBranches,
  P6_4_BalanceCanopy,
} from '../scenes/puzzles/TreeCanopyChoiceScenes';
import {
  Boss_Echo,
  P7_1_NodeLinks,
  P7_2_ShortestPath,
  P7_3_CycleCourt,
  P7_4_ComponentFields,
} from '../scenes/puzzles/GraphNexusChoiceScenes';
import {
  Boss_ProtocolOmega,
  P8_1_EchoChamber,
  P8_2_WeightedStaircase,
  P8_3_GrandArchive,
  P8_4_HallOfPatterns,
} from '../scenes/puzzles/CoreChoiceScenes';
import { ConceptBridgeScene } from '../scenes/ConceptBridgeScene';
import { CodexScene } from '../scenes/CodexScene';
import { CRTScene } from '../scenes/CRTScene';
import { EndGameScene } from '../scenes/EndGameScene';
import { PauseOverlayScene } from '../scenes/PauseOverlayScene';
import { UIScene as PrologueRunUIScene } from '../arcadePrologue/scenes/UIScene';

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  backgroundColor: '#0a0a1a',

  dom: {
    createContainer: true,
  },

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
    DebugSelectScene,
    PrologueRunUIScene,
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
    P2_1_MirrorWalk,
    P2_2_PointerBridge,
    P2_3_FixedWindowDock,
    P2_4_CurrentRider,
    Boss_MirrorSerpent,
    P3_1_NameplateGates,
    P3_2_FrequencyForge,
    P3_3_AnagramGardens,
    P3_4_CacheCavern,
    Boss_Archivist,
    P4_1_ScrollStack,
    P4_2_MirrorStaircase,
    P4_3_MazeOfForks,
    P4_4_TowerOfMemory,
    Boss_Recursion,
    P5_1_FerryQueue,
    P5_2_BfsLocks,
    P5_3_PriorityHarbor,
    P5_4_SchedulerOffice,
    Boss_Reconciler,
    P6_1_RootWalk,
    P6_2_BstGrove,
    P6_3_DfsBranches,
    P6_4_BalanceCanopy,
    Boss_Pattern,
    P7_1_NodeLinks,
    P7_2_ShortestPath,
    P7_3_CycleCourt,
    P7_4_ComponentFields,
    Boss_Echo,
    P8_1_EchoChamber,
    P8_2_WeightedStaircase,
    P8_3_GrandArchive,
    P8_4_HallOfPatterns,
    Boss_ProtocolOmega,
    ConceptBridgeScene,
    CodexScene,
    EndGameScene,
    PauseOverlayScene,
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
