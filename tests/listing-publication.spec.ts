import {test,expect} from '@playwright/test';
import {emptyDraft,type Listing} from '../src/portal/listingModel';
import {readCuration} from '../server/curation-policy.mjs';

for(const width of [1440,390])test(`final OK publishes without the manual curation sequence at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const id='11111111-1111-4111-8111-111111111111';
 let item:Listing={id,version:1,draft:{...emptyDraft,title:'Casa de teste',city:'Vacaria · RS',neighborhood:'Centro',price:500000,area:150,description:'Descrição de teste com informações verificadas sobre os ambientes e a localização deste imóvel.',reasons:'Espaços integrados'},photos:[{id:'photo',url:'/assets/scene-urbano-bairro.webp',width:900,height:1600,caption:'',room:'',position:0}],stage:'Aguardando decisão',published:false,publishedVersion:null,blockers:['Conclua a curadoria e a aprovação.']};
 let version=1,writes=0;
 const base=readCuration({type:'Casa'});
 const saved={criteria:base.criteria.map(c=>({...c,score:5,note:'Referência de teste conferida pela equipe.'})),checks:base.checks.map(c=>({...c,state:'Conferido',note:'Referência privada de teste e responsável.'})),pending:''};
 const detail=()=>({evaluation:{id,version,title:item.draft.title,type:'Casa',stage:item.stage},curation:readCuration({type:'Casa',stage:item.stage,saved}),history:[]});
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:{id:'admin',name:'Admin Teste',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false},needsSetup:false}}));
 await page.route('**/api/listings**',r=>{
  if(r.request().url().endsWith('/publish')){const body=r.request().postDataJSON();expect(body.confirmed).toBe(true);expect(body.version).toBe(item.version);expect(body.reviewMode).toBe('simplified');writes++;item={...item,stage:'Entrada aprovada',published:true,version:item.version+1};}
  return r.fulfill({json:new URL(r.request().url()).pathname==='/api/listings'?{listings:[item]}:item});
 });
 await page.route('**/api/evaluations/**',r=>{
  if(r.request().url().endsWith('/decision')){const body=r.request().postDataJSON();expect(body.action).toBe('approve');expect(body.acknowledged).toBe(true);version++;item={...item,version:2,stage:'Entrada aprovada',blockers:[]};}
  return r.fulfill({json:detail()});
 });
 await page.goto('/portalselect/imoveis?imovel='+id);
 await page.getByRole('button',{name:/05 Revisão/}).click();
 await expect(page.locator('.pl-publication-checks')).toContainText('1 foto pronta para o site');
 await expect(page.getByRole('button',{name:'Dar OK e publicar',exact:true})).toBeDisabled();
 await page.locator('.pl-publish').screenshot({path:`test-results/publication-${width}.png`});
 await page.getByRole('checkbox',{name:/Revisei o anúncio e confirmo/}).check();
 await page.getByRole('button',{name:'Dar OK e publicar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Seu anúncio está publicado.'})).toBeVisible();
 expect(writes).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
