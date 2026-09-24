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
      className={`panel panel-hover p-1.5 cursor-pointer ${isOpen ? 'border-label' : ''}`}
    >
      <div className="slab-label px-2.5 pt-1.5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">{stats.cards} cards · {formatCurrency(stats.invested)} in</div>
            <div className="font-display text-lg font-bold uppercase leading-tight text-text-primary truncate">
              {sub.name}{sub.description ? ` · ${sub.description}` : ''}
            </div>
          </div>
          <div className="flex items-start gap-2 shrink-0">
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                aria-label={`Edit ${sub.name}`}
                className="mt-0.5 text-text-secondary hover:text-text-primary transition-colors"
              >
                <Pencil size={12} />
              </button>
            )}
            <div className={`text-right font-display font-extrabold uppercase leading-[0.85] ${status.textClass}`}>
              <div className="text-2xl">{status.word}</div>
              <div className="font-mono text-[9px] font-medium tracking-[0.1em]">{status.caption}</div>
            </div>
          </div>
        </div>
        <div className="barcode mt-1.5" />
      </div>

      <div className="px-2.5 pt-3 pb-2">
        <div className="flex items-baseline gap-2">
          <span className={`font-display text-3xl font-bold leading-none tabular-nums ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
          </span>
          <span className="font-mono text-xs text-text-secondary">{formatPercent(roi)} ROI</span>
        </div>
        <p className="font-mono text-[10px] text-text-secondary mt-1.5">
          {hasSales
            ? `${stats.soldCount}/${stats.cards} sold · ${formatCurrency(stats.soldRevenue)} revenue`
            : `projected · 0/${stats.cards} sold`}
          {sub.tier ? ` · ${sub.tier}` : ''}
        </p>

        {eta && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full ${eta.progress >= 1 ? 'bg-profit' : 'bg-meter'}`}
                style={{ width: `${Math.max(4, eta.progress * 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] text-text-secondary">
              <span>Day {eta.elapsed} of {sub.turnaroundDays} business days</span>
              <span className="text-text-primary">grades ~{formatShortDate(eta.gradesBack)}</span>
            </div>
            {eta.progress >= 1 && (
              <p className="mt-1 font-mono text-[10px] text-profit">Past PSA's estimate — grades could post any day</p>
            )}
          </div>
        )}
        {awaitingGrades && !eta && (
          <p className="mt-3 font-mono text-[10px] text-text-secondary">
            {isAdmin ? 'Set ship date + turnaround (pencil) for an ETA' : 'No ETA — ship date or turnaround not set'}
          </p>
        )}
        {sub.status === 'returned' && sub.dateReturned && (
          <p className="mt-2 font-mono text-[10px] text-text-secondary">Returned {formatShortDate(parseDate(sub.dateReturned))}</p>
        )}
        {sub.status === 'planned' && feeShortfall > 0.005 && (
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-loss">
            <AlertTriangle size={11} /> Fees under-budgeted by {formatCurrency(feeShortfall)} at today's PSA prices
          </p>
        )}
      </div>
    </div>
  );
}
