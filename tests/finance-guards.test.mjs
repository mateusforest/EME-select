import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { applyFinanceCommand, emptyFinance, financeReport } from '../shared/finance.mjs'
import { allocateWeighted } from '../shared/finance-partners.mjs'

const context = { actorId: randomUUID(), now: '2026-10-15T15:00:00Z', members: [], properties: [] }
const apply = (state, type, data) => applyFinanceCommand(state, { type, data }, context)
const report = (state, asOf = '2026-10-15') => financeReport(state, { from: '2026-10-01', to: '2026-10-31', asOf })
const setup = ({ cash = 10_000_000, loan = 20_000_000, thirdParty = 0 } = {}) => {
  let state = apply(emptyFinance(), 'account.save', { name: 'Banco teste', openingDate: '2026-01-01', openingBalanceCents: cash, openingThirdPartyCents: thirdParty })
  state = apply(state, 'partner.save', { name: 'Sócio A', shareBps: 5000, openingDate: '2026-01-01', openingLoanCents: loan })
  state = apply(state, 'partner.save', { name: 'Sócio B', shareBps: 5000 })
  return apply(state, 'settings.save', { cashTargetCents: 0, partnerRepaymentBps: 2500 })
}
const entry = (state, category, amountCents, extra = {}) => apply(state, 'entry.save', {
  description: 'Movimento adversarial', category, amountCents, recognition: 'recognized', competenceDate: '2026-10-01', dueDate: '2026-10-15', ...extra,
})
const settle = (state, entryId = state.entries.at(-1).id, settledDate = '2026-10-15') => apply(state, 'entry.settle', { id: entryId, accountId: state.accounts[0].id, settledDate })
const plan = (state, type = 'repayment.plan', extra = {}) => apply(state, type, { from: '2026-10-01', to: '2026-10-31', dueDate: '2026-10-15', reason: 'Deliberação dos sócios para este mês', ...extra })

test('guard: a manual profit withdrawal cannot bypass the other partner share', () => {
  let state = setup({ loan: 0 })
  state = settle(entry(state, 'sale_fee', 10_000_000))
  state = entry(state, 'partner_distribution', 8_000_000, { partnerId: state.partners[0].id })
  assert.throws(() => settle(state), /participação|sócio|plano/i)
  state = apply(state, 'entry.save', { id: state.entries.at(-1).id, amountCents: 5_000_000 })
  state = settle(state)
  assert.equal(report(state).partnerCapital.rows[0].profitPaidCents, 5_000_000)
})

test('guard: changing the displayed month does not refresh this month repayment cap', () => {
  let state = plan(setup())
  assert.equal(report(state).partnerCapital.monthlyAllocatedCents, 2_500_000)
  assert.throws(() => plan(state, 'repayment.plan', { from: '2026-09-01', to: '2026-09-30' }))
})

test('guard: a manually entered repayment cannot exceed the configured monthly cap', () => {
  let state = setup()
  state = entry(state, 'loan_repayment', 3_000_000, { partnerId: state.partners[0].id })
  assert.throws(() => settle(state), /mensal|teto|limite/i)
})

test('guard: backdated repayments cannot repeatedly consume a fresh plan budget for the same payment month', () => {
  const state = plan(setup())
  const before = structuredClone(state)
  // Planned repayments belong to their creation timeline; old payments use the partner history.
  assert.throws(() => settle(state, state.entries.at(-1).id, '2026-09-30'), /anteceder a programação|mensal|teto|limite/i)
  assert.deepEqual(state, before)
})

test('guard: a prior-month pending plan cannot bypass the payment month cap already reserved by another plan', () => {
  let state = applyFinanceCommand(setup(), { type: 'repayment.plan', data: { from: '2026-09-01', to: '2026-09-30', dueDate: '2026-09-30', reason: 'Deliberação aprovada em setembro' } }, { ...context, now: '2026-09-15T15:00:00Z' })
  const priorMonthRepayment = state.entries.at(-1).id
  state = plan(state)
  assert.equal(report(state).partnerCapital.monthlyAllocatedCents, 1_875_000)
  assert.throws(() => settle(state, priorMonthRepayment), /mensal|teto|limite/i)
})

