import { defineConfig, devices } from '@playwright/test';
const port = process.env.EME_TEST_PORT || '4190';
const baseURL = 'http://127.0.0.1:' + port;
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'msedge', viewport: { width: 1440, height: 1000 } } }],
  webServer: { command: 'npm run dev -- --port ' + port, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 60000 },
});

