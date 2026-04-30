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
 * Most puzzle layout tests jump via JS injection because they focus on puzzle
 * rendering. Later NPC interaction tests cover the keyboard dialogue path into
 * the first two puzzle scenes.
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

async function clickMenuItem(page: Page, label: string) {
  const menuInfo = await page.waitForFunction((targetLabel) => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene('MenuScene') as Record<string, unknown> | null;
    const items = scene?.['menuItems'] as Array<{ text: string }> | undefined;
    const texts = scene?.['menuTexts'] as Array<{ alpha?: number }> | undefined;
    const index = items?.findIndex((item) => item.text === targetLabel) ?? -1;
    const text = index >= 0 ? texts?.[index] : undefined;
    if (index < 0 || !text || (text.alpha ?? 0) < 0.95) return null;
    return {
      index,
      itemCount: items?.length ?? 0,
      selectedIndex: (scene?.['selectedMenuIndex'] as number | undefined) ?? 0,
    };
  }, label);

  const { index, itemCount, selectedIndex } = await menuInfo.jsonValue();
  const downSteps = (index - selectedIndex + itemCount) % itemCount;
  const upSteps = (selectedIndex - index + itemCount) % itemCount;
  const key = downSteps <= upSteps ? 'ArrowDown' : 'ArrowUp';
  const steps = Math.min(downSteps, upSteps);
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
  await page.keyboard.press('Enter');
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
  await clickMenuItem(page, 'CONTINUE');
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
  await clickMenuItem(page, 'CONTINUE');
  await waitForScene(page, 'ArrayPlainsScene', 10_000);
  await page.waitForTimeout(1_800);
}

async function goToFutureRegionViaContinue(
  page: Page,
  region: string,
  sceneKey: string,
  puzzleResults: Record<string, { stars: number; time: number; attempts: number; hintsUsed: number }>,
) {
  await page.evaluate(
    ([targetRegion, results]) => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 192, y: 448, region: targetRegion },
        companion: { stage: 'graph', mood: 'neutral' },
        rival: { encountered: true, encounterStage: 5 },
        shardsCollected: ['array_plains_logic_shard', 'hash_highlands_logic_shard'],
        puzzleResults: results,
        codexEntries: [],
        npcStates: {},
        flags: {
          opening_scene_done: true,
          professor_node_intro_done: true,
          gateway_open: true,
          twin_rivers_gateway_open: true,
        },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    },
    [region, puzzleResults] as const,
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForScene(page, 'MenuScene');
  await page.waitForTimeout(1_000);
  await clickMenuItem(page, 'CONTINUE');
  await waitForScene(page, sceneKey, 10_000);
  await page.waitForTimeout(1_800);
}

async function continueToPrologueAt(
  page: Page,
  player: { x: number; y: number },
  flags: Record<string, boolean>,
) {
  await page.evaluate(
    ([p, f]) => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: p.x, y: p.y, region: 'prologue' },
        companion: { stage: 'spark', mood: 'neutral' },
        rival: { encountered: false, encounterStage: 0 },
        shardsCollected: [],
        puzzleResults: {},
        codexEntries: [],
        npcStates: {},
        flags: f,
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    },
    [player, flags] as const,
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForScene(page, 'MenuScene');
  await page.waitForTimeout(1_000);
  await clickMenuItem(page, 'CONTINUE');
  await waitForScene(page, 'PrologueScene', 10_000);
}

async function getPrologueRuntimeState(page: Page) {
  return page.evaluate(() => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene('PrologueScene') as Record<string, unknown> | null;
    const dialogueSystem = scene?.['dialogueSystem'] as { isDialogueActive?: () => boolean } | undefined;
    const player = scene?.['player'] as { state?: string } | undefined;
    return {
      storyBeatActive: scene?.['storyBeatActive'] === true,
      dialogueActive: dialogueSystem?.isDialogueActive?.() === true,
      playerState: player?.state ?? null,
      professorNodeIntroDone: (window as GameWindow).__gameState__?.getFlag('professor_node_intro_done') === true,
    };
  });
}

