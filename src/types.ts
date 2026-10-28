export type Entity = { id: string; [key: string]: any };
export type State = {
  version: number;
  revision: number;
  accounts: Entity[];
  transactions: Entity[];
  budgets: Entity[];
  holdings: Entity[];
  prices: Entity[];
  checkpoints: Entity[];
  goals: Entity[];
  notes: Entity[];
  rules: Entity[];
  scenarios: Entity[];
  imports: Entity[];
};
export type Summary = {
  balances: Record<string, number>;
  cash: number;
  liabilities: number;
  invested: number;
  cost: number;
  net_worth: number;
  income: number;
  spending: number;
  savings: number;
  savings_rate: number | null;
  categories: Record<string, number>;
  budgets: Entity[];
  history: any[];
  recurring: any[];
  insights: any[];
  months: string[];
  holdings: Entity[];
};
export const pages = [
  'Overview',
  'Transactions',
  'Budget Studio',
  'Investments',
  'Wealth Simulator',
  'Financial Goals',
  'Research & Notes',
  'JARVIS AI',
  'Settings',
] as const;
export type Page = (typeof pages)[number];
export const categories = [
  'Housing',
  'Groceries',
  'Dining',
  'Shopping',
  'Utilities',
  'Transport',
  'Subscriptions',
  'Health',
  'Lifestyle',
  'Education',
  'Travel',
  'Salary',
  'Income',
  'Transfer',
  'Uncategorized',
];
export const colors = [
  '#b4eed4',
  '#8ea7ff',
  '#c5a0f5',
  '#edc48a',
  '#73cbdc',
  '#ec9cab',
  '#b8c674',
  '#83b6b4',
  '#b5a399',
];
export const today = () => new Date().toLocaleDateString('en-CA');
export const currentMonth = () => today().slice(0, 7);
export const money = (cents: number, digits = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format((Object.is(cents, -0) ? 0 : cents) / 100);
export const compact = (dollars: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(dollars);
export const uid = () => crypto.randomUUID();
export const monthLabel = (v: string) =>
  new Date(v + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
export const browserMode = import.meta.env?.VITE_BROWSER_MODE === 'true';
export async function request(path: string, options?: RequestInit) {
  if (browserMode) return (await import('./browser/api')).browserRequest(path, options);
  const r = await fetch('/api' + path, {
    ...options,
    headers: {
      ...(options?.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options?.headers,
    },
  });
  let data: any;
  try {
    data = await r.json();
  } catch {
    throw new Error('The local service returned an unreadable response.');
  }
  if (!r.ok)
    throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
  return data;
}

export async function exportDownload(
  event: { preventDefault: () => void },
  workspace: string,
  csv = false,
) {
  if (!browserMode) return;
  event.preventDefault();
  const data = await request(`/export${csv ? '/transactions' : ''}?workspace=${workspace}`);
  const url = URL.createObjectURL(
    new Blob([csv ? data : JSON.stringify(data, null, 2)], {
      type: csv ? 'text/csv' : 'application/json',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `wealthlab-${workspace}-${today()}.${csv ? 'csv' : 'json'}`;
  a.click();
  URL.revokeObjectURL(url);
}
