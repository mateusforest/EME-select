import {test,expect} from '@playwright/test';
import {emptyDevelopment} from '../shared/development.mjs';
import type {DevelopmentRecord} from '../shared/development.mjs';
test.beforeEach(async({page})=>{await page.route('**/api/public/properties',r=>r.fulfill({json:{properties:[]}}));});

test('empty real collection never falls back to commercial samples',async({page})=>{
 await page.goto('/#/colecao');await expect(page.getByRole('heading',{level:1})).toHaveText('Encontre o seu lugar.');await expect(page.locator('.catalog-results').getByRole('article')).toHaveCount(0);
 await expect(page.getByText('Casa entre as araucárias',{exact:true})).toHaveCount(0);
 await page.route('**/api/public/properties',r=>r.fulfill({status:503,json:{error:'Teste'}}));await page.reload();
 await expect(page.locator('.collection-connection-notice')).toContainText('Não foi possível atualizar os anúncios.');
 await expect(page.getByText('Casa entre as araucárias',{exact:true})).toHaveCount(0);
});
test('home categories open collection filters, and neighborhood has its own scene',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Casas',exact:true}).click();
 await expect(page).toHaveURL(/tipo=Casa/);await expect(page.getByRole('combobox',{name:'Tipo de imóvel',exact:true})).toHaveValue('Casa');
 await page.goto('/#/ambientes/litoral');await page.getByRole('button',{name:'Beira-mar',exact:true}).click();
 await page.getByRole('button',{name:'Coberturas',exact:true}).click();await expect(page).toHaveURL(/localizacao=beira-mar/);await expect(page).toHaveURL(/tipo=Cobertura/);
 await page.goto('/#/ambientes/serra');await page.getByRole('button',{name:'Apartamentos',exact:true}).click();await expect(page).toHaveURL(/tipo=Apartamento/);
 await page.goto('/#/ambientes/urbano');await page.getByRole('button',{name:'Bairros',exact:true}).click();
 const scene=page.locator('img[src="/assets/scene-urbano-bairro.webp"]');await expect(scene).toBeVisible();await scene.evaluate((i:HTMLImageElement)=>i.decode());
 await page.screenshot({path:'test-results/neighborhood-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/neighborhood-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Casas',exact:true}).click();await expect(page).toHaveURL(/localizacao=bairro/);
});
test('clicking the facade reveals published plans and areas; sold floors cannot be offered',async({page})=>{
 const config=emptyDevelopment();config.plans=[{id:'plan',title:'Planta Jardim',area:71,bedrooms:3,suites:1,parking:1,imageUrl:'/assets/developments/moradas-da-serra/plans.jpg'}];
 config.units=[{id:'601',tower:'a',floor:6,label:'601',planId:'plan',status:'available',price:null,orientation:'Norte'}, {id:'701',tower:'a',floor:7,label:'701',planId:'plan',status:'sold',price:null,orientation:''}];
 await page.route('**/api/public/developments/moradas-da-serra',r=>r.fulfill({json:{config,published:true}}));
 await page.setViewportSize({width:1920,height:1080});await page.goto('/#/empreendimentos/moradas-da-serra');
 await page.getByRole('button',{name:'3º andar, disponibilidade a confirmar',exact:true}).click();
 await page.getByRole('button',{name:'Selecionar torre 1, 6º andar no prédio',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Torre 1 · 6º andar'})).toBeVisible();
 await expect(page.locator('.development-unit-card')).toContainText('71 m²');
 await expect(page.getByRole('button',{name:'7º andar, sem unidades disponíveis',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Ampliar planta',exact:false}).click();await expect(page.getByRole('dialog')).toContainText('71 m²');
 await page.keyboard.press('Escape');await page.screenshot({path:'test-results/development-live-unit.png',fullPage:true});
});

test('administrator edits a floor plan and unit, saves, publishes and reloads the portal',async({page})=>{
 let record:DevelopmentRecord={version:0,config:emptyDevelopment(),published:false,publishedAt:null};
 let writes=0;
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:{id:'admin-test',name:'Admin Teste',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false},needsSetup:false}}));
 await page.route('**/api/developments/moradas-da-serra**',async r=>{
  const req=r.request(),path=new URL(req.url()).pathname;
  if(req.method()==='PATCH'){const body=req.postDataJSON();expect(body.version).toBe(record.version);record={...record,version:record.version+1,config:body.config};writes++;}
  if(path.endsWith('/publish')){expect(req.postDataJSON().confirmed).toBe(true);record={...record,version:record.version+1,published:true,publishedAt:new Date().toISOString()};}
  await r.fulfill({json:record});
 });
 await page.goto('/portalselect/empreendimentos');
 await expect(page.getByRole('heading',{name:'Plantas e metragens',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Adicionar planta',exact:true}).click();await page.getByLabel('Nome da planta',{exact:true}).fill('Planta revisada');
 await page.getByLabel('Área privativa (m²)',{exact:true}).fill('71');await page.getByLabel('Dormitórios',{exact:true}).fill('3');
 await page.getByRole('button',{name:'Adicionar unidade',exact:true}).click();await page.getByLabel('Identificação da unidade',{exact:true}).fill('601');
 await page.getByLabel('Andar',{exact:true}).fill('6');await page.getByRole('combobox',{name:/^Planta/}).selectOption({label:'Planta revisada · 71 m²'});
 await expect(page.getByRole('button',{name:'Publicar revisão no site'})).toBeDisabled();
 await page.getByRole('button',{name:'Salvar rascunho'}).click();await expect(page.getByRole('status')).toContainText('Rascunho salvo');
 expect(writes).toBe(1);expect(record.config.units[0].floor).toBe(6);expect(record.config.plans[0].area).toBe(71);
 await page.getByLabel('Conferi as plantas, as medidas, a disponibilidade e a autorização de divulgação.').check();
 await page.getByRole('button',{name:'Publicar revisão no site'}).click();await expect(page.getByRole('status')).toContainText('Informações publicadas');
 await page.reload();await expect(page.getByLabel('Identificação da unidade')).toHaveValue('601');await expect(page.getByLabel('Área privativa (m²)')).toHaveValue('71');
 await page.screenshot({path:'test-results/development-editor-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/development-editor-mobile.png',fullPage:true});
});
