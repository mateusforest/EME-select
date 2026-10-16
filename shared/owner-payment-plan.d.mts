export interface OwnerPlan { initialCashCents:number; saleFeeCents:number; taxBps:number; brokerBps:number; monthlyFixedCents:number; monthlyPayrollCents:number; employerChargesCents:number; payday:number; reserveCents:number; repaymentBps:number; firstMonth:string }
export interface OwnerPlanPartner { id:string; name:string; shareBps:number; capitalCents?:number; loanCents?:number }
export interface OwnerPlanRow {month:string;dueDate:string;openingCents:number;receiptCents:number;monthlyCostCents:number;payrollCents:number;compensationCents:number;distributionCents:number;closingCents:number;cumulativeProfitCents:number;protectedCents:number;partners:Array<{id:string;name:string;payrollCents:number;compensationCents:number;distributionCents:number}>}
export const OWNER_PLAN_DEFAULTS: Omit<OwnerPlan,'firstMonth'>;
export function validateOwnerPlan(plan:OwnerPlan):string[];
export function ownerMonth(month:string,offset:number):string;
export function ownerDueDate(month:string,day:number):string;
export function calculateOwnerPlan(plan:OwnerPlan,partners:OwnerPlanPartner[]):{rows:OwnerPlanRow[];taxCents:number;brokerCents:number;retainedCents:number;monthlyCostCents:number;quotasReady:boolean;lowCashCents:number;additionalCashCents:number;totalProfitCents:number;distributedCents:number};
