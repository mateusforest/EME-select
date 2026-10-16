import { allocateWeighted, partnerCapitalReport } from './finance-partners.mjs';
export const OWNER_PLAN_DEFAULTS = Object.freeze({initialCashCents:5000000,saleFeeCents:10000000,taxBps:1200,brokerBps:5000,monthlyFixedCents:600000,monthlyPayrollCents:500000,employerChargesCents:0,payday:5,reserveCents:4800000,repaymentBps:2500});
const pct=(n,b)=>Number((BigInt(n)*BigInt(b)+5000n)/10000n);
export function validateOwnerPlan(plan){
 const errors=[];
 for(const [key] of Object.entries(OWNER_PLAN_DEFAULTS)){
  const max=key.endsWith('Bps')?10000:key==='payday'?31:100000000000;
  if(!Number.isSafeInteger(plan[key])||plan[key]<(key==='payday'?1:0)||plan[key]>max)errors.push(key);
 }
 if(typeof plan.firstMonth!=='string'||!/^20\d\d-(0[1-9]|1[0-2])$/.test(plan.firstMonth))errors.push('firstMonth');
 return errors;
}
export const ownerMonth=(month,offset)=>{const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString().slice(0,7);};
export const ownerDueDate=(month,day)=>month+'-'+String(Math.min(day,new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate())).padStart(2,'0');
/** Six-month observation window, NOT a six-installment withdrawal commitment. No ledger mutations. */
export function calculateOwnerPlan(plan,partners){
 if(validateOwnerPlan(plan).length)throw new RangeError('Confira os valores e as datas do planejamento.');
 const quotasReady=partners.length>0&&partners.reduce((n,p)=>n+p.shareBps,0)===10000;
 const taxCents=pct(plan.saleFeeCents,plan.taxBps),brokerCents=pct(plan.saleFeeCents-taxCents,plan.brokerBps);
 const retainedCents=plan.saleFeeCents-taxCents-brokerCents;
 const payrollCents=plan.monthlyPayrollCents*partners.length;
 const monthlyCostCents=plan.monthlyFixedCents+payrollCents+plan.employerChargesCents;
 let cash=plan.initialCashCents,profit=0,distributed=0;
 const repaid=new Map(partners.map(p=>[p.id,0]));
 const rows=[];
 for(let i=0;i<6;i++){
  const month=ownerMonth(plan.firstMonth,i),dueDate=ownerDueDate(month,plan.payday);
  const receipt=i===0?retainedCents:0;
  const openingCents=cash;
  cash+=receipt-monthlyCostCents;profit+=receipt-monthlyCostCents;
  // Protect the remaining observation window as well as the end reserve before suggesting variable withdrawals.
  const protectedCents=plan.reserveCents+(5-i)*monthlyCostCents;
  const free=Math.max(0,cash-protectedCents);
  const capitalState={settings:{cashTargetCents:plan.reserveCents,partnerRepaymentBps:plan.repaymentBps},entries:[],partners:partners.map(p=>({id:p.id,name:p.name,shareBps:p.shareBps,active:true,openingDate:plan.firstMonth+'-01',openingCapitalCents:p.capitalCents||0,openingLoanCents:p.loanCents||0,openingRepaidCents:repaid.get(p.id)}))};
  const capital=partnerCapitalReport(capitalState,dueDate,free);
  for(const p of capital.rows)repaid.set(p.id,repaid.get(p.id)+p.repaymentCents);
  const compensationCents=capital.plannedCents;
  cash-=compensationCents;
  // Profit suggestions cannot consume the initial capital, ignore future costs or outrun repayments.
  const profitCents=quotasReady&&capital.repayableExcessCents<=compensationCents?Math.max(0,Math.min(free-compensationCents,profit-distributed-(5-i)*monthlyCostCents)):0;
  const shares=allocateWeighted(profitCents,partners,'shareBps');
  distributed+=profitCents;cash-=profitCents;
  rows.push({month,dueDate,openingCents,receiptCents:receipt,monthlyCostCents,payrollCents,compensationCents,distributionCents:profitCents,closingCents:cash,cumulativeProfitCents:profit,protectedCents,
    partners:partners.map(p=>({id:p.id,name:p.name,payrollCents:plan.monthlyPayrollCents,compensationCents:capital.rows.find(r=>r.id===p.id)?.repaymentCents||0,distributionCents:shares.find(r=>r.id===p.id)?.amountCents||0}))});
 }
 const lowCashCents=Math.min(plan.initialCashCents,...rows.map(r=>r.closingCents));
 return {rows,taxCents,brokerCents,retainedCents,monthlyCostCents,quotasReady,lowCashCents,additionalCashCents:Math.max(0,plan.reserveCents-lowCashCents),totalProfitCents:profit,distributedCents:distributed};
}
