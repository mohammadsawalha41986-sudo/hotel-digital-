import { defineConfig, devices } from '@playwright/test';

const PORT = 8090;
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      DATABASE_URL: process.env.DATABASE_URL_E2E ?? 'postgres://hub:hub@localhost:5432/hotelhub_e2e',
      UPLOAD_DIR: './.e2e-uploads',
      LOG_LEVEL: 'warn',
      DISABLE_RATE_LIMIT: '1',
      NODE_ENV: 'test',
    },
  },
});
