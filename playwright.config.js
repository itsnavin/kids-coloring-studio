import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 60_000,
  use: { baseURL: process.env.LIVE_URL || 'http://127.0.0.1:4173/kids-coloring-studio/', browserName: 'chromium' },
  webServer: process.env.LIVE_URL ? undefined : {
    command: 'npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173/kids-coloring-studio/',
    reuseExistingServer: !process.env.CI,
  },
});
