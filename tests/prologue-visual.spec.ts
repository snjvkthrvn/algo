/**
 * Prologue region visual audit.
 *
 * Captures screenshots of every key visual state in the prologue â€” overworld,
 * puzzles, dialogue â€” so regressions are visible at a glance.
 *
 * Run with:  npx playwright test
 * View HTML report after:  npx playwright show-report
 *
 * Screenshots land in tests/screenshots/.
 * First run creates them; subsequent runs let you diff manually.
 *
 * â”€â”€ Timing note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * In headless Chromium, requestAnimationFrame is throttled to ~1 fps for
 * background tabs.  Phaser's delayedCall timers fire at correct wall-clock time
 * (they use performance.now internally), but the canvas only repaints on the
 * next RAF tick â€” up to 1000 ms late.  All waitForTimeout values below account
 * for this with a ~1.8Ã— multiplier on top of the nominal game-time duration.
 *
 * â”€â”€ Scene-transition strategy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

import { test, expect, type Page } from "playwright/test";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    getBitMood?(): string;
    getState(): {
      player: { x: number; y: number; region: string };
      puzzleResults?: Record<string, { stars: number } | undefined>;
    };
    unlockCodexEntry?(entryId: string): void;
  };
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SHOTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots");
const runtimeErrorsByPage = new WeakMap<Page, string[]>();

/** Block until Phaser reports the named scene as active. */
async function waitForScene(page: Page, key: string, timeout = 30_000) {
  await page.waitForFunction(
    (k) => !!(window as GameWindow).__PHASER_GAME__?.scene.isActive(k),
    key,
    { timeout },
  );
}

/** Block until P0-1 enters PLAYER_TURN for any round. */
async function waitForP01PlayerTurn(page: Page, timeout = 60_000) {
  await page.waitForFunction(
    () => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P0_1_FollowThePath") as Record<
        string,
        unknown
      > | null;
      return (
        scene?.["state"] === "turn" || scene?.["puzzleState"] === "PLAYER_TURN"
      );
    },
    undefined,
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
    const scene = game?.scene.getScene("P0_1_FollowThePath") as Record<
      string,
      unknown
    > | null;
    if (!scene) return;
    const time = scene["time"] as { removeAllEvents?: () => void } | undefined;
    time?.removeAllEvents?.();
    scene["currentRound"] = round;
    const startRound = scene["startRound"];
    if (typeof startRound === "function") {
      (startRound as () => void).call(scene);
    }
    time?.removeAllEvents?.();
    scene["playerInputIndex"] = 0;
    scene["puzzleState"] = "PLAYER_TURN";
  }, roundIndex);

  await waitForP01PlayerTurn(page, 5_000);
}

/**
 * Advance the post-solve NAME_IT beat (FEELâ†’NAME, docs/VISION.md Â§3): the
 * keeper speaks 1-2 DialogueBox lines, the codex whisper settles, and the
 * scene fades back to the overworld on its own. Space both completes the
 * typewriter and advances lines, so a short press loop covers all states.
 */
async function advanceNameItBeat(page: Page, returnScene = "PrologueScene") {
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(900);
    await page.keyboard.press("Space");
  }
  await waitForScene(page, returnScene, 15_000);
}

/** Trigger onPuzzleComplete(3) on the active puzzle scene via JS injection. */
async function completePuzzleViaInjection(page: Page, sceneKey: string) {
  await page.evaluate((key) => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene(key) as Record<string, unknown> | null;
    const complete = scene?.["onPuzzleComplete"];
    if (typeof complete === "function") {
      (complete as (stars: number) => void).call(scene, 3);
    }
  }, sceneKey);
}

async function getScenePlayerPosition(page: Page, sceneKey: string) {
  return page.evaluate((key) => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene(key) as Record<string, unknown> | null;
    const player = scene?.["player"] as {
      getPosition?: () => { x: number; y: number };
    } | null;
    return player?.getPosition?.() ?? null;
  }, sceneKey);
}

async function setScenePlayerPosition(
  page: Page,
  sceneKey: string,
  x: number,
  y: number,
) {
  await page.evaluate(
    ({ key, x, y }) => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene(key) as Record<string, unknown> | null;
      const player = scene?.["player"] as {
        setPosition?: (x: number, y: number) => void;
      } | null;
      player?.setPosition?.(x, y);
    },
    { key: sceneKey, x, y },
  );
}

async function walkStep(
  page: Page,
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
) {
  await page.keyboard.down(key);
  await page.waitForTimeout(220);
  await page.keyboard.up(key);
  await page.waitForTimeout(140);
}

async function clickMenuItem(page: Page, label: string) {
  const menuInfo = await page.waitForFunction((targetLabel) => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene("MenuScene") as Record<
      string,
      unknown
    > | null;
    const items = scene?.["menuItems"] as Array<{ text: string }> | undefined;
    const texts = scene?.["menuTexts"] as Array<{ alpha?: number }> | undefined;
    const index = items?.findIndex((item) => item.text === targetLabel) ?? -1;
    const text = index >= 0 ? texts?.[index] : undefined;
    if (index < 0 || !text || (text.alpha ?? 0) < 0.95) return null;
    return {
      index,
      itemCount: items?.length ?? 0,
      selectedIndex: (scene?.["selectedMenuIndex"] as number | undefined) ?? 0,
    };
  }, label);

  const { index, itemCount, selectedIndex } = await menuInfo.jsonValue();
  const downSteps = (index - selectedIndex + itemCount) % itemCount;
  const upSteps = (selectedIndex - index + itemCount) % itemCount;
  const key = downSteps <= upSteps ? "ArrowDown" : "ArrowUp";
  const steps = Math.min(downSteps, upSteps);
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
  await page.keyboard.press("Enter");
}

/**
 * Navigate to the PrologueScene the same way the player does: Enter on NEW GAME.
 *
 * This goes through MenuScene â†’ TransitionManager.swirl() â†’ scene.scene.start(),
 * which properly stops the menu before the prologue renders.  Returns once the
 * prologue fade-in overlay has cleared and the first game frame is stable.
 */
async function goToPrologue(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem(
      "algorithmia_save_v1",
      JSON.stringify({
        player: { x: 320, y: 400, region: "prologue" },
        companion: { stage: "spark", mood: "neutral" },
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
      }),
    );
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForScene(page, "MenuScene");
  await page.waitForTimeout(1_000);
  await clickMenuItem(page, "CONTINUE");
  await waitForScene(page, "PrologueScene", 10_000);
  // PrologueScene fade-in runs for 800 ms game-time; swirl + RAF throttle ~1.8Ã—.
  await page.waitForTimeout(1_800);
}

/** Seed a save in Array Plains and use Continue from the menu (tests SCENE_BY_REGION). */
async function goToArrayPlainsViaContinue(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem(
      "algorithmia_save_v1",
      JSON.stringify({
        player: { x: 400, y: 448, region: "array_plains" },
        companion: { stage: "spark", mood: "neutral" },
        rival: { encountered: false, encounterStage: 0 },
        shardsCollected: [],
        puzzleResults: {},
        codexEntries: [],
        npcStates: {},
        flags: { opening_scene_done: true, prologue_visited: true },
        settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
        saveVersion: 1,
        playTime: 0,
      }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForScene(page, "MenuScene");
  await page.waitForTimeout(1_000);
  await clickMenuItem(page, "CONTINUE");
  await waitForScene(page, "ArrayPlainsScene", 10_000);
  await page.waitForTimeout(1_800);
}

async function goToFutureRegionViaContinue(
  page: Page,
  region: string,
  sceneKey: string,
  puzzleResults: Record<
    string,
    { stars: number; time: number; attempts: number; hintsUsed: number }
  >,
) {
  await page.evaluate(
    ([targetRegion, results]) => {
      localStorage.setItem(
        "algorithmia_save_v1",
        JSON.stringify({
          player: { x: 192, y: 448, region: targetRegion },
          companion: { stage: "graph", mood: "neutral" },
          rival: { encountered: true, encounterStage: 5 },
          shardsCollected: [
            "array_plains_logic_shard",
            "hash_highlands_logic_shard",
          ],
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
        }),
      );
    },
    [region, puzzleResults] as const,
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForScene(page, "MenuScene");
  await page.waitForTimeout(1_000);
  await clickMenuItem(page, "CONTINUE");
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
      localStorage.setItem(
        "algorithmia_save_v1",
        JSON.stringify({
          player: { x: p.x, y: p.y, region: "prologue" },
          companion: { stage: "spark", mood: "neutral" },
          rival: { encountered: false, encounterStage: 0 },
          shardsCollected: [],
          puzzleResults: {},
          codexEntries: [],
          npcStates: {},
          flags: f,
          settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
          saveVersion: 1,
          playTime: 0,
        }),
      );
    },
    [player, flags] as const,
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForScene(page, "MenuScene");
  await page.waitForTimeout(1_000);
  await clickMenuItem(page, "CONTINUE");
  await waitForScene(page, "PrologueScene", 10_000);
}

async function getPrologueRuntimeState(page: Page) {
  return page.evaluate(() => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene("PrologueScene") as Record<
      string,
      unknown
    > | null;
    const dialogueSystem = scene?.["dialogueSystem"] as
      | { isDialogueActive?: () => boolean }
      | undefined;
    const player = scene?.["player"] as { state?: string } | undefined;
    return {
      storyBeatActive: scene?.["storyBeatActive"] === true,
      dialogueActive: dialogueSystem?.isDialogueActive?.() === true,
      playerState: player?.state ?? null,
      professorNodeIntroDone:
        (window as GameWindow).__gameState__?.getFlag(
          "professor_node_intro_done",
        ) === true,
    };
  });
}

async function pressThroughDialogue(page: Page, presses: number, gapMs = 350) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(gapMs);
  }
}

