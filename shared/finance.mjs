/** Manual management ledger. Amounts are BRL integer cents; percentages are basis points. */
export const DRE_GROUPS = Object.freeze([
  { id: 'revenue', label: 'Receita bruta da EME' },
  { id: 'deductions', label: 'Deduções da receita' },
  { id: 'direct_cost', label: 'Custos diretos das operações' },
  { id: 'opex', label: 'Despesas operacionais' },
  { id: 'financial_income', label: 'Receitas financeiras' },
  { id: 'financial_expense', label: 'Despesas financeiras' },
  { id: 'income_tax', label: 'Tributos sobre o resultado' },
])
const cat = (id, label, direction, dreGroup = null, recurringRevenue = false) => Object.freeze({ id, label, direction, dreGroup, recurringRevenue })
export const FINANCE_CATEGORIES = Object.freeze([
  cat('sale_fee', 'Honorários de venda', 'in', 'revenue'),
  cat('rental_fee', 'Honorários de intermediação de locação', 'in', 'revenue'),
  cat('management_fee', 'Taxa de administração cobrada separadamente', 'in', 'revenue', true),
  cat('management_fee_retained', 'Taxa de administração retida do aluguel', 'in', 'revenue', true),
  cat('recurring_revenue', 'Outras receitas recorrentes da EME', 'in', 'revenue', true),
  cat('other_revenue', 'Outras receitas da EME', 'in', 'revenue'),
  cat('revenue_deduction', 'Impostos e deduções da receita', 'out', 'deductions'),
  cat('broker_commission', 'Comissão de corretor', 'out', 'direct_cost'),
  cat('operation_cost', 'Outros custos diretos da operação', 'out', 'direct_cost'),
  cat('prolabore', 'Pró-labore', 'out', 'opex'),
  cat('marketing', 'Marketing e mídia', 'out', 'opex'),
  cat('materials', 'Materiais', 'out', 'opex'),
  cat('software', 'Sistemas e assinaturas', 'out', 'opex'),
  cat('rent', 'Aluguel e ocupação da empresa', 'out', 'opex'),
  cat('salaries', 'Equipe e encargos', 'out', 'opex'),
  cat('utilities', 'Energia, internet e serviços', 'out', 'opex'),
  cat('professional_services', 'Serviços profissionais', 'out', 'opex'),
  cat('other_expense', 'Outras despesas operacionais', 'out', 'opex'),
  cat('interest_income', 'Receitas financeiras', 'in', 'financial_income'),
  cat('bank_fees', 'Tarifas bancárias', 'out', 'financial_expense'),
  cat('interest_expense', 'Juros e encargos financeiros', 'out', 'financial_expense'),
  cat('income_tax', 'Tributos sobre o resultado', 'out', 'income_tax'),
  cat('third_party_in', 'Aluguel e outros valores recebidos de terceiros', 'in'),
  cat('third_party_out', 'Repasse de valores de terceiros', 'out'),
  cat('transfer', 'Transferência entre contas da EME', 'transfer'),
  cat('capital_in', 'Aporte de capital', 'in'),
  cat('loan_in', 'Empréstimo recebido', 'in'),
  cat('loan_repayment', 'Amortização de empréstimo (principal)', 'out'),
  cat('partner_distribution', 'Distribuição de lucros', 'out'),
  cat('investment', 'Investimentos e bens de capital', 'out'),
])
const categories = new Map(FINANCE_CATEGORIES.map(item => [item.id, item]))
const LIMIT = 1_000_000_000_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export class FinanceError extends Error {
  constructor(message, code = 'invalid_finance_command', status = 400) { super(message); this.name = 'FinanceError'; this.code = code; this.status = status }
}
const fail = (message, code, status) => { throw new FinanceError(message, code, status) }
const integer = (value, label, min = 0, max = LIMIT) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${label}: informe um valor inteiro válido.`)
  return value
}
const text = (value, label, max = 160, required = true) => {
  const result = typeof value === 'string' ? value.trim() : ''
  if ((required && result.length < 2) || result.length > max) fail(`${label}: informe entre ${required ? 2 : 0} e ${max} caracteres.`)
  return result
}
const date = (value, label = 'Data') => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label}: use uma data válida.`)
  const parsed = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > '2200-12-31') fail(`${label}: use uma data válida.`)
  return value
}
const month = (value, label = 'Mês') => { date(`${value}-01`, label); return value }
const choice = (value, choices, label) => { if (!choices.includes(value)) fail(`${label}: opção inválida.`); return value }
const bool = (value, fallback = true) => value === undefined ? fallback : typeof value === 'boolean' ? value : fail('Informe verdadeiro ou falso.')
const id = (value) => { if (typeof value !== 'string' || !UUID.test(value)) fail('Identificador inválido.'); return value.toLowerCase() }
const newId = value => value ? id(value) : globalThis.crypto.randomUUID()
const found = (list, value, label) => list.find(item => item.id === id(value)) || fail(`${label} não encontrado.`, 'finance_not_found', 404)
const optionalId = value => value === null || value === undefined || value === '' ? null : id(value)
const category = value => categories.get(value) || fail('Categoria financeira inválida.')
const retained = entry => entry.category === 'management_fee_retained'
const saoPauloDate = value => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const part = type => parts.find(item => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
const thirdPartyDelta = entry => entry.category === 'third_party_in' ? entry.amountCents : entry.category === 'third_party_out' || retained(entry) ? -entry.amountCents : 0
function heldThirdParty(state, asOf, propertyId = null) {
  const opening = propertyId ? 0 : sum(state.accounts.filter(item => item.openingDate <= asOf).map(item => item.openingThirdPartyCents || 0))
  return opening + sum(state.entries.filter(item => item.status === 'settled' && item.settledDate <= asOf && (!propertyId || item.propertyId === propertyId)).map(thirdPartyDelta))
}
const safeAdd = (a, b) => { const sum = a + b; if (!Number.isSafeInteger(sum)) fail('O total ultrapassa o limite de cálculo seguro.'); return sum }
const sum = list => list.reduce(safeAdd, 0)
export const percentCents = (amountCents, basisPoints) => {
  integer(amountCents, 'Valor'); integer(basisPoints, 'Percentual', 0, 10000)
  return Number((BigInt(amountCents) * BigInt(basisPoints) + 5000n) / 10000n)
}
export function emptyFinance() {
  return { version: 1, accounts: [], entries: [], recurrences: [], operations: [], partners: [], settings: { reserveBps: null, defaultCommissionBps: null, cashTargetCents: null, initialInvestmentCents: null }, adjustments: [] }
}
const metadata = (prior, context) => ({ createdAt: prior?.createdAt || context.now, updatedAt: context.now, createdBy: prior?.createdBy || context.actorId })
const put = (list, item) => { const index = list.findIndex(row => row.id === item.id); if (index < 0) list.push(item); else list[index] = item }
const link = (value, previousValue, items, label, requireActive = true) => {
  const result = optionalId(value)
  if (!result) return null
  if (result === previousValue) return result
  const row = items.find(item => item.id === result)
  if (!row || (requireActive && row.active === false)) fail(`${label}: selecione um cadastro ativo existente.`)
  return result
}
function dimensions(data, prior, state, context) {
  return {
    brokerId: link(data.brokerId, prior?.brokerId, context.members, 'Corretor'),
    propertyId: link(data.propertyId, prior?.propertyId, context.properties, 'Imóvel', false),
    partnerId: link(data.partnerId, prior?.partnerId, state.partners, 'Sócio'),
  }
}
function entryDraft(data, prior, state, context) {
  category(data.category)
  const result = {
    id: prior?.id || newId(data.id), description: text(data.description, 'Descrição'), category: data.category,
    amountCents: integer(data.amountCents, 'Valor', 1), recognition: choice(data.recognition || 'forecast', ['forecast', 'recognized'], 'Reconhecimento'),
    status: 'open', competenceDate: date(data.competenceDate, 'Competência'), dueDate: date(data.dueDate, 'Vencimento'),
    settledDate: null, accountId: optionalId(data.accountId), destinationAccountId: optionalId(data.destinationAccountId),
    behavior: choice(data.behavior || 'variable', ['fixed', 'variable'], 'Comportamento'), costCenter: text(data.costCenter, 'Centro de custo', 100, false),
    ...dimensions(data, prior, state, context), operationId: prior?.operationId || null, recurrenceId: prior?.recurrenceId || null,
    recurrenceMonth: prior?.recurrenceMonth || null, notes: text(data.notes, 'Observações', 1200, false), cancelReason: null,
    ...metadata(prior, context),
  }
  if (result.accountId) found(state.accounts, result.accountId, 'Conta')
  if (result.destinationAccountId) found(state.accounts, result.destinationAccountId, 'Conta de destino')
  if (result.category !== 'transfer' && result.destinationAccountId) fail('Conta de destino é exclusiva de transferências.')
  if (result.category === 'transfer' && result.accountId && result.accountId === result.destinationAccountId) fail('Escolha contas diferentes para a transferência.')
  if (result.category === 'partner_distribution' && !result.partnerId) fail('Selecione o sócio que receberá a distribuição.')
  return result
}
/** The caller persists this new state and an audit event atomically, with optimistic concurrency. */
export function applyFinanceCommand(input, command, rawContext) {
  if (!input || input.version !== 1) fail('Versão do financeiro não reconhecida.')
  if (!command || typeof command.type !== 'string' || !command.data || typeof command.data !== 'object' || Array.isArray(command.data)) fail('Comando financeiro inválido.')
  const context = { ...rawContext, now: rawContext.now || rawContext.nowISO }
  if (!context.now || !Number.isFinite(Date.parse(context.now))) fail('Data da operação inválida.')
  id(context.actorId)
  context.members ||= []; context.properties ||= []
  const today = date(saoPauloDate(context.now))
  const state = structuredClone(input)
  const data = command.data
  switch (command.type) {
    case 'account.save': {
      const prior = data.id ? state.accounts.find(item => item.id === id(data.id)) : null
      const merged = { ...prior, ...data }
      const result = { id: prior?.id || newId(data.id), name: text(merged.name, 'Nome da conta'), kind: choice(merged.kind || 'bank', ['bank', 'cash'], 'Tipo da conta'), bankName: text(merged.bankName, 'Banco', 120, false), openingDate: date(merged.openingDate, 'Data do saldo inicial'), openingBalanceCents: integer(merged.openingBalanceCents, 'Saldo inicial', -LIMIT), openingThirdPartyCents: integer(merged.openingThirdPartyCents ?? 0, 'Saldo inicial de terceiros'), active: bool(merged.active), ...metadata(prior, context) }
      if (result.openingDate > today) fail('O saldo inicial deve ter uma data atual ou passada.')
      if (result.openingThirdPartyCents > Math.max(0, result.openingBalanceCents)) fail('O saldo inicial de terceiros não pode superar o saldo da conta.')
      if (prior && state.entries.some(item => item.status === 'settled' && [item.accountId, item.destinationAccountId].includes(prior.id)) && (result.openingDate !== prior.openingDate || result.openingBalanceCents !== prior.openingBalanceCents || result.openingThirdPartyCents !== prior.openingThirdPartyCents)) fail('Uma conta com baixas tem saldo inicial preservado. Registre um lançamento de correção.')
      put(state.accounts, result); break
    }
    case 'entry.save': {
      const prior = data.id ? state.entries.find(item => item.id === id(data.id)) : null
      if (prior && prior.status !== 'open') fail('Lançamentos baixados ou cancelados não podem ser editados.')
      if (prior?.operationId) fail('Lançamentos de uma operação preservam os valores originais. Cancele e registre a correção.')
      if (data.operationId || data.recurrenceId || data.recurrenceMonth) fail('Vínculos automáticos devem ser criados pela operação ou recorrência.')
      put(state.entries, entryDraft({ ...prior, ...data }, prior, state, context)); break
    }
    case 'entry.settle': {
      const prior = found(state.entries, data.id, 'Lançamento')
      if (prior.status !== 'open') fail('Apenas lançamentos em aberto podem receber baixa.')
      const account = found(state.accounts, data.accountId, 'Conta')
      if (!account.active) fail('Selecione uma conta ativa.')
      const settledDate = date(data.settledDate, 'Data da baixa')
      if (settledDate > today) fail('Uma baixa real não pode estar no futuro. Mantenha o lançamento em aberto.')
      if (settledDate < account.openingDate) fail('A baixa não pode anteceder o saldo inicial da conta.')
      if (retained(prior)) {
        const heldAtDate = heldThirdParty(state, settledDate, prior.propertyId)
        const heldNow = heldThirdParty(state, today, prior.propertyId)
        const totalAtDate = heldThirdParty(state, settledDate)
        const totalNow = heldThirdParty(state, today)
        if (Math.min(heldAtDate, heldNow, totalAtDate, totalNow) < prior.amountCents) fail(prior.propertyId ? 'Não há saldo suficiente de terceiros vinculado a este imóvel para reter a taxa.' : 'Não há saldo suficiente de terceiros para reter a taxa.')
      }
      let destinationAccountId = null
      if (prior.category === 'transfer') {
        const destination = found(state.accounts, data.destinationAccountId, 'Conta de destino')
        if (!destination.active || destination.id === account.id) fail('Escolha uma conta de destino ativa e diferente da origem.')
        if (settledDate < destination.openingDate) fail('A transferência não pode anteceder o saldo inicial do destino.')
        destinationAccountId = destination.id
      }
      put(state.entries, { ...prior, status: 'settled', recognition: 'recognized', accountId: account.id, destinationAccountId, settledDate, updatedAt: context.now }); break
    }
    case 'entry.cancel': {
      const prior = found(state.entries, data.id, 'Lançamento')
      if (prior.status === 'cancelled') fail('Este lançamento já está cancelado.')
      if (prior.operationId) fail('Cancele a operação para estornar juntos a receita, a comissão e os custos vinculados.')
      put(state.entries, { ...prior, status: 'cancelled', cancelReason: text(data.reason, 'Motivo do cancelamento', 600), updatedAt: context.now }); break
    }
    case 'recurrence.save': {
      const prior = data.id ? state.recurrences.find(item => item.id === id(data.id)) : null
      const merged = { ...prior, ...data }
      const kind = category(merged.category)
      if (kind.direction === 'transfer' || ['partner_distribution', 'capital_in', 'loan_in', 'investment'].includes(kind.id)) fail('Esta categoria exige um lançamento individual.')
      const result = { id: prior?.id || newId(data.id), name: text(merged.name, 'Nome da recorrência'), category: kind.id, amountCents: integer(merged.amountCents, 'Valor mensal', 1), behavior: choice(merged.behavior || 'fixed', ['fixed', 'variable'], 'Comportamento'), costCenter: text(merged.costCenter, 'Centro de custo', 100, false), ...dimensions(merged, prior, state, context), startMonth: month(merged.startMonth, 'Mês inicial'), endMonth: merged.endMonth ? month(merged.endMonth, 'Mês final') : null, dueDay: integer(merged.dueDay, 'Dia de vencimento', 1, 28), active: bool(merged.active), ...metadata(prior, context) }
      if (result.endMonth && result.endMonth < result.startMonth) fail('O mês final não pode anteceder o inicial.')
      put(state.recurrences, result); break
    }
    case 'recurrence.generate': {
      const recurrence = found(state.recurrences, data.id, 'Recorrência')
      const period = month(data.month)
      if (!recurrence.active || period < recurrence.startMonth || (recurrence.endMonth && period > recurrence.endMonth)) fail('A recorrência não está ativa nesse mês.')
      // A cancelled period stays recorded; a correction is always explicit, never regenerated silently.
      if (state.entries.some(entry => entry.recurrenceId === recurrence.id && entry.recurrenceMonth === period)) return state
      const dueDate = `${period}-${String(recurrence.dueDay).padStart(2, '0')}`
      const item = entryDraft({ ...recurrence, id: undefined, description: recurrence.name, recognition: 'forecast', competenceDate: `${period}-01`, dueDate }, null, state, context)
      state.entries.push({ ...item, recurrenceId: recurrence.id, recurrenceMonth: period }); break
    }
    case 'operation.create': {
      const operationId = newId(data.id)
      if (state.operations.some(item => item.id === operationId)) fail('Esta operação já foi registrada.', 'finance_conflict', 409)
      const amountCents = integer(data.amountCents, 'Receita da EME', 1)
      const commissionBps = integer(data.commissionBps ?? state.settings.defaultCommissionBps, 'Percentual da comissão', 0, 10000)
      const directCostCents = integer(data.directCostCents ?? 0, 'Custos diretos')
      const reserveBps = integer(data.reserveBps ?? state.settings.reserveBps ?? 0, 'Percentual de reserva', 0, 10000)
      const linked = dimensions(data, null, state, context)
      if (commissionBps > 0 && !linked.brokerId) fail('Selecione um corretor para registrar comissão.')
      const result = { id: operationId, title: text(data.title, 'Nome da operação'), kind: choice(data.kind, ['sale', 'rental', 'management', 'other'], 'Tipo da operação'), status: 'active', cancelReason: null, amountCents, commissionBps, commissionCents: percentCents(amountCents, commissionBps), directCostCents, reserveBps, reserveCents: percentCents(amountCents, reserveBps), brokerId: linked.brokerId, propertyId: linked.propertyId, competenceDate: date(data.competenceDate, 'Competência'), dueDate: date(data.dueDate, 'Vencimento'), notes: text(data.notes, 'Observações', 1200, false), ...metadata(null, context) }
      state.operations.push(result)
      const add = (description, entryCategory, amount) => {
        const item = entryDraft({ description, category: entryCategory, amountCents: amount, recognition: 'recognized', competenceDate: result.competenceDate, dueDate: result.dueDate, behavior: 'variable', brokerId: result.brokerId, propertyId: result.propertyId, notes: result.notes }, null, state, context)
        state.entries.push({ ...item, operationId })
      }
      add(result.title, { sale: 'sale_fee', rental: 'rental_fee', management: 'management_fee', other: 'other_revenue' }[result.kind], amountCents)
      if (result.commissionCents) add(`Comissão · ${result.title}`, 'broker_commission', result.commissionCents)
      if (directCostCents) add(`Custos diretos · ${result.title}`, 'operation_cost', directCostCents)
      break
    }
    case 'operation.cancel': {
      const operation = found(state.operations, data.id, 'Operação')
      if (operation.status === 'cancelled') fail('Esta operação já está cancelada.')
      const reason = text(data.reason, 'Motivo do cancelamento', 600)
      put(state.operations, { ...operation, status: 'cancelled', cancelReason: reason, updatedAt: context.now })
      state.entries = state.entries.map(entry => entry.operationId === operation.id ? { ...entry, status: 'cancelled', cancelReason: reason, updatedAt: context.now } : entry)
      break
    }
    case 'partner.save': {
      const prior = data.id ? state.partners.find(item => item.id === id(data.id)) : null
      const merged = { ...prior, ...data }
      const result = { id: prior?.id || newId(data.id), name: text(merged.name, 'Nome do sócio'), shareBps: integer(merged.shareBps, 'Participação', 0, 10000), active: bool(merged.active), ...metadata(prior, context) }
      const total = sum(state.partners.filter(item => item.active && item.id !== result.id).map(item => item.shareBps)) + (result.active ? result.shareBps : 0)
      if (total > 10000) fail('A soma das participações dos sócios não pode superar 100%.')
      put(state.partners, result); break
    }
    case 'settings.save': {
      for (const key of ['reserveBps', 'defaultCommissionBps', 'cashTargetCents', 'initialInvestmentCents']) {
        if (!Object.hasOwn(data, key)) continue
        state.settings[key] = data[key] === null ? null : integer(data[key], 'Configuração', 0, key.endsWith('Bps') ? 10000 : LIMIT)
      }
      break
    }
    case 'adjustment.save': {
      const prior = data.id ? state.adjustments.find(item => item.id === id(data.id)) : null
      if (prior) fail('Ajustes da DRE preservam o histórico. Cancele e registre um novo ajuste.')
      const amountCents = integer(data.amountCents, 'Valor do ajuste', -LIMIT)
      if (!amountCents) fail('Informe um ajuste diferente de zero.')
      state.adjustments.push({ id: newId(data.id), label: text(data.label, 'Descrição do ajuste'), group: choice(data.group, DRE_GROUPS.map(item => item.id), 'Linha da DRE'), amountCents, competenceDate: date(data.competenceDate, 'Competência'), reason: text(data.reason, 'Justificativa', 600), status: 'active', cancelReason: null, ...metadata(null, context) }); break
    }
    case 'adjustment.cancel': {
      const prior = found(state.adjustments, data.id, 'Ajuste')
      if (prior.status === 'cancelled') fail('Este ajuste já está cancelado.')
      put(state.adjustments, { ...prior, status: 'cancelled', cancelReason: text(data.reason, 'Motivo do cancelamento', 600), updatedAt: context.now }); break
    }
    default: fail('Comando financeiro não reconhecido.')
  }
  return state
}

const inRange = (value, from, to) => value >= from && value <= to
const monthStart = value => `${value.slice(0, 7)}-01`
const addMonths = (value, count) => { const parsed = new Date(`${value.slice(0, 7)}-01T00:00:00Z`); parsed.setUTCMonth(parsed.getUTCMonth() + count); return parsed.toISOString().slice(0, 7) }
const monthEnd = value => { const parsed = new Date(`${value}-01T00:00:00Z`); parsed.setUTCMonth(parsed.getUTCMonth() + 1); parsed.setUTCDate(0); return parsed.toISOString().slice(0, 10) }
const addDays = (value, count) => { const parsed = new Date(`${value}T00:00:00Z`); parsed.setUTCDate(parsed.getUTCDate() + count); return parsed.toISOString().slice(0, 10) }
const buckets = () => Object.fromEntries(DRE_GROUPS.map(item => [item.id, 0]))
const dre = values => ({
  revenueCents: values.revenue, deductionsCents: values.deductions, netRevenueCents: values.revenue - values.deductions,
  directCostCents: values.direct_cost, grossProfitCents: values.revenue - values.deductions - values.direct_cost,
  operatingExpensesCents: values.opex, operatingProfitCents: values.revenue - values.deductions - values.direct_cost - values.opex,
  financialIncomeCents: values.financial_income, financialExpenseCents: values.financial_expense, incomeTaxCents: values.income_tax,
  netProfitCents: values.revenue - values.deductions - values.direct_cost - values.opex + values.financial_income - values.financial_expense - values.income_tax,
})
const operating = entry => Boolean(category(entry.category).dreGroup)
const signed = entry => category(entry.category).direction === 'in' ? entry.amountCents : category(entry.category).direction === 'out' ? -entry.amountCents : 0
const recurrenceActive = (entry, period) => entry.active && entry.startMonth <= period && (!entry.endMonth || entry.endMonth >= period)
function allocations(total, partners) {
  const base = partners.map(partner => { const product = BigInt(total) * BigInt(partner.shareBps); return { id: partner.id, name: partner.name, shareBps: partner.shareBps, amountCents: Number(product / 10000n), remainder: Number(product % 10000n) } })
  let remaining = total - sum(base.map(item => item.amountCents))
  const order = [...base].sort((a, b) => b.remainder - a.remainder || a.id.localeCompare(b.id))
  for (const row of order) { if (remaining <= 0) break; row.amountCents++; remaining-- }
  return base.map(({ remainder: _remainder, ...item }) => item)
}
export function financeReport(state, { from, to, asOf }, members = []) {
  date(from); date(to); date(asOf)
  if (from > to) fail('O início do período deve anteceder o final.')
  const currentMonth = asOf.slice(0, 7)
  const active = state.entries.filter(item => item.status !== 'cancelled')
  const settled = active.filter(item => item.status === 'settled' && item.settledDate <= asOf)
  const cashRows = state.accounts.map(account => {
    let balanceCents = account.openingDate <= asOf ? account.openingBalanceCents : 0
    for (const entry of settled) {
      if (entry.settledDate < account.openingDate) continue
      if (entry.accountId === account.id && !retained(entry)) balanceCents = safeAdd(balanceCents, entry.category === 'transfer' ? -entry.amountCents : signed(entry))
      if (entry.category === 'transfer' && entry.destinationAccountId === account.id) balanceCents = safeAdd(balanceCents, entry.amountCents)
    }
    return { id: account.id, name: account.name, balanceCents, active: account.active }
  })
  const balanceCents = sum(cashRows.map(item => item.balanceCents))
  const thirdPartyNet = heldThirdParty(state, asOf)
  const thirdPartyHeldCents = Math.max(0, thirdPartyNet)
  const availableCents = balanceCents - thirdPartyHeldCents
  const periodCash = settled.filter(item => inRange(item.settledDate, from, to))
  const recognized = active.filter(item => item.recognition === 'recognized' && inRange(item.competenceDate, from, to))
  const auto = buckets(); const manual = buckets()
  for (const entry of recognized) { const group = category(entry.category).dreGroup; if (group) auto[group] = safeAdd(auto[group], entry.amountCents) }
  for (const adjustment of state.adjustments.filter(item => item.status === 'active' && inRange(item.competenceDate, from, to))) manual[adjustment.group] = safeAdd(manual[adjustment.group], adjustment.amountCents)
  const combined = Object.fromEntries(DRE_GROUPS.map(item => [item.id, safeAdd(auto[item.id], manual[item.id])]))
  const totalDre = dre(combined)
  const operationById = new Map(state.operations.map(item => [item.id, item]))
  // Earmarking suggestion only: no ledger expense and no automatic movement of money.
  const reserveSuggestedCents = sum(settled.filter(item => item.operationId && category(item.category).dreGroup === 'revenue').map(item => percentCents(item.amountCents, operationById.get(item.operationId)?.reserveBps || 0)))
  const targetCents = state.settings.cashTargetCents
  const open = active.filter(item => item.status === 'open')
  const overdue = open.filter(item => item.dueDate < asOf)
  const period = {
    receivedCents: sum(periodCash.filter(item => category(item.category).direction === 'in' && !retained(item)).map(item => item.amountCents)),
    paidCents: sum(periodCash.filter(item => category(item.category).direction === 'out').map(item => item.amountCents)),
    fixedCostsCents: sum(recognized.filter(item => category(item.category).direction === 'out' && operating(item) && item.behavior === 'fixed').map(item => item.amountCents)),
    variableCostsCents: sum(recognized.filter(item => category(item.category).direction === 'out' && operating(item) && item.behavior === 'variable').map(item => item.amountCents)),
    overdueReceivableCents: sum(overdue.filter(item => category(item.category).direction === 'in').map(item => item.amountCents)),
    overduePayableCents: sum(overdue.filter(item => category(item.category).direction === 'out').map(item => item.amountCents)),
    operatingCashCents: sum(periodCash.filter(operating).map(signed)),
    byCategory: FINANCE_CATEGORIES.map(item => ({ category: item.id, label: item.label, direction: item.direction, amountCents: sum(recognized.filter(entry => entry.category === item.id).map(entry => entry.amountCents)) })).filter(item => item.amountCents !== 0),
  }
  const mrrCents = sum(state.recurrences.filter(item => recurrenceActive(item, currentMonth) && category(item.category).recurringRevenue).map(item => item.amountCents))
  const projections = []; let projectedBalance = balanceCents; let projectedThirdParty = thirdPartyHeldCents
  for (let index = 0; index < 6; index++) {
    const periodMonth = addMonths(asOf, index)
    const end = monthEnd(periodMonth)
    const projected = open.filter(item => item.dueDate <= end && (index === 0 || item.dueDate >= `${periodMonth}-01`))
    for (const recurrence of state.recurrences.filter(item => recurrenceActive(item, periodMonth))) {
      if (state.entries.some(item => item.recurrenceId === recurrence.id && item.recurrenceMonth === periodMonth)) continue
      projected.push({ ...recurrence, dueDate: `${periodMonth}-${String(recurrence.dueDay).padStart(2, '0')}` })
    }
    const receivableCents = sum(projected.filter(item => category(item.category).direction === 'in' && !retained(item)).map(item => item.amountCents))
    const payableCents = sum(projected.filter(item => category(item.category).direction === 'out').map(item => item.amountCents))
    const thirdPartyInCents = sum(projected.filter(item => item.category === 'third_party_in').map(item => item.amountCents))
    const thirdPartyOutCents = sum(projected.filter(item => item.category === 'third_party_out').map(item => item.amountCents))
    const retainedFeesCents = sum(projected.filter(retained).map(item => item.amountCents))
    const openingCents = projectedBalance
    projectedBalance = safeAdd(projectedBalance, receivableCents - payableCents)
    projectedThirdParty = Math.max(0, projectedThirdParty + thirdPartyInCents - thirdPartyOutCents - retainedFeesCents)
    const projectedAvailable = projectedBalance - projectedThirdParty
    projections.push({ month: periodMonth, openingCents, receivableCents, payableCents, thirdPartyInCents, thirdPartyOutCents, retainedFeesCents, closingCents: projectedBalance, availableCents: projectedAvailable, belowTarget: projectedAvailable < (targetCents ?? 0) })
  }
  const brokerIds = [...new Set(recognized.map(item => item.brokerId).filter(Boolean))]
  const brokers = brokerIds.map(brokerId => {
    const rows = recognized.filter(item => item.brokerId === brokerId)
    const revenueCents = sum(rows.filter(item => category(item.category).dreGroup === 'revenue').map(item => item.amountCents))
    const commissionCents = sum(rows.filter(item => item.category === 'broker_commission').map(item => item.amountCents))
    const directCostCents = sum(rows.filter(item => category(item.category).dreGroup === 'direct_cost' && item.category !== 'broker_commission').map(item => item.amountCents))
    return { id: brokerId, name: members.find(item => item.id === brokerId)?.name || 'Corretor cadastrado', operations: new Set(rows.map(item => item.operationId).filter(Boolean)).size, revenueCents, commissionCents, directCostCents, contributionCents: revenueCents - commissionCents - directCostCents, receivedCents: sum(periodCash.filter(item => item.brokerId === brokerId && category(item.category).dreGroup === 'revenue').map(item => item.amountCents)) }
  })
  const partners = state.partners.filter(item => item.active)
  const allocatedBps = sum(partners.map(item => item.shareBps))
  const priorDistribution = sum(active.filter(item => item.category === 'partner_distribution' && item.recognition === 'recognized' && inRange(item.competenceDate, from, to)).map(item => item.amountCents))
  const payableHorizon = [to, addDays(asOf, 30)].sort().at(-1)
  let ownPayables = sum(open.filter(item => item.category !== 'third_party_out' && category(item.category).direction === 'out' && item.dueDate <= payableHorizon).map(item => item.amountCents))
  // Protect agreed monthly costs even when the operator has not generated their invoices yet.
  for (let periodMonth = currentMonth; periodMonth <= payableHorizon.slice(0, 7); periodMonth = addMonths(`${periodMonth}-01`, 1)) {
    for (const recurrence of state.recurrences.filter(item => recurrenceActive(item, periodMonth) && item.category !== 'third_party_out' && category(item.category).direction === 'out')) {
      if (state.entries.some(item => item.recurrenceId === recurrence.id && item.recurrenceMonth === periodMonth)) continue
      const dueDate = `${periodMonth}-${String(recurrence.dueDay).padStart(2, '0')}`
      if (dueDate <= payableHorizon) ownPayables = safeAdd(ownPayables, recurrence.amountCents)
    }
  }
  const cashProtection = Math.max(targetCents || 0, reserveSuggestedCents)
  const realizedProfitBuckets = buckets()
  for (const entry of recognized.filter(item => item.competenceDate <= asOf)) { const group = category(entry.category).dreGroup; if (group) realizedProfitBuckets[group] = safeAdd(realizedProfitBuckets[group], entry.amountCents) }
  for (const adjustment of state.adjustments.filter(item => item.status === 'active' && inRange(item.competenceDate, from, to) && item.competenceDate <= asOf)) realizedProfitBuckets[adjustment.group] = safeAdd(realizedProfitBuckets[adjustment.group], adjustment.amountCents)
  const eligibleCents = Math.max(0, Math.min(dre(realizedProfitBuckets).netProfitCents - priorDistribution, availableCents - cashProtection - ownPayables))
  const ready = partners.length > 0 && allocatedBps === 10000
  const operatingSettled = settled.filter(operating)
  const recoveredCents = sum(operatingSettled.map(signed))
  const investmentCents = state.settings.initialInvestmentCents
  const validInvestment = investmentCents !== null && investmentCents > 0
  const remainingCents = validInvestment ? Math.max(0, investmentCents - recoveredCents) : null
  // Estimate from completed calendar months, not a positive one-off result or unfinished current month.
  const cashStart = operatingSettled.map(item => item.settledDate).sort()[0]
  const firstMonth = cashStart?.slice(0, 7)
  const completedMonths = firstMonth ? (Number(currentMonth.slice(0, 4)) - Number(firstMonth.slice(0, 4))) * 12 + Number(currentMonth.slice(5)) - Number(firstMonth.slice(5)) : 0
  const completedOperating = sum(operatingSettled.filter(item => item.settledDate < monthStart(asOf)).map(signed))
  const average = completedMonths > 0 ? completedOperating / completedMonths : 0
  const reached = Boolean(validInvestment && remainingCents === 0)
  const monthsEstimate = !validInvestment ? null : reached ? 0 : average > 0 ? Math.ceil(remainingCents / average) : null
  const warnings = []
  if (!state.accounts.length) warnings.push('Cadastre as contas e os saldos iniciais para conferir o caixa.')
  if (availableCents < 0) warnings.push('O caixa próprio está negativo; o saldo inclui obrigações com terceiros.')
  if (thirdPartyNet < 0) warnings.push('Repasses de terceiros superam os recebimentos registrados. Confira os saldos iniciais e os lançamentos.')
  if (targetCents === null) warnings.push('Defina a meta de caixa para avaliar a reserva financeira.')
  if (projections.some(item => item.belowTarget)) warnings.push('A projeção indica caixa abaixo da meta em pelo menos um mês.')
  if (!ready) warnings.push('A simulação de lucros exige sócios ativos com participação total de 100%.')
  if (state.settings.reserveBps === null) warnings.push('O percentual de reserva por operação ainda não foi definido.')
  if (!validInvestment) warnings.push('Informe o investimento inicial para acompanhar o payback.')
  if (Object.values(manual).some(Boolean)) warnings.push('A DRE inclui ajustes manuais, que não alteram o saldo das contas.')
  return {
    cash: { balanceCents, thirdPartyHeldCents, availableCents, reserveSuggestedCents, targetCents, gapCents: targetCents === null ? null : Math.max(0, targetCents - availableCents), accounts: cashRows },
    period, dre: { automatic: dre(auto), manual: dre(manual), combined: totalDre }, mrrCents, arrCents: mrrCents * 12,
    projections, brokers, distribution: { eligibleCents, allocatedBps, ready, payableHorizon, commitmentsCents: ownPayables, shares: ready ? allocations(eligibleCents, partners) : [] },
    payback: { investmentCents, recoveredCents, remainingCents, monthsEstimate, reached }, warnings,
  }
}
