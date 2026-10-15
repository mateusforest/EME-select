import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { applyFinanceCommand, emptyFinance, financeReport } from '../shared/finance.mjs'

// Business regressions: cash, earned profit and movements with owners are different balances.
const reais = value => Math.round(value * 100)
const context = { actorId: randomUUID(), now: '2026-10-15T15:00:00Z', members: [], properties: [] }
const apply = (state, type, data) => applyFinanceCommand(state, { type, data }, context)
const report = (state, from = '2026-10-01', to = '2026-10-31') => financeReport(state, { from, to, asOf: '2026-10-15' })
const setup = (opening = 0) => {
  let state = apply(emptyFinance(), 'account.save', { name: 'Banco da imobiliária', kind: 'bank', openingDate: '2026-01-01', openingBalanceCents: reais(opening) })
  state = apply(state, 'partner.save', { name: 'Sócio responsável', shareBps: 10000 })
  state = apply(state, 'settings.save', { cashTargetCents: 0 })
  return state
}
const add = (state, category, amount, competenceDate = '2026-10-01', options = {}) => apply(state, 'entry.save', {
  description: `Movimento ${category}`,
  category,
  amountCents: reais(amount),
  recognition: 'recognized',
  competenceDate,
  dueDate: competenceDate,
  ...options,
})
const settleLast = (state, settledDate = '2026-10-01') => apply(state, 'entry.settle', {
  id: state.entries.at(-1).id,
  accountId: state.accounts[0].id,
  settledDate,
})

test('opening cash of R$50,000 is neither period revenue nor profit available for owners', () => {
  const result = report(setup(50000))
  assert.equal(result.cash.balanceCents, reais(50000))
  assert.equal(result.period.receivedCents, 0)
  assert.equal(result.dre.combined.revenueCents, 0)
  assert.equal(result.dre.combined.netProfitCents, 0)
  assert.equal(result.distribution.eligibleCents, 0)
})

test('a settled capital contribution increases cash without generating revenue or profit', () => {
  let state = setup()
  state = settleLast(add(state, 'capital_in', 50000, '2026-10-01', { partnerId: state.partners[0].id }))
  const result = report(state)
  assert.equal(result.cash.balanceCents, reais(50000))
  assert.equal(result.dre.combined.revenueCents, 0)
  assert.equal(result.dre.combined.netProfitCents, 0)
  assert.equal(result.distribution.eligibleCents, 0)
})

test('R$100,000 of recognized fees change DRE before receipt, then cash rises from R$50,000 to R$150,000', () => {
  let state = add(setup(50000), 'sale_fee', 100000)
  const beforeReceipt = report(state)
  assert.equal(beforeReceipt.cash.balanceCents, reais(50000))
  assert.equal(beforeReceipt.period.receivedCents, 0)
  assert.equal(beforeReceipt.dre.combined.revenueCents, reais(100000))
  assert.equal(beforeReceipt.dre.combined.netProfitCents, reais(100000))
  assert.equal(beforeReceipt.distribution.eligibleCents, 0)

  state = settleLast(state)
  const afterReceipt = report(state)
  assert.equal(afterReceipt.cash.balanceCents, reais(150000))
  assert.equal(afterReceipt.period.receivedCents, reais(100000))
  assert.equal(afterReceipt.dre.combined.revenueCents, reais(100000))
  assert.equal(afterReceipt.dre.combined.netProfitCents, reais(100000))
  assert.equal(afterReceipt.distribution.eligibleCents, reais(100000))
})

test('external loan principal received and repaid moves cash without becoming revenue or expense', () => {
  let state = setup()
  state = settleLast(add(state, 'loan_in', 50000, '2026-10-01', { notes: 'Empréstimo bancário, sem sócio mutuante' }))
  state = settleLast(add(state, 'loan_repayment', 20000, '2026-10-01', { notes: 'Amortização do principal bancário' }))
  const result = report(state)
  assert.equal(result.cash.balanceCents, reais(30000))
  assert.equal(result.dre.combined.revenueCents, 0)
  assert.equal(result.dre.combined.netProfitCents, 0)
  assert.equal(result.distribution.eligibleCents, 0)
})

