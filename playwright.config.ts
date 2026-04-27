import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 720 },
    screenshot: 'on',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
