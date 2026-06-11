/**
 * ChamberShell — the shared Isaac beat for chamber rooms: doors seal when
 * the player enters, the exit unbars when the room is cleared, and the par
 * plaque carries the room's only number as diegetic signage.
 *
 * Texture-guarded: uses the room's door/plaque art when loaded, otherwise
 * draws plank rectangles so a room runs before its art batch lands.
 */

import Phaser from "phaser";
import { COLORS, FONTS } from "../../config/constants";
import { a11yManager } from "../../core/A11yManager";
import { audioManager } from "../../core/AudioManager";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { GRAIN_CHAMBER_KEYS } from "../../config/assets";

const DOOR_W = 96;
const DOOR_H = 24;

export interface ChamberShellTextures {
  doorTexture?: string;
  plaqueTexture?: string;
}

export class ChamberShell {
  private scene: Phaser.Scene;
  private southDoor: Phaser.GameObjects.Container;
  private northDoor: Phaser.GameObjects.Container;
  private plaqueText: Phaser.GameObjects.Text | null = null;
  private textures: Required<ChamberShellTextures>;

  constructor(
    scene: Phaser.Scene,
    fieldPar?: number,
    textures: ChamberShellTextures = {},
  ) {
    this.scene = scene;
    this.textures = {
      doorTexture: textures.doorTexture ?? GRAIN_CHAMBER_KEYS.DOOR_PLANKS,
      plaqueTexture: textures.plaqueTexture ?? GRAIN_CHAMBER_KEYS.PAR_PLAQUE,
    };
    const { width, height } = scene.cameras.main;
    this.southDoor = this.buildDoor(width / 2, height - DOOR_H / 2);
    this.northDoor = this.buildDoor(width / 2, DOOR_H / 2);
    // Doors start invisible; seal() slams them in.
    this.southDoor.setAlpha(0);
    this.northDoor.setAlpha(0);
    if (fieldPar !== undefined) this.placePlaque(fieldPar);
  }

  /**
   * The carved par plaque beside the north door — the room's only number,
   * presented as signage (diegetic replay hook, spec "Move economy").
   */
  private placePlaque(fieldPar: number): void {
    if (!this.scene.textures.exists(this.textures.plaqueTexture)) return;
    const { width } = this.scene.cameras.main;
    const x = width / 2 + 96;
    this.scene.add
      .image(x, 40, this.textures.plaqueTexture)
      .setDepth(12);
    this.plaqueText = this.scene.add
      .text(x, 40, `BEST\n${fieldPar}`, {
        fontSize: "8px",
        fontFamily: FONTS.RETRO,
        color: "#5b3f1e",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(13);
  }

  /** Post-clear harvest tally — the plaque flips to your run's numbers. */
  setPlaqueTally(trades: number, fieldPar: number): void {
    this.plaqueText?.setText(`YOU ${trades}\nBEST ${fieldPar}`);
  }

  private buildDoor(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y).setDepth(60);
    if (this.scene.textures.exists(this.textures.doorTexture)) {
      container.add(
        this.scene.add.image(0, 0, this.textures.doorTexture),
      );
      return container;
    }
    const planks = this.scene.add
      .rectangle(0, 0, DOOR_W, DOOR_H, COLORS.TEXT_DARK, 1)
      .setStrokeStyle(2, COLORS.GOLD_ACCENT, 0.6);
    container.add(planks);
    return container;
  }

  /** Plank-slam on entry: doors drop in with a camera thump. */
  seal(): void {
    a11yManager.announce("The chamber doors seal behind you.", false);
    audioManager.playSFX("door_slam");
    audioManager.playTone(90, 140, "square");
    for (const door of [this.southDoor, this.northDoor]) {
      door.setAlpha(1);
      door.setScale(1, 0.1);
      this.scene.tweens.add({
        targets: door,
        scaleY: 1,
        duration: 180,
        ease: "Bounce.easeOut",
      });
    }
    JuiceSystem.cameraShake(this.scene, 120, 0.004);
  }

  /** Bar lifts, door swings open, light spills in. */
  unbar(onDone?: () => void): void {
    a11yManager.announce("The doors swing open.", true);
    const { width } = this.scene.cameras.main;
    const light = this.scene.add
      .rectangle(width / 2, 0, DOOR_W, 0, 0xfff2c0, 0.35)
      .setOrigin(0.5, 0)
      .setDepth(59);
    this.scene.tweens.add({
      targets: this.northDoor,
      alpha: 0,
      scaleY: 0.1,
      duration: 320,
      ease: "Sine.easeIn",
    });
    this.scene.tweens.add({
      targets: light,
      height: 160,
      duration: 480,
      ease: "Sine.easeOut",
      onComplete: () => onDone?.(),
    });
  }
}
