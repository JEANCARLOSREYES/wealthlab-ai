import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCSV, parseMoney, freshDemo } from '../api.ts';
import { stateSchema, validated } from '../schema.ts';
import type { State } from '../../types.ts';
test('currency parsing handles parentheses and rounds half cents', () => {
  assert.equal(parseMoney('($1,234.56)'), -123456);
  assert.equal(parseMoney('1.005'), 101);
  assert.throws(() => parseMoney('NaN'));
});
test('browser CSV review detects duplicate rows and transfer rules', () => {
  const s = validated<State>(stateSchema, {
    accounts: [
      { id: 'a', name: 'Account', kind: 'checking', opening_balance: 0, opened: '2025-01-01' },
    ],
    rules: [{ id: 'r', contains: 'card payment', category: 'Transfer', kind: 'transfer' }],
  });
  const r = previewCSV(
    {
      mode: 'transactions',
      account_id: 'a',
      date_format: '%d/%m/%Y',
      mapping: { date: 'd', merchant: 'm', amount: 'a' },
      rows: [
        { d: '31/01/2025', m: 'Card payment', a: '-200' },
        { d: '31/01/2025', m: 'Card payment', a: '-200' },
        { d: 'invalid', m: 'Shop', a: '-10' },
      ],
    },
    s,
  );
  assert.equal(r.duplicates, 1);
  assert.equal(r.valid, 1);
  assert.equal(r.errors.length, 1);
  assert.equal(r.rows[0].item.kind, 'transfer');
});
test('fictional browser demo validates after date shifting', () => {
  const s = freshDemo();
  assert.ok(s.transactions.length > 100);
  assert.ok(s.prices.length > 0);
  assert.ok(s.checkpoints.length > 1);
  assert.equal(s.revision, 0);
});
