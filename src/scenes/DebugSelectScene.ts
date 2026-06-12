import Phaser from "phaser";
import { SCENE_KEYS, FONTS } from "../config/constants";
import { TransitionManager } from "../core/TransitionManager";
import { audioManager } from "../core/AudioManager";
import { gameState } from "../core/GameStateManager";

export class DebugSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.DEBUG_SELECT });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(0, 0, width, height, 0x0a0a1a, 1).setOrigin(0);

    this.add
      .text(width / 2, 40, "DEBUG SCENE SELECT", {
        fontSize: "24px",
        fontFamily: FONTS.RETRO,
        color: "#e0f8d0",
      })
      .setOrigin(0.5);

    const backBtn = this.add
      .text(width / 2, height - 40, "[ ESC / BACK TO MENU ]", {
        fontSize: "16px",
        fontFamily: FONTS.RETRO,
        color: "#88c070",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backBtn.on("pointerdown", () => {
      audioManager.playClickTone();
      TransitionManager.fade(this, SCENE_KEYS.MENU);
    });

    this.input.keyboard?.on("keydown-ESC", () => {
      audioManager.playClickTone();
      TransitionManager.fade(this, SCENE_KEYS.MENU);
    });

    const scenesToTest = [
      SCENE_KEYS.MOVEMENT_GYM,
      SCENE_KEYS.PROLOGUE_TRIAL,
      SCENE_KEYS.PROLOGUE,
      SCENE_KEYS.PUZZLE_P0_1,
      SCENE_KEYS.PUZZLE_P0_2,
      SCENE_KEYS.BOSS_SENTINEL,
      SCENE_KEYS.ARRAY_PLAINS,
      SCENE_KEYS.PUZZLE_AP_1,
      SCENE_KEYS.PUZZLE_AP_2,
      SCENE_KEYS.PUZZLE_AP_3,
      SCENE_KEYS.PUZZLE_AP_4,
      SCENE_KEYS.BOSS_SHUFFLER,
      SCENE_KEYS.TWIN_RIVERS,
      SCENE_KEYS.PUZZLE_TR_1,
      SCENE_KEYS.PUZZLE_TR_2,
      SCENE_KEYS.PUZZLE_TR_3,
      SCENE_KEYS.PUZZLE_TR_4,
      SCENE_KEYS.BOSS_MIRROR_SERPENT,
      SCENE_KEYS.HASH_HIGHLANDS,
      SCENE_KEYS.PUZZLE_HH_1,
      SCENE_KEYS.PUZZLE_HH_2,
      SCENE_KEYS.PUZZLE_HH_3,
      SCENE_KEYS.PUZZLE_HH_4,
      SCENE_KEYS.BOSS_ARCHIVIST,
      SCENE_KEYS.STACK_SPIRES,
      SCENE_KEYS.PUZZLE_SS_1,
      SCENE_KEYS.PUZZLE_SS_2,
      SCENE_KEYS.PUZZLE_SS_3,
      SCENE_KEYS.PUZZLE_SS_4,
      SCENE_KEYS.BOSS_RECURSION,
      SCENE_KEYS.QUEUE_CANALS,
      SCENE_KEYS.PUZZLE_QC_1,
      SCENE_KEYS.PUZZLE_QC_2,
      SCENE_KEYS.PUZZLE_QC_3,
      SCENE_KEYS.PUZZLE_QC_4,
      SCENE_KEYS.BOSS_RECONCILER,
      SCENE_KEYS.TREE_CANOPY,
      SCENE_KEYS.PUZZLE_TC_1,
      SCENE_KEYS.PUZZLE_TC_2,
      SCENE_KEYS.PUZZLE_TC_3,
      SCENE_KEYS.PUZZLE_TC_4,
      SCENE_KEYS.BOSS_PATTERN,
      SCENE_KEYS.GRAPH_NEXUS,
      SCENE_KEYS.PUZZLE_GN_1,
      SCENE_KEYS.PUZZLE_GN_2,
      SCENE_KEYS.PUZZLE_GN_3,
      SCENE_KEYS.PUZZLE_GN_4,
      SCENE_KEYS.BOSS_ECHO,
      SCENE_KEYS.CORE,
      SCENE_KEYS.PUZZLE_CORE_1,
      SCENE_KEYS.PUZZLE_CORE_2,
      SCENE_KEYS.PUZZLE_CORE_3,
      SCENE_KEYS.PUZZLE_CORE_4,
      SCENE_KEYS.BOSS_PROTOCOL_OMEGA,
    ];

    const cols = 3;
    const startX = 200;
    const startY = 100;
    const colSpacing = 350;
    const rowSpacing = 28;

    scenesToTest.forEach((sceneKey, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = startX + col * colSpacing;
      const y = startY + row * rowSpacing;

      const txt = this.add
        .text(x, y, sceneKey, {
          fontSize: "12px",
          fontFamily: FONTS.RETRO,
          color: sceneKey.includes("Scene")
            ? "#06b6d4"
            : sceneKey.includes("Boss")
              ? "#f97316"
              : "#88c070",
        })
        .setInteractive({ useHandCursor: true });

      txt.on("pointerover", () => txt.setColor("#e0f8d0").setScale(1.1));
      txt.on("pointerout", () =>
        txt
          .setColor(
            sceneKey.includes("Scene")
              ? "#06b6d4"
              : sceneKey.includes("Boss")
                ? "#f97316"
                : "#88c070",
          )
          .setScale(1),
      );

      txt.on("pointerdown", () => {
        audioManager.playClickTone();
        // Reset state so tests are fresh, but maybe don't block access
        gameState.resetState();
        TransitionManager.swirl(this, sceneKey);
      });
    });
  }
}
