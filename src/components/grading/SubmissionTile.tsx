import { Pencil, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { formatShortDate, parseDate } from '../../utils/dates';
import { submissionEta } from '../../utils/gradingMath';
import { STATUS_STYLE } from '../../constants/gradingStyles';
import type { Submission } from '../../types/grading';

export interface SubStats {
  invested: number;
  profit: number;
  cards: number;
  soldCount: number;
  soldRevenue: number;
  currentPL: number;
}

interface SubmissionTileProps {
  sub: Submission;
  stats: SubStats;
  isOpen: boolean;
  isAdmin: boolean;
  feeShortfall: number;
  onOpen: () => void;
  onEdit: () => void;
}

export default function SubmissionTile({ sub, stats, isOpen, isAdmin, feeShortfall, onOpen, onEdit }: SubmissionTileProps) {
  // Before anything sells, show projected profit; once sales land, show realized P/L
  const hasSales = stats.soldCount > 0;
  const pl = hasSales ? stats.currentPL : stats.profit;
  const roi = stats.invested > 0 ? (pl / stats.invested) * 100 : 0;
  const eta = submissionEta(sub);
  const status = STATUS_STYLE[sub.status];
  const awaitingGrades = sub.status === 'shipped' || sub.status === 'at-psa';

  return (
    <div
      onClick={onOpen}
      className={`panel panel-hover p-5 cursor-pointer ${sub.status === 'returned' ? '' : 'border-dashed'} ${isOpen ? 'ring-1 ring-accent/70 border-accent/50' : ''}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-primary">{sub.name}</h3>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title="Edit submission details"
              className="text-text-secondary/60 hover:text-accent-light transition-colors"
            >
              <Pencil size={12} />
            </button>
          )}
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${status.className}`}>{status.label}</span>
        </div>
      </div>
      <p className="font-mono text-[10px] text-text-secondary mb-3">
        {stats.cards} cards{sub.description ? ` · ${sub.description}` : ''}{sub.tier ? ` · ${sub.tier}` : ''} · {formatCurrency(stats.invested)} invested
      </p>
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-2xl font-medium tracking-tight tabular-nums ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
          {formatCurrency(pl)}
        </span>
        <span className={`font-mono text-xs ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatPercent(roi)} ROI</span>
      </div>
      <p className="font-mono text-[10px] text-text-secondary mt-1.5">
        {hasSales
          ? `${stats.soldCount}/${stats.cards} sold · ${formatCurrency(stats.soldRevenue)} revenue`
          : `projected · 0/${stats.cards} sold`}
        {' · '}
        <span className="text-accent">details</span>
      </p>

      {eta && (
        <div className="mt-3">
          <div className="flex justify-between font-mono text-[10px] text-text-secondary mb-1">
            <span>Day {eta.elapsed} of {sub.turnaroundDays} business days</span>
            <span className="text-accent-light">grades ~{formatShortDate(eta.gradesBack)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full ${eta.progress >= 1 ? 'bg-profit' : 'bg-gradient-to-r from-accent to-holo'}`}
              style={{ width: `${Math.max(4, eta.progress * 100)}%` }}
            />
          </div>
          {eta.progress >= 1 && (
            <p className="mt-1 font-mono text-[10px] text-profit">Past PSA's estimate — grades could post any day</p>
          )}
        </div>
      )}
      {awaitingGrades && !eta && (
        <p className="mt-3 font-mono text-[10px] text-text-secondary/70">
          {isAdmin ? 'Set ship date + turnaround (pencil) for an ETA' : 'No ETA — ship date or turnaround not set'}
        </p>
      )}
      {sub.status === 'returned' && sub.dateReturned && (
        <p className="mt-3 font-mono text-[10px] text-text-secondary/70">Returned {formatShortDate(parseDate(sub.dateReturned))}</p>
      )}
      {sub.status === 'planned' && feeShortfall > 0.005 && (
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-loss">
          <AlertTriangle size={11} /> Fees under-budgeted by {formatCurrency(feeShortfall)} at today's PSA prices
        </p>
      )}
    </div>
  );
}
