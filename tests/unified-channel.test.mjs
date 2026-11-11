import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';import {PGlite} from '@electric-sql/pglite';
import {advanceChannel,attachUnifiedChannel} from '../server/cloud/unified-channel.mjs';
import {createChannelTools,forms} from '../server/cloud/channel-tools.mjs';
const admin={id:'00000000-0000-4000-8000-000000000001',name:'Admin',role:'admin',active:true,must_change:false},broker={...admin,id:'00000000-0000-4000-8000-000000000002',name:'Broker',role:'corretor'};
const phone='5554984007919',visitor='555499902688',brokerPhone='5554981037089';
test('conversation switches modes, requires consent, pauses, and confirms staff changes',async()=>{
 let state={},writes=0,queries=0;const tools={actor:async()=>admin,prepare:async()=>({}),execute:async()=>{writes++;return {reference:'record'};},clientLead:async()=>{writes++;return {reference:'lead',notificationQueued:true};},query:async()=>{queries++;return 'Scoped';}};
 const ai={channelConversation:async()=>({answers:{objetivo:'Comprar',regiao:'Vacaria',tipo:'Apartamento',orcamento:'450 mil',prazo:'6 meses'},reply:'Resumo'})};const support=async()=>({reply:'Equipe'});
 const send=async text=>{const r=await advanceChannel({state,phone,text,event:randomUUID(),tools,ai,support});state=r.state;return r.result;};
 await send('Olá');assert.equal(state.status,'confirm');assert.equal(writes,0);await send('SIM');assert.equal(writes,1);await send('SIM');assert.equal(writes,1);
 await send('EQUIPE');assert.equal(state.mode,'staff');await send('CONSULTAR LEADS');assert.equal(queries,1);
 await send('CADASTRAR IMÓVEL');for(const s of ['Casa piloto','Vacaria','Casa','Venda','PULAR'])await send(s);await send('PRONTO');assert.equal(state.flow.confirm,true);assert.equal(writes,1);await send('SIM');assert.equal(writes,2);
 await send('CLIENTE');assert.equal(state.mode,'client');await send('PARAR');assert.equal((await send('olá')).reply,'');await send('EQUIPE');assert.equal(state.status,'active');
 await send('CADASTRAR LEAD');await send('CLIENTE');assert.equal(state.flow,null);
});
test('bridge rejects non-pilot numbers and credentials before accessing data',async()=>{
 const bridge=attachUnifiedChannel({client:{},ai:{},env:{EME_STAFF_WHATSAPP_ENABLED:'true',EME_STAFF_WHATSAPP_TOKEN:'x'.repeat(64)}}).bridge;
 await assert.rejects(bridge('/api/integrations/eme-channel/message',{method:'POST',headers:{}},{},()=>{}),e=>e.status===401);
 await assert.rejects(bridge('/api/integrations/eme-channel/message',{method:'POST',headers:{authorization:'Bearer '+'x'.repeat(64)}},{phone:'5554999999999',sessionId:'eme-oficial-8029'},()=>{}),e=>e.status===403);
 assert.throws(()=>forms.lead[1][2]('54999999999'),/teste/);assert.throws(()=>forms.finance[2][2]('1.00'),/reais/);
});
test('real database: cloud leads, property, visit, finance, notification dedupe and permission boundaries',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 for(const file of ['20260914_portal','20260916_finance','20260916_operations','20261012_leads','20261026_buyer_qualification','20261109_staff_whatsapp','20261109_whatsapp_inbox','20261109_unified_channel','20261109_channel_notifications','20261111154441_whatsapp_registration_materials'])await db.exec(readFileSync(new URL('../supabase/migrations/'+file+'.sql',import.meta.url),'utf8'));
 for(const u of [admin,broker]){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into eme_profiles(id,name,email,role,active,must_change) values($1,$2,$3,$4,true,false)',[u.id,u.name,u.name+'@example.invalid',u.role]);}
 for(const [p,u]of [[phone,admin],[visitor,admin],[brokerPhone,broker]])await db.query('insert into eme_staff_wa_links(phone,user_id) values($1,$2)',[p,u.id]);
 // Minimal PostgREST adapter; real SQL functions and domain validation run unchanged.
 const rest=async(path,method='GET',body)=>{
 const [table,qs]=path.split('?');assert.match(table,/^eme_[a-z_]+$/);
 if(method==='POST'){const keys=Object.keys(body);return (await db.query('insert into '+table+' ('+keys.join(',')+') values ('+keys.map((_,i)=>'$'+(i+1)).join(',')+') returning *',Object.values(body))).rows;}
 const params=new URLSearchParams(qs),where=[],args=[];
 for(const [k,v]of params){if(['select','order','limit'].includes(k)||k.includes('->'))continue;if(v==='is.null'){where.push(k+' is null');continue;}if(v.startsWith('eq.')){assert.match(k,/^[a-z_]+$/);args.push(v.slice(3));where.push(k+'=$'+args.length);}}
 return (await db.query((method==='DELETE'?'delete from ':'select * from ')+table+(where.length?' where '+where.join(' and '):''),args)).rows;
 };
 const rpc=async(name,args)=>{assert.match(name,/^eme_[a-z_]+$/);const keys=Object.keys(args);return (await db.query('select '+name+'('+keys.map((k,i)=>k+'=> $'+(i+1)).join(',')+') as r',Object.values(args))).rows[0].r;};
 const uploads=[];const tools=createChannelTools({client:{rest,rpc,request:async(path)=>{uploads.push(path);}}}),count=async table=>(await db.query('select count(*)::int n from '+table)).rows[0].n;
 const s={reference:randomUUID(),answers:{nome:'Teste autorizado'},brief:'Apartamento em Vacaria.'};const lead=await tools.clientLead(visitor,s);assert.equal(lead.reference,s.reference);assert.equal(lead.notificationQueued,true);await tools.clientLead(visitor,s);assert.equal(await count('eme_leads'),1);assert.equal(await count('eme_inbox_outbox'),1);
 const flow={kind:'property',id:randomUUID(),values:{title:'Casa teste',city:'Vacaria',type:'Casa',operation:'Venda',owner:'Teste'}};await tools.execute(brokerPhone,flow,broker);await tools.execute(brokerPhone,flow,broker);assert.equal(await count('eme_cases'),1);assert.equal((await rest('eme_cases'))[0].assignee_id,broker.id);
 const visit={kind:'visit',id:randomUUID(),values:{propertyId:flow.id,visitorName:'Visitante teste',visitorPhone:visitor,startAt:new Date(Date.now()+3600000).toISOString(),duration:30,notify:true}};await tools.execute(brokerPhone,visit,broker);assert.equal((await rest('eme_operations_state'))[0].data.visits.length,1);
 const finance={kind:'finance',id:randomUUID(),values:{description:'Despesa piloto',category:'marketing',amountCents:10000,competenceDate:'2026-11-09',dueDate:'2026-11-10'}};
 await assert.rejects(tools.execute(brokerPhone,finance,broker),e=>e.status===403);await tools.execute(phone,finance,admin);assert.equal((await rest('eme_finance_state'))[0].data.entries[0].status,'open');assert.equal(await count('eme_sessions'),0);
 const manual={kind:'lead',id:randomUUID(),values:{name:'Teste autorizado',phone:visitor,message:'Interesse',permission:true}};const existing=await tools.execute(phone,manual,admin);assert.equal(existing.reference,s.reference);assert.equal(await count('eme_leads'),1);

 const operation=(await rest('eme_operations_state'))[0];operation.data.visits[0].status='confirmed';await db.query("update eme_operations_state set data=$1,version=version+1 where id='company'",[operation.data]);
 const beforeReminders=await count('eme_inbox_outbox');await rpc('eme_channel_reminders',{});const afterReminders=await count('eme_inbox_outbox');assert.equal(afterReminders,beforeReminders+2);await rpc('eme_channel_reminders',{});assert.equal(await count('eme_inbox_outbox'),afterReminders);
 await db.query("update eme_leads set status='in_progress',assignee_id=$1,version=version+1 where id=$2",[broker.id,s.reference]);assert.equal(await count('eme_inbox_outbox'),afterReminders+2);
 assert.equal((await db.query("select count(*)::int n from eme_inbox_outbox where body like '%financeiro%' and phone=$1",[brokerPhone])).rows[0].n,0);
 await db.query('update eme_profiles set active=false where id=$1',[broker.id]);assert.equal(await tools.actor(brokerPhone),null);await assert.rejects(tools.execute(brokerPhone,{...flow,id:randomUUID()},broker));await db.query('update eme_profiles set active=true where id=$1',[broker.id]);
 const materialFlow=await tools.openProperty(flow.id,broker);const attachment=await tools.receiveMaterial(brokerPhone,'file-test',materialFlow,broker,{mime:'text/plain',name:'ficha.txt',content:Buffer.from('Casa em Vacaria').toString('base64')});materialFlow.materialIds=[attachment.id];
 const sharp=(await import('sharp')).default;const photoBytes=await sharp({create:{width:800,height:600,channels:3,background:'#123456'}}).png().toBuffer();const photo=await tools.receiveMaterial(brokerPhone,'photo-test',materialFlow,broker,{mime:'image/png',name:'casa.png',content:photoBytes.toString('base64')});materialFlow.materialIds.push(photo.id);
 assert.equal((await rest('eme_channel_materials'))[0].case_id,null);const updated=await tools.execute(brokerPhone,materialFlow,broker);assert.equal(updated.reference,flow.id);assert.equal(await count('eme_cases'),1);assert.equal((await rest('eme_channel_materials'))[0].case_id,flow.id);await tools.execute(brokerPhone,materialFlow,broker);assert.equal(await count('eme_channel_materials'),2);assert.equal(uploads.length,1);assert.equal((await rest('eme_cases?id=eq.'+flow.id))[0].data.photos.length,1);
 await assert.rejects(tools.openProperty(flow.id,{...admin,id:admin.id,role:'corretor'}),e=>e.status===403);
 const stale=await tools.openProperty(flow.id,broker);await db.query('update eme_cases set version=version+1 where id=$1',[flow.id]);await assert.rejects(tools.execute(brokerPhone,stale,broker),e=>e.status===409);
 const turnArgs={p_phone:visitor,p_event:'event1',p_hash:'a'.repeat(64)};const begin=await rpc('eme_channel_turn',{...turnArgs,p_action:'begin'});await assert.rejects(rpc('eme_channel_turn',{...turnArgs,p_event:'event2',p_action:'begin'}),/STALE_VERSION/);
 const result={reply:'Pausado'};await rpc('eme_channel_turn',{...turnArgs,p_action:'finish',p_lock:begin.lock,p_state:{mode:'client',status:'stopped'},p_result:result});assert.deepEqual((await rpc('eme_channel_turn',{...turnArgs,p_action:'begin'})).cached,result);
 assert.equal(await rpc('eme_channel_notify',{p_id:randomUUID(),p_phone:visitor,p_body:'Should not send',p_actor:admin.id}),false);
 assert.equal((await db.query("select count(*)::int n from eme_inbox_outbox where phone=$1 and status='queued' and source='automatic'",[visitor])).rows[0].n,0);
 assert.equal(await rpc('eme_channel_notify',{p_id:randomUUID(),p_phone:'5554999999999',p_body:'Outside pilot',p_actor:admin.id}),false);
 await db.exec('set role anon');await assert.rejects(db.query('select * from eme_channel_actions'),/permission denied/);await assert.rejects(rpc('eme_channel_turn',{...turnArgs,p_action:'begin'}),/permission denied/);await db.exec('reset role');
});

