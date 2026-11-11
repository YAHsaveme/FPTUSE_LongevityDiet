import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // CI uses the runner's preinstalled Chrome when available, avoiding apt
    // mirror outages. Local Windows continues to use installed Edge.
    ...(process.env.CI
      ? (process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === '1'
          ? { channel: 'chrome' }
          : {})
      : { channel: 'msedge' }),
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