test('prior accumulated loss reduces distributable profit even when the selected month is profitable', () => {
  let state = setup(100000)
  state = settleLast(add(state, 'other_expense', 60000, '2026-07-10'), '2026-07-10')
  state = settleLast(add(state, 'sale_fee', 100000, '2026-08-10'), '2026-08-10')
  const result = report(state, '2026-08-01', '2026-08-31')
  assert.equal(result.cash.balanceCents, reais(140000))
  assert.equal(result.dre.combined.netProfitCents, reais(100000))
  assert.equal(result.distribution.eligibleCents, reais(40000))
})

test('changing the report range cannot redistribute profit already paid in a later month', () => {
  let state = setup(50000)
  state = settleLast(add(state, 'sale_fee', 100000, '2026-08-10'), '2026-08-10')
  // Existing settled records can predate the stricter monthly planning rules.
  state = add(state, 'partner_distribution', 60000, '2026-09-10', { partnerId: state.partners[0].id })
  state.entries.at(-1).status = 'settled'
  state.entries.at(-1).accountId = state.accounts[0].id
  state.entries.at(-1).settledDate = '2026-09-10'
  const result = report(state, '2026-08-01', '2026-08-31')
  assert.equal(result.cash.balanceCents, reais(90000))
  assert.equal(result.dre.combined.netProfitCents, reais(100000))
  assert.equal(result.distribution.eligibleCents, reais(40000))
})

const setupOwners = ({ opening = 100000, capitalA = 20000, loanA = 60000, capitalB = 20000, loanB = 0, shareA = 5000, shareB = 5000, target = 0 } = {}) => {
  let state = apply(emptyFinance(), 'account.save', {
    name: 'Conta com histórico conciliado', kind: 'bank', openingDate: '2026-01-01', openingBalanceCents: reais(opening),
  })
  state = apply(state, 'partner.save', { name: 'Sócio A', shareBps: shareA, openingDate: '2026-01-01', openingCapitalCents: reais(capitalA), openingLoanCents: reais(loanA), openingRepaidCents: 0 })
  state = apply(state, 'partner.save', { name: 'Sócio B', shareBps: shareB, openingDate: '2026-01-01', openingCapitalCents: reais(capitalB), openingLoanCents: reais(loanB), openingRepaidCents: 0 })
  if (target !== null) state = apply(state, 'settings.save', { cashTargetCents: reais(target) })
  return state
}
const plan = (state, type, amount) => apply(state, type, {
  from: '2026-10-01', to: '2026-10-31', dueDate: '2026-10-15',
  reason: 'Deliberação mensal documentada pelos sócios',
  ...(amount === undefined ? {} : { amountCents: reais(amount) }),
})
const ownerRows = state => report(state).partnerCapital.rows

test('opening capital and loan history identify owners without duplicating bank cash or DRE', () => {
  const state = setupOwners()
  const result = report(state)
  const [ownerA, ownerB] = result.partnerCapital.rows
  assert.equal(result.cash.balanceCents, reais(100000))
  assert.equal(result.period.receivedCents, 0)
  assert.equal(result.dre.combined.netProfitCents, 0)
  assert.equal(ownerA.capitalCents, reais(20000))
  assert.equal(ownerA.lentCents, reais(60000))
  assert.equal(ownerA.netInvestmentCents, reais(80000))
  assert.equal(ownerA.outstandingCents, reais(60000))
  assert.equal(ownerA.excessCents, reais(60000))
  assert.equal(ownerB.netInvestmentCents, reais(20000))
  assert.equal(ownerB.excessCents, 0)
  assert.equal(result.partnerCapital.repayableExcessCents, reais(60000))
})

test('equalization compares investment to ownership shares rather than nominal contribution amounts', () => {
  const state = setupOwners({ opening: 80000, capitalA: 60000, loanA: 0, capitalB: 20000, shareA: 7500, shareB: 2500 })
  assert.deepEqual(ownerRows(state).map(row => row.excessCents), [0, 0])
  assert.equal(report(state).partnerCapital.plannedCents, 0)
})

