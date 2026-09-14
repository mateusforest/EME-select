import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
mkdirSync('tmp',{recursive:true});mkdirSync('design/curation',{recursive:true});
const temp=mkdtempSync(resolve('tmp/curation-browser-'));
const origin='http://127.0.0.1:4198';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,EME_PREVIEW_PORT:'4198',EME_DB_PATH:join(temp,'portal.sqlite')},windowsHide:true,stdio:['ignore','pipe','pipe']});
let browser;const errors=[];
try {
  await new Promise((yes,no)=>{const timeout=setTimeout(()=>no(Error('Server timeout')),10000);server.stdout.once('data',()=>{clearTimeout(timeout);yes();});server.once('exit',code=>{clearTimeout(timeout);no(Error('Exit '+code));});});
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1040}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const setup=await context.request.post(origin+'/api/auth/setup',{headers:{Origin:origin},data:{name:'Equipe de teste',email:'test@example.test',password:'Curation-test-only-2026!'}});expect(setup.status()).toBe(201);
  const created=await context.request.post(origin+'/api/evaluations',{headers:{Origin:origin},data:{title:'Casa do jardim · teste',city:'Caxias do Sul',type:'Casa',operation:'Venda'}});expect(created.status()).toBe(201);
  await page.goto(origin+'/portalselect/avaliacoes');await page.getByRole('button',{name:'Abrir avaliação Casa do jardim · teste'}).click();
  await page.getByRole('button',{name:'Curadoria e decisão',exact:true}).click();
  const panel=page.locator('.pc-panel');await expect(panel.getByRole('heading',{name:'Evidências antes da decisão.'})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Encaminhar para decisão',exact:true})).toBeDisabled();
  await page.screenshot({path:'design/curation/criteria-desktop.png'});
  for(const criterion of await panel.locator('.pc-criterion').all()) {await criterion.getByRole('combobox').selectOption('4');await criterion.getByRole('textbox').fill('Verificação de teste em 14/09/2026; fonte e escopo registrados.');}
  await panel.getByRole('button',{name:'Salvar curadoria',exact:true}).click();
  await expect(panel.locator('.pc-score')).toContainText('80');await expect(panel.getByRole('button',{name:'Encaminhar para decisão',exact:true})).toBeDisabled();
  for(const check of await panel.locator('.pc-check').all()){await check.getByRole('combobox').selectOption('Conferido');await check.getByRole('textbox').fill('Responsável de teste · conferência em 14/09/2026 · fonte privada de teste.');}
  await panel.getByRole('button',{name:'Salvar curadoria',exact:true}).click();await expect(panel.getByRole('button',{name:'Encaminhar para decisão',exact:true})).toBeEnabled();
  await page.setViewportSize({width:390,height:844});await page.getByRole('dialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'design/curation/criteria-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.setViewportSize({width:1440,height:1040});
  await panel.getByRole('button',{name:'Encaminhar para decisão',exact:true}).click();await panel.getByLabel('Motivo da decisão').fill('Informações reunidas para a revisão final da equipe.');await panel.getByRole('button',{name:'Confirmar decisão',exact:true}).click();
  await expect(page.locator('.pt-case-meta')).toContainText('Aguardando decisão');
  await panel.getByRole('button',{name:'Aprovar entrada',exact:true}).click();await panel.getByLabel('Motivo da decisão').fill('Fontes revisadas pela equipe no ambiente isolado de teste.');await expect(panel.getByRole('button',{name:'Confirmar decisão',exact:true})).toBeDisabled();
  await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Confirmar decisão',exact:true}).click();
  await expect(page.locator('.pt-case-meta')).toContainText('Entrada aprovada');await expect(panel.getByRole('heading',{name:'Decisão preservada'})).toBeVisible();await panel.getByRole('button',{name:'Reabrir avaliação'}).scrollIntoViewIfNeeded();await page.screenshot({path:'design/curation/decision-desktop.png'});
  await page.keyboard.press('Escape');await page.reload();await page.getByRole('button',{name:'Abrir avaliação Casa do jardim · teste'}).click();await page.getByRole('button',{name:'Curadoria e decisão',exact:true}).click();await expect(panel.getByRole('heading',{name:'Decisão preservada'})).toBeVisible();
  await panel.getByRole('button',{name:'Reabrir avaliação'}).click();await panel.getByLabel('Motivo da decisão').fill('Informação nova requer revisão das conferências.');await panel.getByRole('button',{name:'Confirmar decisão',exact:true}).click();
  await expect(page.locator('.pt-case-meta')).toContainText('Em avaliação');await expect(panel.getByRole('button',{name:'Encaminhar para decisão',exact:true})).toBeDisabled();await expect(page.locator('.pt-history')).toContainText('Decisão reaberta');
  expect(errors).toEqual([]);writeFileSync('design/curation/verification.json',JSON.stringify({checks:['Criteria and notes','High score blocked by pending checks','Human sign-offs','Mobile layout','Review queue','Acknowledged approval','Persisted decision','Reopening invalidates sign-offs'],errors},null,2));console.log('Curation browser: 8 checks passed; no page errors.');
}finally{await browser?.close();server.kill();}
