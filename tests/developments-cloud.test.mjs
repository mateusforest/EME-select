import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {createHash} from 'node:crypto';
import {createCloudApi} from '../server/cloud/api.mjs';import {emptyDevelopment,developmentRecordId} from '../shared/development.mjs';
test('cloud development record uses audited versioning and stays outside property workspaces',async t=>{
 const profiles=[{id:'00000000-0000-4000-8000-000000000001',name:'Admin',role:'admin',active:true,must_change:false},{id:'00000000-0000-4000-8000-000000000002',name:'Broker',role:'corretor',active:true,must_change:false}];
 const hash=v=>createHash('sha256').update(v).digest('hex');const tokens=['a'.repeat(43),'b'.repeat(43)];let record=null,reads=0,writes=0;
 const client={request:async()=>{throw Error('Unexpected storage access');},rest:async(path,method='GET')=>{
  if(path.startsWith('eme_sessions?')){const i=tokens.findIndex(v=>path.includes(hash(v)));if(i<0)return [];return [{eme_profiles:profiles[i],expires_at:new Date(Date.now()+3600000).toISOString(),last_seen:new Date().toISOString()}];}
  if(path.startsWith('eme_profiles?'))return profiles;
  if(path.startsWith('eme_cases?')){reads++;if(path.includes('stage=eq.'))return [];return record?[structuredClone(record)]:[];}
  throw Error('Unexpected read '+path);
 },rpc:async(name,body)=>{
  assert.equal(name,'eme_save_case');assert.equal(body.p_id,developmentRecordId);assert.equal(body.p_session,hash(tokens[0]));assert.equal(body.p_version,record?.version||0);
  assert.equal(body.p_assignee,profiles[0].id);assert.ok(body.p_action);record={id:body.p_id,version:(record?.version||0)+1,assignee_id:body.p_assignee,data:structuredClone(body.p_data)};writes++;return structuredClone(record);
 }};
 let api;const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const host='127.0.0.1:'+server.address().port,origin='http://'+host;api=createCloudApi({env:{EME_TEST_HOST:host},client});
 async function req(token,path,body,method=body?'POST':'GET',extra={}){const res=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:token?'eme_cloud_session='+token:'',...extra},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
 const path='/developments/moradas-da-serra';
 assert.equal((await req('',path)).status,401);assert.equal((await req(tokens[1],path)).status,403);assert.equal(reads,0);
 assert.deepEqual((await req('','/public'+path)).body.config.units,[]);
 const config=emptyDevelopment();config.description='Descrição cadastrada pela administração';
 assert.equal((await req(tokens[0],path,{version:0,config},'PATCH',{Origin:'https://untrusted.invalid'})).status,403);
 assert.equal((await req(tokens[0],path,{version:0,config},'PATCH')).status,200);assert.equal(writes,1);
 assert.equal((await req(tokens[0],path,{version:0,config},'PATCH')).status,409);
 assert.notEqual((await req('','/public'+path)).body.config.description,config.description);
 assert.equal((await req(tokens[1],path+'/publish',{version:1,confirmed:true})).status,403);
 assert.equal((await req(tokens[0],path+'/publish',{version:1,confirmed:true})).status,200);
 assert.equal((await req('','/public'+path)).body.config.description,config.description);
 assert.deepEqual((await req(tokens[0],'/evaluations')).body.evaluations,[]);
 assert.deepEqual((await req(tokens[0],'/listings')).body.listings,[]);
 assert.equal((await req(tokens[0],'/evaluations/'+developmentRecordId)).status,404);
 assert.equal((await req(tokens[0],'/listings/'+developmentRecordId)).status,404);
 assert.deepEqual((await req('','/public/properties')).body.properties,[]);
});