test('unequal paid-in capital alone never creates an automatically repayable loan', () => {
  let state = setupOwners({ capitalA: 80000, loanA: 0 })
  state = settleLast(add(state, 'sale_fee', 100000))
  const result = report(state)
  assert.equal(result.partnerCapital.rows[0].excessCents, reais(60000))
  assert.equal(result.partnerCapital.rows[0].outstandingCents, 0)
  assert.equal(result.partnerCapital.repayableExcessCents, 0)
  assert.equal(result.partnerCapital.plannedCents, 0)
  assert.equal(result.distribution.eligibleCents, reais(100000))
  assert.throws(() => plan(state, 'repayment.plan'))
})

test('historical principal repaid reduces owner investment and debt without replaying cash movements', () => {
  let state = setupOwners()
  state = apply(state, 'partner.save', { ...state.partners[0], openingRepaidCents: reais(10000) })
  const result = report(state)
  assert.equal(result.cash.balanceCents, reais(100000))
  assert.equal(result.partnerCapital.rows[0].repaidCents, reais(10000))
  assert.equal(result.partnerCapital.rows[0].outstandingCents, reais(50000))
  assert.equal(result.partnerCapital.rows[0].netInvestmentCents, reais(70000))
  assert.equal(result.dre.combined.netProfitCents, 0)
})

test('an explicit cash target is required before owner planning, including when that target is zero', () => {
  const state = setupOwners({ target: null })
  assert.equal(report(state).partnerCapital.ready, false)
  assert.throws(() => plan(state, 'repayment.plan'))
  const configured = apply(state, 'settings.save', { cashTargetCents: 0 })
  assert.equal(report(configured).partnerCapital.ready, true)
})

test('repayment priority blocks distributions while refundable excess remains unplanned', () => {
  let state = setupOwners()
  state = settleLast(add(state, 'sale_fee', 100000))
  const result = report(state)
  assert.equal(result.distribution.periodProfitCents, reais(100000))
  assert.equal(result.distribution.eligibleCents, 0)
  assert.equal(result.partnerCapital.plannedCents, reais(50000))
  assert.throws(() => plan(state, 'distribution.plan', 1))
})

test('repayment plans reserve principal, preserve cash until payment, and cannot multiply a monthly 25% cap', () => {
  let state = setupOwners()
  assert.equal(report(state).partnerCapital.availableBudgetCents, reais(25000))
  state = plan(state, 'repayment.plan')
  const planned = state.entries.filter(entry => entry.category === 'loan_repayment' && entry.status !== 'cancelled')
  assert.equal(planned.reduce((sum, entry) => sum + entry.amountCents, 0), reais(25000))
  assert.equal(planned.every(entry => entry.recognition === 'recognized' && entry.status === 'open'), true)
  let result = report(state)
  assert.equal(result.cash.balanceCents, reais(100000))
  assert.equal(result.partnerCapital.monthlyAllocatedCents, reais(25000))
  assert.equal(result.partnerCapital.availableBudgetCents, 0)
  assert.equal(result.partnerCapital.rows[0].pendingRepaymentCents, reais(25000))
  assert.equal(result.partnerCapital.rows[0].netInvestmentCents, reais(55000))
  assert.equal(result.dre.combined.netProfitCents, 0)
  assert.throws(() => plan(state, 'repayment.plan', 1))
  state = apply(state, 'entry.settle', { id: planned[0].id, accountId: state.accounts[0].id, settledDate: '2026-10-15' })
  result = report(state)
  assert.equal(result.cash.balanceCents, reais(75000))
  assert.equal(result.partnerCapital.monthlyAllocatedCents, reais(25000))
  assert.equal(result.partnerCapital.availableBudgetCents, 0)
  assert.equal(result.partnerCapital.rows[0].pendingRepaymentCents, 0)
  assert.equal(result.partnerCapital.rows[0].repaidCents, reais(25000))
  assert.equal(result.partnerCapital.rows[0].outstandingCents, reais(35000))
  assert.equal(result.partnerCapital.rows[0].netInvestmentCents, reais(55000))
  assert.throws(() => plan(state, 'repayment.plan', 1))
})

