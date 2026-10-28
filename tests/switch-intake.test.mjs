import test from 'node:test';
import assert from 'node:assert/strict';
import {switchIntake,switchRevision} from '../shared/switch-intake.mjs';
const id='8c43ee32-d668-4493-b251-aa22a08df956';
const base={
  requestId:id,kind:'swap',name:'Cliente de teste',phone:'(54) 99999-9999',
  city:'Vacaria',propertyType:'Casa',askingCents:35000000,
  targetCity:'Caxias do Sul',targetBudgetCents:65000000,notes:'',
  contactConsent:true,updatesOptIn:false,privacyAccepted:true,source:'switch-web'
};
const prior={
  id,kind:'swap',version:2,status:'reviewing',owner_id:null,
  ownership_reviewed:false,sharing_authorized:false,
  funds_verified:false,min_acceptable_cents:null
};
test('entrada aceita troca com consentimento e valor normalizados',()=>{
  const input=switchIntake(base);
  assert.equal(input.phone,'5554999999999');
  assert.equal(input.askingCents,35000000);
  assert.equal(input.kind,'swap');
});
test('entrada bloqueia marketing opt-in implícito, falta de autorização, spam e valor inválido',()=>{
  for(const change of [
    {updatesOptIn:undefined},{contactConsent:false},{privacyAccepted:false},
    {website:'spam'},{askingCents:-100},{askingCents:34999.2}
  ])assert.throws(()=>switchIntake({...base,...change}));
});
test('perfil de investidor não carrega campo de destino de troca',()=>{
  const input=switchIntake({...base,kind:'invest'});
  assert.equal(input.targetCity,'');
  assert.equal(input.targetBudgetCents,null);
});
test('somente gestão pode conferir titularidade e investidores',()=>{
  assert.throws(()=>switchRevision({version:2,ownershipReviewed:true},prior,false),e=>e.status===403);
  assert.deepEqual(switchRevision({version:2,status:'reviewing'},prior,false),{status:'reviewing'});
});
test('não qualifica imóvel sem todas as conferências',()=>{
  assert.throws(()=>switchRevision({version:2,status:'qualified'},prior,true));
  assert.deepEqual(switchRevision({
    version:2,status:'qualified',ownershipReviewed:true,sharingAuthorized:true,minAcceptableCents:30000000
  },prior,true),{
    status:'qualified',ownership_reviewed:true,sharing_authorized:true,min_acceptable_cents:30000000
  });
});
test('não qualifica investidor sem revisão financeira',()=>{
  const investor={...prior,kind:'invest'};
  assert.throws(()=>switchRevision({version:2,status:'qualified'},investor,true));
  assert.equal(switchRevision({version:2,status:'qualified',fundsVerified:true},investor,true).funds_verified,true);
});
test('não permite qualificar enquanto limpa valor mínimo anterior',()=>{
  const reviewed={...prior,ownership_reviewed:true,sharing_authorized:true,min_acceptable_cents:35000000};
  assert.throws(()=>switchRevision({version:2,status:'qualified',minAcceptableCents:null},reviewed,true));
});
test('rejeita atualização com versão antiga',()=>{
  assert.throws(()=>switchRevision({version:1,status:'reviewing'},prior,true),e=>e.status===409);
});
