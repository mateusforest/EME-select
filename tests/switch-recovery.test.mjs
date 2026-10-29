import test from 'node:test';
import assert from 'node:assert/strict';
import {attachSwitchAutopilot} from '../server/cloud/switch-autopilot.mjs';
import {queueSwitchInvite} from '../server/cloud/switch-queue.mjs';
const env={SWITCH_AUTOPILOT_ENABLED:'true',SWITCH_WHATSAPP_ENABLED:'true',SWITCH_INVITE_SECRET:'synthetic-recovery-secret-at-least-32-characters',SWITCH_DEFAULT_BROKERAGE_BPS:'500',SWITCH_DEFAULT_SHARE_BPS:'3000'};
test('recovers the committed invitation after queue failure without duplicating or resetting messages',async()=>{
 const saved=[],jobs=[];let failOnce=true;
 const buyer={id:'4da1ca67-d938-47ee-9d4a-0d53cd2d0a89',kind:'buy',status:'qualified',demand_reviewed:true,city:'Vacaria',property_type:'Casa',asking_cents:65000000};
 const offer={id:'3e6ddfa5-8aaa-4e10-b6ac-d155c52f8476',partner:'Synthetic',ref:'1',city:'Vacaria',property_type:'Casa',price_cents:58000000,authorization_confirmed:true,available:true,updated_at:new Date().toISOString()};
 const pro={id:'e2e945d3-0e4d-4d6e-83cb-ecf876538d3c',city:'Vacaria',property_type:'Casa',phone:'5554999999999',status:'verified',whatsapp_opt_in:true};
 const client={rest:async path=>{
  if(path.startsWith('eme_switch_requests?'))return [buyer];
  if(path.startsWith('eme_switch_partner_offers?'))return [offer];
  if(path.startsWith('eme_switch_professionals?'))return [pro];
  if(path.startsWith('eme_switch_deal_invites?'))return saved;
  if(path.startsWith('eme_switch_outbox?'))return jobs;
  throw Error(path);
 },request:async(path,{body})=>{
  if(path.includes('/eme_switch_outbox?')){if(failOnce){failOnce=false;throw Error('temporary failure');}if(jobs.some(j=>j.id===body.id))return [];jobs.push(body);return [body];}
  if(saved.length)return [];saved.push(body);return [body];
 }};
 const service=attachSwitchAutopilot({client,env});
 await assert.rejects(service.run(),/temporary failure/);
 assert.equal(saved.length,1);assert.equal(jobs.length,0);
 assert.equal((await service.run()).created,1);
 assert.equal(saved.length,1);assert.equal(jobs.length,1);assert.equal(jobs[0].deal_id,saved[0].id);
 jobs[0].status='submitted';
 assert.equal((await service.run()).created,0);assert.equal(jobs[0].status,'submitted');
});
test('concurrent recovery chooses one queue slot even when recipient selection differs',async()=>{
 const jobs=[];const client={rest:async()=>[],request:async(_,{body})=>{if(jobs.some(j=>j.id===body.id))return [];jobs.push(body);return [body];}};
 const result=await Promise.all(['a','b'].map(id=>queueSwitchInvite(client,{id:'deal'},{id,phone:'synthetic'})));
 assert.equal(result.filter(Boolean).length,1);assert.equal(jobs.length,1);
});
