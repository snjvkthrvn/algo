/**
 * AudioManager - Music crossfade + SFX pooling.
 * Handles browser autoplay restrictions gracefully.
 */

import Phaser from 'phaser';
import { gameState } from './GameStateManager';

class AudioManagerClass {
  private scene: Phaser.Scene | null = null;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusicKey: string = '';
  private audioUnlocked: boolean = false;
  private pendingMusic: string | null = null;
  private audioCtx: AudioContext | null = null;
  /** Session mute — does not change saved volume sliders in gameState. */
  private muted = false;

  private getAudioContext(): AudioContext | null {
    // Prefer Phaser's context so tones share the same audio graph
    const phaserCtx = (this.scene?.sound as Phaser.Sound.WebAudioSoundManager | null)?.context;
    if (phaserCtx && phaserCtx.state !== 'closed') {
      if (phaserCtx.state === 'suspended') phaserCtx.resume();
      return phaserCtx;
    }
    // Fallback when scene is not set
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  setScene(scene: Phaser.Scene): void {
    this.scene = scene;

    // Handle browser autoplay unlock
    if (!this.audioUnlocked) {
      scene.sound.once('unlocked', () => {
        this.audioUnlocked = true;
        if (this.pendingMusic) {
          this.playMusic(this.pendingMusic);
          this.pendingMusic = null;
        }
      });
    }
  }

  playMusic(key: string, loop: boolean = true): void {
    if (!this.scene) return;
    if (this.currentMusicKey === key) return;

    // If audio not unlocked yet, queue it
    if (!this.audioUnlocked && !this.scene.sound.locked) {
      this.audioUnlocked = true;
    }

    if (this.scene.sound.locked) {
      this.pendingMusic = key;
      return;
    }

    const settings = gameState.getSettings();

    // Crossfade: fade out current, fade in new
    if (this.currentMusic) {
      const oldMusic = this.currentMusic;
      this.scene.tweens.add({
        targets: oldMusic,
        volume: 0,
        duration: 500,
        onComplete: () => {
          oldMusic.stop();
          oldMusic.destroy();
        },
      });
    }

    // Check if audio key exists before playing
    if (!this.scene.cache.audio.exists(key)) {
      this.currentMusicKey = '';
      this.currentMusic = null;
      return;
    }

    this.currentMusic = this.scene.sound.add(key, {
      volume: 0,
      loop,
    });
    this.currentMusic.play();
    this.currentMusicKey = key;

    this.scene.tweens.add({
      targets: this.currentMusic,
      volume: this.effectiveMusicVolume(settings.musicVolume),
      duration: 500,
    });
  }

  stopMusic(fadeOut: boolean = true): void {
    if (!this.currentMusic || !this.scene) return;

    if (fadeOut) {
      const music = this.currentMusic;
      this.scene.tweens.add({
        targets: music,
        volume: 0,
        duration: 500,
        onComplete: () => {
          music.stop();
          music.destroy();
        },
      });
    } else {
      this.currentMusic.stop();
      this.currentMusic.destroy();
    }

    this.currentMusic = null;
    this.currentMusicKey = '';
  }

  playSFX(key: string): void {
    if (!this.scene) return;
    if (!this.scene.cache.audio.exists(key)) return;

    const settings = gameState.getSettings();
    this.scene.sound.play(key, { volume: this.effectiveSfxVolume(settings.sfxVolume) });
  }

  /** Play a procedural tone using the Web Audio API. Falls back silently if unavailable. */
  playTone(frequency: number, duration: number = 100, type: OscillatorType = 'sine'): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const effSfx = this.effectiveSfxVolume(gameState.getSettings().sfxVolume);
    if (effSfx <= 0) return;
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gainNode.gain.setValueAtTime(Math.max(effSfx * 0.3, 0.0001), ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Silently fail if nodes cannot be created
    }
  }

  playCorrectTone(): void {
    this.playTone(523, 150, 'sine'); // C5
    setTimeout(() => this.playTone(659, 150, 'sine'), 100); // E5
    setTimeout(() => this.playTone(784, 200, 'sine'), 200); // G5
  }

  playWrongTone(): void {
    this.playTone(200, 200, 'sawtooth');
    setTimeout(() => this.playTone(150, 300, 'sawtooth'), 150);
  }

  playClickTone(): void {
    this.playTone(880, 50, 'square');
  }

  /**
   * Soft two-note ascend played when a dialogue tree opens. Distinct from
   * the menu click tone (square wave 880Hz) so the player's ear can tell
   * "started talking" apart from "selected an option". A sine + triangle
   * pair lands in the warm middle range; cheap enough to fire on every
   * NPC interaction without becoming fatiguing.
   */
  playDialogueOpenTone(): void {
    this.playTone(392, 70, 'sine');     // G4
    setTimeout(() => this.playTone(523, 90, 'triangle'), 50); // C5
  }

  applyVolumeSettings(): void {
    if (!this.currentMusic) return;
    const { musicVolume } = gameState.getSettings();
    const v = this.effectiveMusicVolume(musicVolume);
    if (this.currentMusic instanceof Phaser.Sound.WebAudioSound) {
      this.currentMusic.setVolume(v);
    } else if (this.currentMusic instanceof Phaser.Sound.HTML5AudioSound) {
      this.currentMusic.setVolume(v);
    }
    // NoAudioSound (no-audio environments) intentionally skipped
  }

  /** Zeroes all audio output while keeping menu volume prefs intact. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.applyVolumeSettings();
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private effectiveMusicVolume(slider: number): number {
    return this.muted ? 0 : slider;
  }

  private effectiveSfxVolume(slider: number): number {
    return this.muted ? 0 : slider;
  }
}

export const audioManager = new AudioManagerClass();
