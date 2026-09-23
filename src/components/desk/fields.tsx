import { useState, type ReactNode } from 'react';

export const inputClass =
  'w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-accent tabular-nums';
export const labelClass = 'block font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1';

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: ReactNode;
}

// Keeps the raw text while typing so "0." or "" don't snap back mid-edit.
export function NumField({ label, value, onChange, prefix, suffix, hint }: NumFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (Number.isFinite(value) ? String(+value.toFixed(4)) : '');

  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative flex items-center">
        {prefix && <span className="absolute left-2.5 text-sm text-text-secondary">{prefix}</span>}
        <input
          className={`${inputClass} ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-7' : ''}`}
          inputMode="decimal"
          value={display}
          onFocus={() => setDraft(display)}
          onChange={(e) => {
            setDraft(e.target.value);
            const parsed = parseFloat(e.target.value);
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          onBlur={() => setDraft(null)}
        />
        {suffix && <span className="absolute right-2.5 text-sm text-text-secondary">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block font-mono text-[10px] text-text-secondary/80">{hint}</span>}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function TextField({ label, value, onChange, placeholder, multiline }: TextFieldProps) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {multiline ? (
        <textarea className={`${inputClass} min-h-20`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={inputClass} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function PageHeader({ eyebrow, title, accent, children }: { eyebrow: string; title: string; accent: string; children?: ReactNode }) {
  return (
    <div className="mb-8 rise flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          <span className="twinkle mr-1">✦</span>{eyebrow}
        </div>
        <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-text-primary">
          {title} <span className="holo-text italic">{accent}</span>
        </h2>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export const primaryButton =
  'rounded-lg bg-gradient-to-r from-accent to-holo px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-background transition-all hover:brightness-125';
export const secondaryButton =
  'rounded-lg border border-border bg-background/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary transition-colors hover:border-accent/40 hover:text-accent-light';