async function pressUntilPrologueChoice(page: Page, maxPresses = 10) {
  for (let i = 0; i < maxPresses; i++) {
    const hasChoice = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("PrologueScene") as Record<
        string,
        unknown
      > | null;
      const dialogue = scene?.["dialogueSystem"] as
        | Record<string, unknown>
        | undefined;
      const choiceContainer = dialogue?.["choiceContainer"] as
        | { visible?: boolean }
        | null
        | undefined;
      return choiceContainer?.visible === true;
    });
    if (hasChoice) return;
    await page.keyboard.press("Space");
    await page.waitForTimeout(450);
  }

  await page.waitForFunction(
    () => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("PrologueScene") as Record<
        string,
        unknown
      > | null;
      const dialogue = scene?.["dialogueSystem"] as
        | Record<string, unknown>
        | undefined;
      const choiceContainer = dialogue?.["choiceContainer"] as
        | { visible?: boolean }
        | null
        | undefined;
      return choiceContainer?.visible === true;
    },
    { timeout: 5_000 },
  );
}

async function chooseDialogueOptionAndWaitForScene(
  page: Page,
  sceneKey: string,
) {
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const isActive = await page.evaluate(
      (key) =>
        !!(window as GameWindow).__PHASER_GAME__?.scene.isActive(key as string),
      sceneKey,
    );
    if (isActive) return;
  }

  await waitForScene(page, sceneKey, 10_000);
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
        .filter((s) => s.sys.isActive())
        .forEach((s) => game.scene.stop(s.sys.settings.key));
      game.scene.start(k as string, d as Record<string, unknown>);
    },
    [key, data] as const,
  );
  await waitForScene(page, key);
}

