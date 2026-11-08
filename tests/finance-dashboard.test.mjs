import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyFinance,applyFinanceCommand,financeReport} from '../shared/finance.mjs';
import {financeDashboard} from '../shared/finance-dashboard.mjs';

test('dashboard separates due month, cash, overdue and recurrence rules without double counting',()=>{
 const state=emptyFinance();
 state.entries=[
  {id:'prior',category:'rent',amountCents:10000,status:'open',dueDate:'2026-10-30',competenceDate:'2026-10-01'},
  {id:'bill',category:'software',amountCents:20000,status:'open',dueDate:'2026-11-15',competenceDate:'2026-10-01'},
  {id:'incoming',category:'sale_fee',amountCents:90000,status:'open',dueDate:'2026-11-20',competenceDate:'2026-12-01'},
  {id:'paid',category:'rent',amountCents:30000,status:'settled',dueDate:'2026-11-01'},
  {id:'cancelled',category:'rent',amountCents:40000,status:'cancelled',dueDate:'2026-11-01'},
  {id:'transfer',category:'transfer',amountCents:50000,status:'open',dueDate:'2026-11-01'},
  {id:'future',category:'rent',amountCents:60000,status:'open',dueDate:'2026-12-01'},
 ];
 state.recurrences=[
  {category:'software',amountCents:20000,behavior:'fixed',active:true,startMonth:'2026-01',endMonth:null},
  {category:'utilities',amountCents:5000,behavior:'variable',active:true,startMonth:'2026-11',endMonth:'2026-11'},
  {category:'rent',amountCents:80000,behavior:'fixed',active:false,startMonth:'2026-01'},
  {category:'rent',amountCents:70000,behavior:'fixed',active:true,startMonth:'2026-12'},
  {category:'management_fee',amountCents:100000,behavior:'fixed',active:true,startMonth:'2026-01'},
  {category:'owner_payout',amountCents:900000,behavior:'fixed',active:true,startMonth:'2026-01'},
 ];
 const result=financeDashboard(state,'2026-11','2026-11-08');
 assert.equal(result.payableCents,20000);assert.equal(result.receivableCents,90000);
 assert.equal(result.overdueCents,10000);assert.equal(result.fixedExpenseCents,20000);
 assert.equal(result.recurringExpenseCents,25000);assert.equal(result.recurringExpenseCount,2);
 assert.deepEqual(result.upcoming.map(e=>e.id),['prior','bill','incoming']);
});

test('indefinite recurring expense generates once per month and affects cash only on payment',()=>{
 const context={actorId:'31ab02b2-cf6e-4a5c-bae6-5b2fbd467c25',now:'2026-11-08T12:00:00Z',members:[],properties:[]};
 let state=emptyFinance();
 const apply=(type,data)=>state=applyFinanceCommand(state,{type,data},context);
 apply('account.save',{name:'Caixa',kind:'cash',openingDate:'2026-11-01',openingBalanceCents:100000});
 apply('recurrence.save',{name:'Internet',category:'utilities',amountCents:20000,behavior:'fixed',startMonth:'2026-11',dueDay:5,active:true,generateAll:false});
 const id=state.recurrences[0].id;
 apply('recurrence.generate',{id,month:'2026-11'});apply('recurrence.generate',{id,month:'2026-11'});
 assert.equal(state.entries.length,1);
 const report=()=>financeReport(state,{from:'2026-11-01',to:'2026-11-30',asOf:'2026-11-08'});
 assert.equal(report().cash.availableCents,100000);
 apply('entry.settle',{id:state.entries[0].id,accountId:state.accounts[0].id,settledDate:'2026-11-08'});
 assert.equal(report().cash.availableCents,80000);
 assert.equal(financeDashboard(state,'2026-11','2026-11-08').payableCents,0);
});
