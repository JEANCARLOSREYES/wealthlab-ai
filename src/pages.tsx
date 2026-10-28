import { useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Plus,
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Download,
  Upload,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  Repeat2,
  ShieldCheck,
  Target,
  Sparkles,
  Send,
  Pin,
  Trash2,
  Pencil,
  BookOpen,
  Check,
  Database,
  RefreshCw,
  FileJson,
  Copy,
  CalendarClock,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { Context } from './App';
import Performance from './Performance';
import {
  type Entity,
  request,
  money,
  compact,
  colors,
  monthLabel,
  uid,
  today,
  currentMonth,
  browserMode,
  exportDownload,
} from './types';
import {
  Panel,
  Button,
  Empty,
  Metric,
  Progress,
  Tag,
  LinkButton,
  Currency,
  Modal,
  Field,
  chartTooltip,
  chartAxis,
} from './components';
const fmt = (v: any) => money(Number(v) * 100);
const day = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function Donut({
  rows,
  total,
  label,
}: {
  rows: { name: string; value: number }[];
  total: string;
  label: string;
}) {
  return (
    <div className="donut-wrap">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={72}
            outerRadius={91}
            paddingAngle={4}
            stroke="none"
          >
            {rows.map((r, i) => (
              <Cell key={r.name} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltip} formatter={(v: any) => money(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <small>{label}</small>
        <strong>{total}</strong>
      </div>
    </div>
  );
}
export function Overview({ c }: { c: Context }) {
  const { m, s } = c;
  const [chart, setChart] = useState('balance'),
    [range, setRange] = useState(6),
    [allAccounts, setAllAccounts] = useState(false);
  const categories = Object.entries(m.categories);
  const recent = [...s.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const first = m.history.at(-range)?.balance || 0,
    last = m.history.at(-1)?.balance || 0,
    change = last - first;
  return (
    <>
      <div className="overview-metrics">
        <div className="networth-card">
          <div className="metric-label">
            Total net worth{' '}
            <span className="metric-icon">
              <Wallet size={18} />
            </span>
          </div>
          <div className="networth-number tabular">
            {money(m.net_worth)}
            <span>.{String(Math.abs(m.net_worth) % 100).padStart(2, '0')}</span>
          </div>
          <div className="networth-caption">
            <span className="status-dot" />
            Your assets, less what you owe
          </div>
          <div className="networth-line" />
          <div className="networth-bottom">
            <span>Liabilities {money(m.liabilities, 2)}</span>
            <ArrowUpRight size={17} />
          </div>
        </div>
        <Metric
          label="Available cash"
          value={money(m.cash)}
          sub={`${s.accounts.filter((a) => (m.balances[a.id] || 0) > 0).length} positive account balances`}
          icon={<Landmark size={17} />}
        />
        <Metric
          label="Investments"
          value={money(m.invested)}
          sub={`${m.cost ? (((m.invested - m.cost) / m.cost) * 100).toFixed(1) : '0.0'}% unrealized gain / loss`}
          icon={<TrendingUp size={18} />}
        />
        <Metric
          label="Monthly savings"
          value={money(m.savings)}
          sub={
            m.savings_rate === null
              ? 'Add income to see your savings rate'
              : `${m.savings_rate.toFixed(1)}% of recorded income`
          }
          icon={<Sparkles size={17} />}
        />
      </div>
      <div className="overview-flowline">
        <span>YOUR MONTHLY CASH FLOW</span>
        <div>
          <ArrowDownLeft size={14} />
          <span>Income</span>
          <strong>{money(m.income)}</strong>
        </div>
        <div>
          <ArrowUpRight size={14} />
          <span>Spending</span>
          <strong>{money(m.spending)}</strong>
        </div>
        <div>
          <span>Savings rate</span>
          <strong>{m.savings_rate === null ? '—' : m.savings_rate.toFixed(1) + '%'}</strong>
        </div>
      </div>
      <div className="dashboard-grid">
        <Panel
          className="history-panel"
          title="The bigger picture"
          action={
            <div className="segmented">
              {[3, 6].map((n) => (
                <button
                  className={range === n ? 'selected' : ''}
                  key={n}
                  onClick={() => setRange(n)}
                >
                  {n}M
                </button>
              ))}
            </div>
          }
        >
          <div className="chart-title-row">
            <div>
              <span className="eyebrow">
                {chart === 'balance' ? 'NET ACCOUNT BALANCES' : 'INCOME LESS SPENDING'}
              </span>
              <div className="chart-headline tabular">
                {money((chart === 'balance' ? last : m.savings / 100) * 100)}{' '}
                <Tag tone={change >= 0 ? 'mint' : 'amber'}>
                  {chart === 'balance'
                    ? `${change >= 0 ? '+' : ''}${money(change * 100)}`
                    : monthLabel(c.month)}
                </Tag>
              </div>
            </div>
            <div className="chart-toggle">
              <button
                className={chart === 'balance' ? 'active' : ''}
                onClick={() => setChart('balance')}
              >
                Balances
              </button>
              <button
                className={chart === 'cashflow' ? 'active' : ''}
                onClick={() => setChart('cashflow')}
              >
                Cash flow
              </button>
            </div>
          </div>
          {m.history.length ? (
            <div className="main-chart">
              <ResponsiveContainer width="100%" height={235}>
                {chart === 'balance' ? (
                  <AreaChart
                    data={m.history.slice(-range)}
                    margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="wealthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b4eed4" stopOpacity={0.23} />
                        <stop offset="100%" stopColor="#b4eed4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#2a3030" vertical={false} strokeDasharray="3 5" />
                    <XAxis dataKey="month" {...chartAxis} dy={8} />
                    <YAxis {...chartAxis} tickFormatter={(v) => '$' + compact(v)} />
                    <Tooltip contentStyle={chartTooltip} formatter={fmt} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      name="Net account balances"
                      stroke="#b4eed4"
                      strokeWidth={2.5}
                      fill="url(#wealthFill)"
                      activeDot={{ r: 5, stroke: '#17231e', strokeWidth: 3 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={m.history.slice(-range)}
                    margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#2a3030" vertical={false} strokeDasharray="3 5" />
                    <XAxis dataKey="month" {...chartAxis} />
                    <YAxis {...chartAxis} tickFormatter={(v) => '$' + compact(v)} />
                    <Tooltip contentStyle={chartTooltip} formatter={fmt} />
                    <Bar dataKey="income" name="Income" fill={colors[0]} radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="spending"
                      name="Spending"
                      fill={colors[1]}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty
              title="Your story starts here"
              body="Add an account and transactions to build a balance history."
              action={
                <Button small onClick={() => c.edit('accounts')}>
                  <Plus size={14} />
                  Add account
                </Button>
              }
            />
          )}
          <div className="chart-footnote">
            <span className="legend-dot" />{' '}
            {chart === 'balance'
              ? 'Recorded account balances · investments excluded without historical prices'
              : 'Income and expenses · transfers excluded'}
            <span>{range} month view</span>
          </div>
        </Panel>
        <Panel
          className="spending-panel"
          title="Where it went"
          action={<LinkButton onClick={() => c.go('Transactions')}>Details</LinkButton>}
        >
          {categories.length ? (
            <>
              <Donut
                rows={categories.map(([name, value]) => ({ name, value }))}
                total={money(m.spending)}
                label="MONTHLY SPENDING"
              />
              <div className="legend-list">
                {categories.slice(0, 4).map(([name, value], i) => (
                  <div key={name}>
                    <span>
                      <i style={{ background: colors[i] }} />
                      {name}
                    </span>
                    <strong>
                      {money(value)} <small>{((value / m.spending) * 100).toFixed(0)}%</small>
                    </strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty title="No spending yet" body="Your categorized spending will appear here." />
          )}
        </Panel>
      </div>
      <div className="insight-strip">
        <span className="insight-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <div className="eyebrow">A LITTLE PERSPECTIVE FROM JARVIS</div>
          <p>
            {m.insights[0] ? (
              <>
                <strong>{m.insights[0].title}.</strong> {m.insights[0].body}
              </>
            ) : (
              'Small steps add up. Start with your accounts, then give your money a plan.'
            )}
          </p>
        </div>
        <button onClick={() => c.go('JARVIS AI')}>
          Explore insights <ArrowRight size={15} />
        </button>
      </div>
      <div className="dashboard-grid lower-grid">
        <Panel
          title="Recent activity"
          action={<LinkButton onClick={() => c.go('Transactions')}>All transactions</LinkButton>}
        >
          {recent.length ? (
            <div className="activity-list">
              {recent.map((t, i) => (
                <button
                  key={t.id}
                  className="activity-row"
                  onClick={() => c.edit('transactions', t)}
                >
                  <span className={`merchant-icon ${t.kind}`}>
                    {t.kind === 'transfer' ? (
                      <ArrowLeftRight size={17} />
                    ) : t.kind === 'income' ? (
                      <ArrowDownLeft size={17} />
                    ) : (
                      t.merchant.charAt(0)
                    )}
                  </span>
                  <span className="activity-name">
                    <strong>{t.merchant}</strong>
                    <small>
                      {t.category} <span>·</span> {day(t.date)}
                    </small>
                  </span>
                  <span className="activity-amount">
                    <Currency value={t.amount} />
                    <small>
                      {t.kind === 'transfer'
                        ? 'Internal transfer'
                        : s.accounts.find((a) => a.id === t.account_id)?.name}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Nothing recorded yet"
              body="Add a transaction or bring your records in with CSV."
              action={
                <Button small onClick={() => c.importData()}>
                  Import CSV
                </Button>
              }
            />
          )}
        </Panel>
        <Panel
          title="A future worth planning for"
          action={<LinkButton onClick={() => c.go('Financial Goals')}>All goals</LinkButton>}
        >
          <div className="mini-goals">
            {s.goals.slice(0, 3).map((g, i) => (
              <button key={g.id} onClick={() => c.edit('goals', g)}>
                <div className="goal-name">
                  <span className={`goal-mini-icon ${g.color}`}>
                    <Target size={16} />
                  </span>
                  <strong>{g.name}</strong>
                  <span>{Math.min(100, (g.saved / g.target) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={(g.saved / g.target) * 100} color={colors[i]} />
                <div className="goal-caption">
                  <span>{money(g.saved)} saved</span>
                  <span>of {money(g.target)}</span>
                </div>
              </button>
            ))}
            {!s.goals.length && (
              <Empty
                title="What matters to you?"
                body="Give your next milestone a name and a plan."
                action={
                  <Button small onClick={() => c.edit('goals')}>
                    Create a goal
                  </Button>
                }
              />
            )}
          </div>
        </Panel>
      </div>
      <Panel
        title="Your accounts"
        action={
          <Button secondary small onClick={() => c.edit('accounts')}>
            <Plus size={14} />
            Add account
          </Button>
        }
      >
        <div className="account-grid">
          {s.accounts.map((a) => (
            <button className="account-tile" key={a.id} onClick={() => c.edit('accounts', a)}>
              <span className="account-icon">
                <Landmark size={19} />
              </span>
              <span>
                <strong>{a.name}</strong>
                <small>
                  {a.kind} · {a.institution}
                </small>
              </span>
              <b>{money(m.balances[a.id], 2)}</b>
              <ChevronRight size={15} />
            </button>
          ))}
          {!s.accounts.length && (
            <p className="muted">
              Add your first account with its opening balance. Your personal workspace starts empty.
            </p>
          )}
        </div>
        {s.accounts.length > 0 && (
          <button
            className="text-button account-manage"
            onClick={() => setAllAccounts(!allAccounts)}
          >
            {allAccounts ? 'Hide account controls' : 'Manage accounts'}
            <ChevronRight size={13} />
          </button>
        )}
        {allAccounts && (
          <div className="account-controls">
            {s.accounts.map((a) => (
              <div key={a.id}>
                <span>
                  {a.name} · opening {money(a.opening_balance, 2)} on {a.opened}
                </span>
                <button
                  className="icon-button"
                  aria-label={'Delete ' + a.name}
                  onClick={() => c.remove('accounts', a)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

export function Transactions({ c }: { c: Context }) {
  const [search, setSearch] = useState(''),
    [kind, setKind] = useState('all'),
    [category, setCategory] = useState('all'),
    [account, setAccount] = useState('all'),
    [period, setPeriod] = useState('month'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [sort, setSort] = useState('newest'),
    [page, setPage] = useState(0),
    [tab, setTab] = useState('transactions');
  useEffect(() => setPage(0), [search, kind, category, account, period, from, to, c.month, sort]);
  const rows = c.s.transactions
    .filter(
      (t) =>
        (t.merchant + ' ' + t.note).toLowerCase().includes(search.toLowerCase()) &&
        (kind === 'all' || t.kind === kind) &&
        (category === 'all' || t.category === category) &&
        (account === 'all' || t.account_id === account) &&
        (period !== 'month' || t.date.startsWith(c.month)) &&
        (period !== 'custom' || ((!from || t.date >= from) && (!to || t.date <= to))),
    )
    .sort((a, b) =>
      sort === 'largest'
        ? Math.abs(b.amount) - Math.abs(a.amount)
        : sort === 'oldest'
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date),
    );
  const income = rows.filter((t) => t.kind === 'income').reduce((a, t) => a + t.amount, 0),
    expense = -rows.filter((t) => t.kind === 'expense').reduce((a, t) => a + t.amount, 0);
  return (
    <>
      <div className="three-metrics">
        <Metric
          label="Income in view"
          value={money(income)}
          sub="Transfers excluded"
          icon={<ArrowDownLeft size={18} />}
        />
        <Metric
          label="Spending in view"
          value={money(expense)}
          sub="Purchases and expenses"
          icon={<ArrowUpRight size={18} />}
        />
        <Metric
          label="Net cash flow"
          value={money(income - expense)}
          sub={`${rows.length} matching transactions`}
          icon={<ArrowLeftRight size={18} />}
        />
      </div>
      <Panel className="transactions-panel">
        <div className="tab-toolbar">
          <div className="tabs">
            {[
              ['transactions', 'All activity'],
              ['recurring', 'Recurring'],
              ['rules', 'Rules'],
              ['imports', 'Import history'],
            ].map(([v, label]) => (
              <button className={tab === v ? 'active' : ''} onClick={() => setTab(v)} key={v}>
                {label}
                {v === 'rules' && <small>{c.s.rules.length}</small>}
              </button>
            ))}
          </div>
          <div className="button-group">
            <a
              className="btn secondary small"
              href={`/api/export/transactions?workspace=${c.workspace}`}
              onClick={(e) => {
                exportDownload(e, c.workspace, true).catch((err) => c.notify(err.message));
              }}
              download
            >
              <Download size={14} />
              Export
            </a>
            <Button small onClick={() => c.importData()}>
              <Upload size={14} />
              Import CSV
            </Button>
          </div>
        </div>
        {tab === 'transactions' && (
          <>
            <div className="filter-row">
              <div className="input-search">
                <Search size={16} />
                <input
                  placeholder="Search merchants or notes…"
                  aria-label="Search transactions"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Transaction type"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {['all', 'expense', 'income', 'transfer'].map((x) => (
                  <option key={x} value={x}>
                    {x === 'all' ? 'All types' : x}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {[...new Set(c.s.transactions.map((t) => t.category))].sort().map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select
                aria-label="Filter account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              >
                <option value="all">All accounts</option>
                {c.s.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Date range"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="month">Selected month</option>
                <option value="all">All dates</option>
                <option value="custom">Custom dates</option>
              </select>
              <select
                aria-label="Sort transactions"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="largest">Largest amount</option>
              </select>
            </div>
            {period === 'custom' && (
              <div className="date-filters">
                <Field label="From">
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="Through">
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </div>
            )}
            {rows.length ? (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Merchant / description</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Account</th>
                        <th>Type</th>
                        <th className="align-right">Amount</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(page * 15, page * 15 + 15).map((t) => (
                        <tr key={t.id}>
                          <td>
                            <button
                              className="table-merchant"
                              onClick={() => c.edit('transactions', t)}
                            >
                              <span className={`merchant-icon small ${t.kind}`}>
                                {t.kind === 'transfer' ? (
                                  <ArrowLeftRight size={14} />
                                ) : (
                                  t.merchant[0]
                                )}
                              </span>
                              <span>
                                {t.merchant}
                                {t.note && <small>{t.note}</small>}
                              </span>
                            </button>
                          </td>
                          <td className="muted nowrap">
                            {day(t.date)}
                            <small className="table-year">{t.date.slice(0, 4)}</small>
                          </td>
                          <td>
                            <button
                              className="category-chip"
                              onClick={() => c.edit('transactions', t)}
                            >
                              {t.category}
                            </button>
                          </td>
                          <td className="muted">
                            {c.s.accounts.find((a) => a.id === t.account_id)?.name}
                          </td>
                          <td>
                            <span className={'type-label ' + t.kind}>{t.kind}</span>
                          </td>
                          <td className="align-right tabular">
                            <Currency value={t.amount} />
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={'Delete ' + t.merchant}
                              onClick={() => c.remove('transactions', t)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span>
                    Showing {page * 15 + 1}–{Math.min(rows.length, page * 15 + 15)} of {rows.length}
                  </span>
                  <div>
                    <Button secondary small disabled={page === 0} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <Button
                      secondary
                      small
                      disabled={(page + 1) * 15 >= rows.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <Empty
                title="A clean slate"
                body="No transactions match this view. Change your filters, add a transaction, or import a CSV."
                action={
                  <Button onClick={() => c.edit('transactions')}>
                    <Plus size={15} />
                    Add transaction
                  </Button>
                }
              />
            )}
          </>
        )}
        {tab === 'recurring' && (
          <div className="inner-content">
            <p className="muted">
              Candidates with stable amounts across at least two months. Estimated dates are
              patterns, not confirmed bills.
            </p>
            {c.m.recurring.length ? (
              <div className="recurring-grid">
                {c.m.recurring.map((r) => (
                  <div className="recurring-card" key={r.merchant}>
                    <span className="account-icon">
                      <Repeat2 size={19} />
                    </span>
                    <strong>{r.merchant}</strong>
                    <b>
                      {money(r.amount, 2)}
                      <small>/mo</small>
                    </b>
                    <p>
                      {r.category} · {r.occurrences} observations
                    </p>
                    <span className="muted">
                      Next estimate: {day(r.next)} · last: {day(r.last)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="More history, more clarity"
                body="Import two or more months of records to find recurring payment patterns."
              />
            )}
          </div>
        )}
        {tab === 'rules' && (
          <div className="inner-content">
            <div className="section-description">
              <p>
                First matching rule applies to future CSV imports. Rules can distinguish transfers
                from purchases.
              </p>
              <Button small onClick={() => c.edit('rules')}>
                <Plus size={14} />
                Add rule
              </Button>
            </div>
            {c.s.rules.map((r, i) => (
              <div className="list-row" key={r.id}>
                <span className="number-pill">{i + 1}</span>
                <span>
                  Merchant contains <strong>“{r.contains}”</strong>
                </span>
                <ArrowRight size={15} />
                <Tag>{r.category}</Tag>
                <Tag>{r.kind}</Tag>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label="Edit rule"
                    onClick={() => c.edit('rules', r)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Delete rule"
                    onClick={() => c.remove('rules', r)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {!c.s.rules.length && (
              <Empty
                title="Let your rules do the sorting"
                body="Create a merchant-matching rule for future imports."
              />
            )}
          </div>
        )}
        {tab === 'imports' && (
          <div className="inner-content">
            {c.s.imports.length ? (
              c.s.imports.map((r) => (
                <div className="list-row" key={r.id}>
                  <Upload size={18} />
                  <span>
                    <strong>{r.filename}</strong>
                    <small>
                      {new Date(r.date).toLocaleString()} · {r.mode}
                    </small>
                  </span>
                  <div className="row-actions">
                    <Tag tone="mint">{r.count} imported</Tag>
                    <Tag>{r.skipped} duplicates skipped</Tag>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="Your imports, documented"
                body="Import history shows the file, time, imported rows and skipped duplicates."
              />
            )}
          </div>
        )}
      </Panel>
    </>
  );
}

export function Budgets({ c }: { c: Context }) {
  const [template, setTemplate] = useState(false),
    [percent, setPercent] = useState({ needs: 50, wants: 30, savings: 20 }),
    [busy, setBusy] = useState(false);
  const planned = c.m.budgets.reduce((a, b) => a + b.planned, 0),
    actual = c.m.spending,
    remaining = planned - actual;
  const prevDate = new Date(c.month + '-15');
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prev = prevDate.toLocaleDateString('en-CA').slice(0, 7);
  const prevSpend = -c.s.transactions
    .filter((t) => t.date.startsWith(prev) && t.kind === 'expense')
    .reduce((a, t) => a + t.amount, 0);
  const copyPrevious = async () => {
    setBusy(true);
    try {
      const old = c.s.budgets.filter((b) => b.month === prev);
      if (!old.length) {
        c.notify('No budgets exist in the previous month.');
        return;
      }
      let revision = c.s.revision;
      for (const b of old) {
        if (c.s.budgets.some((x) => x.month === c.month && x.category === b.category)) continue;
        const result = await request(`/entities/budgets?workspace=${c.workspace}`, {
          method: 'PUT',
          body: JSON.stringify({ revision, item: { ...b, id: uid(), month: c.month } }),
        });
        revision = result.revision;
      }
      await c.refresh();
      c.notify('Previous month budgets copied. Existing categories kept.');
    } catch (e) {
      c.notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="four-metrics">
        <Metric
          label="Planned spending"
          value={money(planned)}
          sub={monthLabel(c.month)}
          icon={<Wallet size={18} />}
        />
        <Metric
          label="Actually spent"
          value={money(actual)}
          sub={`${planned ? ((actual / planned) * 100).toFixed(0) : '0'}% of plan used`}
          icon={<ArrowUpRight size={18} />}
        />
        <Metric
          label={remaining >= 0 ? 'Room in your plan' : 'Above your plan'}
          value={money(Math.abs(remaining))}
          sub={remaining >= 0 ? 'Across all categories' : 'Review your category limits'}
          icon={<Target size={18} />}
        />
        <Metric
          label="Previous month"
          value={money(prevSpend)}
          sub={
            prevSpend
              ? `${(((actual - prevSpend) / prevSpend) * 100).toFixed(1)}% change in spending`
              : 'No prior spending recorded'
          }
          icon={<CalendarClock size={18} />}
        />
      </div>
      <Panel
        title="A plan that works for you"
        action={
          <div className="button-group">
            <Button secondary small disabled={busy} onClick={copyPrevious}>
              <Copy size={14} />
              Copy previous
            </Button>
            <Button secondary small onClick={() => setTemplate(!template)}>
              50 / 30 / 20
            </Button>
            <Button small onClick={() => c.edit('budgets')}>
              <Plus size={14} />
              Category
            </Button>
          </div>
        }
      >
        {template && (
          <div className="template-box">
            <div>
              <h3>Build a percentage plan</h3>
              <p className="muted">
                Explore a split of your recorded monthly income. Adjust the percentages to suit your
                plan.
              </p>
            </div>
            <div className="percentage-fields">
              {(['needs', 'wants', 'savings'] as const).map((k) => (
                <Field key={k} label={k + ' (%)'}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={percent[k]}
                    onChange={(e) => setPercent({ ...percent, [k]: Number(e.target.value) })}
                  />
                  <strong>{money((c.m.income * percent[k]) / 100)}</strong>
                </Field>
              ))}
            </div>
            <p
              className={
                Object.values(percent).reduce((a, b) => a + b, 0) !== 100
                  ? 'error-text'
                  : 'form-hint'
              }
            >
              Total: {Object.values(percent).reduce((a, b) => a + b, 0)}%. Use these dollar targets
              to set category limits below; this calculator does not overwrite saved budgets.
            </p>
          </div>
        )}
        {c.m.budgets.length ? (
          <div className="budget-list">
            {c.m.budgets.map((b, i) => {
              const utilization = b.planned ? (b.actual / b.planned) * 100 : b.actual ? 100 : 0;
              return (
                <div className="budget-row" key={b.id}>
                  <div className="budget-category">
                    <span
                      className="category-square"
                      style={{
                        color: colors[i % colors.length],
                        background: colors[i % colors.length] + '14',
                      }}
                    >
                      {b.category[0]}
                    </span>
                    <span>
                      <strong>{b.category}</strong>
                      <small>{b.fixed ? 'Fixed expense' : 'Variable expense'}</small>
                    </span>
                  </div>
                  <div className="budget-bar">
                    <div>
                      <span>
                        {money(b.actual)} <small>of {money(b.planned)}</small>
                      </span>
                      <b className={b.actual > b.planned ? 'amber-text' : ''}>
                        {utilization.toFixed(0)}%
                      </b>
                    </div>
                    <Progress
                      value={utilization}
                      color={b.actual > b.planned ? '#edc48a' : colors[i % colors.length]}
                    />
                  </div>
                  <span className={`budget-remaining ${b.actual > b.planned ? 'amber-text' : ''}`}>
                    {money(Math.abs(b.planned - b.actual))}
                    <small>{b.actual > b.planned ? 'over plan' : 'remaining'}</small>
                  </span>
                  <div className="button-group">
                    <button
                      className="icon-button"
                      aria-label={'Edit ' + b.category + ' budget'}
                      onClick={() =>
                        c.edit(
                          'budgets',
                          c.s.budgets.find((x) => x.id === b.id),
                        )
                      }
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={'Delete ' + b.category + ' budget'}
                      onClick={() => c.remove('budgets', b)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Make a little room for everything"
            body="Create category limits for this month, or copy your previous month's plan."
            action={<Button onClick={() => c.edit('budgets')}>Create category budget</Button>}
          />
        )}
        {Object.entries(c.m.categories).some(
          ([cat]) => !c.m.budgets.some((b) => b.category === cat),
        ) && (
          <div className="notice">
            <AlertCircle size={17} />
            <span>
              Unbudgeted spending:{' '}
              {Object.entries(c.m.categories)
                .filter(([cat]) => !c.m.budgets.some((b) => b.category === cat))
                .map(([cat, v]) => `${cat} (${money(v)})`)
                .join(', ')}
              . It is included in total spending above.
            </span>
          </div>
        )}
      </Panel>
      <div className="two-col">
        <Panel title="Monthly spending comparison">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={c.m.history} margin={{ left: -20, top: 20 }}>
              <CartesianGrid stroke="#293130" vertical={false} strokeDasharray="3 4" />
              <XAxis dataKey="month" {...chartAxis} />
              <YAxis {...chartAxis} tickFormatter={(v) => '$' + compact(v)} />
              <Tooltip contentStyle={chartTooltip} formatter={fmt} />
              <Bar
                dataKey="spending"
                name="Actual spending"
                fill={colors[1]}
                radius={[5, 5, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Budget history">
          <div className="inner-content">
            {[...new Set(c.s.budgets.map((b) => b.month))]
              .sort()
              .reverse()
              .slice(0, 6)
              .map((month) => {
                const plan = c.s.budgets
                    .filter((b) => b.month === month)
                    .reduce((a, b) => a + b.amount, 0),
                  spent = -c.s.transactions
                    .filter((t) => t.kind === 'expense' && t.date.startsWith(month))
                    .reduce((a, t) => a + t.amount, 0);
                return (
                  <div className="history-row" key={month}>
                    <strong>{monthLabel(month)}</strong>
                    <span>
                      {money(spent)} / {money(plan)}
                    </span>
                    <Tag tone={spent <= plan ? 'mint' : 'amber'}>
                      {spent <= plan ? 'Within plan' : 'Over plan'}
                    </Tag>
                  </div>
                );
              })}
            {!c.s.budgets.length && <p className="muted">Saved monthly plans will appear here.</p>}
          </div>
        </Panel>
      </div>
    </>
  );
}

export function Investments({ c }: { c: Context }) {
  const [targets, setTargets] = useState<Record<string, number>>({}),
    [rebal, setRebal] = useState(false);
  const { m } = c;
  const allocation: Record<string, number> = {};
  m.holdings.forEach(
    (h) => (allocation[h.asset_class] = (allocation[h.asset_class] || 0) + h.value),
  );
  const gain = m.invested - m.cost;
  return (
    <>
      <div className="four-metrics">
        <Metric
          label="Portfolio value"
          value={money(m.invested)}
          sub="At your manually supplied prices"
          icon={<ChartIcon />}
        />
        <Metric
          label="Cost basis"
          value={money(m.cost)}
          sub={`${m.holdings.length} saved purchase lots`}
          icon={<Landmark size={18} />}
        />
        <Metric
          label="Unrealized gain / loss"
          value={money(gain)}
          sub={`${m.cost ? ((gain / m.cost) * 100).toFixed(2) : '0.00'}% vs. acquisition cost`}
          icon={<TrendingUp size={18} />}
        />
        <Metric
          label="Asset classes"
          value={String(Object.keys(allocation).length)}
          sub="Diversification starts with perspective"
          icon={<Target size={18} />}
        />
      </div>
      <div className="portfolio-grid">
        <Panel
          title="Your holdings"
          action={
            <div className="button-group">
              <Button secondary small onClick={() => c.importData('holdings')}>
                <Upload size={14} />
                Import
              </Button>
              <Button small onClick={() => c.edit('holdings')}>
                <Plus size={14} />
                Holding
              </Button>
            </div>
          }
        >
          {m.holdings.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Units / cost</th>
                    <th>Price / as of</th>
                    <th className="align-right">Value</th>
                    <th className="align-right">Unrealized</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {m.holdings.map((h, i) => (
                    <tr key={h.id}>
                      <td>
                        <button
                          className="table-merchant"
                          onClick={() =>
                            c.edit(
                              'holdings',
                              c.s.holdings.find((x) => x.id === h.id),
                            )
                          }
                        >
                          <span
                            className="ticker-icon"
                            style={{ color: colors[i % colors.length] }}
                          >
                            {h.ticker.slice(0, 2)}
                          </span>
                          <span>
                            <b>{h.ticker}</b>
                            <small>{h.name}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        {h.shares}
                        <small className="table-year">{money(h.purchase_price, 2)} / unit</small>
                      </td>
                      <td>
                        {money(h.current_price, 2)}
                        <small className="table-year">{h.valued}</small>
                      </td>
                      <td className="align-right tabular">{money(h.value, 2)}</td>
                      <td className="align-right tabular">
                        <Currency value={h.value - h.cost} />
                        <small className="table-year">
                          {h.cost ? (((h.value - h.cost) / h.cost) * 100).toFixed(1) : '—'}%
                        </small>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={'Delete ' + h.ticker}
                          onClick={() => c.remove('holdings', h)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Meet your future portfolio"
              body="Add a purchase lot and a valuation price to start tracking."
              action={<Button onClick={() => c.edit('holdings')}>Add holding</Button>}
            />
          )}
          <div className="notice">
            <Clock size={16} />
            <span>
              Prices are manual snapshots, not live quotes. Gains exclude dividends, realized
              trades, fees and taxes. Contribution-adjusted returns require dated cash flows and
              valuation history; no TWR or IRR is inferred from these snapshots.
            </span>
          </div>
        </Panel>
        <Panel title="Asset allocation">
          {m.invested ? (
            <>
              <Donut
                rows={Object.entries(allocation).map(([name, value]) => ({ name, value }))}
                total={String(Object.keys(allocation).length)}
                label="ASSET CLASSES"
              />
              <div className="legend-list">
                {Object.entries(allocation).map(([name, value], i) => (
                  <div key={name}>
                    <span>
                      <i style={{ background: colors[i] }} />
                      {name}
                    </span>
                    <strong>{((value / m.invested) * 100).toFixed(1)}%</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty title="Your allocation" body="Your holdings will build this picture." />
          )}
        </Panel>
      </div>
      <Performance c={c} />
      <Panel
        title="Explore a target allocation"
        action={
          <Button secondary small onClick={() => setRebal(!rebal)}>
            {rebal ? 'Close calculator' : 'Open calculator'}
          </Button>
        }
      >
        <p className="panel-description">
          Set your own target weights to understand allocation gaps at current prices. This is a
          planning calculator; it does not place trades.
        </p>
        {rebal && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Asset class</th>
                    <th>Current weight</th>
                    <th>Your target %</th>
                    <th className="align-right">Target value less current</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(allocation).map(([name, value]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{m.invested ? ((value / m.invested) * 100).toFixed(1) : 0}%</td>
                      <td>
                        <input
                          aria-label={name + ' target percent'}
                          className="compact-input"
                          type="number"
                          min="0"
                          max="100"
                          value={targets[name] ?? 0}
                          onChange={(e) =>
                            setTargets({ ...targets, [name]: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="align-right">
                        <Currency
                          value={Math.round((m.invested * (targets[name] || 0)) / 100) - value}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="panel-description">
              Target weights total {Object.values(targets).reduce((a, b) => a + b, 0)}%. They must
              total 100% for a complete allocation. Consider your own costs and tax circumstances
              before making changes.
            </p>
          </>
        )}
      </Panel>
      <div className="insight-strip">
        <Sparkles size={23} />
        <div>
          <h3>What could consistency look like?</h3>
          <p>Explore contributions, fees and inflation in the Wealth Simulator.</p>
        </div>
        <Button secondary onClick={() => c.go('Wealth Simulator')}>
          Model your future <ArrowRight size={15} />
        </Button>
      </div>
    </>
  );
}
function ChartIcon() {
  return <TrendingUp size={18} />;
}

export function Goals({ c }: { c: Context }) {
  const [debt, setDebt] = useState({ balance: 5000, apr: 18, payment: 250 }),
    [months, setMonths] = useState(6);
  let balance = debt.balance,
    interest = 0,
    n = 0;
  while (balance > 0 && n < 1200) {
    const cost = (balance * debt.apr) / 1200;
    interest += cost;
    balance = Math.max(0, balance + cost - debt.payment);
    n++;
  }
  const avg = c.m.history.length
    ? c.m.history.reduce((a, r) => a + r.spending, 0) / c.m.history.length
    : 0;
  return (
    <>
      <div className="three-metrics">
        <Metric
          label="Your goals"
          value={String(c.s.goals.length)}
          sub="Reasons to keep moving forward"
          icon={<Target size={18} />}
        />
        <Metric
          label="Earmarked savings"
          value={money(c.s.goals.reduce((a, g) => a + g.saved, 0))}
          sub="Manually tracked · not additional assets"
          icon={<Wallet size={18} />}
        />
        <Metric
          label="Monthly commitment"
          value={money(c.s.goals.reduce((a, g) => a + g.monthly, 0))}
          sub="Planned contributions across your goals"
          icon={<Repeat2 size={18} />}
        />
      </div>
      <div className="goals-grid">
        {c.s.goals.map((g, i) => {
          const left = Math.max(0, g.target - g.saved),
            remainingMonths = Math.max(
              0,
              (new Date(g.deadline).getFullYear() - new Date().getFullYear()) * 12 +
                new Date(g.deadline).getMonth() -
                new Date().getMonth(),
            ),
            needed = remainingMonths ? left / remainingMonths : left,
            projected = g.monthly ? Math.ceil(left / g.monthly) : null;
          return (
            <Panel key={g.id} className={`goal-card ${g.color}`}>
              <div className="goal-card-top">
                <span className={'goal-icon ' + g.color}>
                  <Target size={23} />
                </span>
                <div className="button-group">
                  <button
                    aria-label={'Edit ' + g.name}
                    className="icon-button"
                    onClick={() => c.edit('goals', g)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    aria-label={'Delete ' + g.name}
                    className="icon-button"
                    onClick={() => c.remove('goals', g)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <h3>{g.name}</h3>
              <p className="muted">
                Target {day(g.deadline)}, {g.deadline.slice(0, 4)}
              </p>
              <div className="goal-big-number">
                {money(g.saved)}
                <small> / {money(g.target)}</small>
              </div>
              <Progress value={(g.saved / g.target) * 100} color={colors[i % colors.length]} />
              <div className="goal-caption">
                <span>{Math.min(100, (g.saved / g.target) * 100).toFixed(0)}% complete</span>
                <span>{money(left)} to go</span>
              </div>
              <div className="goal-plan">
                <span>
                  Monthly plan<strong>{money(g.monthly)}</strong>
                </span>
                <span>
                  Needed by deadline<strong>{money(needed)}/mo</strong>
                </span>
              </div>
              <Tag tone={left === 0 ? 'mint' : g.monthly >= needed ? 'mint' : 'amber'}>
                {left === 0
                  ? 'Goal reached'
                  : g.monthly >= needed
                    ? 'On track at planned pace'
                    : 'Contribution gap'}
              </Tag>
              <p className="form-hint">
                {projected !== null
                  ? `${projected} month${projected === 1 ? '' : 's'} at your planned pace.`
                  : 'Add a monthly contribution to estimate a timeline.'}{' '}
                No growth assumed.
              </p>
            </Panel>
          );
        })}
        <button className="new-goal" onClick={() => c.edit('goals')}>
          <span>
            <Plus size={24} />
          </span>
          <h3>Make the next thing happen.</h3>
          <p>A trip. A home. A little more peace of mind.</p>
          <strong>
            Create a goal <ArrowUpRight size={15} />
          </strong>
        </button>
      </div>
      <div className="two-col">
        <Panel title="Your peace-of-mind number" kicker="EMERGENCY FUND EXPLORER">
          <div className="calculator-copy">
            <p>
              Choose a cushion based on the average recorded spending in your available history.
            </p>
            <div className="range-label">
              <span>Months of expenses</span>
              <strong>{months} months</strong>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            />
            <div className="calculator-result">
              {money(avg * months * 100)}
              <small>
                Based on {money(avg * 100)}/month · {c.m.history.length} recorded months
              </small>
            </div>
            <p className="form-hint">
              Partial months and incomplete imports can understate spending. This estimate is not an
              assessment of how much cash you personally need.
            </p>
          </div>
        </Panel>
        <Panel title="A clearer path out of debt" kicker="PAYOFF EXPLORER">
          <div className="calculator-copy">
            <div className="form-grid three">
              {[
                ['balance', 'Balance ($)'],
                ['apr', 'APR (%)'],
                ['payment', 'Monthly payment ($)'],
              ].map(([k, label]) => (
                <Field label={label} key={k}>
                  <input
                    type="number"
                    min={k === 'payment' ? 1 : 0}
                    max={k === 'apr' ? 100 : 100000000}
                    value={debt[k as keyof typeof debt]}
                    onChange={(e) => setDebt({ ...debt, [k]: Math.max(0, Number(e.target.value)) })}
                  />
                </Field>
              ))}
            </div>
            <div className="calculator-result">
              {debt.balance === 0 ? 'Debt free' : n >= 1200 ? 'Payment too low' : `${n} months`}
              <small>
                {n >= 1200
                  ? 'Payment does not clear debt within 100 years.'
                  : `${money(interest * 100)} in modeled interest`}
              </small>
            </div>
            <p className="form-hint">
              Fixed APR, monthly compounding and end-of-month payments. No fees, additional
              borrowing or rate changes. This calculator does not change your accounts.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

export function Notes({ c }: { c: Context }) {
  const [query, setQuery] = useState(''),
    [tag, setTag] = useState('all');
  const rows = c.s.notes
    .filter(
      (n) =>
        (n.title + ' ' + n.body).toLowerCase().includes(query.toLowerCase()) &&
        (tag === 'all' || n.tag === tag),
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated.localeCompare(a.updated));
  return (
    <>
      <div className="notes-toolbar">
        <div className="input-search">
          <Search size={17} />
          <input
            aria-label="Search notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a thought, thesis, or checklist…"
          />
        </div>
        <select aria-label="Note tag" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="all">All tags</option>
          {[...new Set(c.s.notes.map((n) => n.tag))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Button onClick={() => c.edit('notes')}>
          <Plus size={16} />
          New note
        </Button>
      </div>
      <div className="notes-grid">
        {rows.map((n) => (
          <article className="note-card" key={n.id}>
            <div>
              <Tag>{n.tag}</Tag>
              <button
                className={`icon-button ${n.pinned ? 'mint-text' : ''}`}
                aria-label={n.pinned ? 'Unpin note' : 'Pin note'}
                onClick={async () => {
                  try {
                    await c.save('notes', { ...n, pinned: !n.pinned });
                  } catch (e) {
                    c.notify((e as Error).message);
                  }
                }}
              >
                <Pin size={16} />
              </button>
            </div>
            <button className="note-body" onClick={() => c.edit('notes', n)}>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
            </button>
            <footer>
              <span>Updated {n.updated}</span>
              <button
                aria-label={'Delete ' + n.title}
                className="icon-button"
                onClick={() => c.remove('notes', n)}
              >
                <Trash2 size={15} />
              </button>
            </footer>
          </article>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="A good place to think"
          body="Keep research, investment principles and monthly review notes together."
          action={<Button onClick={() => c.edit('notes')}>Create a note</Button>}
        />
      )}
      <div className="research-bottom">
        <BookOpen size={19} />
        <p>
          Research lives on your device. Write plain text, save links in your notes, and build a
          record of your thinking over time.
        </p>
      </div>
    </>
  );
}

export function Jarvis({ c }: { c: Context }) {
  const [messages, setMessages] = useState<{ role: string; text: string; source?: string }[]>([]),
    [input, setInput] = useState(''),
    [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);
  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const result = await request(`/chat?workspace=${c.workspace}`, {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          month: c.month,
          use_ollama: !browserMode && localStorage.getItem('wealthlab-ollama') === 'true',
          model: localStorage.getItem('wealthlab-model') || 'llama3.2:3b',
        }),
      });
      setMessages((m) => [...m, { role: 'assistant', text: result.answer, source: result.source }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: (e as Error).message, source: 'Connection notice' },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="jarvis-layout">
      <Panel className="chat-panel">
        <div className="chat-top">
          <span className="status-dot" />{' '}
          {!browserMode && localStorage.getItem('wealthlab-ollama') === 'true'
            ? 'Ollama · local model'
            : 'Built-in intelligence'}
          <span>Read-only assistant</span>
          {messages.length > 0 && (
            <button className="text-button" onClick={() => setMessages([])}>
              Clear chat
            </button>
          )}
        </div>
        <div className="chat-messages">
          {!messages.length && (
            <div className="jarvis-welcome">
              <div className="jarvis-orb">
                <Sparkles size={35} />
              </div>
              <span className="eyebrow">A LITTLE INTELLIGENCE. A LOT OF CLARITY.</span>
              <h2>Let’s connect the dots.</h2>
              <p>
                Your money tells a story. I’m here to help you understand it, explore possibilities,
                and find your next move.
              </p>
              <div className="prompt-grid">
                {[
                  ['Understand my spending', 'Where did my money go this month?'],
                  ['Find the recurring costs', 'Which recurring bills appear in my data?'],
                  ['Check my progress', 'How are my financial goals doing?'],
                  ['See the bigger picture', 'Explain my portfolio and investment gains.'],
                ].map(([title, q]) => (
                  <button key={title} onClick={() => send(q)}>
                    <span>{title}</span>
                    <small>{q}</small>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div className={'chat-message ' + m.role} key={i}>
              <span className="chat-avatar">
                {m.role === 'assistant' ? <Sparkles size={16} /> : 'W'}
              </span>
              <div>
                <strong>{m.role === 'assistant' ? 'JARVIS' : 'You'}</strong>
                <p>{m.text}</p>
                {m.source && <small>{m.source}</small>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="chat-thinking">
              <span />
              <span />
              <span /> Reading your saved records…
            </div>
          )}
          <div ref={bottom} />
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            aria-label="Message JARVIS"
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your spending, goals, or portfolio…"
          />
          <button disabled={busy || !input.trim()} type="submit" aria-label="Send message">
            <Send size={18} />
          </button>
        </form>
        <div className="chat-disclaimer">
          {c.workspace === 'demo' ? 'Fictional demo' : 'Personal'} records · {monthLabel(c.month)} ·
          Chat is session-only. JARVIS cannot move money or edit your plan.
        </div>
      </Panel>
      <div className="jarvis-sidebar">
        <Panel title="The context behind the answer">
          <div className="context-list">
            <div>
              <Wallet size={16} />
              <span>Net worth</span>
              <strong>{money(c.m.net_worth)}</strong>
            </div>
            <div>
              <ArrowUpRight size={16} />
              <span>Monthly spending</span>
              <strong>{money(c.m.spending)}</strong>
            </div>
            <div>
              <Target size={16} />
              <span>Active goals</span>
              <strong>{c.s.goals.length}</strong>
            </div>
            <div>
              <Repeat2 size={16} />
              <span>Recurring patterns</span>
              <strong>{c.m.recurring.length}</strong>
            </div>
          </div>
        </Panel>
        <div className="assistant-info">
          <ShieldCheck size={23} />
          <h3>Your numbers stay with you.</h3>
          <p>
            The built-in assistant uses explicit calculations and topic matching. Enable Ollama for
            open-ended language assistance on your device.
          </p>
          <button className="text-button" onClick={() => c.go('Settings')}>
            Local AI settings <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage({
  c,
  changeWorkspace,
}: {
  c: Context;
  changeWorkspace: (v: string) => void;
}) {
  const [ollama, setOllama] = useState<any>(null),
    [useOllama, setUseOllama] = useState(
      !browserMode && localStorage.getItem('wealthlab-ollama') === 'true',
    ),
    [model, setModel] = useState(localStorage.getItem('wealthlab-model') || 'llama3.2:3b'),
    [restore, setRestore] = useState<any>(null),
    [reset, setReset] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const restoreInput = useRef<HTMLInputElement>(null);
  const check = async () => {
    try {
      setOllama(await request('/ollama'));
    } catch (e) {
      c.notify((e as Error).message);
    }
  };
  useEffect(() => {
    check();
  }, []);
  return (
    <div className="settings-layout">
      <div>
        <Panel title="Your workspace" kicker="LOCAL BY DESIGN">
          <div className="settings-content">
            <p className="muted">
              Demo and personal records live in separate {browserMode ? 'browser' : 'SQLite'}{' '}
              workspaces. Switching keeps both sets of records.
            </p>
            <div className="workspace-options">
              {['demo', 'personal'].map((v) => (
                <button
                  className={c.workspace === v ? 'selected' : ''}
                  key={v}
                  onClick={() => changeWorkspace(v)}
                >
                  <span className="account-icon">
                    {v === 'demo' ? <Sparkles size={20} /> : <ShieldCheck size={20} />}
                  </span>
                  <span>
                    <strong>{v === 'demo' ? 'Explore the demo' : 'My personal finances'}</strong>
                    <small>
                      {v === 'demo'
                        ? 'Fictional, editable sample records'
                        : 'Your own accounts and imported records'}
                    </small>
                  </span>
                  {c.workspace === v && <CheckCircle2 size={19} />}
                </button>
              ))}
            </div>
            <div className="storage-summary">
              <Database size={18} />
              <span>
                {browserMode ? 'IndexedDB' : 'SQLite'} · USD · schema v{c.s.version}
              </span>
              <Tag>{c.s.transactions.length} transactions</Tag>
              <Tag>{c.s.accounts.length} accounts</Tag>
            </div>
          </div>
        </Panel>
        <Panel title="Backups & portability">
          <div className="settings-content">
            <p className="muted">
              A JSON backup contains the complete active workspace. CSV exports contain your
              transactions. Files can include sensitive financial information.
            </p>
            <div className="settings-action">
              <span>
                <strong>Export full workspace</strong>
                <small>Accounts, transactions, goals, budgets, notes and rules</small>
              </span>
              <a
                className="btn secondary small"
                href={`/api/export?workspace=${c.workspace}`}
                onClick={(e) => {
                  exportDownload(e, c.workspace).catch((err) => c.notify(err.message));
                }}
                download
              >
                <Download size={15} />
                Backup JSON
              </a>
            </div>
            <div className="settings-action">
              <span>
                <strong>Export transactions</strong>
                <small>A portable ledger for your spreadsheet or records</small>
              </span>
              <a
                className="btn secondary small"
                href={`/api/export/transactions?workspace=${c.workspace}`}
                onClick={(e) => {
                  exportDownload(e, c.workspace, true).catch((err) => c.notify(err.message));
                }}
                download
              >
                <Download size={15} />
                Export CSV
              </a>
            </div>
            <div className="settings-action">
              <span>
                <strong>Restore a workspace</strong>
                <small>Review the file before replacing the active workspace</small>
              </span>
              <Button secondary small onClick={() => restoreInput.current?.click()}>
                <Upload size={15} />
                Choose backup
              </Button>
              <input
                hidden
                ref={restoreInput}
                type="file"
                accept=".json"
                onChange={async (e) => {
                  try {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 20_000_000) throw new Error('Backup limit is 20 MB.');
                    const parsed = JSON.parse(await f.text());
                    if (
                      parsed.version !== 1 ||
                      !Array.isArray(parsed.accounts) ||
                      !Array.isArray(parsed.transactions)
                    )
                      throw new Error('This is not a WealthLab v1 backup.');
                    setRestore(parsed);
                    setError('');
                  } catch (e) {
                    c.notify((e as Error).message);
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        </Panel>
        <Panel title="Optional local intelligence" kicker="JARVIS + OLLAMA">
          <div className="settings-content">
            <div className="settings-action">
              <span>
                <strong>Use Ollama for JARVIS</strong>
                <small>Off by default. Core finance tools work without a model.</small>
              </span>
              <button
                role="switch"
                aria-checked={useOllama}
                aria-label="Use Ollama"
                disabled={browserMode}
                className={'toggle ' + (useOllama ? 'on' : '')}
                onClick={() => {
                  localStorage.setItem('wealthlab-ollama', String(!useOllama));
                  setUseOllama(!useOllama);
                }}
              >
                <span />
              </button>
            </div>
            <div className="model-row">
              <Field label="Installed model">
                <input
                  list="ollama-models"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    localStorage.setItem('wealthlab-model', e.target.value);
                  }}
                />
                <datalist id="ollama-models">
                  {ollama?.models.map((m: string) => (
                    <option key={m}>{m}</option>
                  ))}
                </datalist>
              </Field>
              <Button secondary onClick={check}>
                <RefreshCw size={14} />
                Check connection
              </Button>
            </div>
            <Tag tone={ollama?.available ? 'mint' : ''}>
              {ollama === null
                ? 'Checking…'
                : ollama.available
                  ? `Connected · ${ollama.models.length} installed models`
                  : browserMode
                    ? 'Use the local Python edition for Ollama'
                    : 'Ollama is not running'}
            </Tag>
            <p className="form-hint">
              Connects only to 127.0.0.1:11434. On an 8 GB Mac, start with a small model and close
              memory-heavy apps. Responses may take time. Install and manage models yourself;
              WealthLab does not download them.
            </p>
          </div>
        </Panel>
        <Panel title="Demo controls">
          <div className="settings-content">
            <div className="settings-action">
              <span>
                <strong>Reset fictional demo data</strong>
                <small>Regenerate a clean sample. Personal records are unaffected.</small>
              </span>
              <Button
                secondary
                small
                disabled={c.workspace !== 'demo'}
                onClick={() => setReset(true)}
              >
                <RefreshCw size={14} />
                Reset demo
              </Button>
            </div>
          </div>
        </Panel>
      </div>
      <div>
        <Panel title="Made to stay on your device">
          <div className="settings-content privacy-copy">
            <ShieldCheck size={28} />
            <h3>Your data has a home. Here.</h3>
            <p>
              No bank credentials. No analytics scripts. No cloud accounts. No live market feeds.
            </p>
            <p>
              {browserMode ? (
                <>
                  Your records are stored in this browser’s IndexedDB. They are not sent to GitHub.
                  Clearing site data removes them; export backups regularly. Records do not sync
                  between devices.
                </>
              ) : (
                <>
                  Your database is stored in <code>data/wealthlab.sqlite3</code>. It is not
                  encrypted by WealthLab. Your device security and backup storage protect these
                  files.
                </>
              )}
            </p>
            <p>
              Amounts are stored as integer cents. Prices and dates are supplied by you. Simulations
              use your assumptions.
            </p>
            <p>Educational planning tools, with no trading or money movement.</p>
          </div>
        </Panel>
        <Panel title="A good monthly rhythm">
          <ol className="monthly-rhythm">
            <li>Import and review your records.</li>
            <li>Check categories and transfer labels.</li>
            <li>Update portfolio prices and goals.</li>
            <li>Revisit your budget and scenarios.</li>
            <li>Save a fresh backup.</li>
          </ol>
        </Panel>
      </div>
      {restore && (
        <Modal title="Review workspace restore" onClose={() => setRestore(null)}>
          <p className="muted">
            This will replace your <strong>{c.workspace}</strong> workspace with the backup below. A
            copy of the current workspace is saved{' '}
            {browserMode ? 'in browser storage' : 'to the local data folder'} first.
          </p>
          <div className="restore-summary">
            <Tag>{restore.accounts.length} accounts</Tag>
            <Tag>{restore.transactions.length} transactions</Tag>
            <Tag>{restore.goals?.length || 0} goals</Tag>
            <Tag>{restore.notes?.length || 0} notes</Tag>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="form-actions">
            <Button secondary onClick={() => setRestore(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await request(`/restore?workspace=${c.workspace}`, {
                    method: 'PUT',
                    body: JSON.stringify({ revision: c.s.revision, state: restore }),
                  });
                  setRestore(null);
                  await c.refresh();
                  c.notify(
                    browserMode
                      ? 'Backup restored. Previous state retained in browser storage.'
                      : 'Backup restored. Previous state saved in data/.',
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Restoring…' : 'Replace workspace'}
            </Button>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal title="Reset the demo workspace?" onClose={() => setReset(false)}>
          <p className="muted">
            All edited demo records will be replaced with fresh fictional examples. Download a demo
            backup first if you want to keep your edits.
          </p>
          <div className="form-actions">
            <Button secondary onClick={() => setReset(false)}>
              Keep edits
            </Button>
            <Button
              onClick={async () => {
                try {
                  await request('/reset-demo', {
                    method: 'POST',
                    body: JSON.stringify({ revision: c.s.revision }),
                  });
                  await c.refresh();
                  setReset(false);
                  c.notify('Demo reset.');
                } catch (e) {
                  c.notify((e as Error).message);
                }
              }}
            >
              Reset demo
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
