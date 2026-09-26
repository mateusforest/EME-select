import {test,expect} from '@playwright/test';
import {emptyDraft} from '../src/portal/listingModel';
const admin={id:'admin',name:'Administrador',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false};
test.beforeEach(async({page})=>{
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:admin}}));
 await page.route('**/api/public/properties',r=>r.fulfill({json:{properties:[]}}));
});
test('people editor saves a portrait draft, publishes explicit consent and public profiles respond to mobile',async({page})=>{
 let record={version:0,people:[] as any[],published:false,publishedAt:null};let live:any[]=[];
 await page.route('**/api/people',async r=>{if(r.request().method()==='PATCH')record={...record,version:record.version+1,people:r.request().postDataJSON().people};await r.fulfill({json:record});});
 await page.route('**/api/people/images',async r=>{record={...record,version:record.version+1};await r.fulfill({json:{...record,imageUrl:'/assets/brand-marble-monogram.png'}});});
 await page.route('**/api/people/publish',async r=>{expect(r.request().postDataJSON().confirmed).toBe(true);live=structuredClone(record.people);record={...record,version:record.version+1,published:true};await r.fulfill({json:record});});
 await page.route('**/api/public/people',r=>r.fulfill({json:{people:live}}));
 await page.goto('/portalselect/pessoas');await page.getByRole('button',{name:'Adicionar perfil',exact:true}).click();await page.getByLabel('Nome',{exact:true}).fill('Pessoa de teste');await page.getByLabel('Cargo',{exact:true}).fill('Consultora imobiliária');await page.getByLabel('Apresentação',{exact:true}).fill('Acompanhamento próximo em cada etapa da escolha.');
 await expect(page.getByRole('button',{name:'Publicar perfis',exact:true})).toBeDisabled();
 await page.getByLabel('Fotografia',{exact:true}).setInputFiles('public/assets/brand-marble-monogram.png');await expect(page.getByText('Retrato recebido.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(page.getByRole('button',{name:'Publicar perfis',exact:true})).toBeDisabled();
 await page.getByLabel('Revisei os perfis',{exact:false}).check();await page.getByRole('button',{name:'Publicar perfis',exact:true}).click();await expect(page.getByText('Perfis publicados na página inicial.',{exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/people-editor.png',fullPage:true});
 await page.goto('/');const section=page.locator('#quem-faz-a-eme');await section.scrollIntoViewIfNeeded();await expect(section.getByRole('heading',{name:'Pessoa de teste'})).toBeVisible();await expect(section).toContainText('Consultora imobiliária');await section.screenshot({path:'test-results/people-public-desktop.png'});
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await section.screenshot({path:'test-results/people-public-mobile.png'});
});
test('studio prepares server response, requires review, saves with conventional method and loads no AI model',async({page})=>{
 const item={id:'test-listing',version:1,draft:{...emptyDraft,title:'Casa teste',city:'Vacaria · RS'},photos:[{id:'photo',url:'/assets/developments/moradas-da-serra/suite.jpg',caption:'Quarto',room:'Área íntima',width:1600,height:1200,position:0}],stage:'Em avaliação',published:false,blockers:[]};
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));let saved=false;
 await page.route('**/api/listings',r=>r.fulfill({json:{listings:[item]}}));
 await page.route('**/api/listings/test-listing/prepare-photo',r=>{expect(r.request().postDataJSON()).toEqual({sourceId:'photo',version:1});return r.fulfill({json:{content:item.photos[0].url,width:3200,height:2400,method:'lanczos3-2x'}});});
 await page.route('**/api/listings/test-listing/photos',r=>{const body=r.request().postDataJSON();expect(body.method).toBe('lanczos3-2x');expect(body.reviewed).toBe(true);saved=true;return r.fulfill({json:{...item,version:2}});});
 await page.goto('/portalselect/imoveis');await page.getByRole('button',{name:/Casa teste.*Vacaria/}).click();await page.getByRole('button',{name:/04.*Percurso de fotos/}).click();await page.getByRole('button',{name:'Preparar foto no Ateliê'}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Preparar ampliação',exact:true}).click();await expect(dialog).toContainText('3200 × 2400 px');await expect(dialog).toContainText('convencional, sem IA');await expect(dialog.getByRole('button',{name:'Usar a versão preparada'})).toBeDisabled();await dialog.getByLabel('Comparei as imagens',{exact:false}).check();await dialog.screenshot({path:'test-results/studio-prepared.png'});await dialog.getByRole('button',{name:'Usar a versão preparada'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(saved).toBe(true);expect(requests.some(url=>url.includes('/vendor/photo-v1/'))).toBe(false);
});

test('editorial assistant applies finished public copy and keeps internal instructions out of the fields',async({page})=>{
 const item={id:'test-listing',version:1,draft:{...emptyDraft,title:'Casa editorial',city:'Vacaria · RS'},photos:[],stage:'Em avaliação',published:false,blockers:[]};
 await page.route('**/api/listings',r=>r.fulfill({json:{listings:[item]}}));await page.route('**/api/evaluations/test-listing',r=>r.fulfill({json:{evaluation:{version:1}}}));
 const copy='A casa reúne suíte com closet e sala integrada à cozinha. Os ambientes conectados acompanham as atividades do dia a dia.';
 await page.route('**/api/intelligence/analyses',r=>r.fulfill({json:{runs:[{id:r.request().postDataJSON().requestId,result:{draftReply:copy,strengths:['Suíte com closet'],highlights:['Sala e cozinha integradas'],nextActions:['Não publicar esta orientação'],pending:['Confirmar os móveis incluídos']}}]}}));
 await page.goto('/portalselect/imoveis');await page.getByRole('button',{name:/Casa editorial.*Vacaria/}).click();await page.getByRole('button',{name:/03.*Apresentação/}).click();await page.getByRole('button',{name:'Sugerir apresentação com IA'}).click();await expect(page.getByText('Conferência interna · não entra no anúncio')).toBeVisible();await expect(page.getByText('Não publicar esta orientação')).toHaveCount(0);
 await page.getByRole('button',{name:'Aplicar ao rascunho para revisar'}).click();await expect(page.getByLabel('Descrição do imóvel',{exact:false})).toHaveValue(copy);await expect(page.getByLabel('Diferenciais EME',{exact:false})).toHaveValue('Sala e cozinha integradas');await expect(page.getByRole('button',{name:'Salvar cadastro',exact:true})).toBeEnabled();
});
