import type { State } from '../types';
import { today } from '../types';
export const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
export const hv = (h: any, cost = false) =>
  Math.round(h.shares * (cost ? h.purchase_price : h.current_price));
export function monthOffset(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString('en-CA');
}
export function summarize(s: State, month: string) {
  const balances = Object.fromEntries(
    s.accounts.map((a) => [
      a.id,
      a.opening_balance +
        s.transactions.filter((t) => t.account_id === a.id).reduce((v, t) => v + t.amount, 0),
    ]),
  );
  const cash = Object.values(balances).reduce((a, v) => a + Math.max(0, v), 0),
    liabilities = -Object.values(balances).reduce((a, v) => a + Math.min(0, v), 0),
    invested = s.holdings.reduce((a, h) => a + hv(h), 0),
    cost = s.holdings.reduce((a, h) => a + hv(h, true), 0);
  const tx = s.transactions.filter((t) => t.date.startsWith(month)),
    income = tx.filter((t) => t.kind === 'income').reduce((a, t) => a + t.amount, 0),
    spending = -tx.filter((t) => t.kind === 'expense').reduce((a, t) => a + t.amount, 0),
    cats: Record<string, number> = {};
  tx.filter((t) => t.kind === 'expense').forEach(
    (t) => (cats[t.category] = (cats[t.category] || 0) - t.amount),
  );
  const categories = Object.fromEntries(Object.entries(cats).sort((a, b) => b[1] - a[1]));
  const budgets = s.budgets
    .filter((b) => b.month === month)
    .map((b) => ({
      id: b.id,
      category: b.category,
      planned: b.amount,
      actual: cats[b.category] || 0,
      fixed: b.fixed,
    }));
  const history: any[] = [];
  for (let i = -5; i <= 0; i++) {
    const start = monthOffset(today(), i);
    const endDate = new Date(monthOffset(start, 1) + 'T12:00:00');
    endDate.setDate(0);
    const end = [endDate.toLocaleDateString('en-CA'), today()].sort()[0];
    const eligible = s.accounts.filter((a) => a.opened <= end);
    if (!eligible.length) continue;
    const balance = eligible.reduce(
      (v, a) =>
        v +
        a.opening_balance +
        s.transactions
          .filter((t) => t.account_id === a.id && t.date <= end)
          .reduce((v, t) => v + t.amount, 0),
      0,
    );
    const rows = s.transactions.filter((t) => t.date.startsWith(start.slice(0, 7)));
    history.push({
      month: new Date(start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }),
      date: end,
      balance: balance / 100,
      income: rows.filter((t) => t.kind === 'income').reduce((v, t) => v + t.amount, 0) / 100,
      spending: -rows.filter((t) => t.kind === 'expense').reduce((v, t) => v + t.amount, 0) / 100,
    });
  }
  const groups: Record<string, any[]> = {};
  s.transactions
    .filter((t) => t.kind === 'expense')
    .forEach((t) => (groups[t.merchant.trim().toLowerCase()] ??= []).push(t));
  const recurring = Object.values(groups)
    .flatMap((rows) => {
      const months = new Set(rows.map((t) => t.date.slice(0, 7)));
      const amounts = rows.map((t) => -t.amount);
      const last = [...rows].sort((a, b) => b.date.localeCompare(a.date))[0];
      if (
        months.size < 2 ||
        rows.length > months.size * 1.25 ||
        Math.max(...amounts) > Math.min(...amounts) * 1.2 ||
        (new Date(today()).getTime() - new Date(last.date).getTime()) / 86400000 > 45
      )
        return [];
      return [
        {
          merchant: last.merchant,
          amount: Math.round(amounts.reduce((a, b) => a + b, 0) / rows.length),
          last: last.date,
          next:
            monthOffset(last.date, 1).slice(0, 8) +
            String(Math.min(Number(last.date.slice(8)), 28)).padStart(2, '0'),
          category: last.category,
          occurrences: rows.length,
        },
      ];
    })
    .sort((a, b) => a.next.localeCompare(b.next));
  const insights: any[] = budgets
    .filter((b) => b.actual > b.planned)
    .map((b) => ({
      tone: 'amber',
      title: `${b.category} is over plan`,
      body: `$${((b.actual - b.planned) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} above your ${month} budget.`,
      page: 'Budget Studio',
    }));
  if (income)
    insights.push({
      tone: 'mint',
      title: `You saved ${Math.round(((income - spending) / income) * 100)}% of income`,
      body: `$${((income - spending) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of income remains after recorded expenses this month.`,
      page: 'Transactions',
    });
  if (invested) {
    const largest = [...s.holdings].sort((a, b) => hv(b) - hv(a))[0];
    if (hv(largest) / invested > 0.4)
      insights.push({
        tone: 'blue',
        title: `${largest.ticker} is ${Math.round((hv(largest) / invested) * 100)}% of your portfolio`,
        body: 'Review concentration alongside your own diversification goals.',
        page: 'Investments',
      });
  }
  return {
    balances,
    cash,
    liabilities,
    invested,
    cost,
    net_worth: cash + invested - liabilities,
    income,
    spending,
    savings: income - spending,
    savings_rate: income ? ((income - spending) / income) * 100 : null,
    categories,
    budgets,
    history,
    recurring,
    insights,
    months: [...new Set([...s.transactions.map((t) => t.date.slice(0, 7)), today().slice(0, 7)])]
      .sort()
      .reverse(),
    holdings: s.holdings.map((h) => ({ ...h, value: hv(h), cost: hv(h, true) })),
  };
}
export function performance(s: State) {
  const points = [...s.checkpoints].sort((a, b) => a.date.localeCompare(b.date));
  const result: any = {
    points,
    twr: null,
    mwr: null,
    reason: 'Add at least two dated checkpoints.',
    days: 0,
  };
  if (points.length < 2) return result;
  result.days =
    (new Date(points.at(-1)!.date).getTime() - new Date(points[0].date).getTime()) / 86400000;
  result.twr =
    (points.slice(1).reduce((v, p, i) => (v * (p.value - p.flow)) / points[i].value, 1) - 1) * 100;
  const dates = [points[0].date, ...points.slice(1).map((p) => p.date), points.at(-1)!.date];
  const amounts = [-points[0].value, ...points.slice(1).map((p) => -p.flow), points.at(-1)!.value];
  const years = dates.map(
    (d) => (new Date(d).getTime() - new Date(dates[0]).getTime()) / 86400000 / 365,
  );
  const npv = (log: number) =>
    amounts.reduce(
      (v, a, i) => v + a * Math.exp(Math.max(-600, Math.min(600, -years[i] * log))),
      0,
    );
  const roots: number[] = [];
  let prior = -9.21034,
    fp = npv(prior);
  for (let i = 1; i <= 800; i++) {
    const cur = -9.21034 + (i * 18.42068) / 800,
      fc = npv(cur);
    if (fp === 0) roots.push(prior);
    else if (fp < 0 !== fc < 0) {
      let lo = prior,
        hi = cur,
        flo = fp;
      for (let j = 0; j < 70; j++) {
        const mid = (lo + hi) / 2,
          fm = npv(mid);
        if (fm < 0 === flo < 0) {
          lo = mid;
          flo = fm;
        } else hi = mid;
      }
      roots.push((lo + hi) / 2);
    }
    prior = cur;
    fp = fc;
  }
  const unique = [...new Set(roots.map((v) => Math.round(v * 1e9) / 1e9))];
  if (unique.length === 1) {
    result.mwr = (Math.exp(unique[0]) - 1) * 100;
    result.reason =
      'XIRR uses actual dates and 365-day years. TWR links checkpoint periods with flows at the end of each period.';
  } else
    result.reason =
      unique.length > 1
        ? 'Multiple XIRR roots: an unambiguous money-weighted rate is unavailable.'
        : 'No XIRR root found within the supported range.';
  return result;
}
function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function percentile(sorted: number[], p: number) {
  const at = (sorted.length - 1) * p,
    i = Math.floor(at);
  return sorted[i] + (sorted[Math.min(i + 1, sorted.length - 1)] - sorted[i]) * (at - i);
}
export function simulate(p: any) {
  const random = generator(p.seed);
  const normal = () =>
    Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random());
  const paths = new Float64Array(p.paths).fill(p.initial);
  let balance = p.initial,
    contributions = p.initial;
  const rows: any[] = [
    {
      year: 0,
      value: balance,
      real: balance,
      contributions,
      p10: balance,
      p50: balance,
      p90: balance,
      savings: balance,
    },
  ];
  const rate = ((1 + p.annual_return / 100) * (1 - p.fee / 100)) ** (1 / 12) - 1,
    sigma = p.volatility / 100,
    mu = Math.log1p(p.annual_return / 100) - (sigma * sigma) / 2,
    fee = (1 - p.fee / 100) ** (1 / 12),
    interval = ({ monthly: 1, quarterly: 3, annually: 12 } as Record<string, number>)[p.frequency];
  let finalPaths: number[] = [];
  for (let m = 1; m <= p.years * 12; m++) {
    const contribution =
      m % interval === 0
        ? p.monthly * (1 + p.contribution_growth / 100) ** Math.floor((m - 1) / 12) * interval
        : 0;
    balance = balance * (1 + rate) + contribution;
    contributions += contribution;
    for (let i = 0; i < paths.length; i++)
      paths[i] =
        paths[i] * Math.exp(mu / 12 + (normal() * sigma) / Math.sqrt(12)) * fee + contribution;
    if (m % 12 === 0) {
      const after = balance - (Math.max(0, balance - contributions) * p.tax) / 100;
      finalPaths = Array.from(
        paths,
        (v) => v - (Math.max(0, v - contributions) * p.tax) / 100,
      ).sort((a, b) => a - b);
      rows.push({
        year: m / 12,
        value: round(after),
        real: round(after / (1 + p.inflation / 100) ** (m / 12)),
        contributions: round(contributions),
        p10: round(percentile(finalPaths, 0.1)),
        p50: round(percentile(finalPaths, 0.5)),
        p90: round(percentile(finalPaths, 0.9)),
        savings: round(contributions),
      });
    }
  }
  const min = finalPaths[0],
    max = finalPaths.at(-1)!,
    lo = min === max ? min - 0.5 : min,
    hi = min === max ? max + 0.5 : max,
    width = (hi - lo) / 20,
    counts = new Array(20).fill(0);
  finalPaths.forEach((v) => counts[Math.min(19, Math.max(0, Math.floor((v - lo) / width)))]++);
  const final = rows.at(-1);
  return {
    rows,
    final,
    probability: round((finalPaths.filter((v) => v >= p.target).length / p.paths) * 100),
    distribution: counts.map((count, i) => ({ value: round(lo + (i + 0.5) * width), count })),
    growth: round(final.value - contributions),
    paths: p.paths,
    seed: p.seed,
  };
}
