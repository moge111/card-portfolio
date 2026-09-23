import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import type { FeeCheckRow } from '../../utils/gradingMath';

interface FeeCheckProps {
  rows: FeeCheckRow[];
  isAdmin: boolean;
  onApply: (row: FeeCheckRow) => void;
}

export default function FeeCheck({ rows, isAdmin, onApply }: FeeCheckProps) {
  const shortfall = rows.reduce((s, r) => s + r.shortfall, 0);
  const ok = shortfall < 0.005;

  return (
    <div className={`panel p-4 mb-4 ${ok ? '' : 'border-loss/40'}`}>
      <div className="flex items-center gap-2 mb-3">
        {ok ? <CheckCircle size={14} className="text-profit" /> : <AlertTriangle size={14} className="text-loss" />}
        <h4 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-primary">
          Fee check · today's PSA tiers
        </h4>
        <span className={`ml-auto font-mono text-xs ${ok ? 'text-profit' : 'text-loss'}`}>
          {ok ? 'Budget covers every card' : `${formatCurrency(shortfall)} short`}
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.card.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
            <span className="text-text-primary min-w-0 flex-1 truncate">{r.subQty}× {r.card.name}</span>
            <span className="text-text-secondary">declared {formatCurrency(r.card.psa10Value)}</span>
            <span className="text-text-secondary">budget {formatCurrency(r.budgetPerCard)}</span>
            <span className={r.shortfall > 0 ? 'text-loss' : 'text-profit'}>
              → {r.tier ? `${r.tier.name} ${formatCurrency(r.tier.feePerCard)}` : 'over every open tier — see Premium'}
            </span>
            {isAdmin && r.shortfall > 0 && r.tier && (
              <button onClick={() => onApply(r)} className="text-accent hover:text-accent-light">update budget</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
