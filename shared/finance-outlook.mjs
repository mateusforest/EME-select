import { financeReport, FINANCE_CATEGORIES } from './finance.mjs'
import { allocateWeighted } from './finance-partners.mjs'

const category = id => FINANCE_CATEGORIES.find(c => c.id === id)
const sum = rows => rows.reduce((n, e) => n + e.amountCents, 0)
const periodAt = (asOf, offset) => {
  const date = new Date(asOf + 'T12:00:00Z')
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 7)
}
const dateAt = (month, day) => month + '-' + String(Math.min(day, new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate())).padStart(2, '0')

/** Independent month-end scenarios. Never persists, settles or schedules real records. */
export function financeOutlook(input, asOf) {
  const base = structuredClone(input)
  const virtualAccount = '__outlook_account__'
  base.accounts.push({ id: virtualAccount, name: 'Somente projeção', openingDate: asOf, openingBalanceCents: 0, openingThirdPartyCents: 0, active: true })
  // Include next month's bills in each snapshot's protected 30-day horizon.
  for (let index = 0; index < 7; index++) {
    const month = periodAt(asOf, index)
    for (const rule of base.recurrences) {
      if (!rule.active || rule.startMonth > month || (rule.endMonth && rule.endMonth < month)) continue
      if (base.entries.some(e => e.recurrenceId === rule.id && e.recurrenceMonth === month)) continue
      base.entries.push({ ...rule, id: `outlook:${rule.id}:${month}`, description: rule.name, status: 'open', recognition: 'forecast', accountId: null, settledDate: null,
        recurrenceId: rule.id, recurrenceMonth: month, competenceDate: dateAt(periodAt(month + '-01', rule.competenceOffset || 0), rule.competenceDay || 1), dueDate: dateAt(month, rule.dueDay) })
    }
  }
  const warnings = []
  if (!input.partners.some(p => p.active) || input.partners.filter(p => p.active).reduce((n, p) => n + p.shareBps, 0) !== 10000) warnings.push('Complete as quotas dos sócios ativos até 100% para calcular os valores individuais.')
  if (input.settings.cashTargetCents == null) warnings.push('Defina a meta mínima de caixa para calcular a retirada possível.')
  if (input.settings.reserveBps == null) warnings.push('Defina a reserva padrão; enquanto não definida, ela vale zero nesta projeção.')
  if (!input.recurrences.some(e => e.active && category(e.category)?.direction === 'out')) warnings.push('Sem despesas recorrentes ativas. Cadastre os custos mensais para não superestimar a sobra.')
  if (input.entries.some(e => e.status !== 'cancelled' && category(e.category)?.dreGroup === 'revenue' && !e.operationId)) warnings.push('Há receitas avulsas: confira se os tributos e as comissões correspondentes foram lançados. Não são deduzidos automaticamente nessas receitas.')
  const rows = []
  for (let index = 0; index < 6; index++) {
    const month = periodAt(asOf, index), end = dateAt(month, 31)
    const state = structuredClone(base)
    for (const entry of state.entries) {
      if (entry.status !== 'open') continue
      if (entry.competenceDate <= end) entry.recognition = 'recognized'
      if (entry.dueDate <= end && entry.category !== 'transfer') {
        entry.status = 'settled'; entry.recognition = 'recognized'
        entry.settledDate = entry.dueDate < asOf ? asOf : entry.dueDate
        entry.accountId = virtualAccount
      }
    }
    const period = financeReport(state, { from: month + '-01', to: end, asOf: end })
    const all = financeReport(state, { from: '1900-01-01', to: end, asOf: end })
    const compensation = all.partnerCapital.plannedCents
    // Propose compensation first; no claim that it has happened, and no carry-forward of hypothetical payouts.
    const balanced = all.partnerCapital.repayableExcessCents <= compensation
    const profitAvailable = all.distribution.ready && input.settings.cashTargetCents != null && balanced
      ? Math.max(0, Math.min(all.distribution.unallocatedProfitCents, all.distribution.cashProfitCents, all.distribution.freeCashCents - compensation)) : 0
    const activePartners = state.partners.filter(p => p.active)
    const monthShares = all.distribution.ready ? allocateWeighted(Math.max(0, period.dre.combined.netProfitCents), activePartners, 'shareBps') : []
    // Preserve each partner's outstanding entitlement if previous distributions were unequal.
    const availableShares = allocateWeighted(profitAvailable, all.distribution.periodShares.map(p => ({ ...p, weight: p.amountCents })))
    const receipts = state.entries.filter(e => e.status === 'settled' && e.settledDate >= (index === 0 ? asOf : month + '-01') && e.settledDate <= end)
    rows.push({ month, profitCents: period.dre.combined.netProfitCents, revenueCents: period.dre.combined.revenueCents + period.dre.combined.financialIncomeCents,
      expensesCents: period.dre.combined.deductionsCents + period.dre.combined.directCostCents + period.dre.combined.operatingExpensesCents + period.dre.combined.financialExpenseCents + period.dre.combined.incomeTaxCents,
      cashCents: all.cash.availableCents, protectionCents: all.distribution.protectionCents, commitmentsCents: all.distribution.commitmentsCents,
      capitalReceiptsCents: sum(receipts.filter(e => ['capital_in', 'loan_in'].includes(e.category))),
      compensationCents: compensation, remainingExcessCents: Math.max(0, all.partnerCapital.repayableExcessCents - compensation), profitAvailableCents: profitAvailable,
      cashAfterCents: all.cash.availableCents - compensation - profitAvailable,
      partners: activePartners.map(p => ({ id: p.id, name: p.name, shareBps: p.shareBps, monthProfitCents: monthShares.find(s => s.id === p.id)?.amountCents || 0,
        compensationCents: all.partnerCapital.rows.find(s => s.id === p.id)?.repaymentCents || 0, profitAvailableCents: availableShares.find(s => s.id === p.id)?.amountCents || 0 })) })
  }
  return { rows, warnings }
}
