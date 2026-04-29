/**
 * CRTScene — Persistent overlay that renders CRT phosphor effects on top of every other scene.
 * Launched once by BootScene and runs for the entire game session.
 */

import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/constants';

export class CRTScene extends Phaser.Scene {
  private refreshLine!: Phaser.GameObjects.Graphics;
  private flickerRect!: Phaser.GameObjects.Rectangle;
  private refreshY: number = 0;
  private nextFlicker: number = 0;

  constructor() {
    super({ key: SCENE_KEYS.CRT_OVERLAY });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Scanlines: darken every other row — drawn once, purely static
    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x000000, 0.10);
    for (let y = 0; y < height; y += 2) {
      scanlines.fillRect(0, y, width, 1);
    }

    // Vignette: layered dark strips that stack at corners, fading toward center
    // Corners hit both a horizontal and vertical strip → naturally twice as dark
    const vignette = this.add.graphics();
    const LAYERS = 8;
    for (let i = LAYERS; i >= 1; i--) {
      const m = i * 34;
      const a = (LAYERS - i + 1) * 0.007;
      vignette.fillStyle(0x000000, a);
      vignette.fillRect(0, 0, m, height);
      vignette.fillRect(width - m, 0, m, height);
      vignette.fillRect(0, 0, width, m);
      vignette.fillRect(0, height - m, width, m);
    }

    // Electron-gun refresh sweep — animated in update()
    this.refreshLine = this.add.graphics();
    this.refreshY = 0;

    // Full-screen flicker overlay — normally invisible, briefly activates
    this.flickerRect = this.add
      .rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0);

    this.nextFlicker = this.time.now + 5000 + Math.random() * 5000;

    this.scene.bringToTop();
  }

  update(time: number, delta: number): void {
    const { width, height } = this.cameras.main;

    // Ensure this scene renders above everything else every frame
    this.scene.bringToTop();

    // Electron-gun sweep: faint GB-green glow line traveling downward
    this.refreshY += delta * 0.11;
    if (this.refreshY > height + 12) this.refreshY = -12;

    const ry = Math.floor(this.refreshY);
    this.refreshLine.clear();
    this.refreshLine.fillStyle(0xe0f8d0, 0.015);
    this.refreshLine.fillRect(0, ry, width, 2);
    this.refreshLine.fillStyle(0xe0f8d0, 0.007);
    this.refreshLine.fillRect(0, ry + 2, width, 4);

    // Phosphor flicker: occasional brief darkening, feels like hardware irregularity
    if (time > this.nextFlicker) {
      this.flickerRect.setAlpha(0.055);
      this.time.delayedCall(33, () => this.flickerRect.setAlpha(0));
      this.nextFlicker = time + 3000 + Math.random() * 7000;
    }
  }
}
