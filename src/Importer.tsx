import { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  AlertCircle,
  ShieldCheck,
  Download,
  ArrowLeft,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import type { Context } from './App';
import { request, money } from './types';
import { Modal, Button, Field, Tag } from './components';
const txnFields = [
  ['date', 'Date *'],
  ['merchant', 'Merchant / description *'],
  ['amount', 'Signed amount'],
  ['debit', 'Debit / withdrawal'],
  ['credit', 'Credit / deposit'],
  ['kind', 'Type (income / expense / transfer)'],
  ['category', 'Category (optional)'],
  ['note', 'Note (optional)'],
];
const priceFields = [
  ['ticker', 'Ticker *'],
  ['date', 'Price date *'],
  ['price', 'Price per unit ($) *'],
];
const holdingFields = [
  ['name', 'Asset name'],
  ['ticker', 'Ticker *'],
  ['asset_class', 'Asset class'],
  ['shares', 'Shares / units *'],
  ['purchase_price', 'Purchase price ($) *'],
  ['current_price', 'Current price ($) *'],
  ['purchased', 'Purchase date *'],
  ['valued', 'Valuation date *'],
];
const aliases: Record<string, string[]> = {
  price: ['price', 'close', 'adjusted close', 'adj close'],
  date: ['date', 'transaction date', 'posted date', 'posting date'],
  merchant: ['merchant', 'description', 'payee', 'name', 'memo'],
  amount: ['amount', 'signed amount'],
  debit: ['debit', 'withdrawal', 'debits', 'withdrawals'],
  credit: ['credit', 'deposit', 'credits', 'deposits'],
  kind: ['kind', 'type', 'transaction type'],
  category: ['category'],
  note: ['note', 'notes'],
  name: ['name', 'asset name'],
  ticker: ['ticker', 'symbol'],
  asset_class: ['asset_class', 'asset class'],
  shares: ['shares', 'quantity', 'units'],
  purchase_price: ['purchase_price', 'purchase price', 'cost per share'],
  current_price: ['current_price', 'current price', 'price'],
  purchased: ['purchased', 'purchase date'],
  valued: ['valued', 'valuation date', 'price date'],
};
export default function Importer({
  c,
  mode,
  onClose,
}: {
  c: Context;
  mode: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1),
    [file, setFile] = useState<any>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [account, setAccount] = useState(c.s.accounts[0]?.id || ''),
    [dateFormat, setDateFormat] = useState('auto'),
    [invert, setInvert] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [drag, setDrag] = useState(false),
    [preview, setPreview] = useState<any>(null),
    [duplicates, setDuplicates] = useState(false),
    [done, setDone] = useState<any>(null);
  const input = useRef<HTMLInputElement>(null);
  const upload = async (f: File) => {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', f);
      const r = await request('/csv/inspect', { method: 'POST', body: form });
      setFile(r);
      setMapping(
        Object.fromEntries(
          (mode === 'prices' ? priceFields : mode === 'holdings' ? holdingFields : txnFields).map(
            ([key]) => [
              key,
              r.columns.find((col: string) => aliases[key]?.includes(col.trim().toLowerCase())) ||
                '',
            ],
          ),
        ),
      );
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const payload = () => ({
    mode,
    rows: file.rows,
    mapping,
    account_id: account,
    date_format: dateFormat,
    invert,
  });
  const review = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await request(`/csv/preview?workspace=${c.workspace}`, {
        method: 'POST',
        body: JSON.stringify(payload()),
      });
      setPreview(r);
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const canReview =
    mode === 'prices'
      ? ['ticker', 'date', 'price'].every((k) => mapping[k])
      : mode === 'holdings'
        ? ['ticker', 'shares', 'purchase_price', 'current_price', 'purchased', 'valued'].every(
            (k) => mapping[k],
          )
        : account &&
          mapping.date &&
          mapping.merchant &&
          (mapping.amount || mapping.debit || mapping.credit);
  return (
    <Modal
      title={
        done
          ? 'Import complete'
          : `Import ${mode === 'prices' ? 'prices' : mode === 'holdings' ? 'portfolio' : 'transactions'} from CSV`
      }
      onClose={onClose}
      wide
    >
      <div className="import-steps">
        {['Choose file', 'Map columns', 'Review & import'].map((v, i) => (
          <div className={step >= i + 1 ? 'active' : ''} key={v}>
            <span>{step > i + 1 ? <Check size={13} /> : i + 1}</span>
            {v}
            {i < 2 && <ArrowRight size={13} />}
          </div>
        ))}
      </div>
      {done ? (
        <div className="import-success">
          <span>
            <CheckCircle2 size={40} />
          </span>
          <h2>{done.imported} records, right at home.</h2>
          <p>{done.skipped} duplicates skipped. Your import is saved in this workspace.</p>
          <Button onClick={onClose}>Back to WealthLab</Button>
        </div>
      ) : (
        <>
          {step === 1 && (
            <>
              <div
                className={'dropzone ' + (drag ? 'dragging' : '')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') input.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const f = e.dataTransfer.files[0];
                  if (f) upload(f);
                }}
                onClick={() => input.current?.click()}
              >
                <span className="upload-circle">
                  <Upload size={27} />
                </span>
                <h3>{busy ? 'Reading your file…' : 'Drop your financial records here'}</h3>
                <p>or click to choose a CSV file · UTF-8 · up to 5 MB / 10,000 rows</p>
                <span className="btn secondary small">
                  Choose file <ArrowRight size={14} />
                </span>
              </div>
              <input
                hidden
                ref={input}
                type="file"
                accept=".csv,.tsv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
              <div className="import-information">
                <ShieldCheck size={18} />
                <p>
                  Your file is processed{' '}
                  {import.meta.env.VITE_BROWSER_MODE === 'true'
                    ? 'inside this browser'
                    : 'by your local backend'}
                  . Review and confirm before any records are saved.
                </p>
              </div>
              <a
                className="text-button"
                href={`${import.meta.env.BASE_URL}samples/${mode === 'prices' ? 'prices' : mode === 'holdings' ? 'portfolio' : 'transactions'}.csv`}
                download
              >
                <Download size={14} />
                Download a sample CSV
              </a>
            </>
          )}
          {step === 2 && file && (
            <>
              <div className="file-summary">
                <FileSpreadsheet size={22} />
                <span>
                  <strong>{file.filename}</strong>
                  <small>
                    {file.count} rows · {file.columns.length} columns ·{' '}
                    {file.delimiter === '\t'
                      ? 'tab'
                      : file.delimiter === ';'
                        ? 'semicolon'
                        : 'detected delimiter'}{' '}
                    separated
                  </small>
                </span>
                <Tag>Nothing imported yet</Tag>
              </div>
              {mode === 'transactions' && (
                <>
                  <Field label="Import into account">
                    <select value={account} onChange={(e) => setAccount(e.target.value)}>
                      <option value="">Choose an account</option>
                      {c.s.accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · opening {a.opened}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {!c.s.accounts.length && (
                    <p className="error-text">
                      Close this dialog and create an account first, with an opening date on or
                      before your CSV history.
                    </p>
                  )}
                </>
              )}
              <div className="mapping-grid">
                {(mode === 'prices'
                  ? priceFields
                  : mode === 'holdings'
                    ? holdingFields
                    : txnFields
                ).map(([key, label]) => (
                  <Field label={label} key={key}>
                    <select
                      value={mapping[key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                    >
                      <option value="">Not mapped</option>
                      {file.columns.map((col: string) => (
                        <option key={col}>{col}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <div className="form-grid">
                <Field label="Date format">
                  <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                    <option value="auto">Automatic (ISO or US dates)</option>
                    <option value="%Y-%m-%d">YYYY-MM-DD</option>
                    <option value="%m/%d/%Y">MM/DD/YYYY · US</option>
                    <option value="%d/%m/%Y">DD/MM/YYYY · international</option>
                  </select>
                </Field>
                {mode === 'transactions' && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={invert}
                      onChange={(e) => setInvert(e.target.checked)}
                    />
                    Reverse amount signs
                  </label>
                )}
              </div>
              <div className="notice">
                <AlertCircle size={16} />
                <span>
                  {mode === 'prices'
                    ? 'Historical observations stay separate from current prices. Duplicate ticker/date entries are always skipped; edit an existing price to correct it.'
                    : mode === 'holdings'
                      ? 'Each row is a holding lot. Asset classes must match the classes shown in the holding editor. Prices are dollar amounts.'
                      : 'Map a signed amount OR debit/credit columns. Negative amounts are expenses; positive amounts are income unless an explicit type or saved rule identifies a transfer. Review card payments carefully.'}
                </span>
              </div>
              <h4 className="preview-label">FILE PREVIEW · FIRST 4 ROWS</h4>
              <div className="table-scroll csv-preview">
                <table>
                  <thead>
                    <tr>
                      {file.columns.map((col: string) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {file.rows.slice(0, 4).map((r: any, i: number) => (
                      <tr key={i}>
                        {file.columns.map((col: string) => (
                          <td key={col}>{r[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {step === 3 && preview && (
            <>
              <div className="import-review-stats">
                <div>
                  <CheckCircle2 size={19} />
                  <strong>{preview.valid}</strong>
                  <span>new valid rows</span>
                </div>
                <div>
                  <Copy size={19} />
                  <strong>{preview.duplicates}</strong>
                  <span>possible duplicates</span>
                </div>
                <div>
                  <AlertCircle size={19} />
                  <strong>{preview.errors.length}</strong>
                  <span>rows with errors</span>
                </div>
              </div>
              <p className="muted">
                Nothing has been saved. All rows must be valid before import. Fix errors in your
                source CSV and choose the file again.
              </p>
              {preview.errors.length > 0 && (
                <div className="import-errors">
                  {preview.errors.map((e: any) => (
                    <div key={e.row}>
                      <strong>Row {e.row}</strong>
                      <span>{e.error}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="table-scroll csv-preview">
                <table>
                  <thead>
                    <tr>
                      <th>CSV row</th>
                      <th>
                        {mode === 'prices'
                          ? 'Ticker'
                          : mode === 'holdings'
                            ? 'Asset'
                            : 'Description'}
                      </th>
                      <th>Date</th>
                      <th>
                        {mode === 'prices'
                          ? 'Unit price'
                          : mode === 'holdings'
                            ? 'Value'
                            : 'Amount'}
                      </th>
                      <th>Classification</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 50).map((r: any) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>{r.item.merchant || r.item.name || r.item.ticker}</td>
                        <td>{r.item.date || r.item.valued}</td>
                        <td>
                          {money(
                            mode === 'prices'
                              ? r.item.price
                              : mode === 'holdings'
                                ? Math.round(r.item.current_price * r.item.shares)
                                : r.item.amount,
                            2,
                          )}
                        </td>
                        <td>
                          {r.item.category || r.item.asset_class || 'Historical price'}
                          <small className="table-year">{r.item.kind}</small>
                        </td>
                        <td>
                          <Tag tone={r.duplicate ? 'amber' : 'mint'}>
                            {r.duplicate ? 'Duplicate?' : 'Ready'}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 50 && (
                <p className="form-hint">
                  Showing the first 50 valid rows. All {preview.rows.length} valid rows are included
                  in the counts above.
                </p>
              )}
              {preview.duplicates > 0 && mode !== 'prices' && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={duplicates}
                    onChange={(e) => setDuplicates(e.target.checked)}
                  />
                  Include possible duplicates ({preview.duplicates}). Only enable for legitimate
                  identical records.
                </label>
              )}
              <p className="form-hint">
                Duplicate matching uses account, date, description and amount; holdings use ticker,
                purchase date, shares and purchase price. All import decisions are logged.
              </p>
            </>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              secondary
              disabled={busy}
              onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            >
              {step === 1 ? (
                'Cancel'
              ) : (
                <>
                  <ArrowLeft size={14} />
                  Back
                </>
              )}
            </Button>
            {step === 2 && (
              <Button disabled={busy || !canReview} onClick={review}>
                {busy ? 'Validating…' : 'Review records'}
                <ArrowRight size={14} />
              </Button>
            )}
            {step === 3 && (
              <Button
                disabled={busy || preview.errors.length > 0 || (!duplicates && !preview.valid)}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const result = await request(`/csv/commit?workspace=${c.workspace}`, {
                      method: 'POST',
                      body: JSON.stringify({
                        ...payload(),
                        filename: file.filename,
                        revision: c.s.revision,
                        include_duplicates: duplicates,
                      }),
                    });
                    setDone(result);
                    await c.refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy
                  ? 'Importing…'
                  : `Import ${preview.valid + (duplicates ? preview.duplicates : 0)} records`}
                <Check size={15} />
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
