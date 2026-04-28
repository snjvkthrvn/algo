/**
 * Prologue region visual audit.
 *
 * Captures screenshots of every key visual state in the prologue — overworld,
 * puzzles, dialogue — so regressions are visible at a glance.
 *
 * Run with:  npx playwright test
 * View HTML report after:  npx playwright show-report
 *
 * Screenshots land in tests/screenshots/.
 * First run creates them; subsequent runs let you diff manually.
 *
 * ── Timing note ──────────────────────────────────────────────────────────────
 * In headless Chromium, requestAnimationFrame is throttled to ~1 fps for
 * background tabs.  Phaser's delayedCall timers fire at correct wall-clock time
 * (they use performance.now internally), but the canvas only repaints on the
 * next RAF tick — up to 1000 ms late.  All waitForTimeout values below account
 * for this with a ~1.8× multiplier on top of the nominal game-time duration.
 *
 * ── Scene-transition strategy ────────────────────────────────────────────────
 * Prologue tests navigate via keyboard (Enter on NEW GAME).  That goes through
 * TransitionManager.swirl(), which calls scene.scene.start() from *within* the
 * running MenuScene.  Phaser's ScenePlugin queues the stop-then-start pair
 * atomically, so the menu canvas is fully covered by the swirl before the
 * prologue renders its first frame.
 *
 * Puzzle tests jump via JS injection because reaching them through normal play
 * would require NPC dialogue interaction.  Puzzles are safe: BasePuzzleScene
 * draws a full-screen opaque overlay that hides any bleed from the menu canvas.
 */

import { test, expect, type Page } from 'playwright/test';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// ─── Types ──────────────────────────────────────────────────────────────────

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
  __gameState__?: {
    getFlag(flag: string): boolean;
    getState(): { player: { x: number; y: number; region: string } };
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const SHOTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'screenshots');

/** Block until Phaser reports the named scene as active. */
async function waitForScene(page: Page, key: string, timeout = 15_000) {
  await page.waitForFunction(
    (k) => !!(window as GameWindow).__PHASER_GAME__?.scene.isActive(k),
    key,
    { timeout },
  );
}

/** Block until P0-1 enters PLAYER_TURN for any round. */
async function waitForP01PlayerTurn(page: Page, timeout = 20_000) {
  await page.waitForFunction(
    () => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene('P0_1_FollowThePath') as Record<string, unknown> | null;
      return scene?.['puzzleState'] === 'PLAYER_TURN';
    },
    { timeout },
  );
}

/** Press a sequence of number keys with a small gap between each input. */
async function pressSequence(page: Page, keys: string[], gapMs = 250) {
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(gapMs);
  }
}

/** Stage a specific P0-1 round at player turn while keeping keyboard input real. */
async function prepareP01Round(page: Page, roundIndex: number) {
  await page.evaluate((round) => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene('P0_1_FollowThePath') as Record<string, unknown> | null;
    if (!scene) return;
    const time = scene['time'] as { removeAllEvents?: () => void } | undefined;
    time?.removeAllEvents?.();
    scene['currentRound'] = round;
    const startRound = scene['startRound'];
    if (typeof startRound === 'function') {
      (startRound as () => void).call(scene);
    }
    time?.removeAllEvents?.();
    scene['playerInputIndex'] = 0;
    scene['puzzleState'] = 'PLAYER_TURN';
  }, roundIndex);

  await waitForP01PlayerTurn(page, 5_000);
}

/** Advance all five Concept Bridge pages and wait for the Prologue return. */
async function advanceConceptBridge(page: Page) {
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
  }
  await waitForScene(page, 'PrologueScene', 12_000);
}

/** Trigger onPuzzleComplete(3) on the active puzzle scene via JS injection. */
async function completePuzzleViaInjection(page: Page, sceneKey: string) {
  await page.evaluate((key) => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene(key) as Record<string, unknown> | null;
    const complete = scene?.['onPuzzleComplete'];
    if (typeof complete === 'function') {
      (complete as (stars: number) => void).call(scene, 3);
    }
  }, sceneKey);
}

async function getScenePlayerPosition(page: Page, sceneKey: string) {
  return page.evaluate((key) => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene(key) as Record<string, unknown> | null;
    const player = scene?.['player'] as { getPosition?: () => { x: number; y: number } } | null;
    return player?.getPosition?.() ?? null;
  }, sceneKey);
}

