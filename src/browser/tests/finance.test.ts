import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, summarize, performance } from '../finance.ts';
import { stateSchema, validated, simulationSchema } from '../schema.ts';
import type { State } from '../../types.ts';
const params = {
  initial: 1000,
  monthly: 0,
  annual_return: 10,
  years: 2,
  inflation: 0,
  fee: 0,
  contribution_growth: 0,
  frequency: 'monthly',
  tax: 0,
  volatility: 0,
  target: 1000000,
  paths: 100,
  seed: 42,
};
const blank = () => validated<State>(stateSchema, { version: 1 });
test('effective annual compounding', () => assert.equal(simulate(params).final.value, 1210));
test('zero return conserves money contributed', () => {
  const r = simulate({ ...params, monthly: 100, annual_return: 0 });
  assert.equal(r.final.value, 3400);
  assert.equal(r.growth, 0);
  assert.equal(r.final.p50, 3400);
});
test('tax is charged only on terminal gains', () => {
  const r = simulate({ ...params, years: 1, tax: 20, inflation: 10 });
  assert.equal(r.final.value, 1080);
  assert.equal(r.final.real, 981.82);
});
test('quarterly contributions and annual increase', () => {
  const r = simulate({
    ...params,
    initial: 0,
    monthly: 100,
    annual_return: 0,
    frequency: 'quarterly',
    contribution_growth: 10,
  });
  assert.equal(r.final.value, 2520);
});
test('seed reproduces every path', () =>
  assert.deepEqual(
    simulate({ ...params, volatility: 20 }),
    simulate({ ...params, volatility: 20 }),
  ));
test('empty workspace has no invented account history', () => {
  const m = summarize(blank(), '2026-01');
  assert.deepEqual(m.history, []);
  assert.equal(m.savings_rate, null);
});
test('card payments are not double-counted', () => {
  const s = blank();
  s.accounts = [
    {
      id: 'a',
      name: 'cash',
      kind: 'checking',
      opening_balance: 100000,
      opened: '2025-01-01',
      institution: '',
    },
    {
      id: 'b',
      name: 'card',
      kind: 'credit',
      opening_balance: 0,
      opened: '2025-01-01',
      institution: '',
    },
  ];
  s.transactions = [
    {
      id: 'buy',
      account_id: 'b',
      date: '2025-01-02',
      merchant: 'Shop',
      amount: -5000,
      kind: 'expense',
      category: 'Shopping',
      note: '',
    },
    {
      id: 'out',
      account_id: 'a',
      date: '2025-01-03',
      merchant: 'Payment',
      amount: -5000,
      kind: 'transfer',
      category: 'Transfer',
      note: '',
    },
    {
      id: 'in',
      account_id: 'b',
      date: '2025-01-03',
      merchant: 'Payment',
      amount: 5000,
      kind: 'transfer',
      category: 'Transfer',
      note: '',
    },
  ];
  const m = summarize(s, '2025-01');
  assert.equal(m.spending, 5000);
  assert.equal(m.net_worth, 95000);
});
test('return metrics exclude deposits', () => {
  const s = blank();
  s.checkpoints = [
    { id: 'a', date: '2025-01-01', value: 100000, flow: 0 },
    { id: 'b', date: '2026-01-01', value: 210000, flow: 100000 },
  ];
  const p = performance(s);
  assert.ok(Math.abs(p.twr - 10) < 0.00001);
  assert.ok(Math.abs(p.mwr - 10) < 0.00001);
});
test('duplicate category/month budgets are rejected', () => {
  const s = blank();
  s.budgets = [
    { id: 'a', category: 'Food', month: '2026-01', amount: 10000, fixed: false },
    { id: 'b', category: 'food', month: '2026-01', amount: 20000, fixed: false },
  ];
  assert.throws(() => validated(stateSchema, s));
});
test('missing account references are rejected', () => {
  const s = blank();
  s.transactions = [
    {
      id: 't',
      account_id: 'missing',
      date: '2025-01-01',
      merchant: 'Shop',
      amount: -100,
      kind: 'expense',
      category: 'Food',
      note: '',
    },
  ];
  assert.throws(() => validated(stateSchema, s));
});
test('simulation limits reject non-finite or expensive requests', () => {
  assert.throws(() => validated(simulationSchema, { ...params, paths: 100000 }));
  assert.throws(() => validated(simulationSchema, { ...params, annual_return: Infinity }));
});
