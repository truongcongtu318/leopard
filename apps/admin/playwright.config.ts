import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

const systemChrome = '/usr/bin/google-chrome-stable';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  (!process.env.CI && existsSync(systemChrome) ? systemChrome : undefined);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  globalSetup: './e2e/global.setup.ts',
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3002/login',
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      API_URL: 'http://127.0.0.1:4011/api/v1',
      LEOPARD_UI_PREVIEW: 'enabled',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
