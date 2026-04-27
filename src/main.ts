import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
// Import singletons to guarantee EventBus listeners are registered
// before any scene can fire PUZZLE_COMPLETE or REGION_ENTER events.
import './core/SaveLoadManager';
import './systems/ProgressionSystem';

const game = new Phaser.Game(gameConfig);

// Expose for debugging
(window as unknown as Record<string, unknown>).__PHASER_GAME__ = game;

export { game };