test('multiple partial plans share one monthly repayment budget', () => {
  let state = plan(setupOwners(), 'repayment.plan', 10000)
  assert.equal(report(state).partnerCapital.availableBudgetCents, reais(15000))
  state = plan(state, 'repayment.plan', 15000)
  assert.equal(report(state).partnerCapital.monthlyAllocatedCents, reais(25000))
  assert.equal(report(state).partnerCapital.availableBudgetCents, 0)
  assert.throws(() => plan(state, 'repayment.plan', 1))
})

test('cash protection and due commitments reduce the base used for repayment budgeting', () => {
  let state = setupOwners({ target: 20000 })
  state = add(state, 'other_expense', 10000)
  const result = report(state)
  assert.equal(result.distribution.freeCashCents, reais(70000))
  assert.equal(result.partnerCapital.availableBudgetCents, reais(17500))
  assert.equal(result.partnerCapital.plannedCents, reais(17500))
})

test('once every refundable excess is reserved, remaining earned cash may be planned as profit', () => {
  let state = setupOwners({ opening: 300000 })
  state = settleLast(add(state, 'sale_fee', 100000))
  state = plan(state, 'repayment.plan')
  const result = report(state)
  assert.equal(result.partnerCapital.rows[0].pendingRepaymentCents, reais(60000))
  assert.equal(result.partnerCapital.rows[0].netInvestmentCents, reais(20000))
  assert.equal(result.partnerCapital.repayableExcessCents, 0)
  assert.equal(result.distribution.eligibleCents, reais(100000))
})

test('distribution planning reserves profit for every partner without changing DRE or bank balance', () => {
  let state = setupOwners({ opening: 40000, loanA: 0 })
  state = settleLast(add(state, 'sale_fee', 100000))
  state = plan(state, 'distribution.plan')
  const result = report(state)
  const distributions = state.entries.filter(entry => entry.category === 'partner_distribution')
  assert.equal(distributions.length, 2)
  assert.deepEqual(distributions.map(entry => entry.amountCents).sort((a, b) => a - b), [reais(50000), reais(50000)])
  assert.equal(distributions.every(entry => entry.status === 'open' && entry.recognition === 'recognized'), true)
  assert.equal(result.distribution.declaredCents, reais(100000))
  assert.equal(result.distribution.pendingCents, reais(100000))
  assert.equal(result.distribution.paidCents, 0)
  assert.equal(result.distribution.eligibleCents, 0)
  assert.equal(result.cash.balanceCents, reais(140000))
  assert.equal(result.dre.combined.netProfitCents, reais(100000))
  assert.throws(() => plan(state, 'distribution.plan', 1))
})

test('settling reserved profit reduces cash once and moves partner totals from pending to paid', () => {
  let state = setupOwners({ opening: 40000, loanA: 0 })
  state = settleLast(add(state, 'sale_fee', 100000))
  state = plan(state, 'distribution.plan')
  const distribution = state.entries.find(entry => entry.category === 'partner_distribution')
  state = apply(state, 'entry.settle', { id: distribution.id, accountId: state.accounts[0].id, settledDate: '2026-10-15' })
  const result = report(state)
  assert.equal(result.cash.balanceCents, reais(90000))
  assert.equal(result.distribution.pendingCents, reais(50000))
  assert.equal(result.distribution.paidCents, reais(50000))
  assert.equal(result.distribution.declaredCents, reais(100000))
  const owner = result.partnerCapital.rows.find(row => row.id === distribution.partnerId)
  assert.equal(owner.profitPaidCents, reais(50000))
  assert.equal(owner.profitPendingCents, 0)
  assert.equal(result.distribution.eligibleCents, 0)
  assert.equal(result.dre.combined.netProfitCents, reais(100000))
})

