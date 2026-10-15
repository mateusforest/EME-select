// Planning only. This module does not read or write real financial records.
export const SIMULATION_DEFAULTS = Object.freeze({
  initial: 0, fixed: 6000, floor: 3, tax: 12, share: 50, external: 0,
  urbanPrice: 500000, urbanFee: 6, urbanCost: 1500, urbanInvoice: 0,
  ruralPrice: 3000000, ruralFee: 8, ruralCost: 10000, ruralInvoice: 0,
  delay: 1, ruralMonth: 4, n1: 1, n2: 1, n3: 2, n4: 2, n5: 2, n6: 2,
});

export const SIMULATION_LIMITS = Object.freeze(Object.fromEntries(Object.keys(SIMULATION_DEFAULTS).map(key => [key, {
  min: 0,
  max: ['tax', 'share', 'external', 'urbanFee', 'ruralFee'].includes(key) ? 100 : key === 'floor' ? 24 : ['delay', 'ruralMonth'].includes(key) ? 6 : /^n[1-6]$/.test(key) ? 100 : 1000000000,
  integer: ['floor', 'delay', 'ruralMonth'].includes(key) || /^n[1-6]$/.test(key),
}])));

export function validateSimulation(input) {
  const errors = {};
  for (const [key, limit] of Object.entries(SIMULATION_LIMITS)) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) errors[key] = 'Informe um número válido.';
    else if (value < limit.min || value > limit.max) errors[key] = `Use um valor entre ${limit.min.toLocaleString('pt-BR')} e ${limit.max.toLocaleString('pt-BR')}.`;
    else if (limit.integer && !Number.isInteger(value)) errors[key] = 'Use um número inteiro.';
  }
  return errors;
}

const cents = value => Math.round((value + Number.EPSILON) * 100);
const brl = value => value / 100;
const percentage = (value, rate) => Math.round(value * rate / 100);

function dealInCents(input, kind) {
  const gross = percentage(cents(input[kind + 'Price']), input[kind + 'Fee']);
  const taxes = percentage(gross, input.tax);
  const invoice = cents(input[kind + 'Invoice']);
  const net = gross - taxes - invoice;
  const outside = percentage(Math.max(0, net), input.external);
  const team = percentage(Math.max(0, net) - outside, input.share);
  const retained = net - outside - team;
  const cost = cents(input[kind + 'Cost']);
  return { gross, taxes, invoice, net, outside, team, retained, cost, margin: retained - cost };
}

export function calculateCommissionSimulation(input, scenario = 'base') {
  const errors = validateSimulation(input);
  if (Object.keys(errors).length) throw new RangeError('Premissas inválidas: ' + Object.keys(errors).join(', '));
  if (!['base', 'stress'].includes(scenario)) throw new RangeError('Cenário inválido.');
  const urban = dealInCents(input, 'urban'), rural = dealInCents(input, 'rural');
  const effectiveDelay = input.delay + (scenario === 'stress' ? 2 : 0);
  const receiptKeys = ['gross', 'taxes', 'invoice', 'outside', 'team', 'retained'];
  const schedule = new Map();
  const add = (month, amounts) => {
    const row = schedule.get(month) ?? Object.fromEntries(receiptKeys.map(key => [key, 0]));
    receiptKeys.forEach(key => { row[key] += amounts[key]; });
    schedule.set(month, row);
  };
  for (let month = 1; month <= 6; month++) add(month + effectiveDelay, Object.fromEntries(receiptKeys.map(key => [key, urban[key] * input['n' + month]])));
  if (input.ruralMonth > 0 && scenario === 'base') {
    // Split each reserve to cents; the final installment absorbs the rounding remainder.
    const first = Object.fromEntries(receiptKeys.map(key => [key, Math.floor(rural[key] / 2)]));
    first.retained = first.gross - first.taxes - first.invoice - first.outside - first.team;
    const last = Object.fromEntries(receiptKeys.map(key => [key, rural[key] - first[key]]));
    add(input.ruralMonth, first);
    add(input.ruralMonth + 2, last);
  }
  const initial = cents(input.initial), fixed = cents(input.fixed);
  let cash = initial, low = initial, lowMonth = 0;
  const months = [];
  for (let month = 1; month <= 6; month++) {
    const due = schedule.get(month) ?? Object.fromEntries(receiptKeys.map(key => [key, 0]));
    const urbanCosts = urban.cost * input['n' + month];
    const ruralCosts = input.ruralMonth === month ? rural.cost : 0;
    const expenses = fixed + urbanCosts + ruralCosts;
    const opening = cash, before = opening - expenses;
    cash = before + due.retained;
    if (Math.min(before, cash) < low) { low = Math.min(before, cash); lowMonth = month; }
    months.push({ month, units: input['n' + month], ...Object.fromEntries(Object.entries({ opening, fixed, urbanCosts, ruralCosts, expenses, before, receipt: due.retained, grossReceipts: due.gross, taxes: due.taxes, invoice: due.invoice, outside: due.outside, team: due.team, cash }).map(([key, value]) => [key, brl(value)])) });
  }
  const reserve = fixed * input.floor;
  const required = reserve + initial - low;
  const pending = [...schedule.entries()].filter(([month]) => month > 6).reduce((sum, [, row]) => sum + row.gross, 0);
  const toBrl = deal => Object.fromEntries(Object.entries(deal).map(([key, value]) => [key, brl(value)]));
  return { urban: toBrl(urban), rural: toBrl(rural), months, low: brl(low), lowMonth, reserve: brl(reserve), required: brl(required), extra: brl(Math.max(0, required - initial)), final: brl(cash), pending: brl(pending), effectiveDelay, breakeven: fixed === 0 ? 0 : urban.margin > 0 ? Math.ceil(fixed / urban.margin) : null };
}
