import { expect, test, type Page } from 'playwright/test';

type PhaserGame = {
  scene: {
    isActive(key: string): boolean;
    getScene(key: string): unknown;
  };
};

type GameWindow = Window & {
  __PHASER_GAME__?: PhaserGame;
};

const runtimeErrorsByPage = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const runtimeErrors: string[] = [];
  runtimeErrorsByPage.set(page, runtimeErrors);

  page.on('pageerror', (error) => {
    runtimeErrors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    runtimeErrors.push(`console.error: ${message.text()}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const runtimeErrors = runtimeErrorsByPage.get(page) ?? [];
  expect(runtimeErrors, `runtime errors during ${testInfo.project.name}`).toEqual([]);
});

async function waitForScene(page: Page, key: string, timeout = 45_000): Promise<void> {
  await page.waitForFunction(
    (sceneKey) => Boolean((window as GameWindow).__PHASER_GAME__?.scene.isActive(sceneKey)),
    key,
    { timeout },
  );
}

async function waitForMenuReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const game = (window as GameWindow).__PHASER_GAME__;
    const scene = game?.scene.getScene('MenuScene') as Record<string, unknown> | null;
    const items = scene?.['menuItems'] as Array<{ text: string }> | undefined;
    const texts = scene?.['menuTexts'] as Array<{ alpha?: number }> | undefined;
    const newGameIndex = items?.findIndex((item) => item.text === 'NEW GAME') ?? -1;
    const text = newGameIndex >= 0 ? texts?.[newGameIndex] : undefined;
    return Boolean(text && (text.alpha ?? 0) >= 0.95);
  });
}

async function visibleCanvasPixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return 0;

    const context = canvas.getContext('2d');
    if (!context) return 0;

    const width = canvas.width;
    const height = canvas.height;
    const pixels = context.getImageData(0, 0, width, height).data;
    let visible = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3] ?? 0;
      const luma = (pixels[i] ?? 0) + (pixels[i + 1] ?? 0) + (pixels[i + 2] ?? 0);
      if (alpha > 0 && luma > 12) visible++;
    }

    return visible;
  });
}

test('production build boots menu and enters the first playable scene', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await waitForScene(page, 'MenuScene');
  await waitForMenuReady(page);
  expect(await visibleCanvasPixels(page), `${testInfo.project.name} canvas should render`).toBeGreaterThan(500);

  await page.keyboard.press('Enter');
  await waitForScene(page, 'PrologueScene', 45_000);
  expect(await visibleCanvasPixels(page), `${testInfo.project.name} prologue should render`).toBeGreaterThan(500);
});
