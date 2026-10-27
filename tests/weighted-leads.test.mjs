import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {equalWeights,rebalanceWeights,chooseWeighted} from '../shared/lead-distribution.mjs';
import {routingInput,leadInput} from '../shared/leads.mjs';
import {leadHash} from '../server/leads.mjs';
test('percentage edits preserve 100 and weighted selection stays smooth',()=>{
 assert.deepEqual(equalWeights(['a','b','c']),{a:34,b:33,c:33});
 assert.deepEqual(rebalanceWeights(['a','b'],{a:50,b:50},'a',40),{a:40,b:60});
 assert.deepEqual(rebalanceWeights(['a'],{a:100},'a',20),{a:100});
 const weights={a:40,b:60};let state={},counts={a:0,b:0};
 for(let i=0;i<100;i++){const next=chooseWeighted(['a','b'],weights,state);state=next.state;counts[next.selected]++;assert.ok(Math.abs(counts.a-(i+1)*.4)<1);}
 assert.deepEqual(counts,weights);assert.equal(chooseWeighted(['a'],weights,state).selected,'a');
 const a=randomUUID(),b=randomUUID();assert.throws(()=>routingInput({version:0,mode:'weighted',brokers:[a,b],weights:{[a]:40,[b]:50}}),/100%/);
 assert.equal(routingInput({version:0,mode:'weighted',brokers:[a,b],weights:{[a]:40,[b]:60}}).weights[a],40);
});
test('weighted SQL is replay-safe, restricted, preserves existing leads and routes 40/60 atomically',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 for(const name of ['20260914_portal.sql','20261012_leads.sql','20261025_weighted_leads.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 // Re-running the delivery SQL is safe.
 await db.exec(readFileSync(new URL('../docs/sql/ATIVAR-DISTRIBUICAO-PERCENTUAL.sql',import.meta.url),'utf8'));
 const admin=randomUUID(),a=randomUUID(),b=randomUUID();for(const id of [admin,a,b])await db.query('insert into auth.users values($1)',[id]);await db.query('select public.eme_bootstrap($1,$2,$3)',[admin,'Gestão','admin@example.test']);
 for(const [id,name] of [[a,'A'],[b,'B']])await db.query("insert into public.eme_profiles(id,name,email,role) values($1,$2,$3,'corretor')",[id,name,name+'@example.test']);
 for(const [token,id]of [['admin',admin],['broker',a]])await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[token,id]);
 const route=(token,version,weights)=>db.query('select public.eme_route_leads_v2($1,$2,$3,$4,$5)',[token,version,'weighted',[a,b],JSON.stringify(weights)]);
 await db.exec('set role anon');await assert.rejects(route('admin',0,{[a]:40,[b]:60}),/permission denied/);await db.exec('reset role;set role service_role');
 await assert.rejects(route('broker',0,{[a]:40,[b]:60}),/FORBIDDEN/);
 for(const weights of [{[a]:40,[b]:50},{[a]:-1,[b]:101},{[a]:'40',[b]:60},{[a]:40.5,[b]:59.5},{[a]:40,[randomUUID()]:60}])await assert.rejects(route('admin',0,weights),/LEAD_ROUTING_INVALID/);
 await route('admin',0,{[a]:40,[b]:60});await assert.rejects(route('admin',0,{[a]:50,[b]:50}),/STALE_VERSION/);
 const input=i=>leadInput({requestId:randomUUID(),name:'Teste',phone:'549'+String(i).padStart(8,'0'),interest:'Casa',consent:true});
 const receive=v=>db.query('select public.eme_receive_lead($1,$2,$3,$4)',[v.requestId,leadHash({propertyId:v.propertyId,data:v.data}),v.propertyId,JSON.stringify(v.data)]);
 const contacts=Array.from({length:100},(_,i)=>input(i));
 await Promise.all(contacts.map(receive));
 const counts=(await db.query('select assignee_id,count(*)::int n from public.eme_leads group by assignee_id')).rows;assert.equal(counts.find(r=>r.assignee_id===a).n,40);assert.equal(counts.find(r=>r.assignee_id===b).n,60);
 const before=(await db.query('select distribution_state from public.eme_lead_settings')).rows;
 await receive(contacts[0]);await receive({...contacts[0],requestId:randomUUID()});assert.equal((await db.query('select count(*)::int n from public.eme_leads')).rows[0].n,100);assert.deepEqual((await db.query('select distribution_state from public.eme_lead_settings')).rows,before);
 await db.exec('reset role');await db.query('update public.eme_profiles set must_change=true where id=$1',[b]);await db.exec('set role service_role');await receive(input(200));assert.equal((await db.query('select assignee_id from public.eme_leads where phone=$1',[input(200).data.phone])).rows[0].assignee_id,a);
 await assert.rejects(route('admin',1,{[a]:40,[b]:60}),/LEAD_ROUTING_INVALID/);
 await db.exec('reset role');await db.query('update public.eme_profiles set active=false where id=$1',[a]);await db.exec('set role service_role');const noBroker=input(201);await receive(noBroker);assert.equal((await db.query('select assignee_id from public.eme_leads where id=$1',[noBroker.requestId])).rows[0].assignee_id,null);
});


