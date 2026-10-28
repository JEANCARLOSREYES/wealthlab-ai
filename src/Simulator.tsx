import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  FlaskConical,
  ArrowUpRight,
  Plus,
  Save,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Target,
  Sparkles,
  Trash2,
  Play,
  Info,
} from 'lucide-react';
import type { Context } from './App';
import { request, money, compact, uid, colors } from './types';
import { Panel, Button, Metric, Field, Tag, Modal, chartAxis, chartTooltip } from './components';
const defaults = {
  initial: 25000,
  monthly: 600,
  annual_return: 7,
  years: 25,
  inflation: 2.5,
  fee: 0.15,
  contribution_growth: 2,
  frequency: 'monthly',
  tax: 0,
  volatility: 15,
  target: 1000000,
  paths: 1500,
  seed: 42,
};
const usd = (v: number) => money(v * 100);
export default function Simulator({ c }: { c: Context }) {
  const [p, setP] = useState({ ...defaults }),
    [result, setResult] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [tab, setTab] = useState('growth'),
    [real, setReal] = useState(false),
    [advanced, setAdvanced] = useState(false),
    [table, setTable] = useState(false),
    [saveOpen, setSaveOpen] = useState(false),
    [name, setName] = useState('My long-term plan'),
    [comparison, setComparison] = useState<any[]>([]),
    [comparing, setComparing] = useState(false);
  const set = (key: string, value: any) => setP((prev) => ({ ...prev, [key]: value }));
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await request('/simulate', { method: 'POST', body: JSON.stringify(p) });
        if (!cancelled) {
          setResult(r);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [p]);
  const compare = async () => {
    setComparing(true);
    try {
      const specs = [
        { label: 'Conservative', rate: Math.max(-50, p.annual_return - 3) },
        { label: 'Your baseline', rate: p.annual_return },
        { label: 'Optimistic', rate: Math.min(50, p.annual_return + 3) },
      ];
      const rows = await Promise.all(
        specs.map(async (s) => ({
          ...s,
          result: await request('/simulate', {
            method: 'POST',
            body: JSON.stringify({ ...p, annual_return: s.rate }),
          }),
        })),
      );
      setComparison(rows);
      setTab('compare');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setComparing(false);
    }
  };
  const download = () => {
    if (!result) return;
    const header = 'year,nominal_value,real_value,total_contributions,p10,p50,p90\n';
    const rows = result.rows
      .map((r: any) => [r.year, r.value, r.real, r.contributions, r.p10, r.p50, r.p90].join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wealthlab-projection.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const number = (
    key: keyof typeof defaults,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <Field label={label}>
      <input
        type="number"
        value={p[key]}
        min={min}
        max={max}
        step={step}
        onChange={(e) => set(key, e.target.value === '' ? '' : Number(e.target.value))}
      />
    </Field>
  );
  const data = result?.rows.map((r: any) => ({ ...r, band: Math.max(0, r.p90 - r.p10) })) || [];
  return (
    <>
      <div className="simulator-intro">
        <span className="simulation-tag">
          <FlaskConical size={14} />A LAB FOR YOUR FINANCIAL FUTURE
        </span>
        <p>No predictions. Just possibilities, made clearer.</p>
        <Button
          secondary
          small
          onClick={() => {
            setP({ ...defaults });
            setComparison([]);
          }}
        >
          <RotateCcw size={14} />
          Reset assumptions
        </Button>
      </div>
      <div className="simulator-layout">
        <Panel className="simulation-inputs" title="Build your scenario">
          <div className="sim-fields">
            {number('initial', 'Starting investment ($)', 0, 1e9, 1000)}
            {number('monthly', 'Monthly contribution ($)', 0, 1e7, 50)}
            <div className="slider-field">
              <div>
                <label htmlFor="return">Expected annual return</label>
                <strong>{p.annual_return}%</strong>
              </div>
              <input
                id="return"
                type="range"
                min="-10"
                max="20"
                step=".5"
                value={p.annual_return}
                onChange={(e) => set('annual_return', Number(e.target.value))}
              />
              <div className="range-ends">
                <span>−10%</span>
                <span>20%</span>
              </div>
            </div>
            <div className="slider-field">
              <div>
                <label htmlFor="years">Time to grow</label>
                <strong>{p.years} years</strong>
              </div>
              <input
                id="years"
                type="range"
                min="1"
                max="60"
                value={p.years}
                onChange={(e) => set('years', Number(e.target.value))}
              />
              <div className="range-ends">
                <span>1 year</span>
                <span>60 years</span>
              </div>
            </div>
            <div className="form-grid">
              {number('inflation', 'Inflation (%)', 0, 20, 0.1)}
              {number('fee', 'Annual fee (%)', 0, 10, 0.01)}
            </div>
            <button className="advanced-trigger" onClick={() => setAdvanced(!advanced)}>
              Fine-tune assumptions {advanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {advanced && (
              <div className="advanced-fields">
                {number('contribution_growth', 'Annual contribution increase (%)', 0, 20, 0.5)}
                <Field label="Contribution frequency">
                  <select value={p.frequency} onChange={(e) => set('frequency', e.target.value)}>
                    <option value="monthly">Monthly · end of month</option>
                    <option value="quarterly">Quarterly · 3× monthly amount</option>
                    <option value="annually">Annually · 12× monthly amount</option>
                  </select>
                </Field>
                {number('tax', 'Tax on terminal gains (%)', 0, 60, 1)}
                {number('volatility', 'Annual log volatility (%)', 0, 80, 0.5)}
                {number('target', 'Target outcome ($)', 1, 1e12, 10000)}
                {number('paths', 'Monte Carlo paths', 100, 5000, 100)}
                {number('seed', 'Random seed', 0, 4294967295, 1)}
              </div>
            )}
            <div className="sim-input-actions">
              <Button onClick={() => setSaveOpen(true)} disabled={!result || !!error}>
                <Save size={15} />
                Save scenario
              </Button>
              <Button secondary onClick={compare} disabled={busy || comparing}>
                {comparing ? 'Comparing…' : 'Compare return assumptions'}
                <ArrowUpRight size={14} />
              </Button>
            </div>
            <p className="form-hint">
              Contributions arrive at the end of each selected period. All amounts are in USD.
            </p>
          </div>
        </Panel>
        <div className="simulation-results">
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div className="simulation-summary">
            <div>
              <span className="eyebrow">
                {real ? 'IN TODAY’S PURCHASING POWER' : 'YOUR MODELED FUTURE VALUE'}
              </span>
              <div className="simulation-big tabular">
                {result ? usd(real ? result.final.real : result.final.value) : '—'}
                <ArrowUpRight size={27} />
              </div>
              <p>
                After {p.years} years, under your current assumptions{' '}
                <Tag>{busy ? 'Calculating…' : 'Deterministic model'}</Tag>
              </p>
            </div>
            <div className="sim-real-toggle">
              <button className={!real ? 'selected' : ''} onClick={() => setReal(false)}>
                Nominal
              </button>
              <button className={real ? 'selected' : ''} onClick={() => setReal(true)}>
                Inflation adjusted
              </button>
            </div>
          </div>
          <div className="three-metrics simulation-metrics">
            <Metric
              label="Total contributed"
              value={result ? usd(result.final.contributions) : '—'}
              sub="Starting balance + added contributions"
            />
            <Metric
              label="Modeled growth"
              value={result ? usd(result.growth) : '—'}
              sub="After modeled fees and terminal tax"
            />
            <Metric
              label="Inflation-adjusted value"
              value={result ? usd(result.final.real) : '—'}
              sub="In today's purchasing power"
            />
          </div>
          <Panel className="simulation-chart">
            <div className="tab-toolbar">
              <div className="tabs">
                {[
                  ['growth', 'Growth'],
                  ['monte', 'Monte Carlo'],
                  ['distribution', 'Distribution'],
                  ['compare', 'Compare'],
                ].map(([v, label]) => (
                  <button key={v} className={tab === v ? 'active' : ''} onClick={() => setTab(v)}>
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="icon-button"
                aria-label="Export year-by-year projection CSV"
                onClick={download}
              >
                <Download size={16} />
              </button>
            </div>
            {result && (
              <>
                <div className="simulation-chart-body">
                  {tab === 'growth' ? (
                    <>
                      <div className="chart-note">
                        <span className="legend-dot" />
                        Modeled value <span className="legend-dot violet" />
                        Contributions <span>{real ? 'Inflation adjusted' : 'Nominal USD'}</span>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="simFill" x1="0" y1="0" x2="0" y2="1">
                              <stop stopColor={colors[0]} stopOpacity={0.25} />
                              <stop offset="100%" stopColor={colors[0]} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#2b3230" vertical={false} strokeDasharray="3 5" />
                          <XAxis dataKey="year" {...chartAxis} tickFormatter={(v) => `${v}y`} />
                          <YAxis
                            {...chartAxis}
                            tickFormatter={(v) => '$' + compact(v)}
                            width={65}
                          />
                          <Tooltip
                            contentStyle={chartTooltip}
                            formatter={(v: any) => usd(Number(v))}
                            labelFormatter={(v) => `Year ${v}`}
                          />
                          <Area
                            dataKey={real ? 'real' : 'value'}
                            name="Modeled value"
                            type="monotone"
                            stroke={colors[0]}
                            strokeWidth={2.5}
                            fill="url(#simFill)"
                          />
                          <Area
                            dataKey="contributions"
                            name="Nominal contributions"
                            type="monotone"
                            stroke={colors[2]}
                            strokeDasharray="5 4"
                            fill="transparent"
                            strokeWidth={1.5}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      <p className="chart-disclosure">
                        {real
                          ? 'The value curve is inflation adjusted; contributions remain nominal for reference.'
                          : 'A constant annual return is a simplified model. Real markets do not grow in a straight line.'}
                      </p>
                    </>
                  ) : tab === 'monte' ? (
                    <>
                      <div className="monte-summary">
                        <span>
                          <small>10th percentile</small>
                          <strong>{usd(result.final.p10)}</strong>
                        </span>
                        <span>
                          <small>Median outcome</small>
                          <strong className="mint-text">{usd(result.final.p50)}</strong>
                        </span>
                        <span>
                          <small>90th percentile</small>
                          <strong>{usd(result.final.p90)}</strong>
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={255}>
                        <ComposedChart
                          data={data}
                          margin={{ top: 15, right: 12, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid stroke="#2b3230" vertical={false} strokeDasharray="3 5" />
                          <XAxis dataKey="year" {...chartAxis} tickFormatter={(v) => `${v}y`} />
                          <YAxis
                            {...chartAxis}
                            tickFormatter={(v) => '$' + compact(v)}
                            width={65}
                          />
                          <Tooltip
                            contentStyle={chartTooltip}
                            content={({ active, payload, label }) =>
                              active && payload?.length ? (
                                <div className="custom-tooltip">
                                  Year {label}
                                  <br />
                                  10th: {usd(payload[0].payload.p10)}
                                  <br />
                                  Median: {usd(payload[0].payload.p50)}
                                  <br />
                                  90th: {usd(payload[0].payload.p90)}
                                </div>
                              ) : null
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="p10"
                            stackId="band"
                            fill="transparent"
                            stroke="none"
                          />
                          <Area
                            type="monotone"
                            dataKey="band"
                            stackId="band"
                            fill={colors[1]}
                            fillOpacity={0.16}
                            stroke="none"
                          />
                          <Line
                            type="monotone"
                            dataKey="p10"
                            stroke={colors[1]}
                            dot={false}
                            strokeWidth={1}
                            strokeDasharray="3 4"
                          />
                          <Line
                            type="monotone"
                            dataKey="p90"
                            stroke={colors[1]}
                            dot={false}
                            strokeWidth={1}
                            strokeDasharray="3 4"
                          />
                          <Line
                            type="monotone"
                            dataKey="p50"
                            name="Median"
                            stroke={colors[0]}
                            dot={false}
                            strokeWidth={2.5}
                          />
                          <ReferenceLine y={p.target} stroke="#edc48a" strokeDasharray="5 5" />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <div className="monte-footer">
                        <Tag tone="mint">
                          {result.probability}% of paths reach {usd(p.target)}
                        </Tag>
                        <span>
                          {result.paths.toLocaleString()} paths · seed {result.seed} · nominal,
                          after tax
                        </span>
                      </div>
                    </>
                  ) : tab === 'distribution' ? (
                    <>
                      <p className="chart-disclosure">
                        Distribution of modeled final values after terminal tax. Each bar counts
                        paths within a value range.
                      </p>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={result.distribution}
                          margin={{ top: 15, right: 12, left: -15, bottom: 5 }}
                        >
                          <CartesianGrid stroke="#2b3230" vertical={false} />
                          <XAxis
                            dataKey="value"
                            {...chartAxis}
                            tickFormatter={(v) => '$' + compact(v)}
                            minTickGap={45}
                          />
                          <YAxis {...chartAxis} />
                          <Tooltip
                            contentStyle={chartTooltip}
                            formatter={(v: any) => [v, 'Paths']}
                            labelFormatter={(v) => `Around ${usd(Number(v))}`}
                          />
                          <Bar dataKey="count" fill={colors[1]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="comparison-content">
                      {comparison.length ? (
                        <>
                          <p className="muted">
                            A snapshot of assumptions when you last compared. Recompare after
                            changing inputs.
                          </p>
                          <div className="scenario-comparison">
                            {comparison.map((s, i) => (
                              <div key={s.label}>
                                <span className="eyebrow" style={{ color: colors[i] }}>
                                  {s.label}
                                </span>
                                <strong>{usd(s.result.final.value)}</strong>
                                <span>{s.rate}% annual return</span>
                                <small>{usd(s.result.final.real)} in today's dollars</small>
                                <Tag>{s.result.probability}% paths reach target</Tag>
                              </div>
                            ))}
                          </div>
                          <ResponsiveContainer width="100%" height={220}>
                            <AreaChart
                              data={comparison[0].result.rows.map((r: any, i: number) => ({
                                year: r.year,
                                ...Object.fromEntries(
                                  comparison.map((s) => [s.label, s.result.rows[i].value]),
                                ),
                              }))}
                            >
                              <CartesianGrid stroke="#2b3230" vertical={false} />
                              <XAxis dataKey="year" {...chartAxis} />
                              <YAxis {...chartAxis} tickFormatter={(v) => '$' + compact(v)} />
                              <Tooltip
                                contentStyle={chartTooltip}
                                formatter={(v: any) => usd(Number(v))}
                              />
                              {comparison.map((s, i) => (
                                <Area
                                  key={s.label}
                                  dataKey={s.label}
                                  stroke={colors[i]}
                                  fill="transparent"
                                  type="monotone"
                                  strokeWidth={2}
                                />
                              ))}
                            </AreaChart>
                          </ResponsiveContainer>
                        </>
                      ) : (
                        <div className="comparison-empty">
                          <FlaskConical size={30} />
                          <h3>One plan. Three possibilities.</h3>
                          <p>
                            Compare your baseline annual return with assumptions three percentage
                            points lower and higher.
                          </p>
                          <Button onClick={compare} disabled={busy || comparing}>
                            {comparing ? 'Comparing…' : 'Run comparison'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </Panel>
          <div className="simulation-assumptions">
            <Info size={17} />
            <p>
              Monte Carlo assumes independent monthly lognormal returns, a constant annual expected
              return and constant log volatility. Fees reduce returns; a flat tax applies only to
              positive gains at liquidation. Inflation is constant. No losses offset taxes. These
              assumptions omit market regimes and personal tax rules. Probabilities describe this
              model, not the likelihood of actual future returns.
            </p>
          </div>
          <Panel
            title="Year by year"
            action={
              <Button secondary small onClick={() => setTable(!table)}>
                {table ? 'Hide breakdown' : 'Show breakdown'}
                {table ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
            }
          >
            {table && result && (
              <div className="table-scroll projection-table">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Contributions</th>
                      <th>Modeled value</th>
                      <th>Today's dollars</th>
                      <th>Median path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r: any) => (
                      <tr key={r.year}>
                        <td>{r.year}</td>
                        <td>{usd(r.contributions)}</td>
                        <td>{usd(r.value)}</td>
                        <td>{usd(r.real)}</td>
                        <td>{usd(r.p50)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
      <Panel
        title="Your saved possibilities"
        action={<span className="eyebrow">SAVED TO THIS WORKSPACE</span>}
      >
        <div className="saved-scenarios">
          {c.s.scenarios.map((s) => (
            <div key={s.id}>
              <span className="account-icon">
                <FlaskConical size={18} />
              </span>
              <span>
                <strong>{s.name}</strong>
                <small>
                  {s.inputs.years} years · {usd(s.inputs.monthly)}/month · {s.inputs.annual_return}%
                  expected return
                </small>
              </span>
              <Button
                secondary
                small
                onClick={() => {
                  setP({ ...defaults, ...s.inputs });
                  setComparison([]);
                }}
              >
                <Play size={13} />
                Load
              </Button>
              <button
                className="icon-button"
                aria-label={'Delete scenario ' + s.name}
                onClick={() => c.remove('scenarios', s)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {!c.s.scenarios.length && (
            <p className="muted">
              Save assumptions you want to revisit. Try a retirement plan, a down payment or a
              lump-sum investment.
            </p>
          )}
        </div>
      </Panel>
      {saveOpen && (
        <Modal title="Save this possibility" onClose={() => setSaveOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await c.save('scenarios', { id: uid(), name, inputs: p });
                setSaveOpen(false);
              } catch (e) {
                c.notify((e as Error).message);
              }
            }}
          >
            <Field label="Scenario name">
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <p className="muted">
              Saves inputs, including random seed, so you can reproduce this model later.
            </p>
            <div className="form-actions">
              <Button secondary onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save scenario</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
