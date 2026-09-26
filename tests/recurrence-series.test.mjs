import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {emptyFinance,applyFinanceCommand} from '../shared/finance.mjs';
const context={actorId:randomUUID(),now:'2026-09-25T12:00:00Z'};
const apply=(state,data)=>applyFinanceCommand(state,{type:'recurrence.save',data},context);
const input={name:'Aluguel mensal',category:'rent',amountCents:120000,startMonth:'2027-01',endMonth:'2027-03',dueDay:31,competenceDay:15,notes:'Contrato conferido',active:true,generateAll:true};
test('bounded revenue and expense series clamp month-end and never create realized cash',()=>{
 for(const category of ['rent','recurring_revenue']){const state=apply(emptyFinance(),{...input,category});assert.equal(state.entries.length,3);assert.deepEqual(state.entries.map(e=>e.dueDate),['2027-01-31','2027-02-28','2027-03-31']);for(const e of state.entries){assert.equal(e.recognition,'forecast');assert.equal(e.status,'open');assert.equal(e.accountId,null);assert.equal(e.notes,'Contrato conferido');assert.ok(e.competenceDate.endsWith('-15'));}
 const replay=apply(state,{...input,id:state.recurrences[0].id,category});assert.equal(replay.entries.length,3);assert.deepEqual(replay.entries,state.entries);}
});
test('series validates end and bounded size atomically',()=>{const state=emptyFinance();for(const patch of [{endMonth:''},{endMonth:'2026-12'},{endMonth:'2032-01'},{active:false},{category:'capital_in'}])assert.throws(()=>apply(state,{...input,...patch}));assert.equal(state.entries.length,0);assert.equal(state.recurrences.length,0);});
test('leap-year dates and existing cancelled periods remain stable',()=>{let state=apply(emptyFinance(),{...input,startMonth:'2028-02',endMonth:'2028-02'});assert.equal(state.entries[0].dueDate,'2028-02-29');state=applyFinanceCommand(state,{type:'entry.cancel',data:{id:state.entries[0].id,reason:'Encerramento do compromisso'}},context);const next=apply(state,{...input,id:state.recurrences[0].id,startMonth:'2028-02',endMonth:'2028-02'});assert.equal(next.entries.length,1);assert.equal(next.entries[0].status,'cancelled');});

test('competence month remains before the due month across the year boundary',()=>{const state=apply(emptyFinance(),{...input,competenceOffset:-1,competenceDay:31});assert.deepEqual(state.entries.map(e=>e.competenceDate),['2026-12-31','2027-01-31','2027-02-28']);});
