import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCommissionSimulation, SIMULATION_DEFAULTS, validateSimulation } from '../shared/commission-simulation.mjs';
const run = (changes = {}, scenario = 'base') => calculateCommissionSimulation({ ...SIMULATION_DEFAULTS, ...changes }, scenario);
const rounded = value => Math.round(value * 100);

test('default six-month projection pays fixed and direct costs before receipts and retains required reserve', () => {
  const result = run();
  assert.equal(result.urban.gross, 30000);
  assert.equal(result.urban.taxes, 3600);
  assert.equal(result.urban.team, 13200);
  assert.equal(result.urban.margin, 11700);
  assert.equal(result.rural.margin, 95600);
  assert.deepEqual(result.months.map(month => month.cash), [-7500, -1800, 2400, 62600, 80000, 150200]);
  assert.equal(result.low, -16600);
  assert.equal(result.lowMonth, 4);
  assert.equal(result.required, 34600);
  assert.equal(result.extra, 34600);
  assert.equal(result.pending, 60000);
  assert.equal(run({ initial: result.required }).low, result.reserve);
  assert.equal(run({ initial: result.required }).extra, 0);
  assert.equal(result.breakeven, 1);
});

test('stress keeps spent rural cost while removing rural receipts and delaying urban cash by two months', () => {
  const result = run({}, 'stress');
  assert.equal(result.effectiveDelay, 3);
  assert.equal(result.months[3].ruralCosts, 10000);
  assert.deepEqual(result.months.map(row => row.grossReceipts), [0, 0, 0, 30000, 30000, 60000]);
  assert.equal(result.low, -43000);
  assert.equal(result.required, 61000);
  assert.equal(result.final, -8200);
  assert.equal(result.pending, 180000);
});

test('external share precedes internal share; ordinary operating costs do not reduce the broker base', () => {
  const result = run({ external: 50, urbanInvoice: 100 });
  assert.equal(result.urban.net, 26300);
  assert.equal(result.urban.outside, 13150);
  assert.equal(result.urban.team, 6575);
  assert.equal(result.urban.margin, 5075);
  assert.equal(run({ urbanInvoice: 100 }).urban.team, 13150);
  assert.equal(run({ urbanCost: 10000 }).urban.team, run().urban.team);
});

test('rural installments preserve every cent and the monthly reconciliation identity', () => {
  const result = run({ urbanPrice: 123456.78, urbanFee: 5.77, ruralPrice: 987654.33, ruralFee: 7.13, ruralInvoice: 31.79, external: 33.33, share: 47.89, tax: 13.37, ruralMonth: 4, n1: 0, n2: 0, n3: 0, n4: 0, n5: 0, n6: 0 });
  for (const key of ['taxes', 'invoice', 'outside', 'team']) assert.equal(rounded(result.months.reduce((sum, row) => sum + row[key], 0)), rounded(result.rural[key]));
  assert.equal(rounded(result.months.reduce((sum, row) => sum + row.grossReceipts, 0)), rounded(result.rural.gross));
  for (const row of result.months) {
    assert.equal(rounded(row.grossReceipts - row.taxes - row.invoice - row.outside - row.team), rounded(row.receipt));
    assert.equal(rounded(row.opening - row.expenses + row.receipt), rounded(row.cash));
    assert.equal(rounded(row.fixed + row.urbanCosts + row.ruralCosts), rounded(row.expenses));
  }
});

test('after-horizon installments stay outside six-month cash and maximum delays remain counted', () => {
  const result = run({ ruralMonth: 6, delay: 6 });
  assert.equal(result.pending, 420000);
  assert.equal(result.months.slice(0, 5).reduce((sum, row) => sum + row.grossReceipts, 0), 0);
  assert.equal(result.months[5].grossReceipts, 120000);
  assert.equal(run({ delay: 6, ruralMonth: 0 }, 'stress').pending, 300000);
  assert.equal(run({ ruralMonth: 0 }).months.reduce((sum, row) => sum + row.ruralCosts, 0), 0);
});

test('negative liquid base produces no negative broker payable and exposes loss of company capital', () => {
  const result = run({ urbanPrice: 100, urbanFee: 1, urbanInvoice: 100, urbanCost: 0, tax: 100 });
  assert.equal(result.urban.net, -100);
  assert.equal(result.urban.team, 0);
  assert.equal(result.urban.outside, 0);
  assert.equal(result.urban.margin, -100);
  assert.equal(result.breakeven, null);
  assert.equal(run({ fixed: 0 }).breakeven, 0);
});

test('invalid numbers, negative values, over-allocation and fractional sale counts are rejected', () => {
  for (const invalid of [{ tax: Number.NaN }, { initial: -1 }, { share: 101 }, { fixed: Infinity }, { delay: 7 }, { n1: 1.5 }, { ruralMonth: -1 }, { floor: 3.3 }]) {
    assert.ok(Object.keys(validateSimulation({ ...SIMULATION_DEFAULTS, ...invalid })).length);
    assert.throws(() => run(invalid), RangeError);
  }
  assert.throws(() => run({}, 'unknown'), RangeError);
});
