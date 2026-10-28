import { useEffect, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, Plus, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { money, colors } from './types';
export function Button({
  children,
  onClick,
  secondary = false,
  small = false,
  disabled = false,
  type = 'button',
  className = '',
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  small?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${secondary ? 'secondary' : ''} ${small ? 'small' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
export function Panel({
  title,
  kicker,
  action,
  children,
  className = '',
}: {
  title?: string;
  kicker?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            {kicker && <span className="eyebrow">{kicker}</span>}
            <h3>{title}</h3>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">
        <Plus size={22} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function Metric({
  label,
  value,
  sub,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <div className="metric-label">
        {label}
        {icon}
      </div>
      <div className="metric-value tabular">{value}</div>
      <div className="metric-sub">{sub || 'From your saved records'}</div>
    </div>
  );
}
export function Progress({ value, color = colors[0] }: { value: number; color?: string }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    ((ref.current?.querySelector('input,textarea,select') as HTMLElement) || ref.current)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = '';
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function Currency({ value }: { value: number }) {
  return (
    <span className={value > 0 ? 'positive' : value < 0 ? 'negative' : ''}>
      {value > 0 ? '+' : ''}
      {money(value, 2)}
    </span>
  );
}
export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <span className="select-shell">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </span>
  );
}
export const chartTooltip = {
  background: '#23292a',
  border: '1px solid #3a4242',
  borderRadius: 10,
  color: '#e9eeeb',
  fontSize: 12,
};
export const chartAxis = {
  tickLine: false,
  axisLine: false,
  tick: { fill: '#7d8986', fontSize: 11 },
};
export function Step({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className={`step ${active ? 'active' : ''}`}>
      <span>{active ? <Check size={14} /> : n}</span>
      {label}
      <ArrowRight size={13} />
    </div>
  );
}
