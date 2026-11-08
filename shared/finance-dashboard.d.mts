import type {FinanceState,FinanceEntry} from './finance.mjs';
export function financeDashboard(state:FinanceState,month:string,today:string):{
  receivableCents:number;payableCents:number;overdueCents:number;
  recurringExpenseCents:number;fixedExpenseCents:number;recurringExpenseCount:number;upcoming:FinanceEntry[];
};
