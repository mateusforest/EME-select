import {SWITCH_CONSENT_VERSION} from '../shared/switch-consent.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {attachCloudSwitch} from '../server/cloud/switch.mjs';
const leadId='123e4567-e89b-42d3-a456-426614174000';
const requestId='8c43ee32-d668-4493-b251-aa22a08df956';
const seller={requestId,kind:'sell',name:'Pessoa de teste',phone:'(54) 99999-9999',
  city:'Vacaria',propertyType:'Casa',askingCents:35000000,targetCity:'',targetBudgetCents:null,
  contactConsent:true,updatesOptIn:false,privacyAccepted:true,consentVersion:SWITCH_CONSENT_VERSION,notes:'',source:'switch-web'};
function setup(){
  const records=[],events=[],calls=[];
  const client={
    request:async(path,{method,body})=>{
      calls.push({path,method});
      if(!records.some(x=>x.request_id===body.request_id))records.push({
        ...body,id:leadId,owner_id:null,ownership_reviewed:false,sharing_authorized:false,
        funds_verified:false,min_acceptable_cents:null,review_note:'',version:1,created_at:new Date().toISOString()
      });
      return null;
    },
    rest:async(path,method='GET',body)=>{
      calls.push({path,method});
      if(path.startsWith('eme_profiles?'))return [{active:true,must_change:false,role:'corretor'}];
      if(!path.startsWith('eme_switch_requests?'))throw Error('Tabela desconhecida.');
      const id=path.match(/(?:\?|&)id=eq\.([^&]+)/)?.[1];
      const owner=path.match(/&owner_id=eq\.([^&]+)/)?.[1];
      const version=path.match(/&version=eq\.([^&]+)/)?.[1];
      const selection=records.filter(x=>(!id||x.id===id)&&(!owner||x.owner_id===owner)&&(!version||String(x.version)===version));
      if(method==='PATCH')selection.forEach(x=>Object.assign(x,body));
      return selection;
    }
  };
  const send=(status,data)=>events.push({status,data});
  return {records,events,calls,send,service:attachCloudSwitch({client,rate:async()=>{}})};
}
const admin={id:'f5b08aba-8de0-43ac-a6d8-1203e873a789',role:'admin',active:true,must_change:false};
const broker={id:'85f479a0-d614-4da8-a155-bb5685a0c163',role:'corretor',active:true,must_change:false};
test('público envia sem login; idempotência não multiplica cadastros',async()=>{
  const {service,records,events,send}=setup();
  const req={method:'POST',headers:{'x-forwarded-for':'198.51.100.1'}};
  await service.publicHandle('/api/public/switch',req,seller,send);
  await service.publicHandle('/api/public/switch',req,seller,send);
  assert.equal(records.length,1);assert.deepEqual(events.map(x=>x.status),[201,201]);
});
test('sem permissão não é possível consultar matches',async()=>{
  const {service,send}=setup();
  await assert.rejects(
    service.handle('/api/switch/matches',{method:'GET'},broker,null,send),
    e=>e.status===403
  );
});
test('corretor não vê solicitação sem atribuição e não revisa a titularidade',async()=>{
  const {service,send,records,events}=setup();
  await service.publicHandle('/api/public/switch',{method:'POST',headers:{}},seller,send);
  await service.handle('/api/switch',{method:'GET'},broker,null,send);
  assert.equal(records.length,1);
  assert.deepEqual(events.at(-1).data.requests,[]);
  await assert.rejects(service.handle('/api/switch/'+leadId,{method:'PATCH'},broker,{version:1,status:'qualified'},send),e=>e.status===404);
});
test('gestão qualifica após conferências e versão é incrementada',async()=>{
  const {service,send,records}=setup();
  await service.publicHandle('/api/public/switch',{method:'POST',headers:{}},seller,send);
  await service.handle('/api/switch/'+leadId,{method:'PATCH'},admin,{
    version:1,status:'qualified',ownershipReviewed:true,sharingAuthorized:true,minAcceptableCents:32000000
  },send);
  assert.equal(records[0].status,'qualified');assert.equal(records[0].version,2);
  await assert.rejects(service.handle('/api/switch/'+leadId,{method:'PATCH'},admin,{
    version:1,status:'closed'
  },send),e=>e.status===409);
});
