import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
await mkdir('tmp', { recursive: true });
const temp = await mkdtemp(resolve('tmp/portal-demo-'));
const port = 4195;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, EME_PREVIEW_PORT: String(port), EME_DB_PATH: join(temp, 'portal.sqlite') }, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
let browser;
try {
  await new Promise((resolve,reject) => { const timeout = setTimeout(() => reject(new Error('Preview did not start')), 10000); server.stdout.once('data', () => { clearTimeout(timeout); resolve(); }); server.once('exit', code => { clearTimeout(timeout); reject(new Error('Preview exit: ' + code)); }); });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1060 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = [];
  await mkdir('design/portal', { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1060 });
    for (const route of ['', '/avaliacoes', '/carteira', '/relacionamento', '/locacoes', '/qualidade', '/inteligencia', '/padrao']) {
      const response = await page.goto('http://127.0.0.1:' + port + '/portalselect/demo' + route);
      await page.locator('h1').waitFor();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.ps-sidebar')).position === 'fixed');
      await page.evaluate(() => Promise.all([...document.images].filter(image => image.getBoundingClientRect().top < innerHeight).map(image => image.decode().catch(() => {}))));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const title = await page.locator('h1').textContent();
      results.push({ width, route: route || '/', status: response.status(), overflow, title });
      if (!route || route === '/avaliacoes' || route === '/relacionamento' || route === '/locacoes') await page.screenshot({ path: 'design/portal/' + (route.slice(1) || 'hoje') + '-' + width + '.png', fullPage: !route });
    }
  }
  const slash = await page.goto('http://127.0.0.1:' + port + '/portalselect/demo/');
  const nested = await page.request.get('http://127.0.0.1:' + port + '/portalselect/demo/avaliacoes/');
  const missing = await page.request.get('http://127.0.0.1:' + port + '/missing-portal-file.js');
  const head = await page.request.head('http://127.0.0.1:' + port + '/portalselect/demo');
  const forbidden = await page.request.post('http://127.0.0.1:' + port + '/portalselect/demo');
  const report = { results, errors, http: { slash: slash.status(), nested: nested.status(), missingAsset: missing.status(), head: head.status(), post: forbidden.status() } };
  await writeFile('design/portal/verification.json', JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  if (errors.length || results.some(r => r.overflow || r.status !== 200) || missing.status() !== 404 || head.status() !== 200 || forbidden.status() !== 405) process.exitCode = 1;
} finally { await browser?.close(); server.kill(); }
