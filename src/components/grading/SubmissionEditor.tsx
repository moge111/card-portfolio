import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { PsaTier, Submission, SubmissionStatus } from '../../types/grading';
import { STATUS_STYLE } from '../../constants/gradingStyles';

interface SubmissionEditorProps {
  sub: Submission;
  tiers: PsaTier[];
  canDelete: boolean;
  onSave: (patch: Partial<Submission>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const inputClass = 'w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-accent';
const labelClass = 'block font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1';

export default function SubmissionEditor({ sub, tiers, canDelete, onSave, onDelete, onClose }: SubmissionEditorProps) {
  const [draft, setDraft] = useState<Submission>(sub);
  const set = <K extends keyof Submission>(field: K, value: Submission[K]) => setDraft((d) => ({ ...d, [field]: value }));

  const pickTier = (name: string) => {
    const tier = tiers.find((t) => t.name === name);
    setDraft((d) => ({ ...d, tier: name, ...(tier && { turnaroundDays: tier.turnaroundMax }) }));
  };

  const save = () => {
    onSave({
      ...draft,
      orderNumber: draft.orderNumber || undefined,
      description: draft.description || undefined,
      tier: draft.tier || undefined,
      dateShipped: draft.dateShipped || undefined,
      dateReturned: draft.dateReturned || undefined,
    });
    onClose();
  };

  return (
    <div className="panel gold-hairline ring-1 ring-accent/25 p-5 mb-8 rise">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-light">Edit {sub.name}</h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <label>
          <span className={labelClass}>Name</span>
          <input className={inputClass} value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Description</span>
          <input className={inputClass} value={draft.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>PSA order #</span>
          <input className={inputClass} value={draft.orderNumber ?? ''} onChange={(e) => set('orderNumber', e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Status</span>
          <select className={inputClass} value={draft.status} onChange={(e) => set('status', e.target.value as SubmissionStatus)}>
            {(Object.keys(STATUS_STYLE) as SubmissionStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>Tier</span>
          <input className={inputClass} list="psa-tier-names" value={draft.tier ?? ''} onChange={(e) => pickTier(e.target.value)} />
          <datalist id="psa-tier-names">
            {tiers.map((t) => <option key={t.id} value={t.name} />)}
          </datalist>
        </label>
        <label>
          <span className={labelClass}>Turnaround (business days)</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={draft.turnaroundDays ?? ''}
            onChange={(e) => set('turnaroundDays', parseInt(e.target.value) || undefined)}
          />
        </label>
        <label>
          <span className={labelClass}>Shipping + insurance ($)</span>
          <input
            className={inputClass}
            inputMode="decimal"
            value={draft.shipping}
            onChange={(e) => set('shipping', parseFloat(e.target.value) || 0)}
          />
        </label>
        <label>
          <span className={labelClass}>Date shipped</span>
          <input type="date" className={inputClass} value={draft.dateShipped ?? ''} onChange={(e) => set('dateShipped', e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Date returned</span>
          <input type="date" className={inputClass} value={draft.dateReturned ?? ''} onChange={(e) => set('dateReturned', e.target.value)} />
        </label>
      </div>
      <div className="mt-5 flex items-center justify-between">
        {canDelete ? (
          <button
            onClick={() => { if (confirm(`Delete ${sub.name}?`)) onDelete(); }}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-loss/70 hover:text-loss"
          >
            <Trash2 size={12} /> Delete empty sub
          </button>
        ) : <span />}
        <button
          onClick={save}
          className="rounded-lg bg-gradient-to-r from-accent to-holo px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-background hover:brightness-125"
        >
          Save
        </button>
      </div>
    </div>
  );
}
