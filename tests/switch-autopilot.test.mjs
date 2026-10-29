import test from 'node:test';
import assert from 'node:assert/strict';
import {switchAutopilotSettings,attachSwitchAutopilot} from '../server/cloud/switch-autopilot.mjs';
const env={
 SWITCH_AUTOPILOT_ENABLED:'true',SWITCH_WHATSAPP_ENABLED:'true',
 SWITCH_INVITE_SECRET:'chave-sintetica-com-muito-mais-de-trinta-e-dois-caracteres',
 SWITCH_DEFAULT_BROKERAGE_BPS:'500',SWITCH_DEFAULT_SHARE_BPS:'3000'
};
test('autopiloto comercial é bloqueado por padrão e sem percentuais válidos',()=>{
 assert.equal(switchAutopilotSettings({}).enabled,false);
 assert.equal(switchAutopilotSettings({...env,SWITCH_AUTOPILOT_ENABLED:'false'}).enabled,false);
 assert.equal(switchAutopilotSettings({...env,SWITCH_DEFAULT_SHARE_BPS:'20000'}).enabled,false);
 assert.equal(switchAutopilotSettings(env).enabled,true);
});
test('gera no máximo uma proposta idempotente para demanda qualificada e oferta parceira revisada',async()=>{
 const buyer={id:'4da1ca67-d938-47ee-9d4a-0d53cd2d0a89',kind:'buy',status:'qualified',demand_reviewed:true,city:'Vacaria',property_type:'Casa',asking_cents:65000000};
 const offer={id:'3e6ddfa5-8aaa-4e10-b6ac-d155c52f8476',partner:'Construtora Demo',ref:'COD100',title:'Casa modelo',
   city:'Vacaria',property_type:'Casa',price_cents:58000000,authorization_confirmed:true,
   available:true,updated_at:new Date().toISOString()};
 const pro={id:'e2e945d3-0e4d-4d6e-83cb-ecf876538d3c',city:'Vacaria',property_type:'Casa',
   phone:'5554999999999',status:'verified',whatsapp_opt_in:true};
 const saved=[],jobs=[];
 const client={
  rest:async(path,method='GET',body)=>{
   if(path.startsWith('eme_switch_requests?'))return [buyer];
   if(path.startsWith('eme_switch_partner_offers?'))return [offer];
   if(path.startsWith('eme_switch_professionals?'))return [pro];
   if(path.startsWith('eme_switch_outbox?'))return jobs.filter(j=>j.professional_id===pro.id);
   if(path==='eme_switch_outbox'&&method==='POST'){jobs.push(body);return [body];}
   throw Error('Unexpected DB query: '+path);
  },
  request:async(_path,{body})=>{
   if(_path.includes('/eme_switch_outbox?')){if(jobs.some(j=>j.id===body.id))return [];jobs.push(body);return [body];}
   if(saved.some(row=>row.source_id===body.source_id&&row.demand_id===body.demand_id))return [];
   saved.push(body);return [body];
  }
 };
 const service=attachSwitchAutopilot({client,env});
 const first=await service.run();
 assert.equal(first.created,1);
 assert.equal(saved[0].status,'prepared');
 assert.equal(saved[0].origin,'autopilot');
 assert.equal(saved[0].created_by,null);
 assert.equal(saved[0].brokerage_bps,500);
 assert.equal(saved[0].switch_share_bps,3000);
 assert.ok(saved[0].token_hash.length===64);
 assert.equal(saved[0].buyer_phone,undefined);
 assert.equal(jobs.length,1);
 const second=await service.run();
 assert.equal(second.created,0);
});
test('não gera ofertas de estoque sem atualização recente ou autorização',async()=>{
 const client={
  rest:async path=>path.startsWith('eme_switch_requests?')?[{id:'b',kind:'buy',status:'qualified',demand_reviewed:true,city:'Vacaria',property_type:'Casa',asking_cents:65000000}]:
  path.startsWith('eme_switch_partner_offers?')?[{id:'o',partner:'Demo',ref:'1',city:'Vacaria',property_type:'Casa',price_cents:50000000,
   available:true,authorization_confirmed:false,updated_at:'2026-01-01T00:00:00.000Z'}]:[],
  request:async()=>{throw Error('Nunca deve publicar');}
 };
 const result=await attachSwitchAutopilot({client,env}).run();
 assert.equal(result.created,0);
});

test('capta negócio de proprietário direto sem depender de carteira parceira',async()=>{
 const direct={id:'dd4bbcc5-04a5-4715-95af-1a4c6a816ce8',kind:'sell',status:'qualified',
  city:'Vacaria',property_type:'Casa',asking_cents:38000000,min_acceptable_cents:37000000,
  ownership_reviewed:true,sharing_authorized:true,updated_at:new Date().toISOString()};
 const buyer={id:'d664af4d-0c2e-469d-a9be-22c02bab629d',kind:'buy',status:'qualified',demand_reviewed:true,
  city:'Vacaria',property_type:'Casa',asking_cents:45000000};
 const professional={id:'f9288e7a-0c0a-45c7-a1c3-144335d73125',city:'Vacaria',property_type:'Casa',
  phone:'5554999999999',status:'verified',whatsapp_opt_in:true};
 const saved=[],jobs=[];
 const client={
  rest:async(path,method='GET',body)=>{
   if(path.startsWith('eme_switch_requests?'))return [direct,buyer];
   if(path.startsWith('eme_switch_partner_offers?'))return [];
   if(path.startsWith('eme_switch_professionals?'))return [professional];
   if(path.startsWith('eme_switch_outbox?'))return jobs;
   if(path==='eme_switch_outbox'&&method==='POST'){jobs.push(body);return [body];}
   throw Error('Unexpected: '+path);
  },
  request:async(_path,{body})=>{if(_path.includes('/eme_switch_outbox?'))jobs.push(body);else saved.push(body);return [body];}
 };
 const result=await attachSwitchAutopilot({client,env}).run();
 assert.equal(result.created,1);
 assert.equal(saved[0].source_kind,'switch_request');
 assert.equal(saved[0].source_id,direct.id);
 assert.equal(saved[0].sale_price_cents,37000000);
 assert.equal(jobs.length,1);
});

test('autopiloto não distribui comprador cujo orçamento não foi confirmado',async()=>{
 const requests=[{id:'demand-1',kind:'buy',status:'qualified',demand_reviewed:false,city:'Vacaria',property_type:'Casa',asking_cents:60000000}];
 const offers=[{id:'offer-1',partner:'Exemplo',ref:'im1',city:'Vacaria',property_type:'Casa',price_cents:50000000,available:true,authorization_confirmed:true,updated_at:new Date().toISOString()}];
 const pros=[{id:'pro-1',city:'Vacaria',property_type:'Casa',phone:'5554999999999',status:'verified',whatsapp_opt_in:true}];
 const client={
  rest:async path=>path.startsWith('eme_switch_requests?')?requests:path.startsWith('eme_switch_partner_offers?')?offers:path.startsWith('eme_switch_professionals?')?pros:[],
  request:async()=>{throw Error('Não pode criar convite de demanda não confirmada.');}
 };
 const result=await attachSwitchAutopilot({client,env}).run();
 assert.equal(result.created,0);
});
