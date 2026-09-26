import {test,expect} from '@playwright/test';
import {emptyDraft} from '../src/portal/listingModel';
test.beforeEach(async({page})=>{
 await page.route('**/api/public/properties',r=>r.fulfill({json:{properties:[]}}));
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:{id:'test-admin',name:'Equipe EME',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false},needsSetup:false}}));
});
test('location lookup, BRL input and native confirmation replacement',async({page})=>{
 await page.route('**/api/listings',r=>r.fulfill({json:{listings:[]}}));
 await page.route('https://viacep.com.br/ws/88220000/json/',r=>r.fulfill({json:{localidade:'Itapema',uf:'SC',bairro:'Meia Praia',logradouro:'Rua de teste'}}));
 await page.goto('/portalselect/imoveis');await page.getByRole('button',{name:'Cadastrar imóvel',exact:true}).click();
 await page.getByLabel('Título do anúncio',{exact:true}).fill('Imóvel de teste');await page.getByLabel('CEP · consulta de endereço',{exact:false}).fill('88220000');
 await expect(page.getByLabel('Cidade',{exact:true})).toHaveValue('Itapema');await expect(page.getByLabel('Estado',{exact:true})).toHaveValue('SC');await expect(page.getByLabel('Bairro ou região pública',{exact:true})).toHaveValue('Meia Praia');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByLabel('Preço de venda (R$)',{exact:true}).fill('1690000,50');await page.getByLabel('Área privativa ou útil (m²)',{exact:true}).click();await expect(page.getByLabel('Preço de venda (R$)',{exact:true})).toHaveValue(/1\.690\.000,50/);
 let native=false;page.on('dialog',d=>{native=true;void d.dismiss();});await page.getByRole('button',{name:'Todos os imóveis',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Sair sem salvar');await page.getByRole('button',{name:'Voltar',exact:true}).click();expect(native).toBe(false);
 await page.screenshot({path:'test-results/cadastro-brl.png',fullPage:true});
});
test('coast and mountain profiles display distinct scenes and keep responsive layout',async({page})=>{
 const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message));
 for(const [environment,profiles] of [['litoral',['Beira-mar','Centro','Bairros']],['serra',['Centro','Bairros','Em meio à natureza']]] as const){
  await page.goto('/#/ambientes/'+environment);await expect(page.locator('.photographic-home[data-env-id]')).toHaveAttribute('data-env-id',environment,{timeout:20000});const sources=new Set<string>();
  for(const profile of profiles){await page.locator('main[data-environment-page="'+environment+'"]').getByRole('button',{name:profile,exact:true}).click();const image=page.locator('.photographic-home[data-env-id] img').first();const suffix=profile==='Beira-mar'?'beira-mar':profile==='Centro'?'centro':profile==='Bairros'?'bairro':null;if(suffix)await expect(image).toHaveAttribute('src','/assets/scene-'+environment+'-'+suffix+'.webp');else await expect(image).not.toHaveAttribute('src',/serra-bairro/);const source=await image.getAttribute('src');expect(source).toBeTruthy();sources.add(source!);await image.evaluate((i:HTMLImageElement)=>i.decode());}
  expect(sources.size).toBe(3);
 }
 await page.getByRole('button',{name:'Centro',exact:true}).click();await page.screenshot({path:'test-results/serra-centro.png',fullPage:true});await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/serra-centro-mobile.png',fullPage:true});expect(pageErrors).toEqual([]);
});
test('upscaler loads local model and doubles real pixel dimensions',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const value=await page.evaluate(async()=>{
  const {enhancePhoto}=await import('/src/portal/photoEnhancer.ts');const canvas=document.createElement('canvas');canvas.width=64;canvas.height=48;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#faf5e8';ctx.fillRect(0,0,64,48);ctx.fillStyle='#173c32';ctx.fillRect(12,8,30,32);
  const progress:number[]=[];const url=await enhancePhoto(canvas.toDataURL(),v=>progress.push(v),new AbortController().signal);const image=new Image();image.src=url;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight,progress};
 });expect(value.width).toBe(128);expect(value.height).toBe(96);expect(value.progress.at(-1)).toBe(100);
});
test('photo studio opens comparison and closes accessibly',async({page})=>{
 const item={id:'test-listing',version:1,draft:{...emptyDraft,title:'Casa real',city:'Vacaria · RS'},photos:[{id:'photo',url:'/assets/developments/moradas-da-serra/suite.jpg',caption:'Quarto',room:'Área íntima',width:1280,height:720,position:0}],stage:'Em avaliação',published:false,blockers:['Conclua a curadoria e a aprovação.']};
 await page.route('**/api/listings',r=>r.fulfill({json:{listings:[item]}}));await page.goto('/portalselect/imoveis');await page.getByRole('button',{name:/Casa real.*Vacaria/}).click();await page.getByRole('button',{name:/04.*Percurso de fotos/}).click();await page.getByRole('button',{name:'Preparar foto no Ateliê'}).click();await expect(page.getByRole('dialog')).toContainText('Ateliê de fotografias');await expect(page.getByRole('dialog')).toHaveCSS('background-color','rgb(246, 244, 236)');await page.screenshot({path:'test-results/photo-studio.png',fullPage:true});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
