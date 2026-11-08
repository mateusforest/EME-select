import {FINANCE_CATEGORIES} from './finance.mjs';
const category = id => FINANCE_CATEGORIES.find(item => item.id === id);
const sum = items => items.reduce((total,item) => total + item.amountCents,0);

// Due-date commitments are separate from accrual profit and settled cash.
// Recurrence rules summarize the routine; never add them to ledger balances.
export function financeDashboard(state,month,today) {
  const from=month+'-01';
  const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
  const open=state.entries.filter(entry=>entry.status==='open'&&category(entry.category)?.direction!=='transfer');
  const due=open.filter(entry=>entry.dueDate>=from&&entry.dueDate<=end);
  const active=state.recurrences.filter(rule=>rule.active&&rule.startMonth<=month&&(!rule.endMonth||rule.endMonth>=month));
  const expenses=active.filter(rule=>category(rule.category)?.direction==='out'&&category(rule.category)?.dreGroup);
  return {
    receivableCents:sum(due.filter(entry=>category(entry.category)?.direction==='in')),
    payableCents:sum(due.filter(entry=>category(entry.category)?.direction==='out')),
    overdueCents:sum(open.filter(entry=>entry.dueDate<today&&category(entry.category)?.direction==='out')),
    recurringExpenseCents:sum(expenses),
    fixedExpenseCents:sum(expenses.filter(rule=>rule.behavior==='fixed')),
    recurringExpenseCount:expenses.length,
    upcoming:open.filter(entry=>entry.dueDate<=end).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.id.localeCompare(b.id)).slice(0,6),
  };
}
