import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 720 },
    // 2x DPR makes screenshots 2560x1440 — sharper pixels for art-pass audits
    // without scaling the game itself (Phaser still renders at native 640x360).
    deviceScaleFactor: 2,
    screenshot: 'on',
    launchOptions: {
      args: ['--disable-webgl'],
    },
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
