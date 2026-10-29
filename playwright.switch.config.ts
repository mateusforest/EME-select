import {defineConfig,devices} from '@playwright/test';
const port=Number(process.env.SWITCH_TEST_PORT||4190);

export default defineConfig({
  testDir:'./tests',
  testMatch:'switch-ui.spec.ts',
  workers:2,fullyParallel:true,retries:0,reporter:'list',
  use:{baseURL:'http://127.0.0.1:'+port,trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome'],browserName:'chromium',...(process.env.SWITCH_TEST_CHANNEL?{channel:process.env.SWITCH_TEST_CHANNEL}:{})}}],
  webServer:{command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port '+port,url:'http://127.0.0.1:'+port,reuseExistingServer:!process.env.CI,timeout:60000}
});
