import test from 'node:test';
import assert from 'node:assert/strict';
import {attachCloudSwitchProfessionals} from '../server/cloud/switch-professionals.mjs';

const env={
 SWITCH_WHATSAPP_ENABLED:'true',
 SWITCH_INVITE_SECRET:'synthetic-very-long-secret-which-is-not-production',
 WHATSAPP_ACCESS_TOKEN:'fake_nonproduction_access_token_123456789',
 WHATSAPP_PHONE_NUMBER_ID:'1234567890123',
 WHATSAPP_GRAPH_VERSION:'v22.0',
 SWITCH_WHATSAPP_TEMPLATE:'m_switch_convite'
};
const dealId='8c43ee32-d668-4493-b251-aa22a08df956';
const sourceId='abe6eed0-99e3-4672-9746-2e9499d7fcdc';
const demandId='95ba6d78-4574-4ea6-8741-80cb21fd956f';
const professionalId='682e7261-1b4d-4579-8fbd-2c8225332526';
function fixture(){
 const deal={id:dealId,source_kind:'partner_offer',source_id:sourceId,demand_id:demandId,
  teaser_city:'Caxias do Sul',teaser_type:'Casa',status:'prepared',
  sale_price_cents:50000000,expires_at:new Date(Date.now()+86400000).toISOString()};
 const offer={id:sourceId,available:true,authorization_confirmed:true,
  price_cents:50000000,updated_at:new Date().toISOString()};
 const demand={id:demandId,kind:'buy',status:'qualified',city:'Caxias do Sul',
  property_type:'Casa',asking_cents:55000000};
 const pro={id:professionalId,status:'verified',whatsapp_opt_in:true,city:'Caxias do Sul',
  property_type:'Casa',phone:'5554999999999'};
 const job={id:'c9119c75-611b-4e28-b3c6-dac753024785',
  deal_id:dealId,professional_id:professionalId,phone:pro.phone,status:'pending',attempts:0};
 const state={deal,offer,demand,pro,job,transmissions:0};
 const client={
  rest:async(path,method='GET',payload)=>{
   if(path.startsWith('eme_switch_deal_invites?'))return [state.deal];
   if(path.startsWith('eme_switch_professionals?'))return [state.pro];
   if(path.startsWith('eme_switch_partner_offers?'))return [state.offer];
   if(path.startsWith('eme_switch_requests?'))return [state.demand];
   if(path.startsWith('eme_switch_outbox?')){
    if(method==='PATCH'){
     if(!path.includes('status=eq.'+state.job.status))return [];
     Object.assign(state.job,payload);
     return [state.job];
    }
    return state.job.status==='pending'?[state.job]:[];
   }
   throw Error('unexpected table: '+path);
  }
 };
 const fetcher=async()=>{state.transmissions++;return {ok:true,json:async()=>({messages:[{id:'wamid.test'}]})};};
 return {state,service:attachCloudSwitchProfessionals({client,env,rate:async()=>{},fetcher})};
}
test('aceita envio somente após revalidar estoque, comprador e opt-in no instante do disparo',async()=>{
 const {service,state}=fixture();
 const result=await service.dispatchDeal(dealId);
 assert.equal(result.submitted,1);
 assert.equal(state.job.status,'submitted');
 assert.equal(state.transmissions,1);
 assert.equal(state.job.provider_message_id,'wamid.test');
});
test('estoque indisponível impede envio e marca como ignorado',async()=>{
 const {service,state}=fixture();
 state.offer.available=false;
 const result=await service.dispatchDeal(dealId);
 assert.equal(result.skipped,1);
 assert.equal(state.transmissions,0);
 assert.equal(state.job.status,'skipped');
});
test('interesse encerrado e opt-out impedem disparos, mesmo com fila antiga',async()=>{
 for(const change of ['lost','optout','stale']){
  const {service,state}=fixture();
  if(change==='lost')state.demand.status='archived';
  if(change==='optout')state.pro.whatsapp_opt_in=false;
  if(change==='stale')state.offer.updated_at='2020-01-01T00:00:00.000Z';
  const result=await service.dispatchDeal(dealId);
  assert.equal(result.submitted,0,change);
  assert.equal(state.transmissions,0,change);
  assert.equal(state.job.status,'skipped',change);
 }
});
