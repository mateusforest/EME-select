/** Partner principal is distinct from profit. All amounts are integer centavos. */
export function allocateWeighted(total, rows, weight = 'weight') {
  const denominator = rows.reduce((n, row) => n + BigInt(row[weight]), 0n)
  if (denominator === 0n || total <= 0) return rows.map(row => ({ ...row, amountCents: 0 }))
  const allocated = rows.map(row => {
    const numerator = BigInt(total) * BigInt(row[weight])
    return { ...row, amountCents: Number(numerator / denominator), remainder: numerator % denominator }
  })
  let remainder = total - allocated.reduce((n, row) => n + row.amountCents, 0)
  for (const row of [...allocated].sort((a, b) => a.remainder === b.remainder ? a.id.localeCompare(b.id) : a.remainder > b.remainder ? -1 : 1)) {
    if (remainder-- <= 0) break
    row.amountCents++
  }
  return allocated.map(({ remainder: _, ...row }) => row)
}

export function partnerCapitalReport(state, asOf, freeCashCents) {
  const activeEntries = state.entries.filter(e => e.status !== 'cancelled')
  const settled = activeEntries.filter(e => e.status === 'settled' && e.settledDate <= asOf)
  const total = (rows, category) => rows.filter(e => e.category === category).reduce((n, e) => n + e.amountCents, 0)
  const rows = state.partners.map(partner => {
    const historical = partner.openingDate && partner.openingDate <= asOf
    const cash = settled.filter(e => e.partnerId === partner.id)
    const pending = activeEntries.filter(e => e.partnerId === partner.id && e.status === 'open' && e.recognition === 'recognized')
    const capitalCents = (historical ? partner.openingCapitalCents || 0 : 0) + total(cash, 'capital_in')
    const lentCents = (historical ? partner.openingLoanCents || 0 : 0) + total(cash, 'loan_in')
    const repaidCents = (historical ? partner.openingRepaidCents || 0 : 0) + total(cash, 'loan_repayment')
    const pendingRepaymentCents = total(pending, 'loan_repayment')
    const outstandingCents = Math.max(0, lentCents - repaidCents)
    return { id: partner.id, name: partner.name, active: partner.active, shareBps: partner.shareBps,
      capitalCents, lentCents, repaidCents, pendingRepaymentCents, outstandingCents,
      netInvestmentCents: Math.max(0, capitalCents + lentCents - repaidCents - pendingRepaymentCents),
      excessCents: 0, repaymentCents: 0,
      profitPaidCents: total(cash, 'partner_distribution'), profitPendingCents: total(pending, 'partner_distribution') }
  })
  const participants = rows.filter(p => p.active && p.shareBps > 0)
  const quotasReady = participants.length > 0 && participants.reduce((n, p) => n + p.shareBps, 0) === 10000
  const minimum = quotasReady ? participants.reduce((a, b) => BigInt(a.netInvestmentCents) * BigInt(b.shareBps) <= BigInt(b.netInvestmentCents) * BigInt(a.shareBps) ? a : b) : null
  if (minimum) for (const row of participants) {
    const aligned = Number(BigInt(minimum.netInvestmentCents) * BigInt(row.shareBps) / BigInt(minimum.shareBps))
    row.excessCents = Math.max(0, row.netInvestmentCents - aligned)
  }
  const weighted = participants.map(p => ({ ...p, weight: Math.min(p.excessCents, Math.max(0, p.outstandingCents - p.pendingRepaymentCents)) }))
  const repayableExcessCents = weighted.reduce((n, p) => n + p.weight, 0)
  const currentMonth = asOf.slice(0, 7)
  const monthlyAllocatedCents = activeEntries.filter(e => e.category === 'loan_repayment' && e.partnerId && e.recognition === 'recognized' &&
    (e.status === 'settled' ? e.settledDate <= asOf && e.settledDate.slice(0, 7) === currentMonth : (e.sourcePeriod || e.competenceDate.slice(0, 7)) === currentMonth))
    .reduce((n, e) => n + e.amountCents, 0)
  const budgetBps = state.settings.partnerRepaymentBps ?? 2500
  const ready = quotasReady && state.settings.cashTargetCents != null
  // Restore this month's allocations before applying the monthly ceiling. A second click cannot reset the cap.
  const budgetBase = Math.max(0, freeCashCents + monthlyAllocatedCents)
  const ceiling = Number(BigInt(budgetBase) * BigInt(budgetBps) / 10000n)
  const availableBudgetCents = ready ? Math.max(0, Math.min(freeCashCents, ceiling - monthlyAllocatedCents)) : 0
  const plannedCents = Math.min(availableBudgetCents, repayableExcessCents)
  const payments = allocateWeighted(plannedCents, weighted)
  for (const row of rows) row.repaymentCents = payments.find(p => p.id === row.id)?.amountCents || 0
  const unattributedCents = settled.filter(e => ['capital_in', 'loan_in'].includes(e.category) && !e.partnerId).reduce((n, e) => n + e.amountCents, 0)
  return { policy: 'excess_first', budgetBps, availableBudgetCents, plannedCents, repayableExcessCents, monthlyAllocatedCents, ready, rows, unattributedCents }
}