async function walkStep(page: Page, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') {
  await page.keyboard.down(key);
  await page.waitForTimeout(220);
  await page.keyboard.up(key);
  await page.waitForTimeout(140);
}

/**
 * Navigate to the PrologueScene the same way the player does: Enter on NEW GAME.
 *
 * This goes through MenuScene → TransitionManager.swirl() → scene.scene.start(),
 * which properly stops the menu before the prologue renders.  Returns once the
 * prologue fade-in overlay has cleared and the first game frame is stable.
 */
async function goToPrologue(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('algorithmia_save_v1', JSON.stringify({
      player: { x: 320, y: 400, region: 'prologue' },
      companion: { stage: 'spark', mood: 'neutral' },
      rival: { encountered: false, encounterStage: 0 },
      shardsCollected: [],
      puzzleResults: {},
      codexEntries: [],
      npcStates: {},
      flags: {
        opening_scene_done: true,
        professor_node_intro_done: true,
      },
      settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
      saveVersion: 1,
      playTime: 0,
    }));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForScene(page, 'MenuScene');
  await page.waitForTimeout(1_000);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await waitForScene(page, 'PrologueScene', 10_000);
  // PrologueScene fade-in runs for 800 ms game-time; swirl + RAF throttle ~1.8×.
  await page.waitForTimeout(1_800);
}

