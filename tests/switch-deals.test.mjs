import test from 'node:test';
import assert from 'node:assert/strict';
import {switchDealQuote,switchOfferDraft,switchOfferAcceptance,switchOfferTeaser,switchDealTransition} from '../shared/switch-deals.mjs';
const source={id:'a',kind:'sell',status:'qualified',ownership_reviewed:true,sharing_authorized:true,min_acceptable_cents:35000000};
const target={id:'b',kind:'buy',status:'qualified',demand_reviewed:true};
const input={sourceKind:'switch_request',sourceId:'a',demandId:'b',salePriceCents:50000000,brokerageBps:500,switchShareBps:3000};
test('simulação de corretagem separa bruto, M Switch e parceiro',()=>{
 const result=switchDealQuote(input);
 assert.equal(result.grossCommissionCents,2500000);
 assert.equal(result.switchShareCents,750000);
 assert.equal(result.partnerShareCents,1750000);
 assert.equal(result.contingent,true);
});
test('rejeita valores negativos, percentuais abusivos e entrada não inteira',()=>{
 for(const change of [{salePriceCents:-1},{brokerageBps:1100},{switchShareBps:10001},{salePriceCents:3.14}])
  assert.throws(()=>switchDealQuote({...input,...change}));
});
test('não cria convite sem cliente qualificado nem autorização do proprietário',()=>{
 assert.throws(()=>switchOfferDraft(input,{...source,sharing_authorized:false},target));
 assert.throws(()=>switchOfferDraft(input,source,{...target,status:'new'}));
 assert.throws(()=>switchOfferDraft({...input,salePriceCents:25000000},source,target));
});
test('oferta revisada gera preço e prazo negociáveis mas não comissão devida',()=>{
 const deal=switchOfferDraft({...input,expiresDays:7},source,target);
 assert.equal(deal.expiresDays,7);
 assert.equal(deal.requiresSignedAgreement,true);
});
test('teaser não libera endereço, nome ou telefone da parte',()=>{
 const teaser=switchOfferTeaser({public_ref:'AAAAAA',teaser_city:'Vacaria',teaser_type:'Casa',
  sale_price_cents:50000000,brokerage_bps:500,switch_share_bps:3000,
  expires_at:'2026-11-01T00:00:00Z',status:'prepared',owner_phone:'5554999999999',buyer_name:'Pessoa privada'});
 assert.equal(teaser.reference,'AAAAAA');
 assert.equal(JSON.stringify(teaser).includes('5554999999999'),false);
 assert.equal(JSON.stringify(teaser).includes('Pessoa privada'),false);
});
test('interesse exige CRECI, contato, autorização específica e opt-in opcional',()=>{
 const entry={name:'Profissional Teste',creci:'RS 12345',phone:'(54) 99999-9999',business:'',acknowledge:true,privacyAccepted:true,marketingOptIn:false};
 assert.equal(switchOfferAcceptance(entry).marketingOptIn,false);
 assert.throws(()=>switchOfferAcceptance({...entry,acknowledge:false}));
 assert.throws(()=>switchOfferAcceptance({...entry,creci:''}));
});
test('aprovação da conexão exige acordo assinado e habilitação revisada',()=>{
 assert.throws(()=>switchDealTransition({status:'prepared'},'introduce'),e=>e.status===409);
 assert.throws(()=>switchDealTransition({status:'acknowledged'},'contract',{contractReference:'',licenseChecked:true}));
 assert.deepEqual(switchDealTransition({status:'acknowledged'},'contract',{contractReference:'contrato-010',licenseChecked:true}),{status:'contracted'});
 assert.deepEqual(switchDealTransition({status:'contracted'},'introduce'),{status:'introduced'});
});
test('não marca pago antes de fechar nem sem recebimento real',()=>{
 assert.throws(()=>switchDealTransition({status:'introduced'},'paid',{receivedCents:700000}));
 assert.throws(()=>switchDealTransition({status:'closed'},'paid',{receivedCents:0}));
 assert.deepEqual(switchDealTransition({status:'closed'},'paid',{receivedCents:750000,paymentReference:'comprovante-sintetico'}),{status:'paid'});
});

test('não anuncia comprador sem confirmação humana da intenção declarada',()=>{
 assert.throws(()=>switchOfferDraft(input,source,{...target,demand_reviewed:false}));
});