test('cloud advertises migration readiness and never silently falls back from weighted routing',async()=>{
 const {attachCloudLeads}=await import('../server/cloud/leads.mjs');
 let settings={version:0,mode:'manual',brokers:[]},calls=[],snapshot;
 const api=attachCloudLeads({hashOf:()=> 'session',client:{rest:async path=>path.startsWith('eme_lead_settings')?[settings]:[],rpc:async(name,args)=>calls.push({name,args})}});
 const user={id:randomUUID(),active:true,must_change:false,role:'admin'},broker=randomUUID();
 const send=(_status,value)=>snapshot=value;
 await api.handle('/api/leads',{method:'GET'},user,{},send);
 assert.equal(snapshot.settings.weightedAvailable,false);
 const body={version:0,mode:'weighted',brokers:[broker],weights:{[broker]:100}};
 await assert.rejects(api.handle('/api/leads/settings',{method:'POST'},user,body,send),/atualização do banco/);
 assert.equal(calls.length,0);
 await api.handle('/api/leads/settings',{method:'POST'},user,{version:0,mode:'manual',brokers:[]},send);
 assert.equal(calls.at(-1).name,'eme_route_leads');
 settings={...settings,weights:{}};
 await api.handle('/api/leads/settings',{method:'POST'},user,body,send);
 assert.equal(calls.at(-1).name,'eme_route_leads_v2');
 assert.deepEqual(calls.at(-1).args.p_weights,{[broker]:100});
 assert.equal(snapshot.settings.weightedAvailable,true);
});


test('administrators can receive weighted and round-robin leads without changing roles or bypassing first access',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 for(const name of ['20260914_portal.sql','20261012_leads.sql','20261025_weighted_leads.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 // Production function bodies may have different whitespace than the source files.
 // Reproduce the mismatch that made the previous text-replacement patch abort.
 for(const signature of ['public.eme_receive_lead(uuid,text,uuid,jsonb)','public.eme_route_leads_v2(text,bigint,text,uuid[],jsonb)']){
  const original=(await db.query('select pg_get_functiondef($1::regprocedure) source',[signature])).rows[0].source;
  const formatted=original.replaceAll("p.role='corretor'","p.role = 'corretor'").replaceAll("and role='corretor'","and role = 'corretor'");
  assert.ok(!formatted.includes("role='corretor'"));await db.exec(formatted);
 }
 const delivery=readFileSync(new URL('../docs/sql/ATIVAR-ADMINISTRADOR-CORRETOR.sql',import.meta.url),'utf8');
 await db.exec(delivery);
 const admin=randomUUID(),broker=randomUUID();for(const id of [admin,broker])await db.query('insert into auth.users values($1)',[id]);await db.query('select public.eme_bootstrap($1,$2,$3)',[admin,'Gestor corretor','admin@example.test']);
 await db.query("insert into public.eme_profiles(id,name,email,role) values($1,'Corretor','broker@example.test','corretor')",[broker]);
 await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values('admin',$1,now()+interval '1 hour')",[admin]);
 const route=(version,mode,weights)=>db.query('select public.eme_route_leads_v2($1,$2,$3,$4,$5)',['admin',version,mode,[admin,broker],JSON.stringify(weights)]);
 await route(0,'weighted',{[admin]:60,[broker]:40});
 const receive=async i=>{const v=leadInput({requestId:randomUUID(),name:'Teste',phone:'549'+String(i).padStart(8,'0'),interest:'Casa',consent:true});await db.query('select public.eme_receive_lead($1,$2,$3,$4)',[v.requestId,leadHash({propertyId:v.propertyId,data:v.data}),v.propertyId,JSON.stringify(v.data)]);return v.requestId;};
 await Promise.all(Array.from({length:100},(_,i)=>receive(i)));
 assert.equal((await db.query('select count(*)::int n from public.eme_leads where assignee_id=$1',[admin])).rows[0].n,60);
 assert.equal((await db.query('select role from public.eme_profiles where id=$1',[admin])).rows[0].role,'admin');
 await route(1,'round_robin',{});const ids=[await receive(200),await receive(201)];assert.equal((await db.query('select count(distinct assignee_id)::int n from public.eme_leads where id=any($1)',[ids])).rows[0].n,2);
 await db.query('update public.eme_profiles set must_change=true where id=$1',[admin]);const last=await receive(202);assert.equal((await db.query('select assignee_id from public.eme_leads where id=$1',[last])).rows[0].assignee_id,broker);
 const preserved={settings:(await db.query('select * from public.eme_lead_settings')).rows,leads:(await db.query('select * from public.eme_leads order by id')).rows,profiles:(await db.query('select * from public.eme_profiles order by id')).rows};
 await db.exec(delivery);
 assert.deepEqual((await db.query('select * from public.eme_lead_settings')).rows,preserved.settings);
 assert.deepEqual((await db.query('select * from public.eme_leads order by id')).rows,preserved.leads);
 assert.deepEqual((await db.query('select * from public.eme_profiles order by id')).rows,preserved.profiles);
 for(const role of ['anon','authenticated'])for(const signature of ['public.eme_receive_lead(uuid,text,uuid,jsonb)','public.eme_route_leads_v2(text,bigint,text,uuid[],jsonb)','public.eme_route_leads(text,bigint,text,uuid[])'])assert.equal((await db.query('select has_function_privilege($1,$2,$3) allowed',[role,signature,'execute'])).rows[0].allowed,false);

});
