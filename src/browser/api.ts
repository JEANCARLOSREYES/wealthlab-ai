/** GitHub Pages adapter. All records and calculations stay inside the browser. */
import Papa from 'papaparse';
import seed from './demo.json';
import { type State, today, uid, money } from '../types';
import { schemas, stateSchema, simulationSchema, validated } from './schema';
import { summarize, simulate, performance, monthOffset } from './finance';
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('wealthlab-ai', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('workspaces');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        new Error(
          'Browser storage is unavailable. Allow site storage or use the local desktop edition.',
        ),
      );
  }));
}
export function freshDemo(): State {
  const raw = structuredClone(seed) as unknown as State;
  const anchor = raw.accounts[0]?.opened || today(),
    months =
      (new Date().getFullYear() - Number(anchor.slice(0, 4))) * 12 +
      new Date().getMonth() -
      Number(anchor.slice(5, 7)) +
      1 -
      5;
  const shift = (d: string) => {
    const month = monthOffset(d, months),
      day = Number(d.slice(8)),
      last = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    return month.slice(0, 8) + String(Math.min(day, last)).padStart(2, '0');
  };
  raw.accounts.forEach((a) => (a.opened = shift(a.opened)));
  raw.transactions.forEach((t) => (t.date = shift(t.date)));
  raw.transactions = raw.transactions.filter((t) => t.date <= today());
  raw.holdings.forEach((h) => {
    h.purchased = shift(h.purchased);
    h.valued = today();
  });
  raw.prices.forEach((p) => (p.date = shift(p.date)));
  raw.prices = raw.prices.filter((p) => p.date <= today());
  raw.checkpoints.forEach((p) => (p.date = shift(p.date)));
  raw.checkpoints = raw.checkpoints.filter((p) => p.date <= today());
  raw.budgets.forEach((b) => (b.month = today().slice(0, 7)));
  raw.goals.forEach((g) => (g.deadline = shift(g.deadline)));
  raw.notes.forEach((n) => (n.updated = today()));
  raw.revision = 0;
  return validated<State>(stateSchema, raw);
}
function blank(): State {
  return validated<State>(stateSchema, { version: 1 });
}
async function getState(workspace: string): Promise<State> {
  const store = await db();
  return new Promise((resolve, reject) => {
    const tx = store.transaction('workspaces', 'readwrite'),
      os = tx.objectStore('workspaces'),
      r = os.get(workspace);
    let state: State;
    r.onsuccess = () => {
      try {
        state = r.result || (workspace === 'demo' ? freshDemo() : blank());
        if (!r.result) os.put(state, workspace);
      } catch (e) {
        reject(e);
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(state);
    tx.onerror = () => reject(new Error('Unable to read browser storage.'));
    tx.onabort = () => reject(new Error('Browser storage operation was cancelled.'));
  });
}
async function mutate(
  workspace: string,
  revision: number,
  fn: (raw: State) => void,
  backup = false,
): Promise<State> {
  const store = await db();
  return new Promise((resolve, reject) => {
    const tx = store.transaction('workspaces', 'readwrite'),
      os = tx.objectStore('workspaces'),
      r = os.get(workspace);
    let output: State;
    let failure: unknown;
    r.onsuccess = () => {
      try {
        const before = r.result as State;
        if (before.revision !== revision)
          throw new Error('Another tab changed this workspace. Refresh before trying again.');
        const raw = structuredClone(before);
        fn(raw);
        raw.revision = revision + 1;
        output = validated<State>(stateSchema, raw);
        if (backup) os.put(before, 'backup-' + workspace + '-' + new Date().toISOString());
        os.put(output, workspace);
      } catch (e) {
        failure = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(output);
    tx.onabort = () =>
      reject(
        failure ||
          new Error(
            'Browser storage is full or unavailable. No changes were saved. Export a backup.',
          ),
      );
    tx.onerror = () => reject(failure || new Error('Unable to save to browser storage.'));
  });
}
export function parseMoney(value: string) {
  let v = String(value).trim().replace(/[$,]/g, '');
  if (/^\(.*\)$/.test(v)) v = '-' + v.slice(1, -1);
  if (!v) return 0;
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(v)) throw new Error('Invalid amount: ' + value);
  const n = Number(v);
  if (!Number.isFinite(n) || Math.abs(n) > 1e9) throw new Error('Amount outside supported range.');
  return Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-7);
}
function parseDate(value: string, format: string) {
  const v = value.trim();
  let year: string, month: string, day: string;
  if (format === '%Y-%m-%d' || (format === 'auto' && /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(v))) {
    [year, month, day] = v.split(/[-/]/);
  } else {
    const parts = v.split('/');
    if (parts.length !== 3) throw new Error('Unrecognized date; choose an explicit format.');
    if (format === '%d/%m/%Y') [day, month, year] = parts;
    else [month, day, year] = parts;
  }
  const iso = year + '-' + month.padStart(2, '0') + '-' + day.padStart(2, '0'),
    d = new Date(iso + 'T12:00:00Z');
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso)
    throw new Error('Invalid date: ' + value);
  return iso;
}
export function previewCSV(body: any, s: State) {
  const { mode = 'transactions', mapping = {}, rows = [] } = body;
  if (rows.length > 10000) throw new Error('Import at most 10,000 rows.');
  if (mode === 'transactions' && !s.accounts.some((a) => a.id === body.account_id))
    throw new Error('Choose an account first.');
  const fingerprint = (t: any) =>
    JSON.stringify([t.account_id, t.date, t.merchant.trim().toLowerCase(), t.amount]);
  const existing = new Set(s.transactions.map(fingerprint)),
    holdings = new Set(
      s.holdings.map((h) =>
        JSON.stringify([h.ticker.toLowerCase(), h.purchased, h.shares, h.purchase_price]),
      ),
    ),
    prices = new Set(s.prices.map((p) => p.ticker.toLowerCase() + '|' + p.date)),
    seen = new Set<string>(),
    output: any[] = [],
    errors: any[] = [];
  rows.forEach((raw: any, i: number) => {
    const get = (key: string) => String(raw[mapping[key]] ?? '').trim();
    try {
      let item: any, key: string, duplicate: boolean;
      if (mode === 'prices') {
        item = validated<any>(schemas.prices, {
          id: uid(),
          ticker: get('ticker').toUpperCase(),
          date: parseDate(get('date'), body.date_format),
          price: parseMoney(get('price')),
        });
        key = item.ticker.toLowerCase() + '|' + item.date;
        duplicate = prices.has(key) || seen.has(key);
      } else if (mode === 'holdings') {
        item = validated<any>(schemas.holdings, {
          id: uid(),
          name: get('name') || get('ticker'),
          ticker: get('ticker').toUpperCase(),
          asset_class: get('asset_class') || 'Other',
          shares: Number(get('shares')),
          purchase_price: parseMoney(get('purchase_price')),
          current_price: parseMoney(get('current_price')),
          purchased: parseDate(get('purchased'), body.date_format),
          valued: parseDate(get('valued'), body.date_format),
        });
        key = JSON.stringify([
          item.ticker.toLowerCase(),
          item.purchased,
          item.shares,
          item.purchase_price,
        ]);
        duplicate = holdings.has(key) || seen.has(key);
      } else {
        let amount = mapping.amount
          ? parseMoney(get('amount'))
          : Math.abs(parseMoney(get('credit'))) - Math.abs(parseMoney(get('debit')));
        if (body.invert) amount = -amount;
        const merchant = get('merchant');
        let kind = get('kind').toLowerCase() || (amount > 0 ? 'income' : 'expense'),
          category = get('category') || (amount > 0 ? 'Income' : 'Uncategorized');
        const rule = s.rules.find((r) => merchant.toLowerCase().includes(r.contains.toLowerCase()));
        if (rule) {
          kind = rule.kind;
          category = rule.category;
        }
        item = validated<any>(schemas.transactions, {
          id: uid(),
          account_id: body.account_id,
          date: parseDate(get('date'), body.date_format),
          merchant,
          amount,
          kind,
          category,
          note: get('note'),
        });
        if (item.date < s.accounts.find((a) => a.id === body.account_id)!.opened)
          throw new Error('Predates account opening. Adjust the account first.');
        key = fingerprint(item);
        duplicate = existing.has(key) || seen.has(key);
      }
      seen.add(key);
      output.push({ row: i + 2, item, duplicate });
    } catch (e) {
      errors.push({ row: i + 2, error: (e as Error).message.slice(0, 500) });
    }
  });
  return {
    rows: output,
    errors,
    duplicates: output.filter((r) => r.duplicate).length,
    valid: output.filter((r) => !r.duplicate).length,
  };
}
function csvExport(s: State) {
  return Papa.unparse(
    s.transactions.map((t) => ({
      date: t.date,
      merchant: t.merchant,
      amount: t.amount / 100,
      kind: t.kind,
      category: t.category,
      account_id: t.account_id,
      note: t.note,
    })),
    { escapeFormulae: true },
  );
}
function chat(body: any, s: State, workspace: string) {
  if (body.use_ollama)
    throw new Error(
      'Ollama is available in the local Python edition. Turn local AI off in Settings to use the built-in assistant.',
    );
  const month = body.month || today().slice(0, 7),
    m = summarize(s, month),
    q = body.message.toLowerCase(),
    intro = `For ${month}, using your ${workspace} records:\n\n`;
  let answer = '';
  if (['budget', 'spend', 'cut', 'expense', 'money go'].some((v) => q.includes(v))) {
    answer =
      `Recorded spending is ${money(m.spending, 2)}. Your largest categories are ` +
      (Object.entries(m.categories)
        .slice(0, 3)
        .map(([k, v]) => `${k} (${money(v, 2)})`)
        .join(', ') || 'not available yet') +
      '.\n\nOver plan: ' +
      (m.budgets
        .filter((b) => b.actual > b.planned)
        .map((b) => `${b.category} by ${money(b.actual - b.planned, 2)}`)
        .join(', ') || 'no saved categories') +
      '. Review those records in Budget Studio. Any change needs your explicit save.';
  } else if (['recurr', 'subscription', 'bill'].some((v) => q.includes(v)))
    answer =
      'Recurring candidates from stable payments seen in at least two months:\n' +
      (m.recurring.map((r) => `• ${r.merchant}: about ${money(r.amount, 2)}/month`).join('\n') ||
        'No recurring candidates yet. Import at least two months of records.') +
      '\n\nThese are detected patterns, not confirmed subscriptions or guaranteed due dates.';
  else if (['goal', 'emergency', 'save for'].some((v) => q.includes(v)))
    answer =
      'Your manually tracked goals:\n' +
      (s.goals
        .map(
          (g) =>
            `• ${g.name}: ${money(g.saved)} of ${money(g.target)}, with ${money(g.monthly)}/month planned.`,
        )
        .join('\n') || 'No saved goals yet. Create one in Financial Goals.') +
      '\n\nGoal balances are earmarks, not additional assets.';
  else if (['invest', 'portfolio', 'return', 'market'].some((v) => q.includes(v)))
    answer = `Your manually valued portfolio is ${money(m.invested, 2)}, with ${money(m.cost, 2)} of cost basis. The difference is unrealized gain/loss, excluding dividends, realized trades and taxes.\n\nUse the return ledger for contribution-adjusted returns from dated checkpoints. Use Wealth Simulator to explore your own assumptions. Simulated probabilities describe a model, not future market outcomes.`;
  else
    answer = `Your saved net worth is ${money(m.net_worth, 2)}: cash of ${money(m.cash, 2)}, investments of ${money(m.invested, 2)}, less liabilities of ${money(m.liabilities, 2)}.\n\nThis month's recorded income is ${money(m.income, 2)} and spending is ${money(m.spending, 2)}, leaving ${money(m.savings, 2)}.\n\nI can explain your budget, recurring bills, portfolio and goals. The built-in assistant uses topic matching; open-ended local AI is available in the Python edition.`;
  return { answer: intro + answer, source: 'Built-in · saved-data analysis' };
}
export async function browserRequest(path: string, options: RequestInit = {}) {
  const url = new URL(path, 'https://wealthlab.local'),
    workspace = url.searchParams.get('workspace') || 'demo',
    method = options.method || 'GET';
  if (!['demo', 'personal'].includes(workspace)) throw new Error('Unknown workspace.');
  let body: any = {};
  if (options.body && !(options.body instanceof FormData))
    body = JSON.parse(options.body as string);
  if (url.pathname === '/simulate') return simulate(validated(simulationSchema, body));
  if (url.pathname === '/ollama') return { available: false, models: [], browser_mode: true };
  if (url.pathname === '/csv/inspect') {
    const file = (options.body as FormData).get('file') as File;
    if (file.size > 5000000) throw new Error('CSV limit is 5 MB. Split larger files.');
    const parsed = Papa.parse<Record<string, string>>(await file.text(), {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
    });
    if (parsed.errors.length) throw new Error(parsed.errors.map((e) => e.message).join('\n'));
    const columns = parsed.meta.fields || [];
    if (!columns.length || Object.keys((parsed.meta as any).renamedHeaders || {}).length)
      throw new Error('Missing or duplicate column headers.');
    if (parsed.data.length > 10000) throw new Error('Import at most 10,000 rows.');
    return {
      filename: file.name,
      columns,
      rows: parsed.data,
      delimiter: parsed.meta.delimiter,
      count: parsed.data.length,
    };
  }
  const s = await getState(workspace);
  if (url.pathname === '/state')
    return {
      state: s,
      summary: summarize(s, url.searchParams.get('month') || today().slice(0, 7)),
      performance: performance(s),
    };
  if (url.pathname === '/export') return s;
  if (url.pathname === '/export/transactions') return csvExport(s);
  if (url.pathname === '/chat') return chat(body, s, workspace);
  if (url.pathname === '/csv/preview') return previewCSV(body, s);
  if (url.pathname === '/csv/commit') {
    let result: any;
    await mutate(workspace, body.revision, (raw) => {
      const checked = previewCSV(body, raw);
      if (checked.errors.length)
        throw new Error('Import contains invalid rows. Nothing was imported.');
      const rows = checked.rows.filter(
        (r) => (body.include_duplicates && body.mode !== 'prices') || !r.duplicate,
      );
      (raw as any)[body.mode || 'transactions'].push(...rows.map((r) => r.item));
      raw.imports.unshift({
        id: uid(),
        filename: body.filename,
        date: new Date().toISOString(),
        count: rows.length,
        skipped: checked.rows.length - rows.length,
        mode: body.mode || 'transactions',
      });
      result = { imported: rows.length, skipped: checked.rows.length - rows.length };
    });
    return result;
  }
  if (url.pathname === '/restore') {
    validated(stateSchema, body.state);
    return mutate(workspace, body.revision, (raw) => Object.assign(raw, body.state), true);
  }
  if (url.pathname === '/reset-demo')
    return mutate('demo', body.revision, (raw) => Object.assign(raw, freshDemo()));
  if (url.pathname.startsWith('/entities/')) {
    const [, , collection, id] = url.pathname.split('/');
    if (!schemas[collection]) throw new Error('Unknown collection.');
    if (method === 'PUT') {
      const item = validated<any>(schemas[collection], body.item);
      return mutate(workspace, body.revision, (raw) => {
        const rows = (raw as any)[collection];
        const at = rows.findIndex((r: any) => r.id === item.id);
        if (at < 0) rows.push(item);
        else rows[at] = item;
      });
    }
    if (method === 'DELETE')
      return mutate(workspace, Number(url.searchParams.get('revision')), (raw) => {
        if (collection === 'accounts' && raw.transactions.some((t) => t.account_id === id))
          throw new Error(
            'This account has transactions. Export a backup and remove its transactions before deleting it.',
          );
        (raw as any)[collection] = (raw as any)[collection].filter((r: any) => r.id !== id);
      });
  }
  throw new Error('This feature is unavailable in the browser edition.');
}