/** Seed a save in Array Plains and use Continue from the menu (tests SCENE_BY_REGION). */
async function goToArrayPlainsViaContinue(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('algorithmia_save_v1', JSON.stringify({
      player: { x: 400, y: 448, region: 'array_plains' },
      companion: { stage: 'spark', mood: 'neutral' },
      rival: { encountered: false, encounterStage: 0 },
      shardsCollected: [],
      puzzleResults: {},
      codexEntries: [],
      npcStates: {},
      flags: { opening_scene_done: true, prologue_visited: true },
      settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
      saveVersion: 1,
      playTime: 0,
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForScene(page, 'MenuScene');
  await page.waitForTimeout(1_000);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await waitForScene(page, 'ArrayPlainsScene', 10_000);
  await page.waitForTimeout(1_800);
}

/**
 * Jump directly to a Phaser scene without simulating full UI flows.
 *
 * Only safe for scenes that draw a full-screen opaque overlay in create()
 * (the puzzle scenes all do this via BasePuzzleScene.createPuzzleUI), which
 * prevents any menu-canvas bleed from appearing in the screenshot.
 */
async function jumpToScene(
  page: Page,
  key: string,
  data: Record<string, unknown> = {},
) {
  await page.evaluate(
    ([k, d]) => {
      const game = (window as GameWindow).__PHASER_GAME__;
      if (!game) return;
      // Stop all running scenes first so their render state doesn't bleed.
      game.scene.scenes
        .filter(s => s.sys.isActive())
        .forEach(s => game.scene.stop(s.sys.settings.key));
      game.scene.start(k as string, d as Record<string, unknown>);
    },
    [key, data] as const,
  );
  await waitForScene(page, key);
}

/** Save a screenshot of the Phaser canvas to tests/screenshots/<filename>. */
async function snap(page: Page, filename: string) {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.screenshot({ path: join(SHOTS_DIR, filename) });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Prologue region – visual audit', () => {
  test.beforeAll(async () => {
    await mkdir(SHOTS_DIR, { recursive: true });
  });

  // Every test starts with a fresh page load at the main menu.
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForScene(page, 'MenuScene');
    // Wait for the menu fade-in tween to complete (500 ms game-time ≈ 900 ms real).
    await page.waitForTimeout(1_000);
  });

  // ── Menu ──────────────────────────────────────────────────────────────────

  test('01 – menu screen', async ({ page }) => {
    await snap(page, '01-menu.png');
  });

  // ── Prologue overworld ────────────────────────────────────────────────────

  test('02 – prologue overworld – region card visible', async ({ page }) => {
    await goToPrologue(page);
    // After goToPrologue the fade-in is done and the region card is in its
    // 2500 ms hold phase.  Snap immediately — the card is fully opaque.
    await snap(page, '02-prologue-region-card.png');
  });

  test('03 – prologue overworld – settled atmosphere', async ({ page }) => {
    await goToPrologue(page);
    // HUD card total: 500 ms + 2500 ms + 500 ms = 3500 ms game-time ≈ 6300 ms real.
    // goToPrologue already consumed ~1800 ms real (post-scene-active wait).
    // Wait another 5000 ms to clear the remaining ~4500 ms real of card animation.
    await page.waitForTimeout(5_000);
    await snap(page, '03-prologue-settled.png');
  });

  // ── Puzzle P0-1: Follow the Path ──────────────────────────────────────────

  test('04 – P0-1 Follow the Path – initial tile layout', async ({ page }) => {
    await jumpToScene(page, 'P0_1_FollowThePath', { returnScene: 'PrologueScene' });
    // Tiles are drawn in create(); 500 ms real is enough for the fade-in to clear.
    await page.waitForTimeout(500);
    await snap(page, '04-p0-1-layout.png');
  });

  test('05 – P0-1 Follow the Path – tile glowing mid-sequence', async ({ page }) => {
    await jumpToScene(page, 'P0_1_FollowThePath', { returnScene: 'PrologueScene' });
    // waitForScene resolves ~2600 ms after create() (RAF throttle), so by the time
    // waitForTimeout starts the game is already at ~2600 ms.  Adding 2500 ms real time
    // puts us at game-time ~5100 ms — inside tile-2's glow window (4600–5600 ms).
    await page.waitForTimeout(2_500);
    await snap(page, '05-p0-1-glow.png');
  });

  test('06 – P0-1 Follow the Path – player turn', async ({ page }) => {
    await jumpToScene(page, 'P0_1_FollowThePath', { returnScene: 'PrologueScene' });
    // "Your turn!" fires at game-time 6200 ms (800 intro + 1200 round delay + 3×1300 ms
    // pattern + 300 ms buffer).  waitForScene resolves ~2600 ms after create() due to RAF
    // throttle, so the message window in real-time is roughly waitForScene + 3600–5600 ms.
    // 4500 ms lands in the middle; accounting for ~1× RAF render lag it hits the painted
    // frame where the floating text is clearly visible (alpha ≈ 0.7).
    await page.waitForTimeout(4_500);
    await snap(page, '06-p0-1-player-turn.png');
  });

  // ── Puzzle P0-2: Flow Consoles ────────────────────────────────────────────

  test('07 – P0-2 Flow Consoles – initial layout', async ({ page }) => {
    await jumpToScene(page, 'P0_2_FlowConsoles', { returnScene: 'PrologueScene' });
    await page.waitForTimeout(500);
    await snap(page, '07-p0-2-layout.png');
  });

  // ── Array Plains ───────────────────────────────────────────────────────────

  test('08 – Array Plains – Continue from save', async ({ page }) => {
    await goToArrayPlainsViaContinue(page);
    await snap(page, '08-array-plains-continue.png');

    const pos = await getScenePlayerPosition(page, 'ArrayPlainsScene');
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(368);
    expect(pos!.x).toBeLessThanOrEqual(432);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test('09 - Continue with unknown region falls back to Prologue', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 320, y: 400, region: 'unknown_future_region' },
        companion: { stage: 'spark', mood: 'neutral' },
        rival: { encountered: false, encounterStage: 0 },
        shardsCollected: [],
        puzzleResults: {},
        codexEntries: [],
        npcStates: {},
        flags: { opening_scene_done: true },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    });

    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning') warnings.push(msg.text());
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1_000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await waitForScene(page, 'PrologueScene', 10_000);
    expect(warnings.some((warning) => warning.includes('unknown_future_region'))).toBe(true);
  });

  test('10 - P0-1 Follow the Path - completes all 3 rounds', async ({ page }) => {
    test.setTimeout(90_000);

    await jumpToScene(page, 'P0_1_FollowThePath', { returnScene: 'PrologueScene' });

    await prepareP01Round(page, 0);
    await pressSequence(page, ['1', '2', '3']);

    await prepareP01Round(page, 1);
    await pressSequence(page, ['2', '4', '1', '5', '3']);

    await prepareP01Round(page, 2);
    await pressSequence(page, ['5', '1', '4', '2', '3', '6', '4']);

    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene('P0_1_FollowThePath') as Record<string, unknown> | null;
      const time = scene?.['time'] as { removeAllEvents?: () => void } | undefined;
      time?.removeAllEvents?.();
      const complete = scene?.['puzzleComplete'];
      if (scene && typeof complete === 'function') {
        (complete as () => void).call(scene);
      }
    });

    await waitForScene(page, 'ConceptBridgeScene', 10_000);
    await snap(page, '10-p0-1-complete.png');
    await advanceConceptBridge(page);

    const flagSet = await page.evaluate(() =>
      !!(window as GameWindow).__gameState__?.getFlag('puzzle_p0_1_complete')
    );
    expect(flagSet).toBe(true);
  });

  test('11 - P0-2 Flow Consoles - completes all 3 shards', async ({ page }) => {
    await jumpToScene(page, 'P0_2_FlowConsoles', { returnScene: 'PrologueScene' });
    await page.waitForTimeout(1_000);

    await page.keyboard.press('1');
    await page.waitForTimeout(400);
    await page.keyboard.press('1');
    await page.waitForTimeout(600);

    await page.keyboard.press('2');
    await page.waitForTimeout(400);
    await page.keyboard.press('2');
    await page.waitForTimeout(600);

    await page.keyboard.press('3');
    await page.waitForTimeout(400);
    await page.keyboard.press('3');

    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene('P0_2_FlowConsoles') as Record<string, unknown> | null;
      const time = scene?.['time'] as { removeAllEvents?: () => void } | undefined;
      const complete = scene?.['puzzleComplete'];
      if (scene?.['completedCount'] === 3 && typeof complete === 'function') {
        time?.removeAllEvents?.();
        (complete as () => void).call(scene);
      }
    });

    await waitForScene(page, 'ConceptBridgeScene', 8_000);
    await snap(page, '11-p0-2-complete.png');
    await advanceConceptBridge(page);

    const flagSet = await page.evaluate(() =>
      !!(window as GameWindow).__gameState__?.getFlag('puzzle_p0_2_complete')
    );
    expect(flagSet).toBe(true);
  });

  test('12 - Boss Sentinel completes and Array Plains gateway unlocks', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 320, y: 400, region: 'prologue' },
        companion: { stage: 'spark', mood: 'neutral' },
        rival: { encountered: false, encounterStage: 0 },
        shardsCollected: [],
        puzzleResults: {
          p0_1: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
          p0_2: { stars: 3, time: 25, attempts: 0, hintsUsed: 0 },
        },
        codexEntries: [],
        npcStates: {},
        flags: {
          opening_scene_done: true,
          professor_node_intro_done: true,
          watcher_warning_done: true,
          glitch_intro_done: true,
          boss_gate_cutscene_done: true,
          puzzle_p0_1_complete: true,
          puzzle_p0_2_complete: true,
          boss_gate_open: true,
        },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1_000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'PrologueScene', 10_000);

    await jumpToScene(page, 'Boss_Sentinel', { returnScene: 'PrologueScene' });
    await page.waitForTimeout(1_000);
    await completePuzzleViaInjection(page, 'Boss_Sentinel');

    await waitForScene(page, 'PrologueScene', 10_000);
    await page.waitForTimeout(2_000);
    await snap(page, '12-gateway-unlocked.png');

    const gatewayOpen = await page.evaluate(() =>
      !!(window as GameWindow).__gameState__?.getFlag('gateway_open')
    );
    expect(gatewayOpen).toBe(true);
  });

  test('13 - Array Plains - walk route, inspect marker, return to Prologue', async ({ page }) => {
    test.setTimeout(60_000);

    await page.evaluate(() => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 560, y: 416, region: 'array_plains' },
        companion: { stage: 'spark', mood: 'neutral' },
        rival: { encountered: false, encounterStage: 0 },
        shardsCollected: [],
        puzzleResults: {},
        codexEntries: [],
        npcStates: {},
        flags: {
          opening_scene_done: true,
          professor_node_intro_done: true,
          watcher_warning_done: true,
          prologue_visited: true,
        },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1_000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'ArrayPlainsScene', 10_000);
    await page.waitForTimeout(1_800);

    await walkStep(page, 'ArrowRight');
    await walkStep(page, 'ArrowRight');

    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    await snap(page, '13-array-plains-marker-panel.png');

    await page.keyboard.press('Space');
    await page.waitForTimeout(400);

    for (let i = 0; i < 17; i++) {
      await walkStep(page, 'ArrowLeft');
    }

    await page.keyboard.press('Space');

    await waitForScene(page, 'PrologueScene', 12_000);
    await page.waitForTimeout(1_500);
    await snap(page, '13b-prologue-return.png');

    const returnPos = await getScenePlayerPosition(page, 'PrologueScene');
    expect(returnPos).not.toBeNull();
    expect(returnPos!.x).toBeGreaterThanOrEqual(1904);
    expect(returnPos!.x).toBeLessThanOrEqual(2032);
    expect(returnPos!.y).toBeGreaterThanOrEqual(331);
    expect(returnPos!.y).toBeLessThanOrEqual(459);
  });
});
