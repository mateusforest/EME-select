import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {createPortalApi} from '../server/portal-api.mjs';
import {createCloudApi} from '../server/cloud/api.mjs';
import {peopleRecordId} from '../server/people.mjs';
import {prepareEnlargement} from '../server/photo-preparation.mjs';
import {requestAnalysis,aiProjection} from '../server/intelligence.mjs';

for(const backend of ['local','cloud'])test(backend+': people drafts, portrait privacy, publication, ordering and optimistic lock',async t=>{
 const images=new Map(),rows=new Map();const profiles=[{id:randomUUID(),role:'admin',name:'Admin',active:true,must_change:false},{id:randomUUID(),role:'corretor',name:'Broker',active:true,must_change:false}];
 const tokens=['a'.repeat(43),'b'.repeat(43)];const digest=v=>createHash('sha256').update(v).digest('hex');
 const client={rest:async(path,method='GET')=>{
  if(path.startsWith('eme_sessions?')){const index=tokens.findIndex(v=>path.includes(digest(v)));return index<0?[]:[{eme_profiles:profiles[index],expires_at:new Date(Date.now()+3600000).toISOString(),last_seen:new Date().toISOString()}];}
  if(path.startsWith('eme_profiles?'))return profiles;
  if(path.startsWith('eme_cases?')){if(path.includes('stage=eq.'))return [];const id=path.match(/id=eq.([a-f0-9-]{36})/)?.[1];return id?(rows.has(id)?[structuredClone(rows.get(id))]:[]):[...rows.values()];}
  throw Error('Unexpected read '+path);
 },rpc:async(name,body)=>{if(name==='eme_limit')return;assert.equal(name,'eme_save_case');const old=rows.get(body.p_id);assert.equal(body.p_version,old?.version||0);assert.equal(body.p_session,digest(tokens[0]));const row={id:body.p_id,version:(old?.version||0)+1,assignee_id:body.p_assignee,data:structuredClone(body.p_data)};rows.set(row.id,row);return structuredClone(row);},request:async(path,options={})=>{
  const file=path.split('/').pop();if(options.method==='POST'){images.set(file,options.body);return {};}
  if(options.method==='DELETE'){for(const name of options.body.prefixes)images.delete(name);return {};}
  if(!images.has(file))throw Error('Missing image');return {arrayBuffer:async()=>images.get(file)};
 }};
 let app;const server=http.createServer((req,res)=>app.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const host='127.0.0.1:'+server.address().port,origin='http://'+host;
 app=backend==='local'?createPortalApi({dbPath:':memory:'}):createCloudApi({env:{EME_TEST_HOST:host},client});t.after(async()=>{await new Promise(r=>server.close(r));app.close?.();});
 const admin={cookie:backend==='cloud'?'eme_cloud_session='+tokens[0]:''},broker={cookie:backend==='cloud'?'eme_cloud_session='+tokens[1]:''},anon={};
 async function req(who,path,body,method=body?'POST':'GET'){const res=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,Cookie:who.cookie||'','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(res.headers.get('set-cookie'))who.cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,body:res.headers.get('content-type')?.includes('application/json')?await res.json():Buffer.from(await res.arrayBuffer())};}
 if(backend==='local'){const password='People-test-only-2026!';await req(admin,'/auth/setup',{name:'Admin',email:'admin@example.test',password});await req(admin,'/users',{name:'Broker',email:'broker@example.test',password,role:'corretor'});await req(broker,'/auth/login',{email:'broker@example.test',password});await req(broker,'/auth/password',{currentPassword:password,newPassword:password+'2'});}
 assert.equal((await req(anon,'/people')).status,401);assert.equal((await req(broker,'/people')).status,403);assert.deepEqual((await req(anon,'/public/people')).body,{people:[]});
 let record=(await req(admin,'/people')).body;const bytes=await sharp({create:{width:500,height:700,channels:3,background:'#456557'}}).jpeg().withMetadata().toBuffer();
 assert.equal((await req(admin,'/people/images',{version:0,content:'data:image/png;base64,ZmFrZQ=='})).status,400);
 const upload=await req(admin,'/people/images',{version:record.version,content:'data:image/jpeg;base64,'+bytes.toString('base64')});assert.equal(upload.status,201,JSON.stringify(upload.body));record=upload.body;
 const imageUrl=record.imageUrl,photoPath=imageUrl.replace('/api','');assert.notEqual((await req(anon,photoPath)).status,200);assert.equal((await req(broker,photoPath)).status,403);
 const stored=await req(admin,photoPath);assert.equal(stored.status,200);assert.equal((await sharp(stored.body).metadata()).exif,undefined);
 const people=[{id:randomUUID(),name:'Pessoa exemplo',role:'Consultor imobiliário',photoUrl:imageUrl,bio:'Atendimento e acompanhamento de imóveis.',registration:'CRECI de teste'},{id:randomUUID(),name:'Diretora exemplo',role:'Diretora',photoUrl:imageUrl,bio:'',registration:''}];
 const saved=await req(admin,'/people',{version:record.version,people},'PATCH');assert.equal(saved.status,200,JSON.stringify(saved.body));record=saved.body;
 assert.equal((await req(admin,'/people',{version:record.version-1,people},'PATCH')).status,409);assert.deepEqual((await req(anon,'/public/people')).body.people,[]);
 assert.equal((await req(admin,'/people/publish',{version:record.version})).status,400);
 record=(await req(admin,'/people/publish',{version:record.version,confirmed:true})).body;
 assert.equal((await req(anon,photoPath)).status,200);assert.deepEqual((await req(anon,'/public/people')).body.people,people);
 record=(await req(admin,'/people',{version:record.version,people:[...people].reverse()},'PATCH')).body;
 assert.deepEqual((await req(anon,'/public/people')).body.people,people);
 record=(await req(admin,'/people/publish',{version:record.version,confirmed:true})).body;
 assert.deepEqual((await req(anon,'/public/people')).body.people,[...people].reverse());
 assert.deepEqual((await req(admin,'/evaluations')).body.evaluations,[]);assert.deepEqual((await req(admin,'/listings')).body.listings,[]);
 if(backend==='cloud')assert.equal((await req(admin,'/evaluations/'+peopleRecordId)).status,404);
 assert.equal((await req(admin,'/people',{version:record.version,people:[{...people[0],photoUrl:'/api/people-images/'+randomUUID()}]},'PATCH')).status,400);
 assert.equal((await req(admin,'/people/unpublish',{version:record.version})).status,200);assert.deepEqual((await req(anon,'/public/people')).body.people,[]);assert.notEqual((await req(anon,photoPath)).status,200);
 if(backend==='cloud'){
  const listingId=randomUUID(),sourceId=randomUUID(),originalId=randomUUID();
  rows.set(listingId,{id:listingId,version:7,assignee_id:profiles[0].id,data:{draft:{},photos:[{id:sourceId,originalId}]}});
  images.set(originalId+'.webp',await sharp({create:{width:900,height:1600,channels:3,background:'#123456'}}).webp().toBuffer());
  const endpoint='/listings/'+listingId+'/prepare-photo',body={version:7,sourceId};
  assert.equal((await req(anon,endpoint,body)).status,401);assert.equal((await req(broker,endpoint,body)).status,404);
  assert.equal((await req(admin,endpoint,{...body,version:6})).status,409);assert.equal((await req(admin,endpoint,{...body,sourceId:randomUUID()})).status,404);
  const prepared=await req(admin,endpoint,body);assert.equal(prepared.status,200,JSON.stringify(prepared.body));assert.equal(prepared.body.width,1800);assert.equal(prepared.body.height,3200);assert.equal(rows.get(listingId).version,7);
 }
});

test('photo preparation doubles portrait and landscape without browser AI or crop, rejects invalid and oversized input',async()=>{
 for(const [width,height] of [[900,1600],[1600,1200]]){const bytes=await sharp({create:{width,height,channels:3,background:'#456557'}}).jpeg().withMetadata().toBuffer();const start=performance.now();const result=await prepareEnlargement(bytes);const info=await sharp(Buffer.from(result.content.split(',')[1],'base64')).metadata();assert.equal(info.width,width*2);assert.equal(info.height,height*2);assert.equal(info.exif,undefined);assert.equal(result.method,'lanczos3-2x');console.log(width+'x'+height+' prepared in '+Math.round(performance.now()-start)+' ms');}
 await assert.rejects(prepareEnlargement(Buffer.from('invalid')),/Reenvie/);
 const large=await sharp({create:{width:3200,height:1800,channels:3,background:'#fff'}}).jpeg().toBuffer();await assert.rejects(prepareEnlargement(large),/resolução suficiente/);
});

test('editorial output has finished highlights and rejects writer instructions',async()=>{
 const context=aiProjection({data:{type:'Casa',draft:{description:'Suíte com closet e cozinha integrada.'}}});let payload;
 const complete={summary:'Apresentação organizada',recommendation:'acao_sugerida',draftReply:'A casa reúne suíte com closet e cozinha integrada à sala. Os ambientes conectados aproximam as atividades do dia a dia.',strengths:['Suíte com closet'],highlights:['Integração entre sala e cozinha'],nextActions:[],pending:['Conferir os itens incluídos na venda.']};
 const run=value=>requestAnalysis({apiKey:'fake',model:'gpt-6-astra',task:'atendimento',context,instruction:'',editorial:true,fetcher:async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};}});
 const answer=await run(complete);assert.deepEqual(answer.result.highlights,complete.highlights);assert.ok(payload.text.format.schema.required.includes('highlights'));assert.match(payload.instructions,/texto.*fina|textos finais/);
 for(const line of ['Destacar a suíte com closet','Apresentar a cozinha','Valorizar editorialmente os pátios','Evidenciar os aparelhos instalados','Mencionar os painéis solares','Recomenda-se destacar a suíte'])await assert.rejects(run({...complete,highlights:[line]}),/orientações/);
 await assert.rejects(run({...complete,highlights:undefined}),/formato/);
});