test('direct registration works from client mode only for linked accounts and still requires SIM',async()=>{
 let state={},saved=0,linked=true;const tools={actor:async()=>linked?admin:null,prepare:async()=>({}),execute:async()=>{saved++;return {reference:'registered'};}};
 const send=async text=>{const r=await advanceChannel({state,phone,text,event:randomUUID(),tools,ai:{},support:async()=>({reply:''})});state=r.state;return r.result;};
 assert.match((await send('cadastro')).reply,/CADASTRAR IMÓVEL/);await send('CLIENTE');
 await send('Preciso de ajuda para cadastrar um imóvel');assert.equal(state.mode,'staff');assert.equal(state.flow.kind,'property');
 for(const value of ['Casa de teste','Vacaria','Casa','Venda','PULAR'])await send(value);
 await send('PRONTO');assert.equal(saved,0);assert.equal(state.flow.confirm,true);await send('SIM');assert.equal(saved,1);
 await send('CLIENTE');await send('cadastrar cliente');assert.equal(state.flow.kind,'lead');await send('CANCELAR');assert.equal(state.flow,null);
 await send('CLIENTE');linked=false;assert.match((await send('cadastrar imóvel')).reply,/vincule/);assert.equal(state.flow,null);assert.equal(saved,1);
 await send('PARAR');linked=true;assert.equal((await send('cadastrar imóvel')).reply,'');assert.equal(state.flow,null);
});