test('over-budget planning rejects the whole command without partially creating owner entries', () => {
  const state = setupOwners()
  const before = structuredClone(state)
  assert.throws(() => plan(state, 'repayment.plan', 25001))
  assert.deepEqual(state, before)
})

test('a manual repayment cannot settle principal that the identified partner never lent', () => {
  let state = setupOwners()
  state = add(state, 'loan_repayment', 1, '2026-10-01', { partnerId: state.partners[1].id })
  const before = structuredClone(state)
  assert.throws(() => settleLast(state))
  assert.deepEqual(state, before)
})

test('entry.save with immediate settlement is atomic when owner withdrawal is invalid', () => {
  const state = setup(50000)
  const before = structuredClone(state)
  assert.throws(() => add(state, 'partner_distribution', 1, '2026-10-01', {
    partnerId: state.partners[0].id, accountId: state.accounts[0].id,
    settleNow: true, settledDate: '2026-10-01',
  }))
  assert.deepEqual(state, before)
})

test('cancelling an unpaid repayment restores its reservation and allows one replacement within the same cap', () => {
  let state = plan(setupOwners(), 'repayment.plan')
  const original = state.entries.find(entry => entry.category === 'loan_repayment')
  state = apply(state, 'entry.cancel', { id: original.id, reason: 'Vencimento corrigido antes de qualquer pagamento' })
  assert.equal(report(state).partnerCapital.monthlyAllocatedCents, 0)
  assert.equal(report(state).partnerCapital.availableBudgetCents, reais(25000))
  assert.equal(ownerRows(state)[0].pendingRepaymentCents, 0)
  state = plan(state, 'repayment.plan')
  const active = state.entries.filter(entry => entry.category === 'loan_repayment' && entry.status !== 'cancelled')
  assert.equal(active.reduce((sum, entry) => sum + entry.amountCents, 0), reais(25000))
  assert.equal(state.entries.find(entry => entry.id === original.id).status, 'cancelled')
  assert.equal(report(state).partnerCapital.availableBudgetCents, 0)
  assert.equal(report(state).cash.balanceCents, reais(100000))
})

test('selecting a historical report month cannot reset the current repayment budget', () => {
  const state = plan(setupOwners(), 'repayment.plan')
  assert.throws(() => apply(state, 'repayment.plan', {
    from: '2026-09-01', to: '2026-09-30', dueDate: '2026-10-15', amountCents: 100,
    reason: 'Mesmo reembolso tentado em outro filtro mensal',
  }))
})

test('cancelling priority repayments after a profit plan prevents settlement until priority is restored', () => {
  let state = setupOwners({ opening: 300000 })
  state = settleLast(add(state, 'sale_fee', 100000))
  state = plan(state, 'repayment.plan')
  state = plan(state, 'distribution.plan')
  const repayment = state.entries.find(entry => entry.category === 'loan_repayment')
  const distribution = state.entries.find(entry => entry.category === 'partner_distribution')
  state = apply(state, 'entry.cancel', { id: repayment.id, reason: 'Reembolso desprogramado para revisão' })
  assert.equal(report(state).partnerCapital.repayableExcessCents, reais(60000))
  const before = structuredClone(state)
  assert.throws(() => apply(state, 'entry.settle', {
    id: distribution.id, accountId: state.accounts[0].id, settledDate: '2026-10-15',
  }))
  assert.deepEqual(state, before)
})

test('replanning a cancelled partner installment does not transfer its profit entitlement to the other owner', () => {
  let state = setupOwners({ opening: 40000, loanA: 0 })
  state = settleLast(add(state, 'sale_fee', 100000))
  state = plan(state, 'distribution.plan')
  const cancelled = state.entries.find(entry => entry.category === 'partner_distribution' && entry.partnerId === state.partners[0].id)
  state = apply(state, 'entry.cancel', { id: cancelled.id, reason: 'Parcela do primeiro sócio precisa de nova programação' })
  state = plan(state, 'distribution.plan')
  const totals = state.partners.map(partner => state.entries
    .filter(entry => entry.category === 'partner_distribution' && entry.status !== 'cancelled' && entry.partnerId === partner.id)
    .reduce((sum, entry) => sum + entry.amountCents, 0))
  assert.deepEqual(totals, [reais(50000), reais(50000)])
  assert.equal(report(state).distribution.eligibleCents, 0)
})

