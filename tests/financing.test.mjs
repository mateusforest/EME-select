import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFinancing} from '../shared/financing.mjs';
const input={price:500000,downPayment:100000,months:360,annualRate:12,system:'SAC'};
test('SAC converts effective annual rate and repays all principal in cents',()=>{
 const result=calculateFinancing(input);
 assert.ok(Math.abs((1+result.monthlyRate)**12-1.12)<1e-12);
 assert.equal(result.principal,40000000);
 assert.equal(result.first,490663);
 assert.equal(result.schedule.reduce((sum,r)=>sum+r.amortization,0),result.principal);
 assert.equal(result.schedule.at(-1).balance,0);
 assert.equal(result.total,result.schedule.reduce((sum,r)=>sum+r.payment,0));
 assert.ok(result.first>result.last);
});
test('Price matches the annuity formula with only the final rounding adjustment',()=>{
 const result=calculateFinancing({...input,system:'PRICE'});
 const exact=400000*result.monthlyRate/(1-(1+result.monthlyRate)**-360);
 assert.equal(result.first,Math.round(exact*100));
 assert.ok(result.schedule.slice(0,-1).every(r=>r.payment===result.first));
 assert.equal(result.schedule.at(-1).balance,0);
 assert.equal(result.schedule.reduce((sum,r)=>sum+r.amortization,0),result.principal);
 assert.ok(result.interest>calculateFinancing(input).interest);
});
test('zero interest, one installment and fractional currency retain every cent',()=>{
 for(const system of ['SAC','PRICE'])for(const months of [1,7,480]){
  const result=calculateFinancing({...input,price:1000.01,downPayment:100.02,annualRate:0,months,system});
  assert.equal(result.interest,0);assert.equal(result.total,89999);assert.equal(result.schedule.at(-1).balance,0);
 }
});
test('invalid and incomplete financing inputs cannot produce a quote',()=>{
 for(const change of [{downPayment:500000},{downPayment:-1},{months:0},{months:1.5},{months:481},{annualRate:-1},{annualRate:101},{price:NaN},{price:Infinity},{system:'OTHER'}])assert.equal(calculateFinancing({...input,...change}),null);
});
