import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {mkdtempSync,mkdirSync} from 'node:fs';import {join,resolve} from 'node:path';import sharp from 'sharp';import {createPortalApi} from '../server/portal-api.mjs';
test('real listings: private photos, curation and explicit publication',async t=>{
 mkdirSync('tmp',{recursive:true});const dbPath=join(mkdtempSync(resolve('tmp/listing-api-')),'portal.sqlite');let api=createPortalApi({dbPath});const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;t.after(async()=>{await new Promise(r=>server.close(r));api.close();});
 const admin={},broker={},anonymous={};let item;const password='Listings-test-only-2026!';
 async function req(who,path,body,method=body?'POST':'GET'){const res=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,Cookie:who.cookie||'','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(res.headers.get('set-cookie'))who.cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,body:res.headers.get('content-type')?.includes('application/json')?await res.json():Buffer.from(await res.arrayBuffer())};}
 const draft={privateAddress:'Endereço privado de teste',ownerName:'Pessoa privada de teste',ownerContact:'Contato privado de teste',title:'Casa real de teste',city:'Caxias do Sul · RS',neighborhood:'Região de teste',type:'Casa',environment:'urbano',condominium:'',operation:'comprar',price:650000,area:150,bedrooms:3,suites:1,parking:2,condominiumFee:null,propertyTax:0,description:'Casa utilizada exclusivamente para validar o cadastro e a publicação. Seus espaços e características são dados de teste, sem oferta comercial.',features:'Jardim\nVaranda',reasons:'Planta funcional documentada\nIntegração da sala e do jardim registrada',costNotes:'Área informada, valores de teste.'};
 const photo=await sharp({create:{width:4000,height:2400,channels:3,background:'#567b67'}}).jpeg().withMetadata({exif:{IFD0:{Artist:'Private metadata test'}}}).toBuffer();const content='data:image/jpeg;base64,'+photo.toString('base64');
 async function approve(){let result=(await req(admin,'/evaluations/'+item.id)).body;result=(await req(admin,'/evaluations/'+item.id+'/curation',{version:result.evaluation.version,criteria:result.curation.criteria.map(c=>({key:c.key,score:5,note:'Evidência de teste, fonte e data registradas.'})),checks:result.curation.checks.map(c=>({key:c.key,state:'Conferido',note:'Responsável de teste, fonte privada e data de conferência.'})),pending:''})).body;result=(await req(admin,'/evaluations/'+item.id+'/decision',{version:result.evaluation.version,action:'submit',reason:'Revisão final da equipe solicitada.'})).body;const decision=await req(admin,'/evaluations/'+item.id+'/decision',{version:result.evaluation.version,action:'approve',reason:'Conferência humana no teste controlado.',acknowledged:true});assert.equal(decision.status,200);item=(await req(admin,'/listings/'+item.id)).body;}
 await t.test('draft registration creates linked evaluation and stays private',async()=>{
  await req(admin,'/auth/setup',{name:'Admin Teste',email:'admin@example.test',password});await req(admin,'/users',{name:'Corretor Teste',email:'broker@example.test',password,role:'corretor'});await req(broker,'/auth/login',{email:'broker@example.test',password});await req(broker,'/auth/password',{currentPassword:password,newPassword:password+'2'});
  assert.equal((await req(anonymous,'/listings',{draft})).status,401);const created=await req(admin,'/listings',{draft});assert.equal(created.status,201);item=created.body;assert.equal(item.stage,'Em avaliação');assert.equal((await req(broker,'/listings/'+item.id)).status,404);assert.deepEqual((await req(anonymous,'/public/properties')).body.properties,[]);assert.equal((await req(admin,'/listings/'+item.id+'/publish',{version:item.version,confirmed:true})).status,409);
 });
 await t.test('photo decoder rejects invalid files and strips metadata',async()=>{
  assert.equal((await req(anonymous,'/listings/'+item.id+'/photos',{version:item.version,content})).status,401);
  assert.equal((await req(admin,'/listings/'+item.id+'/photos',{version:item.version,content:'data:image/png;base64,'+Buffer.from('<svg/>').toString('base64')})).status,400);
  const result=await req(admin,'/listings/'+item.id+'/photos',{version:item.version,content,caption:'Sala principal',room:'Área social'});assert.equal(result.status,201,JSON.stringify(result.body));item=result.body;
  const privatePhoto=item.photos[0].url.replace('/api','');assert.equal((await req(anonymous,privatePhoto)).status,404);assert.equal((await req(broker,privatePhoto)).status,404);
  const stored=await req(admin,privatePhoto);assert.equal(stored.status,200);const metadata=await sharp(stored.body).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);assert.equal(metadata.width,3200);assert.equal(metadata.height,1920);
  item=(await req(admin,'/listings/'+item.id+'/photos',{version:item.version,content,caption:'Jardim',room:'Área externa'})).body;assert.equal(item.photos.length,2);
 });
 await t.test('ordered gallery, numeric validation and stale edit protection',async()=>{
  const body={version:item.version,draft,photos:item.photos.map(({id,caption,room})=>({id,caption,room})).reverse()};
  assert.equal((await req(admin,'/listings/'+item.id,{...body,draft:{...draft,price:-1}},'PATCH')).status,400);
  assert.equal((await req(admin,'/listings/'+item.id,{...body,photos:[{id:'not-owned',caption:'No access'}]},'PATCH')).status,400);
  const saved=await req(admin,'/listings/'+item.id,body,'PATCH');assert.equal(saved.status,200);item=saved.body;assert.equal(item.photos[0].caption,'Jardim');assert.equal((await req(admin,'/listings/'+item.id,body,'PATCH')).status,409);
 });
 await t.test('small photos remain private drafts and cannot bypass publication with forged dimensions',async()=>{
  const low=await sharp({create:{width:870,height:652,channels:3,background:'#678576'}}).webp().toBuffer();
  const lowContent='data:image/webp;base64,'+low.toString('base64');
  const spoofedUpload=await req(admin,'/listings/'+item.id+'/photos',{version:item.version,content:lowContent,caption:'Sala pequena de referência',room:'Área social',width:4000,height:3000});
  assert.equal(spoofedUpload.status,400);
  const uploaded=await req(admin,'/listings/'+item.id+'/photos',{version:item.version,content:lowContent,caption:'Sala pequena de referência',room:'Área social'});
  assert.equal(uploaded.status,201);item=uploaded.body;const lowId=item.photos.at(-1).id;
  assert.equal(item.photos.at(-1).width,870);assert.equal(item.photos.at(-1).height,652);
  const bytes=await req(admin,item.photos.at(-1).url.replace('/api',''));const decoded=await sharp(bytes.body).metadata();
  assert.equal(decoded.width,870);assert.equal(decoded.height,652);
  await approve();assert.equal(item.stage,'Entrada aprovada');assert.ok(item.blockers.some(message=>message.includes('870 × 652')));
  const spoofedPatch=await req(admin,'/listings/'+item.id,{version:item.version,draft,photos:item.photos.map(({id,caption,room})=>({id,caption,room,...(id===lowId?{width:4000,height:3000}:{})}))},'PATCH');
  assert.equal(spoofedPatch.status,400);
  const blocked=await req(admin,'/listings/'+item.id+'/publish',{version:item.version,confirmed:true});
  assert.equal(blocked.status,409);assert.match(blocked.body.error,/2000/);
  assert.deepEqual((await req(anonymous,'/public/properties')).body.properties,[]);
  assert.equal((await req(anonymous,item.photos.at(-1).url.replace('/api',''))).status,404);
  const removed=await req(admin,'/listings/'+item.id,{version:item.version,draft,photos:item.photos.filter(photo=>photo.id!==lowId).map(({id,caption,room})=>({id,caption,room}))},'PATCH');
  assert.equal(removed.status,200);item=removed.body;
 });
 await t.test('reviewed photo replacement preserves private original, order and concurrency',async()=>{
  const source=item.photos[0],original=(await req(admin,source.url.replace('/api',''))).body,version=item.version;
  const body={version,sourceId:source.id,content,method:'esrgan-slim-2x',reviewed:true,caption:source.caption,room:source.room};
  assert.equal((await req(admin,'/listings/'+item.id+'/photos',{...body,reviewed:false})).status,400);
  assert.equal((await req(admin,'/listings/'+item.id+'/photos',{...body,sourceId:item.id})).status,400);
  const result=await req(admin,'/listings/'+item.id+'/photos',body);assert.equal(result.status,201);item=result.body;
  assert.equal(item.photos.length,2);assert.notEqual(item.photos[0].id,source.id);assert.equal(item.photos[0].caption,source.caption);assert.ok(item.photos[0].enhancement);
  assert.deepEqual((await req(admin,item.photos[0].url.replace('/api','')+'?original=1')).body,original);
  assert.equal((await req(anonymous,item.photos[0].url.replace('/api','')+'?original=1')).status,404);
  assert.equal((await req(admin,'/listings/'+item.id+'/photos',{...body,sourceId:item.photos[0].id})).status,409);
 });
 await t.test('admin publishes reviewed snapshot with authorized photos only',async()=>{
  await approve();assert.equal(item.blockers.length,0);assert.equal((await req(admin,'/listings/'+item.id+'/publish',{version:item.version})).status,400);
  const published=await req(admin,'/listings/'+item.id+'/publish',{version:item.version,confirmed:true});assert.equal(published.status,200);item=published.body;
  const publicItem=(await req(anonymous,'/public/properties')).body.properties[0];assert.equal(publicItem.title,draft.title);assert.equal(publicItem.images[0].caption,'Jardim');assert.equal(publicItem.images[0].width,3200);assert.equal(publicItem.images[0].height,1920);assert.equal(publicItem.images[0].room,'Área externa');assert.equal(publicItem.isIllustrative,false);assert.equal(publicItem.owner,undefined);assert.equal(publicItem.privateAddress,undefined);assert.equal(publicItem.ownerName,undefined);assert.equal(publicItem.ownerContact,undefined);assert.equal(publicItem.checks,undefined);assert.equal((await req(anonymous,publicItem.images[0].url.replace('/api',''))).status,200);
  assert.equal((await req(anonymous,item.photos[0].url.replace('/api','')+'?original=1')).status,404);api.close();api=createPortalApi({dbPath});assert.equal((await req(admin,item.photos[0].url.replace('/api','')+'?original=1')).status,200);assert.equal((await req(anonymous,'/public/properties')).body.properties.length,1);
 });
 await t.test('edits retract publication and require new sign-offs',async()=>{
  const edited=await req(admin,'/listings/'+item.id,{version:item.version,draft:{...draft,price:660000},photos:item.photos.map(({id,caption,room})=>({id,caption,room}))},'PATCH');assert.equal(edited.status,200);item=edited.body;assert.equal(item.published,false);assert.equal(item.stage,'Em avaliação');assert.equal((await req(anonymous,'/public/properties')).body.properties.length,0);assert.equal((await req(anonymous,item.photos[0].url.replace('/api',''))).status,404);
  const evaluation=(await req(admin,'/evaluations/'+item.id)).body;assert.ok(evaluation.curation.checks.every(c=>c.state==='Em revisão'));assert.equal((await req(admin,'/listings/'+item.id+'/publish',{version:item.version,confirmed:true})).status,409);
 });
 await t.test('withdrawal revokes public media and approval reopening never resurrects snapshot',async()=>{
  await approve();item=(await req(admin,'/listings/'+item.id+'/publish',{version:item.version,confirmed:true})).body;
  const evaluation=(await req(admin,'/evaluations/'+item.id)).body;await req(admin,'/evaluations/'+item.id+'/decision',{version:evaluation.evaluation.version,action:'reopen',reason:'Nova verificação necessária após informação recebida.'});assert.equal((await req(anonymous,'/public/properties')).body.properties.length,0);
  await approve();assert.equal((await req(anonymous,'/public/properties')).body.properties.length,0);item=(await req(admin,'/listings/'+item.id+'/publish',{version:item.version,confirmed:true})).body;
  item=(await req(admin,'/listings/'+item.id+'/unpublish',{version:item.version})).body;assert.equal(item.published,false);assert.equal((await req(anonymous,item.photos[0].url.replace('/api',''))).status,404);
 });
});