const profitWithWithholding = () => {
  let state = settleLast(add(setup(50000), 'sale_fee', 100000))
  state = plan(state, 'distribution.plan')
  const distribution = state.entries.find(entry => entry.category === 'partner_distribution')
  state = apply(state, 'entry.settle', {
    id: distribution.id, accountId: state.accounts[0].id, settledDate: '2026-10-15',
    withholdingCents: reais(10000), withholdingDueDate: '2026-10-20',
  })
  return { state, distributionId: distribution.id }
}

test('manual withholding preserves gross profit entitlement while only the net payment leaves the bank', () => {
  const { state, distributionId } = profitWithWithholding()
  const result = report(state)
  const distribution = state.entries.find(entry => entry.id === distributionId)
  const tax = state.entries.find(entry => entry.category === 'partner_withholding')
  assert.equal(distribution.amountCents, reais(100000))
  assert.equal(distribution.withholdingCents, reais(10000))
  assert.equal(result.cash.balanceCents, reais(60000))
  assert.equal(result.period.paidCents, reais(90000))
  assert.equal(result.dre.combined.netProfitCents, reais(100000))
  assert.equal(result.distribution.paidCents, reais(100000))
  assert.equal(result.distribution.eligibleCents, 0)
  assert.equal(result.partnerCapital.rows[0].profitPaidCents, reais(100000))
  assert.equal(tax.amountCents, reais(10000))
  assert.equal(tax.status, 'open')
  assert.equal(tax.recognition, 'recognized')
  assert.equal(tax.sourceEntryId, distributionId)
  assert.equal(result.distribution.freeCashCents, reais(50000))
})

test('paying the withheld tax completes the gross cash outflow without a second DRE expense or owner distribution', () => {
  let { state } = profitWithWithholding()
  const tax = state.entries.find(entry => entry.category === 'partner_withholding')
  state = apply(state, 'entry.settle', { id: tax.id, accountId: state.accounts[0].id, settledDate: '2026-10-15' })
  const result = report(state)
  assert.equal(result.cash.balanceCents, reais(50000))
  assert.equal(result.period.paidCents, reais(100000))
  assert.equal(result.dre.combined.netProfitCents, reais(100000))
  assert.equal(result.distribution.paidCents, reais(100000))
  assert.equal(result.partnerCapital.rows[0].profitPaidCents, reais(100000))
  assert.equal(result.distribution.eligibleCents, 0)
  assert.throws(() => apply(state, 'entry.settle', { id: tax.id, accountId: state.accounts[0].id, settledDate: '2026-10-15' }))
})

test('cancelling a distribution also cancels its unpaid withholding reservation', () => {
  let { state, distributionId } = profitWithWithholding()
  state = apply(state, 'entry.cancel', { id: distributionId, reason: 'Registro integral corrigido por lançamento substituto' })
  const tax = state.entries.find(entry => entry.sourceEntryId === distributionId)
  assert.equal(tax.status, 'cancelled')
  assert.equal(report(state).cash.balanceCents, reais(150000))
  assert.equal(report(state).distribution.declaredCents, 0)
  assert.equal(report(state).distribution.eligibleCents, reais(100000))
})

test('a distribution cannot be cancelled after its linked withholding has been paid', () => {
  let { state, distributionId } = profitWithWithholding()
  const tax = state.entries.find(entry => entry.sourceEntryId === distributionId)
  state = apply(state, 'entry.settle', { id: tax.id, accountId: state.accounts[0].id, settledDate: '2026-10-15' })
  const before = structuredClone(state)
  assert.throws(() => apply(state, 'entry.cancel', { id: distributionId, reason: 'Tentativa de cancelar com tributo recolhido' }))
  assert.deepEqual(state, before)
})

