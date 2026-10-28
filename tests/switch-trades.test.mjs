import test from 'node:test';
import assert from 'node:assert/strict';
import {rankSwitchUpgradeTargets} from '../shared/switch-trades.mjs';

const offer={
  id:'casa-vacaria',kind:'swap',status:'qualified',city:'Vacaria',
  target_city:'Caxias do Sul',target_budget_cents:70000000,
  ownership_reviewed:true,sharing_authorized:true,min_acceptable_cents:35000000
};
const target={
  id:'apartamento-caxias',kind:'sell',status:'qualified',city:'Caxias do Sul',
  ownership_reviewed:true,sharing_authorized:true,min_acceptable_cents:62000000
};
test('sugere imóvel revisado na cidade e orçamento de destino',()=>{
  const [match]=rankSwitchUpgradeTargets([offer,target]);
  assert.equal(match.kind,'upgrade-target');
  assert.equal(match.assetId,target.id);
  assert.equal(match.investorId,offer.id);
  assert.equal(match.requiresBrokerReview,true);
});
test('não sugere imóvel indisponível, com preço excessivo ou sem autorização',()=>{
  for(const modification of [{status:'archived'},{min_acceptable_cents:90000000},{sharing_authorized:false},{ownership_reviewed:false},{city:'Porto Alegre'}]){
    assert.deepEqual(rankSwitchUpgradeTargets([offer,{...target,...modification}]),[]);
  }
});
test('não presume que troca gera crédito bancário aprovado',()=>{
  const [match]=rankSwitchUpgradeTargets([offer,target]);
  assert.ok(match.flags.some(f=>f.includes('crédito')));
  assert.equal(match.stage,'candidate');
});
test('destino sem orçamento e sem cidade não produz combinações',()=>{
  assert.deepEqual(rankSwitchUpgradeTargets([{...offer,target_budget_cents:null},target]),[]);
  assert.deepEqual(rankSwitchUpgradeTargets([{...offer,target_city:''},target]),[]);
});
