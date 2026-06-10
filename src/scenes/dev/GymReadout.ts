/**
 * GymReadout — screen-fixed debug panel for the Movement Gym. Shows live
 * player position/grid cell, PlayerState, facing, current animation key +
 * frame, and FPS. Chrome goes through drawPanel() per the UI rules; depth
 * 3000+ with scrollFactor 0 so setupUICamera claims it for the UI camera.
 */

import Phaser from "phaser";
import { FONTS } from "../../config/constants";
import { PLAYER_GRID_STEP } from "../../entities/Player";
import { drawPanel } from "../../ui/panel";

export interface ReadoutData {
  x: number;
  y: number;
  state: string;
  facing: string;
  animKey: string;
  frameIndex: number;
  fps: number;
}

const PANEL_X = 16;
const PANEL_Y = 64;
const PANEL_W = 280;
const PANEL_H = 88;
const READOUT_DEPTH = 3200;

export function formatReadoutLines(data: ReadoutData): string[] {
  const px = Math.round(data.x);
  const py = Math.round(data.y);
  const cellX = Math.floor(data.x / PLAYER_GRID_STEP);
  const cellY = Math.floor(data.y / PLAYER_GRID_STEP);
  return [
    `pos ${px},${py}  cell ${cellX},${cellY}`,
    `state ${data.state}  facing ${data.facing}`,
    `anim ${data.animKey} #${data.frameIndex}`,
    `fps ${Math.round(data.fps)}`,
  ];
}

export class GymReadout {
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    drawPanel(scene, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, {
      depth: READOUT_DEPTH,
      scrollFactor: 0,
      alpha: 0.88,
      fill: 0x101a20, // dark fill — default palette washes out the light text
    });
    this.text = scene.add
      .text(PANEL_X + 8, PANEL_Y + 8, "", {
        fontSize: "12px",
        fontFamily: FONTS.RETRO,
        color: "#e0f8d0",
        lineSpacing: 6,
      })
      .setDepth(READOUT_DEPTH + 1)
      .setScrollFactor(0);
  }

  update(data: ReadoutData): void {
    this.text.setText(formatReadoutLines(data));
  }
}
