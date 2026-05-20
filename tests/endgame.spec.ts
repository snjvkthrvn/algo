import { test, expect, type Page } from 'playwright/test';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const SHOTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'screenshots');

type PhaserGame = {
  scene: {
    isActive(key: string): boolean;
    getScene(key: string): unknown;
    start(key: string, data?: Record<string, unknown>): void;
    stop(key: string): void;
    scenes: Array<{ sys: { settings: { key: string }; isActive(): boolean } }>;
  };
};

type GameWindow = Window & {
  __PHASER_GAME__?: PhaserGame;
};

async function waitForScene(page: Page, key: string, timeout = 30_000) {
  await page.waitForFunction(
    (k) => !!(window as GameWindow).__PHASER_GAME__?.scene.isActive(k),
    key,
    { timeout },
  );
}

async function snap(page: Page, filename: string) {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.screenshot({ path: join(SHOTS_DIR, filename) });
}

test.describe('EndGameScene visual audit', () => {
  test.beforeAll(async () => {
    await mkdir(SHOTS_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1_000);
  });

  test('End Game - Journey Ledger renders correctly', async ({ page }) => {
    // Seed save data with endgame_pending true
    await page.evaluate(() => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 0, y: 0, region: 'core' },
        companion: { stage: 'core', mood: 'neutral' },
        rival: { encountered: true, encounterStage: 8 },
        shardsCollected: ['logic_shard_1', 'logic_shard_2', 'logic_shard_3'],
        puzzleResults: {
          'p1': { stars: 3, time: 60, attempts: 1, hintsUsed: 0 },
          'p2': { stars: 2, time: 120, attempts: 2, hintsUsed: 1 },
          'p3': { stars: 3, time: 45, attempts: 1, hintsUsed: 0 },
        },
        codexEntries: [],
        npcStates: {},
        flags: {
          game_complete: false,
          endgame_pending: true,
        },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 3650,
      }));
    });

    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      if (!game) return;
      game.scene.scenes
        .filter(s => s.sys.isActive())
        .forEach(s => game.scene.stop(s.sys.settings.key));
      game.scene.start('EndGameScene');
    });

    await waitForScene(page, 'EndGameScene');
    
    // EndGameScene sequence:
    // - Fade in (1.4s real approx)
    // - Title (0.4s delay + 1.2s = 1.6s game-time)
    // - Ledger scheduled at 2.2s
    // - Ledger animates for 0.7s (complete around 2.9s game-time)
    // We wait 3.5s real time to capture it fully assembled.
    await page.waitForTimeout(3_500);

    await snap(page, '64-endgame-ledger.png');
  });

  test('End Game - Credits and Return Button render correctly', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 0, y: 0, region: 'core' },
        companion: { stage: 'core', mood: 'neutral' },
        rival: { encountered: true, encounterStage: 8 },
        shardsCollected: [],
        puzzleResults: {},
        codexEntries: [],
        npcStates: {},
        flags: {
          game_complete: false,
          endgame_pending: true,
        },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    });

    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      if (!game) return;
      game.scene.scenes
        .filter(s => s.sys.isActive())
        .forEach(s => game.scene.stop(s.sys.settings.key));
      game.scene.start('EndGameScene');
    });

    await waitForScene(page, 'EndGameScene');

    // Credits appear at 3.4s game-time. Button appears at 4.4s game-time.
    // Button animates for 0.6s. Fully resolved by 5.0s game-time.
    // Wait ~8 seconds real time to be safe.
    await page.waitForTimeout(8_000);

    await snap(page, '65-endgame-credits.png');
  });
});
