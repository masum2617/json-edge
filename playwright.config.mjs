import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ui', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4178', trace: 'retain-on-failure', ...(process.env.CHROME_PATH ? { launchOptions: { executablePath: process.env.CHROME_PATH } } : {}) },
  webServer: { command: 'node scripts/ui-server.cjs', url: 'http://127.0.0.1:4178', reuseExistingServer: false },
});