test('guard: principal must exist on the effective date of a backdated repayment', () => {
  let state = setup({ loan: 0 })
  const partnerId = state.partners[0].id
  state = settle(entry(state, 'loan_in', 5_000_000, { partnerId }), undefined, '2026-10-10')
  state = entry(state, 'loan_repayment', 2_000_000, { partnerId, competenceDate: '2026-09-30' })
  assert.throws(() => settle(state, state.entries.at(-1).id, '2026-09-30'), /saldo|empréstimo|histórico|data/i)
})

test('guard: cancelling a prioritized repayment revalidates previously planned profit withdrawals', () => {
  let state = setup({ cash: 30_000_000, loan: 6_000_000 })
  state = settle(entry(state, 'sale_fee', 10_000_000))
  state = plan(state)
  const repayment = state.entries.find(e => e.category === 'loan_repayment')
  state = plan(state, 'distribution.plan')
  const distribution = state.entries.find(e => e.category === 'partner_distribution')
  state = apply(state, 'entry.cancel', { id: repayment.id, reason: 'A compensação não foi aprovada pelos sócios' })
  assert.equal(report(state).partnerCapital.repayableExcessCents, 6_000_000)
  assert.throws(() => settle(state, distribution.id), /compensa|reembols|aportes/i)
})

test('guard: third-party money is excluded from the repayment budget', () => {
  const result = report(setup({ cash: 10_000_000, thirdParty: 9_000_000 }))
  assert.equal(result.cash.availableCents, 1_000_000)
  assert.equal(result.partnerCapital.plannedCents, 250_000)
})

test('guard: cancelling the third-party receipt cannot leave an unsupported retained fee distributable', () => {
  let state = setup({ loan: 0 })
  state = settle(entry(state, 'third_party_in', 1_000_000))
  const receipt = state.entries.at(-1).id
  state = settle(entry(state, 'management_fee_retained', 1_000_000))
  const retainedFee = state.entries.at(-1).id
  const before = structuredClone(state)
  assert.throws(() => apply(state, 'entry.cancel', { id: receipt, reason: 'Recebimento de terceiros registrado por engano' }), /retenções|repasses|terceiros/i)
  assert.deepEqual(state, before)
  // The operator can recover by correcting the dependent retained fee first.
  state = apply(state, 'entry.cancel', { id: retainedFee, reason: 'Corrigir a taxa antes do recebimento lançado por engano' })
  state = apply(state, 'entry.cancel', { id: receipt, reason: 'Recebimento de terceiros registrado por engano' })
  assert.equal(report(state).cash.balanceCents, 10_000_000)
  assert.throws(() => plan(state, 'distribution.plan'), /terceiros|saldo|lucro|recebido/i)
})

test('guard: centavo allocation conserves value and never exceeds available individual principal', () => {
  for (let total = 1; total <= 100; total++) {
    const rows = [{ id: 'a', weight: 33 }, { id: 'b', weight: 33 }, { id: 'c', weight: 34 }]
    const allocated = allocateWeighted(total, rows)
    assert.equal(allocated.reduce((sum, row) => sum + row.amountCents, 0), total)
    assert.ok(allocated.every(row => row.amountCents >= 0 && row.amountCents <= row.weight))
  }
})

test('guard: cancelling an unapproved plan restores availability and lets the user replace it', () => {
  let state = plan(setup())
  state = apply(state, 'entry.cancel', { id: state.entries.at(-1).id, reason: 'Valor digitado incorretamente' })
  assert.equal(report(state).partnerCapital.plannedCents, 2_500_000)
  state = plan(state, 'repayment.plan', { amountCents: 1_000_000 })
  assert.equal(report(state).partnerCapital.monthlyAllocatedCents, 1_000_000)
})
