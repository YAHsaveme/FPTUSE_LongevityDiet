import { defineConfig } from '@playwright/test'

const externalServers = process.env.E2E_EXTERNAL_SERVERS === 'true'
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  webServer: externalServers
    ? undefined
    : [
        {
          command: 'dotnet run --project ../../src/LongevityDiet.API/LongevityDiet.API.csproj --launch-profile https',
          url: 'https://localhost:7110/health',
          reuseExistingServer: true,
          timeout: 120_000,
          ignoreHTTPSErrors: true,
        },
        {
          command: 'npm run dev --prefix ../../src/LongevityDiet.Web -- --host localhost --port 5173 --strictPort',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
