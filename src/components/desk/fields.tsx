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
