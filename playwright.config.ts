import { defineConfig, devices } from '@playwright/test';

// Cần build trước (pnpm build) và database đã migrate + seed.
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    { command: 'pnpm --filter api start', url: 'http://localhost:3001/health', reuseExistingServer: true },
    { command: 'pnpm --filter web start', url: 'http://localhost:3000', reuseExistingServer: true },
  ],
});
