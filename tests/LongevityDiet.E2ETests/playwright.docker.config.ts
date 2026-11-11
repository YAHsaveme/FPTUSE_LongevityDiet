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
    // GitHub CI installs Playwright Chromium; local Windows can use existing Edge.
    ...(process.env.CI ? {} : { channel: 'msedge' }),
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