test('withholding cannot exceed gross distribution and cannot silently attach to an unrelated category', () => {
  let state = settleLast(add(setup(50000), 'sale_fee', 100000))
  state = plan(state, 'distribution.plan')
  const distribution = state.entries.find(entry => entry.category === 'partner_distribution')
  assert.throws(() => apply(state, 'entry.settle', {
    id: distribution.id, accountId: state.accounts[0].id, settledDate: '2026-10-15',
    withholdingCents: reais(100001), withholdingDueDate: '2026-10-20',
  }))
  state = add(state, 'other_expense', 100)
  const before = structuredClone(state)
  assert.throws(() => apply(state, 'entry.settle', {
    id: state.entries.at(-1).id, accountId: state.accounts[0].id, settledDate: '2026-10-15',
    withholdingCents: reais(10), withholdingDueDate: '2026-10-20',
  }))
  assert.deepEqual(state, before)
})

const taxedOperation = (state, options = {}) => {
  const brokerId = randomUUID()
  return applyFinanceCommand(state, { type: 'operation.create', data: {
    title: 'Honorários com tributos informados', kind: 'sale', amountCents: 10000, taxCents: 1200,
    commissionBps: 5000, directCostCents: 0, reserveBps: 0, brokerId,
    competenceDate: '2026-10-01', dueDate: '2026-10-15', ...options,
  } }, { ...context, members: [{ id: brokerId, name: 'Corretor associado', role: 'corretor', active: true }] })
}

test('operation commission uses revenue after the informed tax deduction, without an assumed tax rate', () => {
  const state = taxedOperation(setup())
  const result = report(state)
  assert.equal(state.operations[0].commissionBaseCents, 8800)
  assert.equal(state.operations[0].commissionCents, 4400)
  assert.equal(result.dre.combined.revenueCents, 10000)
  assert.equal(result.dre.combined.deductionsCents, 1200)
  assert.equal(result.dre.combined.directCostCents, 4400)
  assert.equal(result.dre.combined.netProfitCents, 4400)
  assert.equal(result.cash.balanceCents, 0)
  assert.equal(result.distribution.eligibleCents, 0)
})

test('receiving a forecast operation recognizes its revenue, taxes, commission and direct costs together', () => {
  let state = taxedOperation(setup(), { recognition: 'forecast', directCostCents: 400 })
  const before = structuredClone(state)
  assert.equal(report(state).dre.combined.revenueCents, 0)
  assert.equal(report(state).dre.combined.netProfitCents, 0)
  assert.equal(state.entries.every(entry => entry.recognition === 'forecast'), true)
  const receipt = state.entries.find(entry => entry.category === 'sale_fee')
  state = apply(state, 'entry.settle', { id: receipt.id, accountId: state.accounts[0].id, settledDate: '2026-10-15' })
  const result = report(state)
  assert.equal(state.operations[0].recognition, 'recognized')
  assert.equal(state.entries.every(entry => entry.recognition === 'recognized'), true)
  assert.equal(state.entries.filter(entry => entry.status === 'settled').length, 1)
  assert.equal(before.entries.every(entry => entry.recognition === 'forecast'), true)
  assert.equal(result.cash.balanceCents, 10000)
  assert.equal(result.dre.combined.revenueCents, 10000)
  assert.equal(result.dre.combined.deductionsCents, 1200)
  assert.equal(result.dre.combined.directCostCents, 4800)
  assert.equal(result.dre.combined.netProfitCents, 4000)
  assert.equal(result.distribution.eligibleCents, 4000)
})

test('declared unpaid distributions reserve earned profit across report ranges without changing cash or DRE', () => {
  let state = setup(50000)
  state = settleLast(add(state, 'sale_fee', 100000, '2026-08-10'), '2026-08-10')
  state = add(state, 'partner_distribution', 60000, '2026-09-10', { partnerId: state.partners[0].id })
  const result = report(state, '2026-08-01', '2026-08-31')
  assert.equal(result.cash.balanceCents, reais(150000))
  assert.equal(result.dre.combined.netProfitCents, reais(100000))
  assert.equal(result.distribution.eligibleCents, reais(40000))
})
