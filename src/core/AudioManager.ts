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
      volume: settings.musicVolume,
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
    this.scene.sound.play(key, { volume: settings.sfxVolume });
  }

  /**
   * Play a procedural tone fallback when no authored SFX asset is available.
   */
  playTone(frequency: number, duration: number = 100, type: OscillatorType = 'sine'): void {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(gameState.getSettings().sfxVolume * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch {
      // Silently fail if Web Audio API unavailable
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
}

export const audioManager = new AudioManagerClass();
