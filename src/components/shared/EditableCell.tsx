import { useState, useRef, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';

interface EditableCellProps {
  value: number | string;
  onSave: (value: any) => void;
  format?: (value: any) => string;
  type?: 'number' | 'text';
  className?: string;
  inputWidth?: string;
}

export default function EditableCell({ value, onSave, format, type = 'number', className = '', inputWidth = 'w-20' }: EditableCellProps) {
  const isAdmin = useAdmin();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    if (!isAdmin) return;
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (type === 'number') {
      const parsed = parseFloat(draft);
      if (!isNaN(parsed) && parsed !== value) {
        onSave(parsed);
      }
    } else {
      if (draft.trim() && draft !== value) {
        onSave(draft.trim());
      }
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={`${inputWidth} bg-background border border-accent rounded px-1.5 py-0.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent`}
      />
    );
  }

  const display = format ? format(value) : value;

  if (!isAdmin) {
    return <span className={className}>{display}</span>;
  }

  return (
    <span
      onClick={startEdit}
      className={`cursor-pointer border-b border-dashed border-text-secondary/30 hover:border-accent hover:text-accent transition-colors ${className}`}
      title="Click to edit"
    >
      {display}
    </span>
  );
}

interface EditableSelectProps {
  value: string;
  options: string[];
  onSave: (value: string) => void;
}

export function EditableSelect({ value, options, onSave }: EditableSelectProps) {
  const isAdmin = useAdmin();
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  if (!isAdmin) return <span>{value}</span>;

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        className="bg-background border border-accent rounded px-1 py-0.5 text-xs text-text-primary outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer border-b border-dashed border-text-secondary/30 hover:border-accent hover:text-accent transition-colors"
      title="Click to edit"
    >
      {value}
    </span>
  );
}
