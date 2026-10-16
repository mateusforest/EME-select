// Quick estimate with an effective annual rate; all balances are integer cents.
export function calculateFinancing({ price, downPayment, months, annualRate, system }) {
  if (![price, downPayment, months, annualRate].every(Number.isFinite) || price <= 0 || price > 1e10 || downPayment < 0 || downPayment >= price || !Number.isInteger(months) || months < 1 || months > 480 || annualRate < 0 || annualRate > 100 || !['SAC', 'PRICE'].includes(system)) return null;
  const principal = Math.round(price * 100) - Math.round(downPayment * 100);
  if (principal < months) return null;
  const rate = Math.expm1(Math.log1p(annualRate / 100) / 12);
  const fixed = rate === 0 ? principal / months : principal * rate / -Math.expm1(-months * Math.log1p(rate));
  let balance = principal;
  const schedule = [];
  for (let month = 1; month <= months; month++) {
    const interest = Math.round(balance * rate);
    const amortization = month === months ? balance : Math.min(balance, system === 'SAC' ? Math.floor(principal / months) : Math.max(0, Math.round(fixed) - interest));
    balance -= amortization;
    schedule.push({ month, payment: amortization + interest, interest, amortization, balance });
  }
  const interest = schedule.reduce((sum, row) => sum + row.interest, 0);
  return { principal, monthlyRate: rate, first: schedule[0].payment, last: schedule.at(-1).payment, interest, total: principal + interest, schedule };
}
