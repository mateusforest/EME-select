import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {emptyFinance,applyFinanceCommand,financeReport} from '../shared/finance.mjs';
import {brokerSnapshot} from '../shared/broker.mjs';
import {attachCloudFinance} from '../server/cloud/finance.mjs';
const admin={id:randomUUID(),role:'admin',active:true,must_change:false};
const first={id:randomUUID(),name:'Primeiro corretor',role:'corretor',active:true,must_change:false};
const second={id:randomUUID(),name:'Segundo corretor',role:'corretor',active:true,must_change:false};
const prop={id:randomUUID(),title:'Imóvel compartilhado',assigneeId:first.id};
const context={actorId:admin.id,now:'2026-10-12T18:00:00Z',members:[admin,first,second],properties:[prop]};
const apply=(s,t,d)=>applyFinanceCommand(s,{type:t,data:d},context);
const agreement={propertyId:prop.id,captorId:first.id,model:'Captação e venda',feeCents:100001,participants:[{brokerId:first.id,role:'Captação',bps:2500},{brokerId:second.id,role:'Venda',bps:3500}],terms:'Pagamento após recebimento dos honorários, conforme acordo aprovado.'};
test('agreement captures immutable conditions without changing cash; total share bounded',()=>{
 const empty=emptyFinance(),s=apply(empty,'broker.save',agreement);assert.equal(empty.brokerAgreements,undefined);assert.equal(s.entries.length,0);
 assert.equal(brokerSnapshot(s,first,[prop],context.members).totals.potentialCents,25000);
 assert.throws(()=>apply(s,'broker.save',agreement),/Já existe/);
 assert.throws(()=>apply(empty,'broker.save',{...agreement,participants:[{brokerId:first.id,role:'Captação',bps:7000},{brokerId:second.id,role:'Venda',bps:4000}]}),/até 100/);
 assert.throws(()=>apply(empty,'broker.save',{...agreement,participants:[{brokerId:first.id,role:'Captação',bps:2000},{brokerId:first.id,role:'Venda',bps:2000}]}),/Consolide/);
});
test('close removes potential and generates own receivables once with original shares',()=>{
 let s=apply(emptyFinance(),'broker.save',agreement),id=s.brokerAgreements[0].id;
 s=apply(s,'broker.close',{id,actualFeeCents:200000,competenceDate:'2026-10-12',dueDate:'2026-10-20',note:'Contrato assinado e referência interna conferida'});
 const own=brokerSnapshot(s,first,[prop],context.members);assert.equal(own.totals.potentialCents,0);assert.equal(own.totals.receivableCents,50000);assert.equal(own.totals.receivedCents,0);assert.equal(s.entries.length,2);
 assert.throws(()=>apply(s,'broker.close',{id}),/encerrado/);
 assert.throws(()=>apply(s,'entry.save',{...s.entries[0],amountCents:1}),/preserva/);
});
test('rounding conserves the commission pool even for a one-cent fee',()=>{
 const data={...agreement,feeCents:1,participants:[{brokerId:first.id,role:'Captação',bps:5000},{brokerId:second.id,role:'Venda',bps:5000}]};
 let s=apply(emptyFinance(),'broker.save',data);
 const expected=[first,second].map(u=>brokerSnapshot(s,u,[prop],context.members).totals.potentialCents);
 s=apply(s,'broker.close',{id:s.brokerAgreements[0].id,actualFeeCents:1,competenceDate:'2026-10-12',dueDate:'2026-10-12',note:'Teste de fechamento'});
 assert.equal(s.entries.reduce((n,e)=>n+e.amountCents,0),1);assert.equal(expected.reduce((n,v)=>n+v,0),1);
 assert.deepEqual([first,second].map(u=>brokerSnapshot(s,u,[prop],context.members).totals.receivableCents),expected);
});
test('broker projection excludes other commissions, accounts, notes, company and partner data',()=>{
 const s=apply(emptyFinance(),'broker.save',agreement);s.company={secret:'company-secret'};s.accounts=[{secret:'account-secret'}];s.entries=[{id:'own',brokerId:first.id,category:'broker_commission',amountCents:5,status:'settled',recognition:'recognized',notes:'secret note'}, {id:'other',brokerId:second.id,category:'broker_commission',amountCents:999999,status:'settled'}, {id:'revenue',brokerId:first.id,category:'sale_fee',amountCents:999999,status:'settled'}];
 const out=brokerSnapshot(s,first,[prop],context.members),json=JSON.stringify(out);assert.equal(out.entries.length,1);assert.equal(out.totals.receivedCents,5);for(const word of ['company-secret','account-secret','secret note','999999',second.id])assert.ok(!json.includes(word));
 assert.deepEqual(brokerSnapshot(s,second,[prop],context.members).portfolio,[]);
});
test('origin survives change of responsibility and does not require commission or money',()=>{
 let s=apply(emptyFinance(),'broker.origin',{propertyId:prop.id,captorId:first.id,reason:'Indicação recebida pelo corretor'});
 assert.equal(s.entries.length,0);assert.equal(s.brokerAgreements.length,0);
 const out=brokerSnapshot(s,second,[{...prop,assigneeId:second.id}],context.members);assert.equal(out.portfolio[0].captor,first.name);assert.equal(out.portfolio[0].responsible,second.name);
 assert.throws(()=>apply(s,'broker.origin',{propertyId:randomUUID(),captorId:first.id,reason:'Referência'}),/Imóvel/);
});
test('archive keeps history and releases property for a new agreement',()=>{
 let s=apply(emptyFinance(),'broker.save',agreement);s=apply(s,'broker.archive',{id:s.brokerAgreements[0].id,reason:'Condições substituídas por novo acordo'});s=apply(s,'broker.save',{...agreement,feeCents:200000});
 assert.equal(s.brokerAgreements.length,2);assert.equal(brokerSnapshot(s,first,[prop],context.members).totals.potentialCents,50000);
});
test('settlement appears only after administrative cash entry and cancellation removes value',()=>{
 let s=apply(emptyFinance(),'broker.save',agreement);s=apply(s,'broker.close',{id:s.brokerAgreements[0].id,actualFeeCents:200000,competenceDate:'2026-10-12',dueDate:'2026-10-12',note:'Contrato conferido'});
 s=apply(s,'account.save',{name:'Conta da empresa',kind:'bank',openingDate:'2026-10-01',openingBalanceCents:1000000});const entry=s.entries[0];
 s=apply(s,'entry.settle',{id:entry.id,accountId:s.accounts[0].id,settledDate:'2026-10-12'});
 assert.equal(brokerSnapshot(s,first,[prop],context.members).totals.receivedCents,50000);
 assert.equal(financeReport(s,{from:'2026-10-01',to:'2026-10-31',asOf:'2026-10-12'}).cash.balanceCents,950000);
 s=apply(s,'entry.cancel',{id:entry.id,reason:'Pagamento registrado por engano'});assert.equal(brokerSnapshot(s,first,[prop],context.members).totals.receivedCents,0);
});
test('cloud endpoint reads own data only; inactive users and write attempts rejected',async()=>{
 const state=apply(emptyFinance(),'broker.save',agreement);let result;
 const client={rest:async path=>path.startsWith('eme_finance_state')?[{version:1,data:state}]:path.startsWith('eme_profiles')?context.members:path.startsWith('eme_cases')?[{id:prop.id,title:prop.title,assignee_id:first.id}]:[],rpc:async()=>assert.fail('Read must not write')};
 const api=attachCloudFinance({client,hashOf:()=>''});
 await api.handle('/api/broker/commissions',{method:'GET'},{},first,{},(status,value)=>{result={status,value};});assert.equal(result.status,200);assert.equal(result.value.agreements[0].potentialCents,25000);assert.ok(!JSON.stringify(result.value).includes(second.id));
 await assert.rejects(()=>api.handle('/api/broker/commissions',{method:'GET'},{},null,{},()=>{}),e=>e.status===401);
 await assert.rejects(()=>api.handle('/api/broker/commissions',{method:'GET'},{},{...first,active:false},{},()=>{}),e=>e.status===403);
 await assert.rejects(()=>api.handle('/api/broker/commissions',{method:'POST'},{},first,{},()=>{}),e=>e.status===405);
 await assert.rejects(()=>api.handle('/api/finance',{method:'GET'},{},first,{},()=>{}),e=>e.status===403);
});
