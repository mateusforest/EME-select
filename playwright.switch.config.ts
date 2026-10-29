import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:'switch-ui.spec.ts',
  workers:2,fullyParallel:true,retries:0,reporter:'list',
  use:{baseURL:'http://127.0.0.1:4190',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome'],browserName:'chromium'}}],
  webServer:{command:'npm run dev',url:'http://127.0.0.1:4190',reuseExistingServer:!process.env.CI,timeout:60000}
});
