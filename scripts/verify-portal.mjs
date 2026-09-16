import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
await mkdir('tmp', { recursive: true });
const temp = await mkdtemp(resolve('tmp/portal-unified-'));
const port = 4295, origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, EME_PREVIEW_PORT: String(port), EME_DB_PATH: join(temp, 'portal.sqlite') }, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
let browser;
try {
  await new Promise((yes,no) => { const timeout=setTimeout(()=>no(new Error('Preview did not start')),15000); server.stdout.once('data',()=>{clearTimeout(timeout);yes();}); server.once('exit',code=>{clearTimeout(timeout);no(new Error('Preview exit: '+code));}); });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1060 } });
  const errors = [], results = [];
  page.on('pageerror', error => errors.push(error.message));
  // A brand-new disposable database; never uses company data or credentials.
  await page.goto(origin + '/portalselect/demo');
  await expect(page).toHaveURL(origin + '/portalselect');
  await expect(page.getByRole('heading',{name:'Seu acesso começa aqui.'})).toBeVisible();
  await expect(page.getByRole('link',{name:/demonstração/i})).toHaveCount(0);
  await page.getByLabel('Seu nome',{exact:true}).fill('Administrador QA isolado');
  await page.getByLabel('E-mail',{exact:true}).fill('portal-qa@example.invalid');
  await page.getByLabel('Senha',{exact:true}).fill('PortalIsolatedTest!2026');
  await page.getByLabel('Confirme sua senha',{exact:true}).fill('PortalIsolatedTest!2026');
  await page.getByRole('button',{name:'Criar meu acesso'}).click();
  await expect(page.locator('.pt-live')).toBeVisible();
  const routes=['','/imoveis','/avaliacoes','/relacionamento','/locacoes','/documentos','/qualidade','/inteligencia','/padrao','/financeiro','/equipe','/conta'];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1060 });
    for (const route of routes) {
      const response = await page.goto(origin + '/portalselect' + route);
      await expect(page.locator('.pt-live')).toBeVisible();
      await expect(page.getByRole('status').filter({hasText:'Carregando'})).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const title = await page.locator('h1').textContent();
      results.push({ width, route: route || '/', status: response.status(), overflow, title });
      await expect(page.locator('a[href*="/portalselect/demo"]')).toHaveCount(0);
      await expect(page.getByText('Dados fictícios',{exact:true})).toHaveCount(0);
      if(['/relacionamento','/locacoes','/documentos','/qualidade','/inteligencia'].includes(route))await expect(page.locator('.pt-module-status').getByText('Em desenvolvimento',{exact:true})).toBeVisible();
      if(['','/padrao','/relacionamento','/financeiro'].includes(route))await page.screenshot({path:join(temp,(route.slice(1)||'hoje')+'-'+width+'.png'),fullPage:true});
    }
  }
  for(const [before,after] of [['/demo',''],['/demo/carteira','/imoveis'],['/demo/locacoes','/locacoes'],['/demo/avaliacoes/','/avaliacoes']]){
    await page.goto(origin+'/portalselect'+before+'?origem=legado');
    await expect(page).toHaveURL(origin+'/portalselect'+after+'?origem=legado');
    await expect(page.locator('.pt-live')).toBeVisible();
  }
  const missing = await page.request.get(origin+'/missing-portal-file.js');
  const head = await page.request.head(origin+'/portalselect');
  const forbidden = await page.request.post(origin+'/portalselect');
  const report = { results, errors, http: { missingAsset:missing.status(),head:head.status(),post:forbidden.status() } };
  await writeFile(join(temp,'verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,artifacts:temp}));
  if(errors.length||results.some(r=>r.overflow||r.status!==200)||missing.status()!==404||head.status()!==200||forbidden.status()!==405)process.exitCode=1;
} finally { await browser?.close(); server.kill(); }
