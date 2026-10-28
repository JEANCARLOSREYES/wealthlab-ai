import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Wallet,
  FlaskConical,
  Target,
  BookOpen,
  Sparkles,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Command,
  ChevronRight,
  Menu,
  X,
  Download,
  Upload,
  Bell,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  pages,
  type Page,
  type State,
  type Summary,
  type Entity,
  request,
  currentMonth,
  monthLabel,
  uid,
  today,
  categories,
  money,
} from './types';
import { Button, Modal, Field, Tag, Select } from './components';
import {
  Overview,
  Transactions,
  Budgets,
  Investments,
  Goals,
  Notes,
  Jarvis,
  SettingsPage,
} from './pages';
import Simulator from './Simulator';
import Importer from './Importer';
const icons = [
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  FlaskConical,
  Target,
  BookOpen,
  Sparkles,
  Settings,
];
const descriptions: Record<Page, string> = {
  Overview: 'A little clarity. A lot of possibility.',
  Transactions: 'Every move, accounted for.',
  'Budget Studio': 'Give every dollar a direction.',
  Investments: 'The big picture behind your portfolio.',
  'Wealth Simulator': 'Turn what if into a plan.',
  'Financial Goals': 'Make room for what matters.',
  'Research & Notes': 'A workspace for your financial thinking.',
  'JARVIS AI': 'Your numbers, with a little perspective.',
  Settings: 'Your workspace. Your rules.',
};
export type Context = {
  s: State;
  m: Summary;
  month: string;
  workspace: string;
  performance: any;
  go: (p: Page) => void;
  edit: (collection: string, item?: Entity) => void;
  remove: (collection: string, item: Entity) => void;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  save: (collection: string, item: Entity) => Promise<void>;
  importData: (mode?: string) => void;
};
export default function App() {
  const [page, setPage] = useState<Page>('Overview'),
    [workspace, setWorkspace] = useState(localStorage.getItem('wealthlab-workspace') || 'demo'),
    [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<{ state: State; summary: Summary; performance: any } | null>(
      null,
    ),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [loading, setLoading] = useState(false),
    [mobile, setMobile] = useState(false),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState(''),
    [add, setAdd] = useState(false),
    [importMode, setImportMode] = useState(''),
    [editor, setEditor] = useState<{ collection: string; item?: Entity } | null>(null),
    [deleting, setDeleting] = useState<{ collection: string; item: Entity } | null>(null);
  const activeKey = useRef('');
  activeKey.current = workspace + month;
  const refresh = useCallback(async () => {
    const key = workspace + month;
    setLoading(true);
    try {
      const result = await request(`/state?workspace=${workspace}&month=${month}`);
      if (activeKey.current === key) {
        setData(result);
        setError('');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspace, month]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommand((v) => !v);
      }
      if (e.key === 'Escape') {
        setAdd(false);
        setMobile(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const go = (p: Page) => {
    setPage(p);
    setMobile(false);
    setCommand(false);
    window.scrollTo(0, 0);
  };
  const save = async (collection: string, item: Entity) => {
    await request(`/entities/${collection}?workspace=${workspace}`, {
      method: 'PUT',
      body: JSON.stringify({ revision: data!.state.revision, item }),
    });
    await refresh();
    setToast('Changes saved to your local workspace.');
  };
  const changeWorkspace = (value: string) => {
    setData(null);
    setWorkspace(value);
    localStorage.setItem('wealthlab-workspace', value);
    setMonth(currentMonth());
  };
  const c: Context = data
    ? {
        s: data.state,
        m: data.summary,
        performance: data.performance,
        month,
        workspace,
        go,
        edit: (collection, item) => setEditor({ collection, item }),
        remove: (collection, item) => setDeleting({ collection, item }),
        refresh,
        notify: setToast,
        save,
        importData: (mode = 'transactions') => setImportMode(mode),
      }
    : null!;
  return (
    <div className="app-shell">
      {mobile && <div className="sidebar-scrim" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go('Overview');
          }}
        >
          <span className="brand-symbol">
            <svg viewBox="0 0 28 28">
              <path d="m3 7 5 15 6-11 6 11 5-15" />
            </svg>
          </span>
          <span>
            wealthlab<span className="brand-ai">AI</span>
          </span>
        </a>
        <button className="workspace-switch" onClick={() => go('Settings')}>
          <span className="avatar">W</span>
          <span>
            <strong>Personal workspace</strong>
            <small>
              {workspace === 'demo' ? 'Explore with demo data' : 'My financial workspace'}
            </small>
          </span>
          <ChevronRight size={15} />
        </button>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {pages.map((p, i) => {
            const Icon = icons[i];
            return (
              <button
                key={p}
                className={`nav-item ${page === p ? 'active' : ''} ${p === 'Settings' ? 'settings-nav' : ''}`}
                onClick={() => go(p)}
              >
                <Icon size={18} />
                <span>{p}</span>
                {p === 'JARVIS AI' && <span className="new-dot" />}
                {page === p && <span className="active-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="assistant-promo">
            <div className="mini-orb">
              <Sparkles size={19} />
            </div>
            <strong>A clearer next move.</strong>
            <p>Let JARVIS connect the dots in your finances.</p>
            <button onClick={() => go('JARVIS AI')}>
              Ask JARVIS <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="local-status">
            <span className="status-dot" />
            Local & private <ShieldCheck size={14} />
          </div>
          <small className="version">
            WEALTHLAB AI <span>v1.0</span>
          </small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <button
              className="search-trigger"
              onClick={() => {
                setQuery('');
                setCommand(true);
              }}
            >
              <Search size={15} />
              <span>Search anything</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className={`workspace-badge ${workspace === 'demo' ? '' : 'personal'}`}>
              <span />
              {workspace === 'demo' ? 'Demo mode' : 'Personal'}
            </span>
            <button
              className="profile-avatar"
              aria-label="Workspace settings"
              onClick={() => go('Settings')}
            >
              W
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                <span className="tiny-line" />
                YOUR FINANCIAL COMMAND CENTER
              </div>
              <h1>{page === 'Overview' ? 'Your money, in perspective.' : page}</h1>
              <p>{descriptions[page]}</p>
            </div>
            <div className="heading-actions">
              {!['Wealth Simulator', 'Research & Notes', 'JARVIS AI', 'Settings'].includes(
                page,
              ) && (
                <Select
                  label="Reporting month"
                  value={month}
                  onChange={setMonth}
                  options={[
                    ...new Set([
                      currentMonth(),
                      ...(data?.summary.months || []),
                      ...Array.from({ length: 12 }, (_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - i);
                        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
                      }),
                    ]),
                  ]
                    .sort()
                    .reverse()
                    .map((v) => ({ value: v, label: monthLabel(v) }))}
                />
              )}
              <div className="add-wrap">
                <Button onClick={() => setAdd((v) => !v)}>
                  <Plus size={16} /> Add new
                </Button>
                {add && (
                  <div className="dropdown">
                    {[
                      ['transactions', 'Transaction'],
                      ['accounts', 'Account'],
                      ['holdings', 'Holding'],
                      ['goals', 'Goal'],
                      ['notes', 'Research note'],
                      ['budgets', 'Budget'],
                    ].map(([collection, label]) => (
                      <button
                        key={collection}
                        onClick={() => {
                          setEditor({ collection });
                          setAdd(false);
                        }}
                      >
                        <Plus size={14} />
                        {label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setImportMode('transactions');
                        setAdd(false);
                      }}
                    >
                      <Upload size={14} />
                      Import CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {workspace === 'demo' && (
            <div className="demo-banner">
              <FlaskConical size={15} />
              <span>Room to explore. You’re viewing fictional demo data.</span>
              <button onClick={() => changeWorkspace('personal')}>
                Start with my data <ArrowRightIcon />
              </button>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <strong>Unable to load your workspace.</strong> {error}
              <button onClick={refresh}>
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}
          {!data ? (
            <div className="loading-state">
              <div className="loading-orb" />
              <h3>
                {error
                  ? 'Start the local service to continue'
                  : 'Bringing your finances into focus…'}
              </h3>
              {error && <code>python3 scripts/start.py</code>}
            </div>
          ) : (
            <div className="page-content" key={page}>
              {page === 'Overview' ? (
                <Overview c={c} />
              ) : page === 'Transactions' ? (
                <Transactions c={c} />
              ) : page === 'Budget Studio' ? (
                <Budgets c={c} />
              ) : page === 'Investments' ? (
                <Investments c={c} />
              ) : page === 'Wealth Simulator' ? (
                <Simulator c={c} />
              ) : page === 'Financial Goals' ? (
                <Goals c={c} />
              ) : page === 'Research & Notes' ? (
                <Notes c={c} />
              ) : page === 'JARVIS AI' ? (
                <Jarvis c={c} />
              ) : (
                <SettingsPage c={c} changeWorkspace={changeWorkspace} />
              )}
            </div>
          )}
          <footer className="main-footer">
            <span>
              <ShieldCheck size={13} /> Stored on your device. Built for your future.
            </span>
            <span>
              {loading ? 'Syncing…' : 'USD · Local-first'} <span className="status-dot" />
            </span>
          </footer>
        </main>
      </div>
      <button
        className="jarvis-fab"
        aria-label="Open JARVIS assistant"
        onClick={() => go('JARVIS AI')}
      >
        <Sparkles size={20} />
        <span>Ask JARVIS</span>
      </button>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {editor && data && (
        <EntityEditor
          collection={editor.collection}
          item={editor.item}
          c={c}
          onClose={() => setEditor(null)}
        />
      )}
      {importMode && data && <Importer mode={importMode} c={c} onClose={() => setImportMode('')} />}
      {deleting && (
        <Modal title="Delete this record?" onClose={() => setDeleting(null)}>
          <p className="muted">
            {deleting.item.name ||
              deleting.item.merchant ||
              deleting.item.title ||
              deleting.item.category}{' '}
            will be removed from this workspace. Export a backup in Settings if you need a recovery
            copy.
          </p>
          <div className="form-actions">
            <Button secondary onClick={() => setDeleting(null)}>
              Keep record
            </Button>
            <Button
              className="danger"
              onClick={async () => {
                try {
                  await request(
                    `/entities/${deleting.collection}/${deleting.item.id}?workspace=${workspace}&revision=${data!.state.revision}`,
                    { method: 'DELETE' },
                  );
                  setDeleting(null);
                  await refresh();
                  setToast('Record deleted.');
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            >
              Delete record
            </Button>
          </div>
        </Modal>
      )}
      {command && (
        <Modal title="Find your next move" onClose={() => setCommand(false)}>
          <div className="command-search">
            <Search size={20} />
            <input
              autoFocus
              placeholder="Search pages, transactions, notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="command-results">
            {pages
              .filter((p) => p.toLowerCase().includes(query.toLowerCase()))
              .map((p) => (
                <button onClick={() => go(p)} key={p}>
                  <Command size={16} />
                  <span>{p}</span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            {query.length > 1 &&
              data &&
              [
                ...data.state.transactions
                  .filter((t) => t.merchant.toLowerCase().includes(query.toLowerCase()))
                  .slice(0, 5)
                  .map((t) => ({
                    t,
                    collection: 'transactions',
                    label: t.merchant,
                    sub: money(t.amount, 2),
                  })),
                ...data.state.notes
                  .filter((t) => (t.title + t.body).toLowerCase().includes(query.toLowerCase()))
                  .slice(0, 4)
                  .map((t) => ({ t, collection: 'notes', label: t.title, sub: t.tag })),
              ].map(({ t, collection, label, sub }) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setCommand(false);
                    setEditor({ collection, item: t });
                  }}
                >
                  <Search size={15} />
                  <span>
                    {label}
                    <small>{sub}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
function ArrowRightIcon() {
  return <ChevronRight size={14} />;
}

function EntityEditor({
  collection,
  item,
  c,
  onClose,
}: {
  collection: string;
  item?: Entity;
  c: Context;
  onClose: () => void;
}) {
  const defaults: Record<string, any> = {
    prices: { ticker: c.s.holdings[0]?.ticker || '', date: today(), price: 0 },
    checkpoints: { date: today(), value: c.m.invested, flow: 0 },
    accounts: {
      name: '',
      kind: 'checking',
      opening_balance: 0,
      opened: today(),
      institution: 'Manual account',
    },
    transactions: {
      account_id: c.s.accounts[0]?.id || '',
      date: today(),
      merchant: '',
      amount: 0,
      kind: 'expense',
      category: 'Uncategorized',
      note: '',
    },
    budgets: { category: 'Groceries', amount: 0, month: c.month, fixed: false },
    holdings: {
      name: '',
      ticker: '',
      asset_class: 'US equities',
      shares: 1,
      purchase_price: 0,
      current_price: 0,
      purchased: today(),
      valued: today(),
    },
    goals: {
      name: '',
      target: 1000000,
      saved: 0,
      monthly: 0,
      deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString(
        'en-CA',
      ),
      color: 'mint',
    },
    notes: { title: '', body: '', tag: 'Research', updated: today(), pinned: false },
    rules: { contains: '', category: 'Groceries', kind: 'expense' },
  };
  const monetary = [
    'opening_balance',
    'amount',
    'purchase_price',
    'current_price',
    'target',
    'saved',
    'monthly',
    'price',
    'value',
    'flow',
  ];
  const initial = { ...defaults[collection], ...item };
  monetary.forEach((k) => {
    if (k in initial) initial[k] = String(initial[k] / 100);
  });
  const [form, setForm] = useState<any>(initial),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const input = (k: string, label: string, type = 'text', hint?: string) => (
    <Field label={label} hint={hint}>
      <input
        required
        type={type}
        value={form[k]}
        step={type === 'number' ? 'any' : undefined}
        maxLength={type === 'text' ? 200 : undefined}
        onChange={(e) => set(k, e.target.value)}
      />
    </Field>
  );
  const select = (
    k: string,
    label: string,
    options: string[] | { value: string; label: string }[],
  ) => (
    <Field label={label}>
      <select value={form[k]} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => (
          <option
            key={typeof o === 'string' ? o : o.value}
            value={typeof o === 'string' ? o : o.value}
          >
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
    </Field>
  );
  const cat = () => (
    <Field label="Category">
      <input
        required
        list="categories"
        value={form.category}
        onChange={(e) => set('category', e.target.value)}
      />
      <datalist id="categories">
        {[
          ...new Set([
            ...categories,
            ...c.s.budgets.map((b) => b.category),
            ...c.s.transactions.map((t) => t.category),
          ]),
        ].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </datalist>
    </Field>
  );
  const titles: Record<string, string> = {
    prices: 'historical price',
    checkpoints: 'portfolio checkpoint',
    accounts: 'account',
    transactions: 'transaction',
    budgets: 'category budget',
    holdings: 'holding',
    goals: 'financial goal',
    notes: 'research note',
    rules: 'categorization rule',
  };
  return (
    <Modal title={`${item ? 'Edit' : 'New'} ${titles[collection]}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          setBusy(true);
          try {
            let record: any = { ...form, id: item?.id || uid() };
            monetary.forEach((k) => {
              if (k in record) record[k] = Math.round(Number(record[k]) * 100);
            });
            if (collection === 'transactions') {
              record.amount =
                record.kind === 'expense'
                  ? -Math.abs(record.amount)
                  : record.kind === 'income'
                    ? Math.abs(record.amount)
                    : record.amount;
            }
            if (collection === 'holdings') record.shares = Number(record.shares);
            if (collection === 'notes') record.updated = today();
            await c.save(collection, record);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {collection === 'prices' && (
          <>
            {input('ticker', 'Ticker / symbol')}
            {input('date', 'Price date', 'date')}
            {input('price', 'Price per unit ($)', 'number')}
            <p className="form-hint">
              Historical prices are kept separately from current holding prices. Adding one does not
              revalue your holdings.
            </p>
          </>
        )}
        {collection === 'checkpoints' && (
          <>
            {input('date', 'Checkpoint date', 'date')}
            {input('value', 'Total portfolio value, after flow ($)', 'number')}
            {input(
              'flow',
              'External flow at end of this day ($)',
              'number',
              'Positive for contributions; negative for withdrawals.',
            )}
            <p className="form-hint">
              Record the whole portfolio value, including cash. Each flow must occur at the end of
              this checkpoint day, after that period’s investment return. Add a checkpoint for every
              external cash flow. Transfers within the portfolio are not external flows. This ledger
              is independent of your account transactions and holding snapshots.
            </p>
          </>
        )}
        {collection === 'accounts' && (
          <>
            {input('name', 'Account name')}
            {select('kind', 'Account type', ['checking', 'savings', 'cash', 'credit', 'loan'])}
            <div className="form-grid">
              {input(
                'opening_balance',
                'Opening balance ($)',
                'number',
                'Use a negative balance for debt.',
              )}
              {input('opened', 'Balance as of', 'date')}
            </div>
            {input('institution', 'Institution / label')}
            <p className="form-hint">
              Opening balance is the balance before transactions on this date. Import only activity
              on or after this date.
            </p>
          </>
        )}
        {collection === 'transactions' && (
          <>
            {!c.s.accounts.length && (
              <p className="error-text">
                Create an account in Overview before adding transactions.
              </p>
            )}
            {input('merchant', 'Merchant / description')}
            <div className="form-grid">
              {input('amount', 'Amount ($)', 'number', 'Expense signs are applied automatically.')}
              {input('date', 'Date', 'date')}
            </div>
            <div className="form-grid">
              {select('kind', 'Type', ['expense', 'income', 'transfer'])}
              {select(
                'account_id',
                'Account',
                c.s.accounts.map((a) => ({ value: a.id, label: a.name })),
              )}
            </div>
            {cat()}
            {input('note', 'Note (optional)')}
            <p className="form-hint">
              For transfers between your accounts, record one entry in each account with equal and
              opposite amounts. A card payment is a transfer.
            </p>
          </>
        )}
        {collection === 'budgets' && (
          <>
            {cat()}
            <div className="form-grid">
              {input('amount', 'Monthly limit ($)', 'number')}
              {input('month', 'Budget month', 'month')}
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.fixed}
                onChange={(e) => set('fixed', e.target.checked)}
              />
              Fixed expense
            </label>
          </>
        )}
        {collection === 'holdings' && (
          <>
            {input('name', 'Asset name')}
            <div className="form-grid">
              {input('ticker', 'Ticker / symbol')}
              {input('shares', 'Shares / units', 'number')}
            </div>
            {select('asset_class', 'Asset class', [
              'US equities',
              'International equities',
              'Bonds',
              'Real estate',
              'Crypto',
              'Cash',
              'Other',
            ])}
            <div className="form-grid">
              {input('purchase_price', 'Cost per unit ($)', 'number')}
              {input('current_price', 'Current price per unit ($)', 'number')}
              {input('purchased', 'Purchase date', 'date')}
              {input('valued', 'Price as of', 'date')}
            </div>
            <p className="form-hint">
              Each row is a purchase lot. Prices are supplied by you; there is no live price feed.
              Brokerage cash can be entered as a Cash holding with a unit price of $1.
            </p>
          </>
        )}
        {collection === 'goals' && (
          <>
            {input('name', 'What are you working toward?')}
            <div className="form-grid">
              {input('target', 'Target ($)', 'number')}
              {input('saved', 'Earmarked so far ($)', 'number')}
              {input('monthly', 'Planned monthly savings ($)', 'number')}
              {input('deadline', 'Target date', 'date')}
            </div>
            {select('color', 'Accent', ['mint', 'blue', 'violet', 'amber'])}
            <p className="form-hint">
              Earmarked balances track your plan. They are not added to net worth or moved between
              accounts.
            </p>
          </>
        )}
        {collection === 'notes' && (
          <>
            {input('title', 'Title')}
            {input('tag', 'Tag')}
            <Field label="Your notes">
              <textarea
                rows={10}
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder="Capture a thesis, question, or next step…"
              />
            </Field>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => set('pinned', e.target.checked)}
              />
              Pin to the top
            </label>
          </>
        )}
        {collection === 'rules' && (
          <>
            {input('contains', 'Merchant contains')}
            {cat()}
            {select('kind', 'Transaction type', ['expense', 'income', 'transfer'])}
            <p className="form-hint">
              Rules apply to future CSV imports. First matching rule wins. Existing records are
              unchanged.
            </p>
          </>
        )}
        {error && (
          <div className="error-text" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <Button secondary onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || (collection === 'transactions' && !c.s.accounts.length)}
          >
            {busy ? 'Saving…' : 'Save ' + titles[collection]}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
