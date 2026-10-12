import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {createCloudApi} from '../server/cloud/api.mjs';
test('cloud lead HTTP keeps public receipts minimal and reads scoped to the signed-in broker',async t=>{
 const broker={id:randomUUID(),name:'Corretor',role:'corretor',active:true,must_change:false},admin={...broker,id:randomUUID(),role:'admin'},id=randomUUID(),token='b'.repeat(43),adminToken='a'.repeat(43),hash=s=>createHash('sha256').update(s).digest('hex');
 const lead={id,version:1,assignee_id:broker.id,data:{name:'Contato privado'},status:'new'};let captured;
 const client={request:async()=>{throw Error('No direct storage access');},rest:async path=>{
  if(path.startsWith('eme_sessions?'))return [{eme_profiles:path.includes(hash(token))?broker:admin,expires_at:new Date(Date.now()+3600000).toISOString(),last_seen:new Date().toISOString()}];
  if(path.startsWith('eme_leads?')){assert.match(path,new RegExp('assignee_id=eq.'+broker.id));return [lead];}
  if(path.startsWith('eme_profiles?')){assert.match(path,new RegExp('id=eq.'+broker.id));return [broker];}
  if(path.startsWith('eme_lead_events?')){assert.match(path,new RegExp('eme_leads.assignee_id=eq.'+broker.id));return [{id:randomUUID(),lead_id:id,action:'received',detail:{message:'Privado'}}];}
  throw Error(path);
 },rpc:async(name,body)=>{if(name==='eme_limit')return true;assert.equal(name,'eme_receive_lead');captured=body;return body.p_id;}};
 let api;const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const host='127.0.0.1:'+server.address().port,origin='http://'+host;api=createCloudApi({env:{EME_TEST_HOST:host},client});
 async function request(path,body,session=''){const res=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:session?'eme_cloud_session='+session:''},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:await res.json()};}
 assert.equal((await request('/leads')).status,401);
 const snapshot=await request('/leads',null,token);assert.equal(snapshot.status,200);assert.equal(snapshot.body.settings,null);assert.equal(snapshot.body.leads[0].events.length,1);assert.equal(snapshot.body.members.length,1);
 assert.equal((await request('/leads/settings',{version:0,mode:'manual',brokers:[]},token)).status,403);
 const input={requestId:randomUUID(),name:'Visitante',phone:'54999990000',interest:'Casa',message:'Quero conversar.',consent:true,source:{page:'/#/'}};
 const receipt=await request('/public/leads',input);assert.equal(receipt.status,201);assert.deepEqual(receipt.body,{reference:input.requestId,received:true});assert.equal(captured.p_data.phone,'5554999990000');assert.equal(captured.p_data.assigneeId,undefined);assert.match(captured.p_hash,/^[a-f0-9]{64}$/);
 assert.equal((await request('/public/leads',{...input,status:'won'})).status,400);
});
