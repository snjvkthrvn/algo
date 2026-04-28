import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { gameState } from './core/GameStateManager';
// Import singletons to guarantee EventBus listeners are registered
// before any scene can fire PUZZLE_COMPLETE or REGION_ENTER events.
import './core/SaveLoadManager';
import './systems/ProgressionSystem';

const game = new Phaser.Game(gameConfig);

// Expose for debugging
(window as unknown as Record<string, unknown>).__PHASER_GAME__ = game;
(window as unknown as Record<string, unknown>).__gameState__ = gameState;

export { game };
