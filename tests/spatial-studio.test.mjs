import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {initialSpatialProject,estimateSpatialProject,validateSpatialProject,applySpatialScope} from '../shared/spatial-studio.mjs';
import {attachLocalSpatial,createSpatialApi,attachCloudSpatial} from '../server/spatial-studio.mjs';
import {requestSpatialPlan} from '../server/spatial-ai.mjs';
test('estimates separate effort, team time, price, waiver and platform investment',()=>{
 const p=initialSpatialProject(),r=estimateSpatialProject(p);
 assert.equal(r.remainingHours,140);assert.equal(r.weeks,4);assert.equal(r.payable,0);
 const team=estimateSpatialProject({...p,people:4});assert.ok(team.weeks<r.weeks);assert.equal(team.cost,r.cost);
 assert.equal(estimateSpatialProject({...p,platformInvestment:100000}).price,r.price);
 assert.equal(estimateSpatialProject({...p,reductionTarget:0}).remainingHours,200);
 assert.equal(applySpatialScope(p,'full','signature').manualHours,2276);
 for(const update of [{manualHours:NaN},{reductionTarget:1},{people:0},{tax:.4,margin:.6},{level:'unknown'},{plan:{summary:'x',steps:['x'],risks:100}}])assert.throws(()=>validateSpatialProject({...p,...update}));
});
test('private studio persists versioned drafts; AI plan does not silently mutate or generate scenes',async()=>{
 const db=new DatabaseSync(':memory:');let calls=0;
 const api=attachLocalSpatial({db,transaction:fn=>fn(),stamp:()=>new Date().toISOString(),ai:{studioStatus:async()=>({configured:true,enabled:true}),studioPlan:async()=>{calls++;return {summary:'Plano',steps:['Conferir medidas'],risks:'Sem CAD'};}}});
 const admin={id:randomUUID(),role:'admin'};let result;
 const call=(path,method,body,user=admin)=>api.handle(path,{method},{},user,body,(status,value)=>{result={status,value};});
 await assert.rejects(call('/api/spatial-studio','GET',null,{role:'corretor'}),e=>e.status===403);
 await call('/api/spatial-studio','POST',{project:initialSpatialProject()});const id=result.value.id;assert.equal(result.status,201);
 await assert.rejects(call('/api/spatial-studio/'+id,'PATCH',{version:0,project:initialSpatialProject()}),e=>e.status===409);
 await call('/api/spatial-studio/'+id+'/plan','POST',{version:1});assert.equal(calls,1);assert.equal(result.value.sourceVersion,1);
 await call('/api/spatial-studio','GET');assert.equal(result.value.projects[0].project.plan,null);assert.equal(result.value.productionReady,false);
 await call('/api/spatial-studio/'+id,'PATCH',{version:1,project:{...initialSpatialProject(),name:'G400 salvo'}});assert.equal(result.value.version,2);
 db.close();
});
test('AI sends minimal project brief, validates completion and does not transmit costs or images',async()=>{
 let payload;const output={summary:'Plano revisável',steps:['Conferir planta'],risks:'Medidas a confirmar'};
 const fetcher=async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]})};};
 const result=await requestSpatialPlan({apiKey:'test',model:'test-model',project:initialSpatialProject(),fetcher});assert.deepEqual(result,output);
 assert.equal(payload.store,false);assert.deepEqual(Object.keys(JSON.parse(payload.input)),['name','level','scope','brief']);
 await assert.rejects(requestSpatialPlan({apiKey:'test',model:'test',project:initialSpatialProject(),fetcher:async()=>({ok:true,json:async()=>({status:'incomplete'})})}));
});
test('cloud studio adapter uses dedicated table and authenticated save RPC',async()=>{
 const row={id:randomUUID(),version:1,data:initialSpatialProject(),updated_at:'2026-09-29'};let write;
 const api=attachCloudSpatial({client:{rest:async()=>[row],rpc:async(name,payload)=>{write={name,payload};return {...row,version:2};}},hashOf:()=> 'session-hash',ai:{studioStatus:async()=>({configured:false})}});
 let result;await api.handle('/api/spatial-studio/'+row.id,{method:'PATCH'},{},{role:'admin'},{version:1,project:initialSpatialProject()},(status,value)=>{result=value;});
 assert.equal(write.name,'eme_spatial_save');assert.equal(write.payload.p_session,'session-hash');assert.equal(result.version,2);
});
test('spatial schema denies public reads and broker writes, checks sessions and stale versions',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 await db.exec(readFileSync(new URL('../supabase/migrations/20260914_portal.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20260929_spatial_studio.sql',import.meta.url),'utf8'));
 const admin=randomUUID(),broker=randomUUID(),id=randomUUID();
 for(const uid of [admin,broker])await db.query('insert into auth.users values($1)',[uid]);
 await db.query('select public.eme_bootstrap($1,$2,$3)',[admin,'Admin','admin@test.invalid']);
 await db.query("insert into public.eme_profiles(id,name,email,role) values($1,'Broker','broker@test.invalid','corretor')",[broker]);
 for(const [token,uid] of [['admin',admin],['broker',broker]])await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[token,uid]);
 const save=(session,version)=>db.query('select * from public.eme_spatial_save($1,$2,$3,$4)',[session,id,version,JSON.stringify(initialSpatialProject())]);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from public.eme_spatial_projects'),/permission denied/);await assert.rejects(save('admin',0),/permission denied/);await db.exec('reset role');}
 await db.exec('set role service_role');await assert.rejects(save('missing',0),/UNAUTHORIZED/);await assert.rejects(save('broker',0),/FORBIDDEN/);
 assert.equal((await save('admin',0)).rows[0].version,1);await assert.rejects(save('admin',0),/STALE_VERSION/);assert.equal((await save('admin',1)).rows[0].version,2);
});
