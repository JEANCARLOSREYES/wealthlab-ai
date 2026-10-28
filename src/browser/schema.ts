import { z } from 'zod';
import { today } from '../types';
const id = z.string().min(1).max(80),
  text = (max = 100) => z.string().min(1).max(max),
  cents = z.number().int().min(-1e11).max(1e11),
  positive = cents.refine((v) => v >= 0, 'Use a nonnegative amount.');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Invalid date.');
const pastDate = date.refine(
  (v) => v <= today(),
  'Future records belong in a plan, not your ledger.',
);
export const simulationSchema = z.object({
  initial: z.number().min(0).max(1e9),
  monthly: z.number().min(0).max(1e7),
  annual_return: z.number().min(-50).max(50),
  years: z.number().int().min(1).max(60),
  inflation: z.number().min(0).max(20),
  fee: z.number().min(0).max(10),
  contribution_growth: z.number().min(0).max(20),
  frequency: z.enum(['monthly', 'quarterly', 'annually']),
  tax: z.number().min(0).max(60),
  volatility: z.number().min(0).max(80),
  target: z.number().positive().max(1e12),
  paths: z.number().int().min(100).max(5000),
  seed: z.number().int().min(0).max(4294967295),
});
export const schemas: Record<string, z.ZodType> = {
  accounts: z.strictObject({
    id,
    name: text(),
    kind: z.enum(['checking', 'savings', 'cash', 'credit', 'loan']),
    opening_balance: cents,
    opened: date,
    institution: z.string().max(100).default('Manual account'),
  }),
  transactions: z
    .strictObject({
      id,
      account_id: id,
      date: pastDate,
      merchant: text(200),
      amount: cents,
      kind: z.enum(['expense', 'income', 'transfer']),
      category: text(80),
      note: z.string().max(2000).default(''),
    })
    .refine(
      (t) => (t.kind === 'income' ? t.amount > 0 : t.kind === 'expense' ? t.amount < 0 : true),
      'Income must be positive and expenses negative.',
    ),
  budgets: z.strictObject({
    id,
    category: text(80),
    amount: positive,
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    fixed: z.boolean().default(false),
  }),
  holdings: z
    .strictObject({
      id,
      name: text(),
      ticker: text(20),
      asset_class: z.enum([
        'US equities',
        'International equities',
        'Bonds',
        'Real estate',
        'Crypto',
        'Cash',
        'Other',
      ]),
      shares: z.number().positive().max(1e9),
      purchase_price: positive,
      current_price: positive,
      purchased: pastDate,
      valued: pastDate,
    })
    .refine((h) => h.purchased <= h.valued, 'Purchase date must precede valuation date.'),
  prices: z.strictObject({ id, ticker: text(20), date: pastDate, price: positive }),
  checkpoints: z
    .strictObject({
      id,
      date: pastDate,
      value: positive.refine((v) => v > 0),
      flow: cents.default(0),
    })
    .refine((c) => c.value - c.flow >= 0, 'Value must include the end-of-day contribution.'),
  goals: z.strictObject({
    id,
    name: text(),
    target: positive.refine((v) => v > 0),
    saved: positive,
    monthly: positive,
    deadline: date,
    color: z.enum(['mint', 'blue', 'violet', 'amber']).default('mint'),
  }),
  notes: z.strictObject({
    id,
    title: text(150),
    body: z.string().max(20000),
    tag: z.string().max(50).default('Research'),
    updated: date,
    pinned: z.boolean().default(false),
  }),
  rules: z.strictObject({
    id,
    contains: text(),
    category: text(80),
    kind: z.enum(['expense', 'income', 'transfer']),
  }),
  scenarios: z.strictObject({ id, name: text(), inputs: simulationSchema }),
};
const limits: Record<string, number> = {
  accounts: 500,
  transactions: 50000,
  budgets: 5000,
  holdings: 5000,
  prices: 50000,
  checkpoints: 5000,
  goals: 500,
  notes: 5000,
  rules: 500,
  scenarios: 100,
};
export const stateSchema = z
  .strictObject({
    version: z.literal(1).default(1),
    revision: z.number().int().nonnegative().default(0),
    ...Object.fromEntries(
      Object.entries(schemas).map(([key, schema]) => [
        key,
        z.array(schema).max(limits[key]).default([]),
      ]),
    ),
    imports: z.array(z.record(z.string(), z.unknown())).max(5000).default([]),
  })
  .superRefine((s: any, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const key of Object.keys(schemas)) {
      const rows = s[key];
      if (new Set(rows.map((r: any) => r.id)).size !== rows.length)
        issue(`Duplicate IDs in ${key}.`);
    }
    const accounts = new Map(s.accounts.map((a: any) => [a.id, a]));
    for (const t of s.transactions) {
      const a: any = accounts.get(t.account_id);
      if (!a) issue('Transaction references a missing account.');
      else if (t.date < a.opened)
        issue('Transaction predates account opening. Adjust the opening date and balance first.');
    }
    if (
      new Set(s.budgets.map((b: any) => b.month + '|' + b.category.toLowerCase())).size !==
      s.budgets.length
    )
      issue('Only one budget per category and month is allowed.');
    if (new Set(s.checkpoints.map((p: any) => p.date)).size !== s.checkpoints.length)
      issue('Only one checkpoint per date is allowed.');
    if (
      new Set(s.prices.map((p: any) => p.ticker.toUpperCase() + '|' + p.date)).size !==
      s.prices.length
    )
      issue('Only one price per ticker and date is allowed.');
  });
export function validated<T>(schema: z.ZodType, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success)
    throw new Error(
      r.error.issues
        .map((i) => (i.path.length ? i.path.join('.') + ': ' : '') + i.message)
        .join('\n'),
    );
  return r.data as T;
}
