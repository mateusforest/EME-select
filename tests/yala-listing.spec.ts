import {test,expect} from '@playwright/test';
import {emptyDraft,type Listing} from '../src/portal/listingModel';
const id='11111111-1111-4111-8111-111111111111';
for(const scenario of ['automatic','provider-error','stale'] as const)test(`Yala photo upload ${scenario} preserves the saved listing`,async({page},info)=>{
 let item:Listing|null=null,analyses=0,saves=0;
 const description='Ambientes apresentados a partir das fotografias recebidas. A cozinha e a sala compõem o percurso para conhecer este imóvel.';
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:{id:'admin',name:'Admin Teste',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false},needsSetup:false}}));
 await page.route('**/api/listings**',r=>{
  const req=r.request(),path=new URL(req.url()).pathname,body=req.method()==='GET'?null:req.postDataJSON();
  if(path==='/api/listings'&&req.method()==='GET')return r.fulfill({json:{listings:[]}});
  if(path==='/api/listings'&&req.method()==='POST'){item={id,version:1,draft:body.draft,photos:[],stage:'Em avaliação',published:false,publishedVersion:null,blockers:['Adicione pelo menos uma fotografia real.']};return r.fulfill({json:item});}
  if(path.endsWith('/photos')){item={...item!,version:item!.version+1,photos:[...item!.photos,{id:'photo-'+item!.photos.length,url:'/assets/scene-urbano-bairro.webp',width:870,height:652,caption:'',room:'',position:item!.photos.length}],blockers:['Conclua a curadoria e a aprovação.']};return r.fulfill({json:item});}
  if(req.method()==='PATCH'){saves++;expect(body.version).toBe(item!.version);if(scenario==='stale')return r.fulfill({status:409,json:{error:'O cadastro mudou. Reabra para conferir a versão atual.'}});item={...item!,version:item!.version+1,draft:body.draft,photos:body.photos.map((p:object)=>({...item!.photos[0],...p}))};return r.fulfill({json:item});}
  return r.fulfill({json:item});
 });
 await page.route('**/api/evaluations/**',r=>r.fulfill({json:{evaluation:{id,version:item!.version},curation:{},history:[]}}));
 await page.route('**/api/intelligence/analyses',r=>{analyses++;const body=r.request().postDataJSON();expect(body.prepareListing).toBe(true);expect(item!.photos).toHaveLength(2);if(scenario==='provider-error')return r.fulfill({status:502,json:{error:'A Yala não respondeu. As fotos estão salvas.'}});return r.fulfill({json:{runs:[{id:body.requestId,status:'completed',stale:false,result:{summary:'Duas fotos organizadas.',description,features:['Cozinha'],highlights:['Ambientes apresentados'],pending:[],photos:[{id:'photo-1',room:'Área social',caption:'Sala de estar',observation:''},{id:'photo-0',room:'Cozinha',caption:'Cozinha',observation:''}]}}]}});});
 await page.goto('/portalselect/imoveis');await page.getByRole('button',{name:'Cadastrar imóvel',exact:true}).click();
 await page.getByLabel('Título do anúncio',{exact:true}).fill('Casa teste Yala');await page.getByLabel('Cidade',{exact:true}).fill('Vacaria');
 await page.getByRole('button',{name:'Adicionar fotos',exact:true}).click();
 await page.getByLabel('Adicionar fotografias do imóvel').setInputFiles(['public/assets/scene-urbano-bairro.webp','public/assets/scene-urbano-bairro.webp']);
 if(scenario==='automatic'){
  await expect(page.getByText('Preparação concluída · aguardando seu OK',{exact:true})).toBeVisible();
  expect(item!.draft.description).toBe(description);expect(item!.photos.map(p=>p.caption)).toEqual(['Sala de estar','Cozinha']);expect(item!.published).toBe(false);expect(saves).toBe(1);
  await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('yala-ready-mobile.png'),fullPage:true});
 }else{
  await expect(page.getByRole('alert').filter({hasText:scenario==='provider-error'?'Yala não respondeu':'cadastro mudou'})).toBeVisible();
  expect(item!.photos).toHaveLength(2);expect(item!.draft.description).toBe('');expect(item!.published).toBe(false);
 }
 expect(analyses).toBe(1);
});