/** Save a screenshot of the Phaser canvas to tests/screenshots/<filename>. */
async function snap(page: Page, filename: string) {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await canvas.screenshot({ path: join(SHOTS_DIR, filename) });
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Prologue region â€“ visual audit", () => {
  test.beforeAll(async () => {
    await mkdir(SHOTS_DIR, { recursive: true });
  });

  // Every test starts with a fresh page load at the main menu.
  test.beforeEach(async ({ page }) => {
    // Swallow the Vite HMR websocket so dev-server file saves (e.g. from a
    // concurrent editing session) cannot full-reload the page mid-test.
    await page.routeWebSocket(/.*/, () => {});
    const runtimeErrors: string[] = [];
    runtimeErrorsByPage.set(page, runtimeErrors);
    page.on("pageerror", (error) => {
      runtimeErrors.push(`pageerror: ${error.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        runtimeErrors.push(`console.error: ${msg.text()}`);
      }
    });

    await page.goto("/");
    await waitForScene(page, "MenuScene");
    // Wait for the menu fade-in tween to complete (500 ms game-time â‰ˆ 900 ms real).
    await page.waitForTimeout(1_000);
  });

  test.afterEach(async ({ page }) => {
    expect(runtimeErrorsByPage.get(page) ?? []).toEqual([]);
  });

  // â”€â”€ Menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("01 â€“ menu screen", async ({ page }) => {
    await snap(page, "01-menu.png");
  });

  test("01b - corrupt save is cleared with a title-screen notice", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem("algorithmia_save_v1", "not-json");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");

    const recovery = await page.waitForFunction(
      () => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("MenuScene") as Record<
          string,
          unknown
        > | null;
        const children = scene?.["children"] as
          | { list?: unknown[] }
          | undefined;
        const texts =
          children?.list
            ?.map((child) => (child as { text?: unknown }).text)
            .filter((text): text is string => typeof text === "string") ?? [];
        if (!texts.includes("CORRUPT SAVE CLEARED")) return null;
        return {
          v1SaveData: localStorage.getItem("algorithmia_save_v1"),
          v2SaveData: localStorage.getItem("algorithmia_save_v2"),
          menuItems:
            (scene?.["menuItems"] as Array<{ text: string }> | undefined)?.map(
              (item) => item.text,
            ) ?? [],
        };
      },
      { timeout: 5_000 },
    );

    const result = await recovery.jsonValue();
    expect(result.v1SaveData).toBeNull();
    expect(result.v2SaveData).toBeNull();
    expect(result.menuItems).not.toContain("CONTINUE");
    expect(result.menuItems).not.toContain("RESUME");
  });

  // â”€â”€ Prologue overworld â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("02 â€“ prologue overworld â€“ region card visible", async ({
    page,
  }) => {
    await goToPrologue(page);
    // After goToPrologue the fade-in is done and the region card is in its
    // 2500 ms hold phase.  Snap immediately â€” the card is fully opaque.
    await snap(page, "02-prologue-region-card.png");
  });

  test("03 â€“ prologue overworld â€“ settled atmosphere", async ({ page }) => {
    await goToPrologue(page);
    // HUD card total: 500 ms + 2500 ms + 500 ms = 3500 ms game-time â‰ˆ 6300 ms real.
    // goToPrologue already consumed ~1800 ms real (post-scene-active wait).
    // Wait another 5000 ms to clear the remaining ~4500 ms real of card animation.
    await page.waitForTimeout(5_000);
    await snap(page, "03-prologue-settled.png");
  });

  test("03b - player smooth walk sheet is loaded as 32 isolated frames", async ({
    page,
  }) => {
    await goToPrologue(page);

    const sheetInfo = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("PrologueScene") as Record<
        string,
        unknown
      > | null;
      const player = scene?.["player"] as {
        sprite?: {
          texture?: {
            key?: string;
            frames?: Record<string, { width?: number; height?: number }>;
          };
        };
      } | null;
      const animationManager = scene?.["anims"] as
        | {
            get?: (key: string) => {
              frames?: Array<{ frame?: { name?: string | number } }>;
            };
          }
        | undefined;
      const texture = player?.sprite?.texture;
      const frameEntries = Object.entries(texture?.frames ?? {}).filter(
        ([key]) => key !== "__BASE",
      );

      return {
        textureKey: texture?.key ?? null,
        frameCount: frameEntries.length,
        frameSize: {
          width: frameEntries[0]?.[1].width ?? null,
          height: frameEntries[0]?.[1].height ?? null,
        },
        walkRightFrames:
          animationManager
            ?.get?.("player-walk-right")
            ?.frames?.map((entry) => Number(entry.frame?.name)) ?? [],
      };
    });

    expect(sheetInfo).toEqual({
      textureKey: "prologue-sheet-player-walk",
      frameCount: 32,
      frameSize: { width: 256, height: 256 },
      walkRightFrames: [16, 17, 18, 19, 20, 21, 22, 23],
    });
  });

  // â”€â”€ Puzzle P0-1: Follow the Path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("04 â€“ P0-1 Follow the Path â€“ initial tile layout", async ({
    page,
  }) => {
    await jumpToScene(page, "P0_1_FollowThePath", {
      returnScene: "PrologueScene",
    });
    // Tiles are drawn in create(); 500 ms real is enough for the fade-in to clear.
    await page.waitForTimeout(500);
    await snap(page, "04-p0-1-layout.png");
  });

  test("05 â€“ P0-1 Follow the Path â€“ tile glowing mid-sequence", async ({
    page,
  }) => {
    await jumpToScene(page, "P0_1_FollowThePath", {
      returnScene: "PrologueScene",
    });
    // waitForScene resolves ~2600 ms after create() (RAF throttle), so by the time
    // waitForTimeout starts the game is already at ~2600 ms.  Adding 2500 ms real time
    // puts us at game-time ~5100 ms â€” inside tile-2's glow window (4600â€“5600 ms).
    await page.waitForTimeout(2_500);
    await snap(page, "05-p0-1-glow.png");
  });

  test("06 â€“ P0-1 Follow the Path â€“ player turn", async ({ page }) => {
    await jumpToScene(page, "P0_1_FollowThePath", {
      returnScene: "PrologueScene",
    });
    // "Your turn!" fires at game-time 6200 ms (800 intro + 1200 round delay + 3Ã—1300 ms
    // pattern + 300 ms buffer).  waitForScene resolves ~2600 ms after create() due to RAF
    // throttle, so the message window in real-time is roughly waitForScene + 3600â€“5600 ms.
    // 4500 ms lands in the middle; accounting for ~1Ã— RAF render lag it hits the painted
    // frame where the floating text is clearly visible (alpha â‰ˆ 0.7).
    await page.waitForTimeout(4_500);
    await snap(page, "06-p0-1-player-turn.png");
  });

  // â”€â”€ Puzzle P0-2: Flow Consoles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("07 â€“ P0-2 Flow Consoles â€“ initial layout", async ({ page }) => {
    await jumpToScene(page, "P0_2_FlowConsoles", {
      returnScene: "PrologueScene",
    });
    await page.waitForTimeout(500);
    await snap(page, "07-p0-2-layout.png");
  });

  // â”€â”€ Array Plains â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test("08 â€“ Array Plains â€“ Continue from save", async ({ page }) => {
    await goToArrayPlainsViaContinue(page);
    await snap(page, "08-array-plains-continue.png");

    const pos = await getScenePlayerPosition(page, "ArrayPlainsScene");
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeCloseTo(400, 0);
    expect(pos!.y).toBeCloseTo(448, 0);
  });

  test("08b - Escape opens pause, Save & Quit returns to title with Resume first", async ({
    page,
  }) => {
    await goToArrayPlainsViaContinue(page);

    await page.keyboard.press("Escape");
    await waitForScene(page, "PauseOverlayScene", 8_000);

    const pauseState = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      return {
        overlayActive: game?.scene.isActive("PauseOverlayScene"),
        arrayPaused: game?.scene.isPaused("ArrayPlainsScene"),
      };
    });
    expect(pauseState.overlayActive).toBe(true);
    expect(pauseState.arrayPaused).toBe(true);

    const pauseOptions = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("PauseOverlayScene") as Record<
        string,
        unknown
      > | null;
      const items = scene?.["menuItems"] as Array<{ text: string }> | undefined;
      return items?.map((item) => item.text) ?? [];
    });
    expect(pauseOptions).toEqual(["RESUME", "SETTINGS", "SAVE & QUIT"]);

    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("PauseOverlayScene") as Record<
        string,
        unknown
      > | null;
      scene!["selectedIndex"] = 2;
      const activate = scene?.["activate"];
      if (typeof activate === "function") {
        (activate as () => void).call(scene);
      }
    });
    await waitForScene(page, "MenuScene", 8_000);

    const menuState = await page.waitForFunction(
      () => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("MenuScene") as Record<
          string,
          unknown
        > | null;
        const items = scene?.["menuItems"] as
          | Array<{ text: string }>
          | undefined;
        const texts = scene?.["menuTexts"] as
          | Array<{ alpha?: number }>
          | undefined;
        if (!items?.length || !texts?.length || (texts[0].alpha ?? 0) < 0.95)
          return null;
        return {
          items: items.map((item) => item.text),
          selectedIndex: scene?.["selectedMenuIndex"] as number | undefined,
        };
      },
      { timeout: 8_000 },
    );

    const { items, selectedIndex } = await menuState.jsonValue();
    expect(items[0]).toBe("RESUME");
    expect(items).toContain("NEW GAME");
    expect(selectedIndex).toBe(0);

    const savedRegion = await page.evaluate(() => {
      const saveData =
        localStorage.getItem("algorithmia_save_v2") ??
        localStorage.getItem("algorithmia_save_v1");
      return saveData ? JSON.parse(saveData).player.region : null;
    });
    expect(savedRegion).toBe("array_plains");
  });

  test("08c - Codex opens from overworld hotkey and returns", async ({
    page,
  }) => {
    await goToArrayPlainsViaContinue(page);
    await page.evaluate(() => {
      (window as GameWindow).__gameState__?.unlockCodexEntry?.("bubble_sort");
    });

    await page.keyboard.press("c");
    await waitForScene(page, "CodexScene", 8_000);
    await page.waitForTimeout(700);
    await snap(page, "08c-codex-hotkey.png");

    await page.keyboard.press("c");
    await waitForScene(page, "ArrayPlainsScene", 8_000);
    const pos = await getScenePlayerPosition(page, "ArrayPlainsScene");
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeCloseTo(400, 0);
    expect(pos!.y).toBeCloseTo(448, 0);
  });

  test("09 - Continue with unknown region falls back to Prologue", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v1",
        JSON.stringify({
          player: { x: 320, y: 400, region: "unknown_future_region" },
          companion: { stage: "spark", mood: "neutral" },
          rival: { encountered: false, encounterStage: 0 },
          shardsCollected: [],
          puzzleResults: {},
          codexEntries: [],
          npcStates: {},
          flags: { opening_scene_done: true },
          settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
          saveVersion: 1,
          playTime: 0,
        }),
      );
    });

    const warnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "warning") warnings.push(msg.text());
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");

    await waitForScene(page, "PrologueScene", 10_000);
    expect(
      warnings.some((warning) => warning.includes("unknown_future_region")),
    ).toBe(true);
  });

  test("10 - P0-1 Follow the Path - completes all 4 rounds", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await jumpToScene(page, "P0_1_FollowThePath", {
      returnScene: "PrologueScene",
    });

    await waitForP01PlayerTurn(page);
    await pressSequence(page, ["ArrowUp", "ArrowUp"]);

    await waitForP01PlayerTurn(page);
    await pressSequence(page, [
      "ArrowUp",
      "ArrowUp",
      "ArrowRight",
      "ArrowRight",
    ]);

    await waitForP01PlayerTurn(page);
    await pressSequence(page, [
      "ArrowUp",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowUp",
    ]);

    await waitForP01PlayerTurn(page);
    await pressSequence(page, [
      "ArrowUp",
      "ArrowUp",
      "ArrowRight",
      "ArrowRight",
      "ArrowLeft",
      "ArrowUp",
      "ArrowRight",
      "ArrowRight",
    ]);

    // FEELâ†’NAME: the Rune Keeper names the pattern in-scene, then the
    // puzzle returns straight to the Prologue. No bridge scene.
    // Chamber debrief: the gate unbars and the room opens into free roam
    // (par plaque tally + lever visible). The player WALKS OUT to complete.
    await page.waitForFunction(
      () => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("P0_1_FollowThePath") as Record<
          string,
          unknown
        > | null;
        return scene?.["state"] === "roam";
      },
      undefined,
      { timeout: 30_000 },
    );
    // Let the final win cascade settle so the debrief reads clean.
    await page.waitForTimeout(3_400);
    await snap(page, "10-p0-1-complete.png");

    // Walk out through the north gate: iso-steering Up climbs row then
    // col, ending on the exit cell (0,1); one more Up steps through.
    await pressSequence(
      page,
      ["ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp"],
      450,
    );

    await page.waitForTimeout(2_600);
    await advanceNameItBeat(page);

    const flagSet = await page.evaluate(
      () =>
        !!(window as GameWindow).__gameState__?.getFlag("puzzle_p0_1_complete"),
    );
    expect(flagSet).toBe(true);
  });

  test("11 - P0-2 Flow Consoles - completes via the state bridge", async ({ page }) => {
    await jumpToScene(page, "P0_2_FlowConsoles", {
      returnScene: "PrologueScene",
    });
    // Sealed chamber settles (door slam + keeper stakes line), then the
    // state bridge completes the room via the public test hook.
    await page.waitForTimeout(2_000);

    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P0_2_FlowConsoles") as Record<
        string,
        unknown
      > | null;
      const time = scene?.["time"] as
        | { removeAllEvents?: () => void }
        | undefined;
      const complete = scene?.["puzzleComplete"];
      if (scene && typeof complete === "function") {
        time?.removeAllEvents?.();
        (complete as () => void).call(scene);
      }
    });

    // FEELâ†’NAME: Console Keeper naming beat, then straight back.
    await page.waitForTimeout(2_600);
    await snap(page, "11-p0-2-complete.png");
    await advanceNameItBeat(page);

    const flagSet = await page.evaluate(
      () =>
        !!(window as GameWindow).__gameState__?.getFlag("puzzle_p0_2_complete"),
    );
    expect(flagSet).toBe(true);
  });

  test("12a - Boss Sentinel - litany layout", async ({ page }) => {
    await jumpToScene(page, "Boss_Sentinel", { returnScene: "PrologueScene" });
    await page.waitForTimeout(3_100);
    await snap(page, "12a-boss-sentinel-layout.png");
  });

  test("12 - Boss Sentinel completes and Array Plains gateway unlocks", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v1",
        JSON.stringify({
          player: { x: 320, y: 400, region: "prologue" },
          companion: { stage: "spark", mood: "neutral" },
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
        }),
      );
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");
    await waitForScene(page, "PrologueScene", 10_000);

    await jumpToScene(page, "Boss_Sentinel", { returnScene: "PrologueScene" });
    await page.waitForTimeout(1_000);
    await completePuzzleViaInjection(page, "Boss_Sentinel");

    // Bosses have no naming beat â€” the completion fades straight back to
    // the overworld (FEELâ†’NAME flow, docs/VISION.md Â§3).
    await waitForScene(page, "PrologueScene", 15_000);
    await page.waitForTimeout(2_000);
    await snap(page, "12-gateway-unlocked.png");

    const gatewayOpen = await page.evaluate(
      () => !!(window as GameWindow).__gameState__?.getFlag("gateway_open"),
    );
    expect(gatewayOpen).toBe(true);
  });

  // ── Echo Causeway (dev-warp trial room, gym-pattern generated tiles) ──────

  test("90 - Echo Causeway - sealed trial layout", async ({ page }) => {
    await jumpToScene(page, "PrologueTrialScene", {});
    // Seal beat fires ~900ms in; watch lightshow follows. Snap the sealed
    // chamber with the leg-1 field visible.
    await page.waitForTimeout(2_500);
    await snap(page, "90-trial-causeway-sealed.png");
  });

  test("90b - Echo Causeway - walk phase and completion bridge", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await jumpToScene(page, "PrologueTrialScene", {});

    // The first watch ends and hands over the walk (RAF-throttled).
    await page.waitForFunction(
      () => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("PrologueTrialScene") as Record<
          string,
          unknown
        > | null;
        return (
          (scene?.["trial"] as { phase?: string } | undefined)?.phase === "walk"
        );
      },
      undefined,
      { timeout: 30_000 },
    );
    await snap(page, "90b-trial-causeway-walk.png");

    // Completion via the public hook (state bridge, like test 11).
    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("PrologueTrialScene") as Record<
        string,
        unknown
      > | null;
      const complete = scene?.["puzzleComplete"];
      if (typeof complete === "function") (complete as () => void).call(scene);
    });
    await waitForScene(page, "PrologueScene", 15_000);
    const result = await page.evaluate(
      () =>
        (window as GameWindow).__gameState__?.getState?.()?.puzzleResults
          ?.p0_trial ?? null,
    );
    expect(result).not.toBeNull();
  });

  test("13 - Array Plains - walk route, inspect marker, return to Prologue", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v1",
        JSON.stringify({
          // Living-map coords: main road, two steps west of index marker 0.
          player: { x: 496, y: 664, region: "array_plains" },
          companion: { stage: "spark", mood: "neutral" },
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
        }),
      );
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");
    await waitForScene(page, "ArrayPlainsScene", 10_000);
    await page.waitForTimeout(1_800);

    await walkStep(page, "ArrowRight");
    await walkStep(page, "ArrowRight");

    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
    await snap(page, "13-array-plains-marker-panel.png");

    // Touching marker 0 opens the Array Guide field note. Under throttled
    // headless RAF one Space may only complete the typewriter line, so press
    // until the dialogue actually closes instead of assuming one press.
    for (let i = 0; i < 8; i++) {
      const dialogueOpen = await page.evaluate(() => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("ArrayPlainsScene") as Record<
          string,
          unknown
        > | null;
        const dialogue = scene?.["dialogueSystem"] as
          | { isDialogueActive(): boolean }
          | undefined;
        return dialogue?.isDialogueActive() ?? false;
      });
      if (!dialogueOpen) break;
      await page.keyboard.press("Space");
      await page.waitForTimeout(500);
    }

    // Walk to the prologue gateway arch on the living map's west edge â€”
    // within the interaction prompt radius (~40px) of the portal at x=88.
    await setScenePlayerPosition(page, "ArrayPlainsScene", 126, 664);
    // Throttled headless RAF means the InteractionSystem can take well over
    // a fixed beat to register the teleported player, so wait for the portal
    // prompt to reach the aria-live region before pressing Space.
    await page.waitForFunction(
      () => document.body.textContent?.includes("[SPACE] Return") ?? false,
      undefined,
      { timeout: 15_000 },
    );
    await page.keyboard.press("Space");

    await waitForScene(page, "PrologueScene");
    await page.waitForTimeout(1_500);
    await snap(page, "13b-prologue-return.png");

    const returnPos = await getScenePlayerPosition(page, "PrologueScene");
    expect(returnPos).not.toBeNull();
    expect(returnPos!.x).toBeGreaterThanOrEqual(1904);
    expect(returnPos!.x).toBeLessThanOrEqual(2032);
    expect(returnPos!.y).toBeGreaterThanOrEqual(331);
    expect(returnPos!.y).toBeLessThanOrEqual(459);
  });

  test("13b - Watcher warning completes without frozen story state", async ({
    page,
  }) => {
    await continueToPrologueAt(
      page,
      { x: 560, y: 384 },
      {
        opening_scene_done: true,
        professor_node_intro_done: true,
        prologue_visited: true,
      },
    );
    await page.waitForTimeout(1_800);

    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("PrologueScene") as Record<
        string,
        unknown
      > | null;
      (
        window as Window & { __watcherRegressionDone?: boolean }
      ).__watcherRegressionDone = false;
      (scene?.["beginStoryBeat"] as ((name: string) => void) | undefined)?.call(
        scene,
        "watcher_regression",
      );
      (
        scene?.["spawnWatcherFlyby"] as
          | ((
              scheduleNext: boolean,
              onComplete: () => void,
              flyDurationMs: number,
            ) => void)
          | undefined
      )?.call(
        scene,
        false,
        () => {
          (
            scene?.["endStoryBeat"] as ((name: string) => void) | undefined
          )?.call(scene, "watcher_regression");
          (
            window as Window & { __watcherRegressionDone?: boolean }
          ).__watcherRegressionDone = true;
        },
        220,
      );
    });

    await page.waitForFunction(
      () =>
        (window as Window & { __watcherRegressionDone?: boolean })
          .__watcherRegressionDone === true,
      { timeout: 6_000 },
    );
    await page.waitForTimeout(1_800);

    const state = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("PrologueScene") as Record<
        string,
        unknown
      > | null;
      const player = scene?.["player"] as { state?: string } | undefined;
      return {
        storyBeatActive: scene?.["storyBeatActive"] === true,
        playerState: player?.state ?? null,
        bitMood: (window as GameWindow).__gameState__?.getBitMood?.() ?? null,
        hasCleanup: scene?.["cleanupActiveWatcherFlyby"] != null,
      };
    });

    expect(state).toEqual({
      storyBeatActive: false,
      playerState: "idle",
      bitMood: "neutral",
      hasCleanup: false,
    });
  });

  test("17 - AP-1 Grain Chamber - sealed room layout", async ({ page }) => {
    await jumpToScene(page, "P1_1_BubbleSort", {
      returnScene: "ArrayPlainsScene",
    });
    // Grain Chamber design: no lesson card / round banner to dismiss — the
    // room opens straight onto the playable surface. Wait out the door-seal
    // slam and the transient entry legend's settle (~1.8x RAF throttle).
    await page.waitForTimeout(3600);
    await snap(page, "17-ap1-grain-chamber-sealed.png");
  });

  test("17b - AP-1 Grain Chamber - a trade spills grain", async ({ page }) => {
    await jumpToScene(page, "P1_1_BubbleSort", {
      returnScene: "ArrayPlainsScene",
    });
    await page.waitForTimeout(2200);
    // Number keys walk the player to the gap and trade on arrival — the
    // deterministic way to land one trade in headless (gap 1 = crates 2&3).
    await page.keyboard.press("2");
    await page.waitForTimeout(2600);
    // The trade must have spilled grain and swapped crates 2 and 3.
    const state = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P1_1_BubbleSort") as Record<
        string,
        unknown
      > | null;
      const lane = scene?.["lane"] as { values?: () => number[] } | undefined;
      const fx = scene?.["fx"] as
        | { decalPositions?: () => unknown[] }
        | undefined;
      return {
        values: lane?.values?.() ?? null,
        decals: fx?.decalPositions?.()?.length ?? 0,
      };
    });
    expect(state.values).toEqual([3, 4, 1, 2]);
    expect(state.decals).toBeGreaterThan(0);
    await snap(page, "17b-ap1-grain-spill.png");
  });

  test("18 - AP-2 Basket Cellar - sealed room with first order", async ({
    page,
  }) => {
    await jumpToScene(page, "P1_2_BasketIndexing", {
      returnScene: "ArrayPlainsScene",
    });
    // Basket Cellar design: no cards or banners to dismiss — wait out the
    // door seal, entry legend settle, and the first order tag's drop
    // (~1.8x RAF throttle applies).
    await page.waitForTimeout(4200);
    await snap(page, "18-ap2-basket-cellar-order.png");
  });

  test("18b - AP-2 Basket Cellar - wrong basket tumbles persistent mess", async ({
    page,
  }) => {
    await jumpToScene(page, "P1_2_BasketIndexing", {
      returnScene: "ArrayPlainsScene",
    });
    await page.waitForTimeout(4200);
    // Order 1 wants basket 4; press 1 to open the wrong one. The opening is
    // allowed, counted, and tumbles mess that persists (chamber economy).
    await page.keyboard.press("1");
    await page.waitForTimeout(2600);
    const state = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P1_2_BasketIndexing") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      const shelf = scene?.["shelf"] as
        | { messPositions?: () => unknown[] }
        | undefined;
      return {
        openings: ledger?.trades ?? 0,
        mess: shelf?.messPositions?.()?.length ?? 0,
        orderIndex: scene?.["orderIndex"],
      };
    });
    expect(state.openings).toBe(1);
    expect(state.mess).toBeGreaterThan(0);
    expect(state.orderIndex).toBe(0); // order still open — no refusal, just cost
    await snap(page, "18b-ap2-basket-cellar-mess.png");
  });

  test("19 - AP-3 Sorting Mill - sealed room with first arrival", async ({
    page,
  }) => {
    await jumpToScene(page, "P1_3_HashHopper", {
      returnScene: "ArrayPlainsScene",
    });
    // Sorting Mill: no cards or banners — wait out the door seal, the entry
    // legend settle, and the first crop's chute drop (~1.8x RAF throttle).
    await page.waitForTimeout(4200);
    await snap(page, "19-ap3-sorting-mill-arrival.png");
  });

  test("19b - AP-3 Sorting Mill - wrong bin spits the crop back", async ({
    page,
  }) => {
    await jumpToScene(page, "P1_3_HashHopper", {
      returnScene: "ArrayPlainsScene",
    });
    await page.waitForTimeout(4200);
    // Pick the first crop up at the bench (act on arrival so timing can't
    // race the walk), then toss it at the wrong bin.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const game = (window as GameWindow).__PHASER_GAME__;
          const scene = game?.scene.getScene("P1_3_HashHopper") as Record<
            string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            any
          > | null;
          if (!scene) return resolve();
          const bench = scene["bench"].benchPosition;
          scene["room"].player.walkTo(bench.x, bench.y, () => {
            scene["onAct"]();
            resolve();
          });
        }),
    );
    await page.waitForTimeout(700);
    // WHEAT's home is bin 3 (its count walked along four bins); bin 1 is
    // wrong: the toss is recorded, a bruise drops, the crop stays carried.
    await page.keyboard.press("1");
    await page.waitForTimeout(4200);
    const state = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P1_3_HashHopper") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      const bench = scene?.["bench"] as { isCarrying?: boolean } | undefined;
      const bins = scene?.["bins"] as
        | { bruisePositions?: () => unknown[] }
        | undefined;
      return {
        tosses: ledger?.trades ?? 0,
        carrying: bench?.isCarrying ?? false,
        bruises: bins?.bruisePositions?.()?.length ?? 0,
      };
    });
    expect(state.tosses).toBe(1);
    expect(state.carrying).toBe(true); // spit back — cost, not refusal
    expect(state.bruises).toBeGreaterThan(0);
    await snap(page, "19b-ap3-sorting-mill-spitback.png");
  });

  test("20 - AP-4 Pairing Grounds - sealed courtyard with scale", async ({
    page,
  }) => {
    await jumpToScene(page, "P1_4_TwoSum", { returnScene: "ArrayPlainsScene" });
    // Chamber room: wait out the door seal + entry legend settle.
    await page.waitForTimeout(4200);
    await snap(page, "20-ap4-pairing-grounds-sealed.png");
  });

  test("20b - AP-4 Pairing Grounds - wrong offer cracks chips", async ({
    page,
  }) => {
    await jumpToScene(page, "P1_4_TwoSum", { returnScene: "ArrayPlainsScene" });
    await page.waitForTimeout(4200);
    // Anchor stone 1 (value 1), then offer it with stone 2 (value 3):
    // 1+3 misses target 9 — the offer is recorded, chips crack off and
    // persist, and the anchor stays in the player's hands.
    await page.keyboard.press("1");
    await page.waitForTimeout(4200);
    await page.keyboard.press("2");
    await page.waitForTimeout(4200);
    const state = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P1_4_TwoSum") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      const field = scene?.["field"] as
        | {
            carriedIndex?: () => number;
            chipPositions?: () => unknown[];
          }
        | undefined;
      return {
        offers: ledger?.trades ?? 0,
        carried: field?.carriedIndex?.() ?? -2,
        chips: field?.chipPositions?.()?.length ?? 0,
      };
    });
    expect(state.offers).toBe(1);
    expect(state.carried).toBe(0); // anchor survives the slam
    expect(state.chips).toBeGreaterThan(0);
    await snap(page, "20b-ap4-pairing-grounds-chips.png");
  });

  test("21 - Shuffler Threshing Floor - sealed arena, phase I", async ({
    page,
  }) => {
    await jumpToScene(page, "Boss_Shuffler", {
      returnScene: "ArrayPlainsScene",
    });
    // Seal + entry banner + phase I mount (~1.8x RAF throttle).
    await page.waitForTimeout(8000);
    await snap(page, "21-shuffler-threshing-floor.png");
  });

  test("21b - Shuffler scrambles the row himself, honestly", async ({
    page,
  }) => {
    await jumpToScene(page, "Boss_Shuffler", {
      returnScene: "ArrayPlainsScene",
    });
    await page.waitForTimeout(8000);
    const before = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("Boss_Shuffler") as Record<
        string,
        unknown
      > | null;
      return [...((scene?.["bubbleValues"] as number[]) ?? [])];
    });
    // One full interference cycle with NO player input: the Shuffler must
    // telegraph and scramble on his own, leaving the player's ledger at 0
    // and raising par via the scramble counter instead.
    await page.waitForTimeout(16000);
    const after = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("Boss_Shuffler") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      return {
        values: [...((scene?.["bubbleValues"] as number[]) ?? [])],
        actions: ledger?.trades ?? -1,
        scrambles: scene?.["scrambles"] ?? -1,
      };
    });
    expect(after.values).not.toEqual(before);
    expect(after.actions).toBe(0);
    expect(after.scrambles).toBeGreaterThan(0);
    await snap(page, "21b-shuffler-scramble.png");
  });

  test("22 - Twin Rivers - Continue from save", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v1",
        JSON.stringify({
          player: { x: 160, y: 624, region: "twin_rivers" },
          companion: { stage: "frame", mood: "neutral" },
          rival: { encountered: true, encounterStage: 2 },
          shardsCollected: [],
          puzzleResults: {
            boss_shuffler: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
          },
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
        }),
      );
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");
    await waitForScene(page, "TwinRiversScene", 10_000);
    await page.waitForTimeout(1_800);
    await snap(page, "22-twin-rivers-continue.png");
  });

  test("23 - TR-1 Mirror Crossing - sealed river arena", async ({ page }) => {
    await jumpToScene(page, "P2_1_MirrorWalk", {
      returnScene: "TwinRiversScene",
    });
    // Chamber room: wait out the door seal + entry legend settle.
    await page.waitForTimeout(4200);
    await snap(page, "23-tr1-mirror-crossing-sealed.png");
  });

  test("23b - TR-1 Mirror Crossing - any order trades, waste splashes", async ({
    page,
  }) => {
    await jumpToScene(page, "P2_1_MirrorWalk", {
      returnScene: "TwinRiversScene",
    });
    await page.waitForTimeout(4200);
    // Trade the MIDDLE pair first — the old room only accepted one forced
    // sequence; the crossing must accept any pair, any order.
    await page.keyboard.press("3");
    await page.waitForTimeout(4200);
    // Trade the same pair again: it is now resolved, so the river keeps
    // the splash — recorded, debris persisted, values unchanged.
    await page.keyboard.press("3");
    await page.waitForTimeout(3600);
    const state = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P2_1_MirrorWalk") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      const rack = scene?.["rack"] as
        | { debrisPositions?: () => unknown[] }
        | undefined;
      return {
        values: [...((scene?.["values"] as number[]) ?? [])],
        trades: ledger?.trades ?? 0,
        debris: rack?.debrisPositions?.()?.length ?? 0,
      };
    });
    expect(state.values).toEqual([3, 8, 4, 1, 7, 2]);
    expect(state.trades).toBe(2);
    expect(state.debris).toBeGreaterThan(0);
    await snap(page, "23b-tr1-mirror-crossing-splash.png");
  });

  test("24 - TR-2 Rope Bridge - sealed crossing", async ({ page }) => {
    await jumpToScene(page, "P2_2_PointerBridge", {
      returnScene: "TwinRiversScene",
    });
    // Chamber room: wait out the door seal + entry legend settle.
    await page.waitForTimeout(4200);
    await snap(page, "24-tr2-rope-bridge-sealed.png");
  });

  test("24b - TR-2 Rope Bridge - dead end snaps the rope back", async ({
    page,
  }) => {
    await jumpToScene(page, "P2_2_PointerBridge", {
      returnScene: "TwinRiversScene",
    });
    await page.waitForTimeout(4200);
    // Round 1's end pair already makes the target — lock it (key 2), then
    // in round 2 march the LEFT buoy into the right one. The buoys meeting
    // without the weight must snap back to the ends, with every wasted
    // step still on the ledger (cost, not refusal).
    await page.keyboard.press("2");
    await page.waitForTimeout(6500);
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press("1");
      await page.waitForTimeout(2400);
    }
    await page.waitForTimeout(2000);
    const state = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P2_2_PointerBridge") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      const line = scene?.["line"] as
        | {
            leftIndex?: number;
            rightIndex?: number;
            debrisPositions?: () => unknown[];
          }
        | undefined;
      return {
        round: scene?.["roundIndex"],
        left: line?.leftIndex,
        right: line?.rightIndex,
        moves: ledger?.trades ?? 0,
        debris: line?.debrisPositions?.()?.length ?? 0,
      };
    });
    expect(state.round).toBe(1);
    expect(state.left).toBe(0); // snapped back to the banks
    expect(state.right).toBe(7);
    expect(state.moves).toBe(8); // 1 lock + 7 wasted steps, all recorded
    expect(state.debris).toBeGreaterThan(0);
    await snap(page, "24b-tr2-rope-bridge-snapback.png");
  });

  test("25 - TR-3 Fishing Dock - sealed dock with the net", async ({
    page,
  }) => {
    await jumpToScene(page, "P2_3_FixedWindowDock", {
      returnScene: "TwinRiversScene",
    });
    // Chamber room: wait out the door seal + entry legend settle.
    await page.waitForTimeout(4200);
    await snap(page, "25-tr3-fishing-dock-sealed.png");
  });

  test("25b - TR-3 Fishing Dock - a light haul tears the net", async ({
    page,
  }) => {
    await jumpToScene(page, "P2_3_FixedWindowDock", {
      returnScene: "TwinRiversScene",
    });
    await page.waitForTimeout(4200);
    // Walk to the first basket (net frames the dock's start) and haul:
    // round 1's heaviest window lives elsewhere, so the net tears — haul
    // recorded, debris persisted, round unchanged (cost, not refusal).
    await page.keyboard.press("1");
    await page.waitForTimeout(4200);
    await page.keyboard.press("Space");
    await page.waitForTimeout(3200);
    const state = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P2_3_FixedWindowDock") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      const row = scene?.["row"] as
        | { debrisPositions?: () => unknown[] }
        | undefined;
      const net = scene?.["net"] as { start?: number } | undefined;
      return {
        round: scene?.["roundIndex"],
        start: net?.start,
        moves: ledger?.trades ?? 0,
        debris: row?.debrisPositions?.()?.length ?? 0,
      };
    });
    expect(state.round).toBe(0); // the tear holds the round open
    expect(state.start).toBe(0);
    expect(state.moves).toBeGreaterThan(0);
    expect(state.debris).toBeGreaterThan(0);
    await snap(page, "25b-tr3-fishing-dock-tear.png");
  });

  test("26 - TR-4 Current Run - sealed river ride", async ({ page }) => {
    await jumpToScene(page, "P2_4_CurrentRider", {
      returnScene: "TwinRiversScene",
    });
    // Chamber room: wait out the door seal + entry legend settle.
    await page.waitForTimeout(4200);
    await snap(page, "26-tr4-current-run-sealed.png");
  });

  test("26b - TR-4 Current Run - twins snag the net", async ({ page }) => {
    await jumpToScene(page, "P2_4_CurrentRider", {
      returnScene: "TwinRiversScene",
    });
    await page.waitForTimeout(4200);
    // Ride to the fourth float: A-B-C-A puts twins inside the net, which
    // must SNAG (render-state, not text). Paying the left tie out clears
    // it — every move on the ledger.
    await page.keyboard.press("4");
    await page.waitForTimeout(4200);
    const snagged = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P2_4_CurrentRider") as Record<
        string,
        unknown
      > | null;
      const run = scene?.["run"] as
        | { paintNet?: (l: number, r: number) => [number, number] | null }
        | undefined;
      return {
        L: scene?.["leftTie"],
        R: scene?.["rightEdge"],
        snag: run?.paintNet?.(
          scene?.["leftTie"] as number,
          scene?.["rightEdge"] as number,
        ),
        moves: (scene?.["ledger"] as { trades?: number } | undefined)?.trades,
      };
    });
    expect(snagged.R).toBe(3);
    expect(snagged.snag).toEqual([0, 3]); // the twin A's
    await page.keyboard.press("Space");
    await page.waitForTimeout(1500);
    const released = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("P2_4_CurrentRider") as Record<
        string,
        unknown
      > | null;
      return {
        L: scene?.["leftTie"],
        moves: (scene?.["ledger"] as { trades?: number } | undefined)?.trades,
      };
    });
    expect(released.L).toBe(1); // the tie paid out past the first twin
    expect(released.moves).toBe(4);
    await snap(page, "26b-tr4-current-run-snag.png");
  });

  test("27 - Mirror Serpent - sealed coil arena, phase I", async ({ page }) => {
    await jumpToScene(page, "Boss_MirrorSerpent", {
      returnScene: "TwinRiversScene",
    });
    // Seal + entry banner + phase I mount (~1.8x RAF throttle).
    await page.waitForTimeout(8000);
    await snap(page, "27-mirror-serpent-layout.png");
  });

  test("27b - Mirror Serpent - the coil un-turns a set pair, for free", async ({
    page,
  }) => {
    await jumpToScene(page, "Boss_MirrorSerpent", {
      returnScene: "TwinRiversScene",
    });
    await page.waitForTimeout(8000);
    // Turn one mirror pair so a RESOLVED pair exists for the coil to undo.
    await page.keyboard.press("1");
    await page.waitForTimeout(4000);
    const before = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("Boss_MirrorSerpent") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      return {
        actions: ledger?.trades ?? -1,
        untrades: scene?.["untrades"] ?? -1,
      };
    });
    expect(before.actions).toBe(1); // exactly the player's one trade
    expect(before.untrades).toBe(0); // the coil has not struck yet
    // One full interference cycle with NO further input: the coil must
    // telegraph and un-turn the set pair on its own, leaving the player's
    // ledger untouched and raising par via the untrade counter instead.
    await page.waitForTimeout(16000);
    const after = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("Boss_MirrorSerpent") as Record<
        string,
        unknown
      > | null;
      const ledger = scene?.["ledger"] as { trades?: number } | undefined;
      return {
        actions: ledger?.trades ?? -1,
        untrades: scene?.["untrades"] ?? -1,
      };
    });
    expect(after.untrades).toBeGreaterThan(0); // the coil struck on its own
    expect(after.actions).toBe(1); // and it cost the player nothing
    await snap(page, "27b-mirror-serpent-untrade.png");
  });

  test("27a - Twin Rivers - Hash Highlands gateway stays locked until Mirror Serpent", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v2",
        JSON.stringify({
          player: { x: 1700, y: 520, region: "twin_rivers" },
          companion: { stage: "branch", mood: "neutral" },
          rival: { encountered: true, encounterStage: 3 },
          shardsCollected: ["array_plains_logic_shard"],
          puzzleResults: {
            tr_1: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_2: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_3: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_4: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
          },
          codexEntries: [],
          npcStates: {},
          flags: {
            opening_scene_done: true,
            professor_node_intro_done: true,
            gateway_open: true,
            twin_rivers_gateway_open: true,
            mirror_serpent_gate_open: true,
            beta_warning_seen: true,
          },
          settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 300 },
          saveVersion: 2,
          playTime: 0,
        }),
      );
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");
    await waitForScene(page, "TwinRiversScene", 10_000);

    await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("TwinRiversScene") as Record<
        string,
        unknown
      > | null;
      const enter = scene?.["enterHashHighlands"];
      if (typeof enter === "function") {
        (enter as () => void).call(scene);
      }
    });
    await page.waitForTimeout(1_200);

    const activeScenes = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      return {
        twinRivers: game?.scene.isActive("TwinRiversScene") ?? false,
        hashHighlands: game?.scene.isActive("HashHighlandsScene") ?? false,
      };
    });
    expect(activeScenes.twinRivers).toBe(true);
    expect(activeScenes.hashHighlands).toBe(false);
  });

  test("27b - Twin Rivers - post-Mirror-Serpent closure beat", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v2",
        JSON.stringify({
          player: { x: 1700, y: 520, region: "twin_rivers" },
          companion: { stage: "branch", mood: "neutral" },
          rival: { encountered: true, encounterStage: 3 },
          shardsCollected: [
            "array_plains_logic_shard",
            "twin_rivers_logic_shard",
          ],
          puzzleResults: {
            tr_1: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_2: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_3: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_4: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            boss_mirror_serpent: {
              stars: 3,
              time: 55,
              attempts: 0,
              hintsUsed: 0,
            },
          },
          codexEntries: [],
          npcStates: {},
          flags: {
            opening_scene_done: true,
            professor_node_intro_done: true,
            gateway_open: true,
            twin_rivers_gateway_open: true,
            mirror_serpent_gate_open: true,
            puzzle_boss_mirror_serpent_complete: true,
            hash_highlands_gateway_open: true,
            glitch_tr_1_done: true,
            glitch_tr_3_done: true,
          },
          settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 300 },
          saveVersion: 2,
          playTime: 0,
        }),
      );
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");
    await waitForScene(page, "TwinRiversScene", 10_000);

    const closure = await page.waitForFunction(
      () => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("TwinRiversScene") as Record<
          string,
          unknown
        > | null;
        const ds = scene?.["dialogueSystem"] as
          | { isDialogueActive?: () => boolean }
          | undefined;
        const currentNode = ds
          ? ((ds as Record<string, unknown>)["currentNode"] as {
              speaker?: string;
              text?: string | string[];
            } | null)
          : null;
        if (
          ds?.isDialogueActive?.() !== true ||
          currentNode?.speaker !== "River Guide"
        )
          return null;
        const text = Array.isArray(currentNode.text)
          ? currentNode.text.join("\n")
          : (currentNode.text ?? "");
        if (!text.includes("Twin Rivers is complete")) return null;
        return {
          closureDone: (window as GameWindow).__gameState__?.getFlag(
            "twin_rivers_closure_done",
          ),
          hashGate: (window as GameWindow).__gameState__?.getFlag(
            "hash_highlands_gateway_open",
          ),
          text,
        };
      },
      { timeout: 8_000 },
    );

    const result = await closure.jsonValue();
    expect(result.closureDone).toBe(false);
    expect(result.hashGate).toBe(true);
    expect(result.text).toContain("Thanks for playing this demo");
    await page.waitForTimeout(250);
    const inProgressObjective = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("TwinRiversScene") as Record<
        string,
        unknown
      > | null;
      const hud = scene?.["hud"] as Record<string, unknown> | undefined;
      return hud?.["objectiveTextCache"] as string | undefined;
    });
    expect(inProgressObjective).toContain("polished arc ends");
    await page.waitForTimeout(1_000);
    await snap(page, "27b-twin-rivers-closure.png");

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(340);
    }

    await page.waitForFunction(
      () => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("TwinRiversScene") as Record<
          string,
          unknown
        > | null;
        const ds = scene?.["dialogueSystem"] as
          | { isDialogueActive?: () => boolean }
          | undefined;
        return ds?.isDialogueActive?.() === false;
      },
      { timeout: 8_000 },
    );

    const objective = await page.evaluate(() => {
      const game = (window as GameWindow).__PHASER_GAME__;
      const scene = game?.scene.getScene("TwinRiversScene") as Record<
        string,
        unknown
      > | null;
      const hud = scene?.["hud"] as Record<string, unknown> | undefined;
      return hud?.["objectiveTextCache"] as string | undefined;
    });
    expect(objective).toContain("Turn back for credits");
    const closureDone = await page.evaluate(() =>
      (window as GameWindow).__gameState__?.getFlag("twin_rivers_closure_done"),
    );
    expect(closureDone).toBe(true);
  });

  test("27c - Twin Rivers - closure pan locks player movement", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v2",
        JSON.stringify({
          player: { x: 1700, y: 520, region: "twin_rivers" },
          companion: { stage: "branch", mood: "neutral" },
          rival: { encountered: true, encounterStage: 3 },
          shardsCollected: [
            "array_plains_logic_shard",
            "twin_rivers_logic_shard",
          ],
          puzzleResults: {
            tr_1: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_2: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_3: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            tr_4: { stars: 3, time: 30, attempts: 0, hintsUsed: 0 },
            boss_mirror_serpent: {
              stars: 3,
              time: 55,
              attempts: 0,
              hintsUsed: 0,
            },
          },
          codexEntries: [],
          npcStates: {},
          flags: {
            opening_scene_done: true,
            professor_node_intro_done: true,
            gateway_open: true,
            twin_rivers_gateway_open: true,
            mirror_serpent_gate_open: true,
            puzzle_boss_mirror_serpent_complete: true,
            hash_highlands_gateway_open: true,
            glitch_tr_1_done: true,
            glitch_tr_3_done: true,
          },
          settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 300 },
          saveVersion: 2,
          playTime: 0,
        }),
      );
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");
    await waitForScene(page, "TwinRiversScene", 10_000);

    const beforeHandle = await page.waitForFunction(
      () => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("TwinRiversScene") as Record<
          string,
          unknown
        > | null;
        const ds = scene?.["dialogueSystem"] as
          | { isDialogueActive?: () => boolean }
          | undefined;
        const player = scene?.["player"] as
          | { getPosition?: () => { x: number; y: number } }
          | undefined;
        if (
          scene?.["twinRiversClosureInProgress"] !== true ||
          ds?.isDialogueActive?.() === true
        )
          return null;
        return player?.getPosition?.() ?? null;
      },
      { timeout: 8_000, polling: 50 },
    );
    const before = await beforeHandle.jsonValue();

    await page.keyboard.down("D");
    await page.waitForTimeout(450);
    await page.keyboard.up("D");
    await page.waitForTimeout(250);

    const after = await getScenePlayerPosition(page, "TwinRiversScene");
    expect(after).not.toBeNull();
    expect(Math.abs(after!.x - before.x)).toBeLessThan(1);
    expect(Math.abs(after!.y - before.y)).toBeLessThan(1);
  });

  test("28 - Hash Highlands - Continue from save", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v1",
        JSON.stringify({
          player: { x: 192, y: 448, region: "hash_highlands" },
          companion: { stage: "frame", mood: "neutral" },
          rival: { encountered: true, encounterStage: 3 },
          shardsCollected: ["array_plains_logic_shard"],
          puzzleResults: {
            boss_mirror_serpent: {
              stars: 3,
              time: 35,
              attempts: 0,
              hintsUsed: 0,
            },
          },
          codexEntries: [],
          npcStates: {},
          flags: {
            opening_scene_done: true,
            professor_node_intro_done: true,
            gateway_open: true,
            twin_rivers_gateway_open: true,
            puzzle_boss_mirror_serpent_complete: true,
            twin_rivers_closure_done: true,
          },
          settings: { musicVolume: 0.7, sfxVolume: 0.8, textSpeed: 90 },
          saveVersion: 1,
          playTime: 0,
        }),
      );
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");
    await waitForScene(page, "HashHighlandsScene", 10_000);
    await page.waitForTimeout(1_800);
    await snap(page, "28-hash-highlands-continue.png");

    const pos = await getScenePlayerPosition(page, "HashHighlandsScene");
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test("29 - HH-1 Nameplate Gates - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P3_1_NameplateGates", {
      returnScene: "HashHighlandsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "29-hh1-nameplate-gates-layout.png");
  });

  test("30 - HH-2 Frequency Forge - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P3_2_FrequencyForge", {
      returnScene: "HashHighlandsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "30-hh2-frequency-forge-layout.png");
  });

  test("31 - HH-3 Anagram Gardens - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P3_3_AnagramGardens", {
      returnScene: "HashHighlandsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "31-hh3-anagram-gardens-layout.png");
  });

  test("32 - HH-4 Cache Cavern - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P3_4_CacheCavern", {
      returnScene: "HashHighlandsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "32-hh4-cache-cavern-layout.png");
  });

  test("33 - Archivist - boss encounter layout", async ({ page }) => {
    await jumpToScene(page, "Boss_Archivist", {
      returnScene: "HashHighlandsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "33-archivist-layout.png");
  });

  test("34 - Stack Spires - Continue from save", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "algorithmia_save_v1",
        JSON.stringify({
          player: { x: 192, y: 448, region: "stack_spires" },
          companion: { stage: "branch", mood: "neutral" },
          rival: { encountered: true, encounterStage: 4 },
          shardsCollected: [
            "array_plains_logic_shard",
            "hash_highlands_logic_shard",
          ],
          puzzleResults: {
            boss_archivist: { stars: 3, time: 38, attempts: 0, hintsUsed: 0 },
          },
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
        }),
      );
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForScene(page, "MenuScene");
    await page.waitForTimeout(1_000);
    await clickMenuItem(page, "CONTINUE");
    await waitForScene(page, "StackSpiresScene", 10_000);
    await page.waitForTimeout(1_800);
    await snap(page, "34-stack-spires-continue.png");

    const pos = await getScenePlayerPosition(page, "StackSpiresScene");
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test("35 - SS-1 Scroll Stack - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P4_1_ScrollStack", {
      returnScene: "StackSpiresScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "35-ss1-scroll-stack-layout.png");
  });

  test("36 - SS-2 Mirror Staircase - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P4_2_MirrorStaircase", {
      returnScene: "StackSpiresScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "36-ss2-mirror-staircase-layout.png");
  });

  test("37 - SS-3 Maze of Forks - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P4_3_MazeOfForks", {
      returnScene: "StackSpiresScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "37-ss3-maze-of-forks-layout.png");
  });

  test("38 - SS-4 Tower of Memory - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P4_4_TowerOfMemory", {
      returnScene: "StackSpiresScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "38-ss4-tower-of-memory-layout.png");
  });

  test("39 - Recursion - boss encounter layout", async ({ page }) => {
    await jumpToScene(page, "Boss_Recursion", {
      returnScene: "StackSpiresScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "39-recursion-layout.png");
  });

  test("40 - Queue Canals - Continue from save", async ({ page }) => {
    await goToFutureRegionViaContinue(
      page,
      "queue_canals",
      "QueueCanalsScene",
      {
        boss_recursion: { stars: 3, time: 38, attempts: 0, hintsUsed: 0 },
      },
    );
    await snap(page, "40-queue-canals-continue.png");

    const pos = await getScenePlayerPosition(page, "QueueCanalsScene");
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test("41 - QC-1 Ferry Dock - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P5_1_FerryQueue", {
      returnScene: "QueueCanalsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "41-qc1-ferry-dock-layout.png");
  });

  test("42 - QC-2 Ripple Map - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P5_2_BfsLocks", {
      returnScene: "QueueCanalsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "42-qc2-ripple-map-layout.png");
  });

  test("43 - QC-3 Priority Dock - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P5_3_PriorityHarbor", {
      returnScene: "QueueCanalsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "43-qc3-priority-dock-layout.png");
  });

  test("44 - QC-4 Scheduler Lottery - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P5_4_SchedulerOffice", {
      returnScene: "QueueCanalsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "44-qc4-scheduler-lottery-layout.png");
  });

  test("45 - Reconciler - boss encounter layout", async ({ page }) => {
    await jumpToScene(page, "Boss_Reconciler", {
      returnScene: "QueueCanalsScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "45-reconciler-layout.png");
  });

  test("46 - Tree Canopy - Continue from save", async ({ page }) => {
    await goToFutureRegionViaContinue(page, "tree_canopy", "TreeCanopyScene", {
      boss_reconciler: { stars: 3, time: 40, attempts: 0, hintsUsed: 0 },
    });
    await snap(page, "46-tree-canopy-continue.png");

    const pos = await getScenePlayerPosition(page, "TreeCanopyScene");
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test("47 - TC-1 First Fork - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P6_1_RootWalk", {
      returnScene: "TreeCanopyScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "47-tc1-first-fork-layout.png");
  });

  test("48 - TC-2 Sorted Grove - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P6_2_BstGrove", {
      returnScene: "TreeCanopyScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "48-tc2-sorted-grove-layout.png");
  });

  test("49 - TC-3 Deep Root - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P6_3_DfsBranches", {
      returnScene: "TreeCanopyScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "49-tc3-deep-root-layout.png");
  });

  test("50 - TC-4 Bent Bough - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P6_4_BalanceCanopy", {
      returnScene: "TreeCanopyScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "50-tc4-bent-bough-layout.png");
  });

  test("51 - Pattern - boss encounter layout", async ({ page }) => {
    await jumpToScene(page, "Boss_Pattern", { returnScene: "TreeCanopyScene" });
    await page.waitForTimeout(700);
    await snap(page, "51-pattern-layout.png");
  });

  test("52 - Graph Nexus - Continue from save", async ({ page }) => {
    await goToFutureRegionViaContinue(page, "graph_nexus", "GraphNexusScene", {
      boss_pattern: { stars: 3, time: 42, attempts: 0, hintsUsed: 0 },
    });
    await snap(page, "52-graph-nexus-continue.png");

    const pos = await getScenePlayerPosition(page, "GraphNexusScene");
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test("53 - GN-1 Bridge Map - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P7_1_NodeLinks", {
      returnScene: "GraphNexusScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "53-gn1-bridge-map-layout.png");
  });

  test("54 - GN-2 Courier Dilemma - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P7_2_ShortestPath", {
      returnScene: "GraphNexusScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "54-gn2-courier-dilemma-layout.png");
  });

  test("55 - GN-3 Cycle Bazaar - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P7_3_CycleCourt", {
      returnScene: "GraphNexusScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "55-gn3-cycle-bazaar-layout.png");
  });

  test("56 - GN-4 Island Census - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P7_4_ComponentFields", {
      returnScene: "GraphNexusScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "56-gn4-island-census-layout.png");
  });

  test("57 - Echo - boss encounter layout", async ({ page }) => {
    await jumpToScene(page, "Boss_Echo", { returnScene: "GraphNexusScene" });
    await page.waitForTimeout(700);
    await snap(page, "57-echo-layout.png");
  });

  test("58 - The Core - Continue from save", async ({ page }) => {
    await goToFutureRegionViaContinue(page, "core", "CoreScene", {
      boss_echo: { stars: 3, time: 44, attempts: 0, hintsUsed: 0 },
    });
    await snap(page, "58-core-continue.png");

    const pos = await getScenePlayerPosition(page, "CoreScene");
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeGreaterThanOrEqual(160);
    expect(pos!.x).toBeLessThanOrEqual(224);
    expect(pos!.y).toBeGreaterThanOrEqual(416);
    expect(pos!.y).toBeLessThanOrEqual(480);
  });

  test("59 - CORE-1 Echo Chamber - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P8_1_EchoChamber", { returnScene: "CoreScene" });
    await page.waitForTimeout(700);
    await snap(page, "59-core1-echo-chamber-layout.png");
  });

  test("60 - CORE-2 Weighted Staircase - encounter layout", async ({
    page,
  }) => {
    await jumpToScene(page, "P8_2_WeightedStaircase", {
      returnScene: "CoreScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "60-core2-weighted-staircase-layout.png");
  });

  test("61 - CORE-3 Grand Archive - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P8_3_GrandArchive", { returnScene: "CoreScene" });
    await page.waitForTimeout(700);
    await snap(page, "61-core3-grand-archive-layout.png");
  });

  test("62 - CORE-4 Hall of Patterns - encounter layout", async ({ page }) => {
    await jumpToScene(page, "P8_4_HallOfPatterns", {
      returnScene: "CoreScene",
    });
    await page.waitForTimeout(700);
    await snap(page, "62-core4-hall-of-patterns-layout.png");
  });

  test("63 - Protocol Omega - final boss encounter layout", async ({
    page,
  }) => {
    await jumpToScene(page, "Boss_ProtocolOmega", { returnScene: "CoreScene" });
    await page.waitForTimeout(700);
    await snap(page, "63-protocol-omega-layout.png");
  });

  test("14 - Professor Node intro cannot open overlapping NPC dialogue", async ({
    page,
  }) => {
    await continueToPrologueAt(
      page,
      { x: 860, y: 395 },
      {
        opening_scene_done: true,
        prologue_visited: true,
      },
    );

    await page.waitForFunction(
      () => {
        const game = (window as GameWindow).__PHASER_GAME__;
        const scene = game?.scene.getScene("PrologueScene") as Record<
          string,
          unknown
        > | null;
        const ds = scene?.["dialogueSystem"] as
          | { isDialogueActive?: () => boolean }
          | undefined;
        return ds?.isDialogueActive?.() === true;
      },
      { timeout: 15_000 },
    );

    await page.waitForTimeout(150);
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);

    const midIntro = await getPrologueRuntimeState(page);
    expect(midIntro.storyBeatActive).toBe(false);
    expect(midIntro.dialogueActive).toBe(true);
    expect(midIntro.playerState).toBe("interacting");

    await snap(page, "14-professor-node-intro-clean.png");

    for (let i = 0; i < 40; i++) {
      const done = await page.evaluate(
        () =>
          (window as GameWindow).__gameState__?.getFlag(
            "professor_node_intro_done",
          ) === true,
      );
      if (done) break;
      await page.keyboard.press("Space");
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(700);

    const afterIntro = await getPrologueRuntimeState(page);
    expect(afterIntro.professorNodeIntroDone).toBe(true);
    expect(afterIntro.storyBeatActive).toBe(false);
    expect(afterIntro.dialogueActive).toBe(false);
    expect(afterIntro.playerState).toBe("idle");
  });

  test("15 - Rune Keeper keyboard choice starts Follow the Path", async ({
    page,
  }) => {
    await continueToPrologueAt(
      page,
      { x: 900, y: 197 },
      {
        opening_scene_done: true,
        professor_node_intro_done: true,
        watcher_warning_done: true,
        prologue_visited: true,
      },
    );
    await page.waitForTimeout(1_800);

    await page.keyboard.press("Space");
    await pressUntilPrologueChoice(page);
    await snap(page, "15-rune-keeper-choice-ui.png");
    await chooseDialogueOptionAndWaitForScene(page, "P0_1_FollowThePath");
    await snap(page, "15-rune-keeper-puzzle-start.png");
  });

  test("16 - Console Keeper keyboard choice starts Flow Consoles", async ({
    page,
  }) => {
    await continueToPrologueAt(
      page,
      { x: 900, y: 593 },
      {
        opening_scene_done: true,
        professor_node_intro_done: true,
        watcher_warning_done: true,
        prologue_visited: true,
      },
    );
    await page.waitForTimeout(1_800);

    await page.keyboard.press("Space");
    await pressUntilPrologueChoice(page);
    await snap(page, "16-console-keeper-choice-ui.png");
    await chooseDialogueOptionAndWaitForScene(page, "P0_2_FlowConsoles");
    await snap(page, "16-console-keeper-puzzle-start.png");
  });
});