async function pressThroughDialogue(page: Page, presses: number, gapMs = 350) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(gapMs);
  }
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
    expect(pos!.x).toBeGreaterThanOrEqual(192);
    expect(pos!.x).toBeLessThanOrEqual(256);
    expect(pos!.y).toBeGreaterThanOrEqual(304);
    expect(pos!.y).toBeLessThanOrEqual(368);
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
    await clickMenuItem(page, 'CONTINUE');

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
    await clickMenuItem(page, 'CONTINUE');
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
        player: { x: 560, y: 384, region: 'array_plains' },
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
    await clickMenuItem(page, 'CONTINUE');
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

  test('17 - AP-1 Sorting Shed - region encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P1_1_BubbleSort', { returnScene: 'ArrayPlainsScene' });
    await page.waitForTimeout(700);
    await snap(page, '17-ap1-sorting-shed-layout.png');
  });

  test('18 - AP-2 Indexing Barn - region encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P1_2_BasketIndexing', { returnScene: 'ArrayPlainsScene' });
    await page.waitForTimeout(700);
    await snap(page, '18-ap2-indexing-barn-layout.png');
  });

  test('19 - AP-3 Grain Hopper - region encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P1_3_HashHopper', { returnScene: 'ArrayPlainsScene' });
    await page.waitForTimeout(700);
    await snap(page, '19-ap3-grain-hopper-layout.png');
  });

  test('20 - AP-4 Pairing Grounds - region encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P1_4_TwoSum', { returnScene: 'ArrayPlainsScene' });
    await page.waitForTimeout(700);
    await snap(page, '20-ap4-pairing-grounds-layout.png');
  });

  test('21 - Shuffler Domain - boss encounter layout', async ({ page }) => {
    await jumpToScene(page, 'Boss_Shuffler', { returnScene: 'ArrayPlainsScene' });
    await page.waitForTimeout(700);
    await snap(page, '21-shuffler-domain-layout.png');
  });

  test('22 - Twin Rivers - Continue from save', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 192, y: 384, region: 'twin_rivers' },
        companion: { stage: 'frame', mood: 'neutral' },
        rival: { encountered: true, encounterStage: 2 },
        shardsCollected: [],
        puzzleResults: { boss_shuffler: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 } },
        codexEntries: [],
        npcStates: {},
        flags: {
          opening_scene_done: true,
          professor_node_intro_done: true,
          watcher_warning_done: true,
          prologue_visited: true,
          gateway_open: true,
          twin_rivers_gateway_open: true,
        },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, 'CONTINUE');
    await waitForScene(page, 'TwinRiversScene', 10_000);
    await page.waitForTimeout(1_800);
    await snap(page, '22-twin-rivers-continue.png');
  });

  test('23 - TR-1 Mirror Walk - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P2_1_MirrorWalk', { returnScene: 'TwinRiversScene' });
    await page.waitForTimeout(700);
    await snap(page, '23-tr1-mirror-walk-layout.png');
  });

  test('24 - TR-2 Pointer Bridge - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P2_2_PointerBridge', { returnScene: 'TwinRiversScene' });
    await page.waitForTimeout(700);
    await snap(page, '24-tr2-pointer-bridge-layout.png');
  });

  test('25 - TR-3 Fixed Window Dock - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P2_3_FixedWindowDock', { returnScene: 'TwinRiversScene' });
    await page.waitForTimeout(700);
    await snap(page, '25-tr3-fixed-window-layout.png');
  });

  test('26 - TR-4 Current Rider - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P2_4_CurrentRider', { returnScene: 'TwinRiversScene' });
    await page.waitForTimeout(700);
    await snap(page, '26-tr4-current-rider-layout.png');
  });

  test('27 - Mirror Serpent - boss encounter layout', async ({ page }) => {
    await jumpToScene(page, 'Boss_MirrorSerpent', { returnScene: 'TwinRiversScene' });
    await page.waitForTimeout(700);
    await snap(page, '27-mirror-serpent-layout.png');
  });

  test('28 - Hash Highlands - Continue from save', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 192, y: 448, region: 'hash_highlands' },
        companion: { stage: 'frame', mood: 'neutral' },
        rival: { encountered: true, encounterStage: 3 },
        shardsCollected: ['array_plains_logic_shard'],
        puzzleResults: { boss_mirror_serpent: { stars: 3, time: 35, attempts: 0, hintsUsed: 0 } },
        codexEntries: [],
        npcStates: {},
        flags: {
          opening_scene_done: true,
          professor_node_intro_done: true,
          gateway_open: true,
          twin_rivers_gateway_open: true,
          puzzle_boss_mirror_serpent_complete: true,
        },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, 'CONTINUE');
    await waitForScene(page, 'HashHighlandsScene', 10_000);
    await page.waitForTimeout(1_800);
    await snap(page, '28-hash-highlands-continue.png');

    const pos = await getScenePlayerPosition(page, 'HashHighlandsScene');
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test('29 - HH-1 Nameplate Gates - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P3_1_NameplateGates', { returnScene: 'HashHighlandsScene' });
    await page.waitForTimeout(700);
    await snap(page, '29-hh1-nameplate-gates-layout.png');
  });

  test('30 - HH-2 Frequency Forge - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P3_2_FrequencyForge', { returnScene: 'HashHighlandsScene' });
    await page.waitForTimeout(700);
    await snap(page, '30-hh2-frequency-forge-layout.png');
  });

  test('31 - HH-3 Anagram Gardens - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P3_3_AnagramGardens', { returnScene: 'HashHighlandsScene' });
    await page.waitForTimeout(700);
    await snap(page, '31-hh3-anagram-gardens-layout.png');
  });

  test('32 - HH-4 Cache Cavern - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P3_4_CacheCavern', { returnScene: 'HashHighlandsScene' });
    await page.waitForTimeout(700);
    await snap(page, '32-hh4-cache-cavern-layout.png');
  });

  test('33 - Archivist - boss encounter layout', async ({ page }) => {
    await jumpToScene(page, 'Boss_Archivist', { returnScene: 'HashHighlandsScene' });
    await page.waitForTimeout(700);
    await snap(page, '33-archivist-layout.png');
  });

  test('34 - Stack Spires - Continue from save', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('algorithmia_save_v1', JSON.stringify({
        player: { x: 192, y: 448, region: 'stack_spires' },
        companion: { stage: 'branch', mood: 'neutral' },
        rival: { encountered: true, encounterStage: 4 },
        shardsCollected: ['array_plains_logic_shard', 'hash_highlands_logic_shard'],
        puzzleResults: { boss_archivist: { stars: 3, time: 38, attempts: 0, hintsUsed: 0 } },
        codexEntries: [],
        npcStates: {},
        flags: {
          opening_scene_done: true,
          professor_node_intro_done: true,
          gateway_open: true,
          twin_rivers_gateway_open: true,
          puzzle_boss_archivist_complete: true,
        },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, 'CONTINUE');
    await waitForScene(page, 'StackSpiresScene', 10_000);
    await page.waitForTimeout(1_800);
    await snap(page, '34-stack-spires-continue.png');

    const pos = await getScenePlayerPosition(page, 'StackSpiresScene');
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test('35 - SS-1 Scroll Stack - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P4_1_ScrollStack', { returnScene: 'StackSpiresScene' });
    await page.waitForTimeout(700);
    await snap(page, '35-ss1-scroll-stack-layout.png');
  });

  test('36 - SS-2 Mirror Staircase - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P4_2_MirrorStaircase', { returnScene: 'StackSpiresScene' });
    await page.waitForTimeout(700);
    await snap(page, '36-ss2-mirror-staircase-layout.png');
  });

  test('37 - SS-3 Maze of Forks - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P4_3_MazeOfForks', { returnScene: 'StackSpiresScene' });
    await page.waitForTimeout(700);
    await snap(page, '37-ss3-maze-of-forks-layout.png');
  });

  test('38 - SS-4 Tower of Memory - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P4_4_TowerOfMemory', { returnScene: 'StackSpiresScene' });
    await page.waitForTimeout(700);
    await snap(page, '38-ss4-tower-of-memory-layout.png');
  });

  test('39 - Recursion - boss encounter layout', async ({ page }) => {
    await jumpToScene(page, 'Boss_Recursion', { returnScene: 'StackSpiresScene' });
    await page.waitForTimeout(700);
    await snap(page, '39-recursion-layout.png');
  });

  test('40 - Queue Canals - Continue from save', async ({ page }) => {
    await goToFutureRegionViaContinue(page, 'queue_canals', 'QueueCanalsScene', {
      boss_recursion: { stars: 3, time: 38, attempts: 0, hintsUsed: 0 },
    });
    await snap(page, '40-queue-canals-continue.png');

    const pos = await getScenePlayerPosition(page, 'QueueCanalsScene');
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test('41 - QC-1 Ferry Dock - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P5_1_FerryQueue', { returnScene: 'QueueCanalsScene' });
    await page.waitForTimeout(700);
    await snap(page, '41-qc1-ferry-dock-layout.png');
  });

  test('42 - QC-2 Ripple Map - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P5_2_BfsLocks', { returnScene: 'QueueCanalsScene' });
    await page.waitForTimeout(700);
    await snap(page, '42-qc2-ripple-map-layout.png');
  });

  test('43 - QC-3 Priority Dock - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P5_3_PriorityHarbor', { returnScene: 'QueueCanalsScene' });
    await page.waitForTimeout(700);
    await snap(page, '43-qc3-priority-dock-layout.png');
  });

  test('44 - QC-4 Scheduler Lottery - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P5_4_SchedulerOffice', { returnScene: 'QueueCanalsScene' });
    await page.waitForTimeout(700);
    await snap(page, '44-qc4-scheduler-lottery-layout.png');
  });

  test('45 - Reconciler - boss encounter layout', async ({ page }) => {
    await jumpToScene(page, 'Boss_Reconciler', { returnScene: 'QueueCanalsScene' });
    await page.waitForTimeout(700);
    await snap(page, '45-reconciler-layout.png');
  });

  test('46 - Tree Canopy - Continue from save', async ({ page }) => {
    await goToFutureRegionViaContinue(page, 'tree_canopy', 'TreeCanopyScene', {
      boss_reconciler: { stars: 3, time: 40, attempts: 0, hintsUsed: 0 },
    });
    await snap(page, '46-tree-canopy-continue.png');

    const pos = await getScenePlayerPosition(page, 'TreeCanopyScene');
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test('47 - TC-1 First Fork - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P6_1_RootWalk', { returnScene: 'TreeCanopyScene' });
    await page.waitForTimeout(700);
    await snap(page, '47-tc1-first-fork-layout.png');
  });

  test('48 - TC-2 Sorted Grove - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P6_2_BstGrove', { returnScene: 'TreeCanopyScene' });
    await page.waitForTimeout(700);
    await snap(page, '48-tc2-sorted-grove-layout.png');
  });

  test('49 - TC-3 Deep Root - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P6_3_DfsBranches', { returnScene: 'TreeCanopyScene' });
    await page.waitForTimeout(700);
    await snap(page, '49-tc3-deep-root-layout.png');
  });

  test('50 - TC-4 Bent Bough - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P6_4_BalanceCanopy', { returnScene: 'TreeCanopyScene' });
    await page.waitForTimeout(700);
    await snap(page, '50-tc4-bent-bough-layout.png');
  });

  test('51 - Pattern - boss encounter layout', async ({ page }) => {
    await jumpToScene(page, 'Boss_Pattern', { returnScene: 'TreeCanopyScene' });
    await page.waitForTimeout(700);
    await snap(page, '51-pattern-layout.png');
  });

  test('52 - Graph Nexus - Continue from save', async ({ page }) => {
    await goToFutureRegionViaContinue(page, 'graph_nexus', 'GraphNexusScene', {
      boss_pattern: { stars: 3, time: 42, attempts: 0, hintsUsed: 0 },
    });
    await snap(page, '52-graph-nexus-continue.png');

    const pos = await getScenePlayerPosition(page, 'GraphNexusScene');
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test('53 - GN-1 Bridge Map - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P7_1_NodeLinks', { returnScene: 'GraphNexusScene' });
    await page.waitForTimeout(700);
    await snap(page, '53-gn1-bridge-map-layout.png');
  });

  test('54 - GN-2 Courier Dilemma - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P7_2_ShortestPath', { returnScene: 'GraphNexusScene' });
    await page.waitForTimeout(700);
    await snap(page, '54-gn2-courier-dilemma-layout.png');
  });

  test('55 - GN-3 Cycle Bazaar - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P7_3_CycleCourt', { returnScene: 'GraphNexusScene' });
    await page.waitForTimeout(700);
    await snap(page, '55-gn3-cycle-bazaar-layout.png');
  });

  test('56 - GN-4 Island Census - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P7_4_ComponentFields', { returnScene: 'GraphNexusScene' });
    await page.waitForTimeout(700);
    await snap(page, '56-gn4-island-census-layout.png');
  });

  test('57 - Echo - boss encounter layout', async ({ page }) => {
    await jumpToScene(page, 'Boss_Echo', { returnScene: 'GraphNexusScene' });
    await page.waitForTimeout(700);
    await snap(page, '57-echo-layout.png');
  });

  test('58 - The Core - Continue from save', async ({ page }) => {
    await goToFutureRegionViaContinue(page, 'core', 'CoreScene', {
      boss_echo: { stars: 3, time: 44, attempts: 0, hintsUsed: 0 },
    });
    await snap(page, '58-core-continue.png');

    const pos = await getScenePlayerPosition(page, 'CoreScene');
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test('59 - CORE-1 Echo Chamber - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P8_1_EchoChamber', { returnScene: 'CoreScene' });
    await page.waitForTimeout(700);
    await snap(page, '59-core1-echo-chamber-layout.png');
  });

  test('60 - CORE-2 Weighted Staircase - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P8_2_WeightedStaircase', { returnScene: 'CoreScene' });
    await page.waitForTimeout(700);
    await snap(page, '60-core2-weighted-staircase-layout.png');
  });

  test('61 - CORE-3 Grand Archive - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P8_3_GrandArchive', { returnScene: 'CoreScene' });
    await page.waitForTimeout(700);
    await snap(page, '61-core3-grand-archive-layout.png');
  });

  test('62 - CORE-4 Hall of Patterns - encounter layout', async ({ page }) => {
    await jumpToScene(page, 'P8_4_HallOfPatterns', { returnScene: 'CoreScene' });
    await page.waitForTimeout(700);
    await snap(page, '62-core4-hall-of-patterns-layout.png');
  });

  test('63 - Protocol Omega - final boss encounter layout', async ({ page }) => {
    await jumpToScene(page, 'Boss_ProtocolOmega', { returnScene: 'CoreScene' });
    await page.waitForTimeout(700);
    await snap(page, '63-protocol-omega-layout.png');
  });

  test('14 - Professor Node intro cannot open overlapping NPC dialogue', async ({ page }) => {
    await continueToPrologueAt(page, { x: 860, y: 395 }, {
      opening_scene_done: true,
      prologue_visited: true,
    });

    await page.waitForFunction(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene('PrologueScene') as Record<string, unknown> | null;
      return scene?.['storyBeatActive'] === true;
    });

    await page.keyboard.press('Space');
    await page.waitForTimeout(250);

    const midIntro = await getPrologueRuntimeState(page);
    expect(midIntro.storyBeatActive).toBe(true);
    expect(midIntro.dialogueActive).toBe(false);
    expect(midIntro.playerState).toBe('frozen');

    await snap(page, '14-professor-node-intro-clean.png');

    await pressThroughDialogue(page, 12, 250);
    await page.waitForTimeout(700);

    const afterIntro = await getPrologueRuntimeState(page);
    expect(afterIntro.professorNodeIntroDone).toBe(true);
    expect(afterIntro.storyBeatActive).toBe(false);
    expect(afterIntro.dialogueActive).toBe(false);
    expect(afterIntro.playerState).toBe('idle');
  });

  test('15 - Rune Keeper keyboard choice starts Follow the Path', async ({ page }) => {
    await continueToPrologueAt(page, { x: 900, y: 197 }, {
      opening_scene_done: true,
      professor_node_intro_done: true,
      watcher_warning_done: true,
      prologue_visited: true,
    });
    await page.waitForTimeout(1_800);

    await page.keyboard.press('Space');
    await pressThroughDialogue(page, 6);
    await snap(page, '15-rune-keeper-choice-ui.png');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    await page.keyboard.press('Enter');

    await waitForScene(page, 'P0_1_FollowThePath', 10_000);
    await snap(page, '15-rune-keeper-puzzle-start.png');
  });

  test('16 - Console Keeper keyboard choice starts Flow Consoles', async ({ page }) => {
    await continueToPrologueAt(page, { x: 900, y: 593 }, {
      opening_scene_done: true,
      professor_node_intro_done: true,
      watcher_warning_done: true,
      prologue_visited: true,
    });
    await page.waitForTimeout(1_800);

    await page.keyboard.press('Space');
    await pressThroughDialogue(page, 6);
    await snap(page, '16-console-keeper-choice-ui.png');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    await page.keyboard.press('Enter');

    await waitForScene(page, 'P0_2_FlowConsoles', 10_000);
    await snap(page, '16-console-keeper-puzzle-start.png');
  });
});
