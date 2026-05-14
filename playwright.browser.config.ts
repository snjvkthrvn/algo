import { defineConfig, devices } from 'playwright/test';

const previewPort = 4173;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${previewPort}`;
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: './tests',
  testMatch: 'browser-support.spec.ts',
  timeout: 90_000,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-chrome-edge',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        // No --disable-webgl: production users run with WebGL on, and Phaser 3
        // defaults to WEBGL_AUTO which falls back to canvas-2d on its own when
        // WebGL is unavailable. Testing with WebGL disabled here would silently
        // skip the renderer real users see.
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit-safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${previewPort}`,
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
