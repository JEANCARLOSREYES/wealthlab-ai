import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Plus, Upload, Trash2, Clock, Info } from 'lucide-react';
import type { Context } from './App';
import { money, colors } from './types';
import { Panel, Button, Metric, Empty, chartAxis, chartTooltip } from './components';
export default function Performance({ c }: { c: Context }) {
  const [tab, setTab] = useState('returns'),
    [ticker, setTicker] = useState(c.s.prices[0]?.ticker || c.s.holdings[0]?.ticker || '');
  const p = c.performance;
  const prices = c.s.prices
    .filter((v) => v.ticker.toUpperCase() === ticker.toUpperCase())
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Panel
      title="Performance, with the right context"
      action={
        <div className="segmented">
          <button className={tab === 'returns' ? 'selected' : ''} onClick={() => setTab('returns')}>
            Return ledger
          </button>
          <button className={tab === 'prices' ? 'selected' : ''} onClick={() => setTab('prices')}>
            Price history
          </button>
        </div>
      }
    >
      {tab === 'returns' ? (
        <div className="inner-content">
          <div className="section-description">
            <p>
              Use actual portfolio valuations and dated external flows. Record every deposit and
              withdrawal as a checkpoint with its end-of-day value.
            </p>
            <Button secondary small onClick={() => c.edit('checkpoints')}>
              <Plus size={14} />
              Checkpoint
            </Button>
          </div>
          {p.points.length >= 2 ? (
            <>
              <div className="three-metrics">
                <Metric
                  label="Time-weighted return"
                  value={p.twr === null ? '—' : p.twr.toFixed(2) + '%'}
                  sub="Cumulative · linked checkpoint periods"
                />
                <Metric
                  label="Money-weighted return"
                  value={p.mwr === null ? 'Unavailable' : p.mwr.toFixed(2) + '%'}
                  sub="Annualized XIRR · actual dated flows"
                />
                <Metric
                  label="Recorded interval"
                  value={p.days + ' days'}
                  sub={
                    p.days < 365
                      ? 'Short-period annualization can exaggerate results'
                      : 'First through last saved checkpoint'
                  }
                />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={p.points}>
                  <CartesianGrid stroke="#293b2e" vertical={false} />
                  <XAxis dataKey="date" {...chartAxis} />
                  <YAxis {...chartAxis} tickFormatter={(v) => money(Number(v))} width={75} />
                  <Tooltip
                    contentStyle={chartTooltip}
                    formatter={(v: any) => money(Number(v), 2)}
                  />
                  <Area
                    dataKey="value"
                    name="Portfolio value (includes flows)"
                    stroke={colors[1]}
                    fill={colors[1]}
                    fillOpacity={0.08}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="form-hint">
              {p.reason} A total value chart includes contributions; use return metrics to
              distinguish performance from money you added.
            </p>
          )}
          {p.points.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Checkpoint date</th>
                    <th>Value after flow</th>
                    <th>External flow</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.points.map((v: any) => (
                    <tr key={v.id}>
                      <td>
                        <button className="text-button" onClick={() => c.edit('checkpoints', v)}>
                          {v.date}
                        </button>
                      </td>
                      <td>{money(v.value, 2)}</td>
                      <td>{money(v.flow, 2)}</td>
                      <td>
                        <button
                          aria-label={'Delete checkpoint ' + v.date}
                          className="icon-button"
                          onClick={() => c.remove('checkpoints', v)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="performance-method">
            <Info size={16} />
            <p>
              {p.points.length >= 2 ? p.reason + ' ' : ''}Exact TWR requires all external flows to
              be recorded at the end of each checkpoint period. Checkpoints are user-supplied;
              WealthLab cannot verify their completeness. XIRR can have multiple solutions, in which
              case no single rate is shown. Neither metric is inferred from purchase lots.
            </p>
          </div>
        </div>
      ) : (
        <div className="inner-content">
          <div className="section-description">
            <p>
              Your imported historical prices. Keep price research alongside your holdings without a
              live data feed.
            </p>
            <div className="button-group">
              <Button secondary small onClick={() => c.importData('prices')}>
                <Upload size={14} />
                Import
              </Button>
              <Button small onClick={() => c.edit('prices')}>
                <Plus size={14} />
                Price
              </Button>
            </div>
          </div>
          <select
            aria-label="Price history ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          >
            <option value="">Choose ticker</option>
            {[
              ...new Set([
                ...c.s.holdings.map((h) => h.ticker),
                ...c.s.prices.map((p) => p.ticker),
              ]),
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          {prices.length ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={prices} margin={{ top: 25 }}>
                  <CartesianGrid stroke="#293b2e" vertical={false} />
                  <XAxis dataKey="date" {...chartAxis} />
                  <YAxis {...chartAxis} tickFormatter={(v) => money(Number(v))} width={70} />
                  <Tooltip
                    contentStyle={chartTooltip}
                    formatter={(v: any) => money(Number(v), 2)}
                  />
                  <Area
                    dataKey="price"
                    name={ticker + ' price'}
                    stroke={colors[0]}
                    fill={colors[0]}
                    fillOpacity={0.08}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="price-history-list">
                {[...prices]
                  .reverse()
                  .slice(0, 20)
                  .map((v) => (
                    <div className="list-row" key={v.id}>
                      <Clock size={14} />
                      <span>{v.date}</span>
                      <strong>{money(v.price, 2)}</strong>
                      <div className="row-actions">
                        <button className="text-button" onClick={() => c.edit('prices', v)}>
                          Edit
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Delete price"
                          onClick={() => c.remove('prices', v)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              <p className="form-hint">
                Showing the most recent 20 entries in this ticker's list. The chart includes all of
                its saved observations. Prices are not automatically copied to current holdings.
              </p>
            </>
          ) : (
            <Empty
              title="A record of the market, on your terms"
              body="Import a ticker, date and price CSV, or add individual historical prices."
            />
          )}
        </div>
      )}
    </Panel>
  );
}
