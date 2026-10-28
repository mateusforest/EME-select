import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSwitchPartnerImport,matchSwitchDemand} from '../shared/switch-partners.mjs';

const valid={
 partner:'Construtora teste',
 authorizationConfirmed:true,
 offers:[{ref:'APT-01',title:'Apartamento para venda',city:'Caxias do Sul',
  propertyType:'Apartamento',priceCents:54000000,url:'https://example.com/imoveis/apt-01',available:true}]
};
const offer={id:'d782f47d-e683-4f36-8b39-47fda7728ef4',
  partner:'Construtora teste',ref:'APT-01',city:'Caxias do Sul',property_type:'Apartamento',
  price_cents:54000000,available:true,authorization_confirmed:true};
const buyer={id:'a1a5d4ea-5855-4e5e-b7c0-b5013ca514b3',kind:'buy',
 status:'qualified',city:'Caxias do Sul',property_type:'Apartamento',asking_cents:60000000};
test('aceita carteira autorizada, privada, com referências sem duplicidade',()=>{
  const item=validateSwitchPartnerImport(valid);
  assert.equal(item.offers[0].ref,'APT-01');
  assert.equal(item.offers[0].priceCents,54000000);
});
test('rejeita carteira sem autorização, links inseguros e duplicatas',()=>{
  for(const change of [{authorizationConfirmed:false},
    {offers:[{...valid.offers[0],url:'http://example.com/imovel'}]},
    {offers:[valid.offers[0],valid.offers[0]]},
    {offers:[{...valid.offers[0],available:'sim'}]}]){
    assert.throws(()=>validateSwitchPartnerImport({...valid,...change}));
  }
});
test('limite de lote protege servidor',()=>{
  assert.throws(()=>validateSwitchPartnerImport({...valid,offers:Array(101).fill(valid.offers[0])}));
});
test('combina comprador com carteira parceira por cidade, tipo e orçamento',()=>{
  const found=matchSwitchDemand([buyer],[offer]);
  assert.equal(found.length,1);
  assert.equal(found[0].kind,'partner-offer');
  assert.equal(found[0].requiresBrokerReview,true);
});
test('não sugere preço excessivo, indisponível, autorização ausente ou perfil não qualificado',()=>{
  for(const change of [{available:false},{authorization_confirmed:false},{price_cents:75000000},
    {city:'Porto Alegre'},{property_type:'Casa'}]){
    assert.deepEqual(matchSwitchDemand([buyer],[{...offer,...change}]),[]);
  }
  assert.deepEqual(matchSwitchDemand([{...buyer,status:'new'}],[offer]),[]);
});
test('pedido de troca procura destino e investidor procura cidade declarada',()=>{
  const upgrade={...buyer,kind:'swap',city:'Vacaria',target_city:'Caxias do Sul',target_budget_cents:61000000};
  assert.equal(matchSwitchDemand([upgrade],[offer]).length,1);
  assert.equal(matchSwitchDemand([{...buyer,kind:'invest'}],[offer]).length,1);
});
