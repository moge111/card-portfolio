import { useMemo, useState, useRef } from 'react';
import { CreditCard, DollarSign, TrendingUp, Target, CheckCircle, Clock, Plus, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { type ColumnDef } from '@tanstack/react-table';
import StatCard from '../shared/StatCard';
import ChartCard from '../shared/ChartCard';
import DataTable from '../shared/DataTable';
import EditableCell, { EditableSelect } from '../shared/EditableCell';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { CATEGORY_COLORS, CHART_COLORS } from '../../constants/theme';
import SubmissionDetail from './SubmissionDetail';
import { FLAIR_HERO, triggerFlyBy } from '../../constants/flair';
import Peeker from '../shared/Peeker';
import type { GradingCard } from '../../types/portfolio';

const EBAY_FEE = 0.1325;
const SHIPPING_COST_PER_SALE = 2; // $5 charged - ~$7 FedEx avg = $2 out of pocket
// Shipping costs from PSA Invoice PSI26960405
const SUB1_SHIPPING = 47.33; // Order 26141760
const SUB2_SHIPPING = 46.55; // Order 26141834

function soldTotal(c: GradingCard): number {
  return (c.soldPrices || []).reduce((s, p) => s + p, 0);
}

function calcActualRevenue(c: GradingCard): number {
  const sold = soldTotal(c);
  const unsoldGraded = c.gradedQty - (c.soldPrices || []).length;
  if (unsoldGraded <= 0) return sold;
  const unsoldRatio = unsoldGraded / c.gradedQty;
  const estimatedUnsold = (c.actual10s * c.psa10Value + c.actual9s * c.psa9Value + c.actualSub9s * c.costPerCard) * unsoldRatio * (1 - EBAY_FEE);
  return sold + estimatedUnsold;
}

function calcActualProfit(c: GradingCard, shippingPerCard: number): number {
  if (c.gradedQty === 0) return 0;
  const revenue = calcActualRevenue(c);
  const investmentPerCard = c.totalInvestment / c.qty;
  return revenue - (investmentPerCard + shippingPerCard) * c.gradedQty;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-bright bg-background/95 px-3 py-2 font-mono text-xs shadow-2xl backdrop-blur">
      <p className="text-text-primary font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

function SalesCell({ card, onAdd, onRemove, onUpdate, isAdmin }: { card: GradingCard; onAdd: (price: number) => void; onRemove: (index: number) => void; onUpdate: (index: number, newPrice: number) => void; isAdmin: boolean }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [promoDraft, setPromoDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  if (card.gradedQty === 0) return <span className="text-text-secondary text-xs">—</span>;

  const total = soldTotal(card);

  const commitSale = () => {
    const salePrice = parseFloat(draft);
    const promo = parseFloat(promoDraft) || 0;
    if (!isNaN(salePrice) && salePrice > 0) {
      const totalFeeRate = EBAY_FEE + promo / 100;
      onAdd(+(salePrice * (1 - totalFeeRate) - SHIPPING_COST_PER_SALE).toFixed(2));
    }
    setDraft('');
    setPromoDraft('');
    setAdding(false);
  };

  const commitEdit = () => {
    if (editingIndex === null) return;
    const newPrice = parseFloat(editDraft);
    if (!isNaN(newPrice)) {
      onUpdate(editingIndex, +newPrice.toFixed(2));
    }
    setEditingIndex(null);
    setEditDraft('');
  };

  return (
    <div className="flex flex-col gap-0.5">
      {card.soldPrices.map((price, i) => (
        <div key={i} className="flex items-center gap-1 text-xs">
          {editingIndex === i ? (
            <input
              ref={editRef}
              type="text"
              inputMode="decimal"
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') { setEditingIndex(null); setEditDraft(''); }
              }}
              onBlur={commitEdit}
              className="w-16 bg-background border border-accent rounded px-1.5 py-0.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
            />
          ) : (
            <span
              className={`text-profit ${isAdmin ? 'cursor-pointer hover:underline' : ''}`}
              onClick={() => {
                if (!isAdmin) return;
                setEditingIndex(i);
                setEditDraft(String(price));
                setTimeout(() => editRef.current?.focus(), 0);
              }}
            >
              {formatCurrency(price)}
            </span>
          )}
          {isAdmin && editingIndex !== i && (
            <button onClick={() => onRemove(i)} className="text-loss/40 hover:text-loss transition-colors">
              <X size={10} />
            </button>
          )}
        </div>
      ))}
      {card.soldPrices.length > 0 && (
        <div className="text-xs text-text-secondary border-t border-border pt-0.5">
          {card.soldPrices.length}/{card.gradedQty} sold · {formatCurrency(total)}
        </div>
      )}
      {card.soldPrices.length === 0 && !adding && (
        <span className="text-text-secondary text-xs">0/{card.gradedQty} sold</span>
      )}
      {isAdmin && !adding && card.soldPrices.length < card.gradedQty && (
        <button
          onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          className="flex items-center gap-0.5 text-xs text-accent hover:text-accent-light transition-colors"
        >
          <Plus size={10} /> sale
        </button>
      )}
      {adding && (
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            placeholder="Sale $"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSale();
              if (e.key === 'Escape') { setDraft(''); setPromoDraft(''); setAdding(false); }
            }}
            className="w-16 bg-background border border-accent rounded px-1.5 py-0.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Promo %"
            value={promoDraft}
            onChange={(e) => setPromoDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitSale();
              if (e.key === 'Escape') { setDraft(''); setPromoDraft(''); setAdding(false); }
            }}
            onBlur={commitSale}
            className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}
    </div>
  );
}

const SUB1_MAP: Record<number, number> = {
  1: 4, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1,
  9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1,
};
// Sub 2 originally had Shanks (id 24) and 3x McDonalds Pikachu (id 2) — both
// moved to keepers in singles. Their grading cost still counts via keeperCost
// added to totals.invested. McDonalds dropped from 3 → 2 (1 kept); Shanks removed.
const SUB2_MAP: Record<number, number> = {
  1: 4, 2: 2, 3: 1, 4: 2, 5: 1, 6: 1, 7: 1,
  21: 1, 22: 1, 23: 1, 25: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1,
};
// id 31 split: 10 sellable + 1 keeper (id 36). id 34 (Naruto) is a whole keeper.
// Keepers stay in the map so their grading cost still counts toward Sub 3.
const SUB3_MAP: Record<number, number> = { 31: 10, 36: 1, 32: 1, 33: 10, 34: 1 };
const SUB3_SHIPPING = 0; // TBD — not yet invoiced

// Sub 4 — Submission #14972306 (Value Bulk, submitted 5/28/26)
const SUB4_MAP: Record<number, number> = {
  37: 20, 38: 1, 39: 1, 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 45: 1, 46: 6,
  47: 1, 48: 1, 49: 1, 50: 1, 51: 1, 52: 1, 53: 7, 54: 1, 55: 1, 56: 1,
};
const SUB4_SHIPPING = 112.07; // $19.99 inbound label + $20 Cabrella coverage + $72.08 insured return

// Sub 5 — Chinese Pokemon submission; $70/card grading
const SUB5_MAP: Record<number, number> = { 57: 1, 58: 5, 59: 1, 60: 1, 61: 3, 62: 3, 63: 7, 65: 3, 66: 2 };
const SUB5_SHIPPING = 0; // TBD

export default function GradingPage() {
  const { gradingPortfolio, updateGradingCard, addGradingCard, deleteGradingCard, addSale, removeSale, updateSale } = usePortfolio();
  const isAdmin = useAdmin();
  const CATEGORIES = ['Pokemon', 'One Piece', 'MTG', 'Naruto'];
  const [openSim, setOpenSim] = useState<number | null>(null);

  // Sellable cards = cards actually for sale (keepers are tracked here for cost but not for revenue/display)
  const sellableCards = useMemo(() => gradingPortfolio.filter((c) => !c.isKeeper), [gradingPortfolio]);
  const keeperCost = useMemo(
    () => gradingPortfolio.filter((c) => c.isKeeper).reduce((s, c) => s + c.totalInvestment, 0),
    [gradingPortfolio],
  );

  const totalGradedCards = sellableCards.reduce((s, card) => s + card.gradedQty, 0);
  const totalShipping = SUB1_SHIPPING + SUB2_SHIPPING + SUB3_SHIPPING + SUB4_SHIPPING + SUB5_SHIPPING;
  const shippingPerCard = totalGradedCards > 0 ? totalShipping / totalGradedCards : 0;

  const columns: ColumnDef<GradingCard, any>[] = useMemo(() => {
    const cols: ColumnDef<GradingCard, any>[] = [
      {
        accessorKey: 'name',
        header: 'Card',
        footer: () => <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Totals</span>,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <EditableCell
              value={row.original.name}
              onSave={(v) => updateGradingCard(row.original.id, 'name', v)}
              type="text"
              inputWidth="w-40"
              className="font-body text-text-primary font-medium text-sm"
            />
            <div className="flex items-center gap-2">
              <EditableSelect
                value={row.original.category}
                options={CATEGORIES}
                onSave={(v) => updateGradingCard(row.original.id, 'category', v)}
              />
              {row.original.gradedQty > 0 && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                  row.original.gradedQty >= row.original.qty
                    ? 'bg-profit/15 text-profit'
                    : 'bg-accent/15 text-accent-light'
                }`}>
                  {row.original.gradedQty >= row.original.qty ? <CheckCircle size={10} /> : <Clock size={10} />}
                  {row.original.gradedQty}/{row.original.qty}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.qty}
            onSave={(v) => updateGradingCard(row.original.id, 'qty', v)}
          />
        ),
        footer: ({ table }) => table.getFilteredRowModel().rows.reduce((s, r) => s + r.original.qty, 0),
      },
      {
        accessorKey: 'costPerCard',
        header: 'Cost/Card',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.costPerCard}
            onSave={(v) => updateGradingCard(row.original.id, 'costPerCard', v)}
            format={formatCurrency}
          />
        ),
      },
      {
        accessorKey: 'totalInvestment',
        header: 'Investment',
        cell: ({ getValue }) => formatCurrency(getValue()),
        footer: ({ table }) => formatCurrency(table.getFilteredRowModel().rows.reduce((s, r) => s + r.original.totalInvestment, 0)),
      },
      {
        accessorKey: 'psa10Value',
        header: 'PSA 10 Val',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.psa10Value}
            onSave={(v) => updateGradingCard(row.original.id, 'psa10Value', v)}
            format={formatCurrency}
          />
        ),
      },
      {
        accessorKey: 'psa9Value',
        header: 'PSA 9 Val',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.psa9Value}
            onSave={(v) => updateGradingCard(row.original.id, 'psa9Value', v)}
            format={formatCurrency}
          />
        ),
      },
      {
        accessorKey: 'psa10Rate',
        header: '10 Rate',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.psa10Rate}
            onSave={(v) => updateGradingCard(row.original.id, 'psa10Rate', v)}
            format={(v: number) => formatPercent(v * 100)}
          />
        ),
      },
      {
        id: 'actualGrades',
        header: 'Actual Grades',
        cell: ({ row }) => {
          const c = row.original;
          if (c.gradedQty === 0) return <span className="text-text-secondary text-xs">Pending</span>;
          return (
            <div className="flex gap-1.5">
              {c.actual10s > 0 && <span className="text-profit text-xs font-medium">{c.actual10s}× 10</span>}
              {c.actual9s > 0 && <span className="text-accent-light text-xs font-medium">{c.actual9s}× 9</span>}
              {c.actualSub9s > 0 && <span className="text-loss text-xs font-medium">{c.actualSub9s}× sub-9</span>}
            </div>
          );
        },
      },
      {
        id: 'sold',
        header: 'Sold',
        cell: ({ row }) => (
          <SalesCell
            card={row.original}
            onAdd={(price) => addSale(row.original.id, price)}
            onRemove={(index) => removeSale(row.original.id, index)}
            onUpdate={(index, newPrice) => updateSale(row.original.id, index, newPrice)}
            isAdmin={isAdmin}
          />
        ),
        sortingFn: (a, b) => soldTotal(a.original) - soldTotal(b.original),
        footer: ({ table }) => {
          const rows = table.getFilteredRowModel().rows;
          const count = rows.reduce((s, r) => s + (r.original.soldPrices || []).length, 0);
          return `${count} · ${formatCurrency(rows.reduce((s, r) => s + soldTotal(r.original), 0))}`;
        },
      },
      {
        id: 'actualPL',
        header: 'Actual P/L',
        cell: ({ row }) => {
          const c = row.original;
          if (c.gradedQty === 0) return <span className="text-text-secondary text-xs">Pending</span>;
          const pl = calcActualProfit(c, shippingPerCard);
          const label = pl > 5 ? 'Profit' : pl < -5 ? 'Loss' : 'Break-even';
          const color = pl > 5 ? 'text-profit' : pl < -5 ? 'text-loss' : 'text-accent-light';
          const bgColor = pl > 5 ? 'bg-profit/10' : pl < -5 ? 'bg-loss/10' : 'bg-accent/10';
          return (
            <div className="flex flex-col gap-0.5">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${color} ${bgColor}`}>
                {label}
              </span>
              <span className={`text-xs ${color}`}>{formatCurrency(pl)}</span>
            </div>
          );
        },
        sortingFn: (a, b) => calcActualProfit(a.original, shippingPerCard) - calcActualProfit(b.original, shippingPerCard),
        footer: ({ table }) => {
          const total = table.getFilteredRowModel().rows.reduce((s, r) => s + calcActualProfit(r.original, shippingPerCard), 0);
          return <span className={total >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(total)}</span>;
        },
      },
      {
        accessorKey: 'profit',
        header: 'Exp. Profit',
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return <span className={v >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(v)}</span>;
        },
        footer: ({ table }) => {
          const total = table.getFilteredRowModel().rows.reduce((s, r) => s + r.original.profit, 0);
          return <span className={total >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(total)}</span>;
        },
      },
      {
        accessorKey: 'roi',
        header: 'Exp. ROI',
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return <span className={v >= 0 ? 'text-profit' : 'text-loss'}>{formatPercent(v)}</span>;
        },
      },
    ];
    if (isAdmin) {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={() => { if (confirm('Delete this card?')) deleteGradingCard(row.original.id); }}
            className="text-loss/50 hover:text-loss text-xs transition-colors"
            title="Delete"
          >✕</button>
        ),
      });
    }
    return cols;
  }, [updateGradingCard, deleteGradingCard, addSale, removeSale, updateSale, shippingPerCard, isAdmin]);
  const totals = useMemo(() => {
    const totalCards = sellableCards.reduce((s, c) => s + c.qty, 0);
    const sellableInvested = sellableCards.reduce((s, c) => s + c.totalInvestment, 0);
    const invested = sellableInvested + keeperCost; // keeper grading cost still counts

    // Blended profit: actual results for graded cards + expected for ungraded (sellable only)
    const blendedRevenue = sellableCards.reduce((s, c) => {
      const actualRev = calcActualRevenue(c); // revenue from graded cards
      const remainingQty = c.qty - c.gradedQty;
      const expectedRevPerCard = c.netRevenue / c.qty;
      return s + actualRev + remainingQty * expectedRevPerCard;
    }, 0);
    const blendedProfit = blendedRevenue - invested - SUB1_SHIPPING - SUB2_SHIPPING - SUB3_SHIPPING - SUB4_SHIPPING - SUB5_SHIPPING;

    // Original expected (no actuals)
    const expectedProfit = sellableCards.reduce((s, c) => s + c.profit, 0) - keeperCost;

    // Breakdown by submission
    // Attribute sales to earliest sub first: Sub 1 fills before Sub 2
    const calcActualSubStats = (subMap: Record<number, number>, priorSubMap: Record<number, number> | null, shippingCost: number) => {
      let subInvested = 0;
      let subRevenue = 0;
      let soldCount = 0;
      let soldRevenue = 0;
      let soldInvestment = 0;
      const cards = Object.values(subMap).reduce((s, v) => s + v, 0);
      gradingPortfolio.forEach((c) => {
        const subQty = subMap[c.id];
        if (!subQty) return;
        const investPerCard = c.totalInvestment / c.qty;
        subInvested += investPerCard * subQty;
        if (c.isKeeper) return; // keeper cost counts toward the sub, but no sale revenue
        if (c.gradedQty > 0) {
          const revPerGraded = calcActualRevenue(c) / c.gradedQty;
          subRevenue += revPerGraded * subQty;
          // Attribute sales: prior subs get first claim
          const sales = c.soldPrices || [];
          const priorClaim = priorSubMap ? (priorSubMap[c.id] || 0) : 0;
          const salesAfterPrior = Math.max(0, sales.length - priorClaim);
          const subSoldCount = Math.min(salesAfterPrior, subQty);
          soldCount += subSoldCount;
          // Take the actual sale prices attributed to this sub
          const startIdx = priorClaim;
          const subSales = sales.slice(startIdx, startIdx + subSoldCount);
          soldRevenue += subSales.reduce((s, p) => s + p, 0);
          soldInvestment += investPerCard * subSoldCount;
        } else {
          // Not yet graded — fall back to expected revenue from market values × rates
          const revPerCard = c.qty > 0 ? c.netRevenue / c.qty : 0;
          subRevenue += revPerCard * subQty;
        }
      });
      const soldShipping = cards > 0 ? shippingCost * (soldCount / cards) : 0;
      const soldProfit = soldRevenue - soldInvestment - soldShipping;
      const currentPL = soldRevenue - subInvested - shippingCost;
      return { invested: subInvested, profit: subRevenue - subInvested - shippingCost, cards, soldCount, soldProfit, soldRevenue, currentPL };
    };

    const sub1 = calcActualSubStats(SUB1_MAP, null, SUB1_SHIPPING);
    const sub2 = calcActualSubStats(SUB2_MAP, SUB1_MAP, SUB2_SHIPPING);
    const sub3 = calcActualSubStats(SUB3_MAP, null, SUB3_SHIPPING);
    const sub4 = calcActualSubStats(SUB4_MAP, null, SUB4_SHIPPING);
    const sub5 = calcActualSubStats(SUB5_MAP, null, SUB5_SHIPPING);

    const totalSoldRevenue = sellableCards.reduce((s, c) => s + (c.soldPrices || []).reduce((a, p) => a + p, 0), 0);
    const totalSoldCount = sellableCards.reduce((s, c) => s + (c.soldPrices || []).length, 0);
    // Received = Sub 1, 2, 3 (Sub 4 is still in transit/grading)
    const receivedInvested = sub1.invested + sub2.invested + sub3.invested;
    const currentPL = totalSoldRevenue - receivedInvested - SUB1_SHIPPING - SUB2_SHIPPING - SUB3_SHIPPING;

    return {
      totalCards, invested, blendedProfit, expectedProfit, roi: (blendedProfit / invested) * 100,
      sub1, sub2, sub3, sub4, sub5, currentPL, totalSoldRevenue, totalSoldCount,
    };
  }, [sellableCards, keeperCost]);

  const actualStats = useMemo(() => {
    const graded = sellableCards.filter((c) => c.gradedQty > 0);
    const totalGraded = graded.reduce((s, c) => s + c.gradedQty, 0);
    const total10s = graded.reduce((s, c) => s + c.actual10s, 0);
    const total9s = graded.reduce((s, c) => s + c.actual9s, 0);
    const totalSub9s = graded.reduce((s, c) => s + c.actualSub9s, 0);
    const actualRevenue = graded.reduce((s, c) => s + calcActualRevenue(c), 0);
    // Investment proportional to graded cards
    const gradedInvestment = graded.reduce((s, c) => {
      const perCard = c.totalInvestment / c.qty;
      return s + perCard * c.gradedQty;
    }, 0);
    const totalWithShipping = gradedInvestment + SUB1_SHIPPING + SUB2_SHIPPING + SUB3_SHIPPING + SUB4_SHIPPING + SUB5_SHIPPING + keeperCost;
    const actualProfit = actualRevenue - totalWithShipping;
    return { totalGraded, total10s, total9s, totalSub9s, actualRevenue, gradedInvestment, totalWithShipping, actualProfit };
  }, [sellableCards, keeperCost]);

  const roiDistribution = useMemo(() => {
    const ranges = [
      { range: '0-50%', min: 0, max: 50, count: 0 },
      { range: '50-100%', min: 50, max: 100, count: 0 },
      { range: '100-200%', min: 100, max: 200, count: 0 },
      { range: '200-400%', min: 200, max: 400, count: 0 },
      { range: '400%+', min: 400, max: Infinity, count: 0 },
    ];
    sellableCards.forEach((c) => {
      const r = ranges.find((r) => c.roi >= r.min && c.roi < r.max);
      if (r) r.count++;
    });
    return ranges;
  }, [sellableCards]);

  const gradeDistribution = useMemo(() => {
    return sellableCards
      .filter((c) => c.qty >= 2)
      .map((c) => ({
        name: c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name,
        'PSA 10': c.expected10s,
        'PSA 9': c.expected9s,
        'Sub-9': c.expectedSub9s,
      }));
  }, [sellableCards]);

  const categoryProfit = useMemo(() => {
    const map: Record<string, number> = {};
    sellableCards.forEach((c) => {
      map[c.category] = (map[c.category] || 0) + c.profit;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [sellableCards]);

  const categories = [...new Set(sellableCards.map((c) => c.category))];

  const psa10Rate = actualStats.totalGraded > 0
    ? (actualStats.total10s / actualStats.totalGraded * 100)
    : 0;

  return (
    <div>
      <div className="mb-10 rise">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          <span className="twinkle mr-1">✦</span>The Gem Hunt · PSA Submissions
        </div>
        <h2 className="font-display text-5xl font-medium tracking-tight text-text-primary">
          PSA <span className="holo-text italic">Grading</span>
          <img src={FLAIR_HERO.charizard} alt="Charizard" title="Psst — hover me" onMouseEnter={() => triggerFlyBy('Pokemon')} className="floaty ml-5 inline-block h-14 w-14 cursor-pointer object-contain align-middle drop-shadow-[0_0_14px_rgba(239,68,68,0.45)]" />
        </h2>
        <p className="text-text-secondary text-sm mt-2">{sellableCards.length} card types, {totals.totalCards} total cards submitted</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 rise rise-1">
        <StatCard
          title="Total Cards"
          value={String(totals.totalCards)}
          icon={CreditCard}
          info="Total sellable cards across all five PSA submissions (keepers excluded)."
        />
        <StatCard
          title="Total Invested"
          value={formatCurrency(totals.invested)}
          icon={DollarSign}
          info="Card costs plus grading fees for every submission, including grading fees on keeper cards."
        />
        <StatCard
          title="Current P/L"
          value={formatCurrency(totals.currentPL)}
          subtitle={`All subs · ${totals.totalSoldCount} sold · ${formatCurrency(totals.totalSoldRevenue)} revenue`}
          icon={DollarSign}
          trend={totals.currentPL >= 0 ? 'up' : 'down'}
          info="Cash position right now: actual sale revenue minus everything spent on the received submissions (1–3) including shipping. Goes up as more cards sell."
        />
        <StatCard
          title="Blended Profit"
          value={formatCurrency(totals.blendedProfit)}
          subtitle={`Originally expected: ${formatCurrency(totals.expectedProfit)}`}
          icon={TrendingUp}
          trend="up"
          info="Best estimate of where this ends up: actual results for returned cards plus expected value for cards still at PSA, minus all costs and shipping."
        />
        <StatCard
          title="Portfolio ROI"
          value={formatPercent(totals.roi)}
          icon={Target}
          trend="up"
          info="Blended profit divided by total invested."
        />
      </div>

      {/* Profit by Submission */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 rise rise-2">
        {[
          { key: 1, title: 'Sub 1', data: totals.sub1, badge: 'Graded', badgeClass: 'border-profit/30 bg-profit/10 text-profit', desc: '', solid: true },
          { key: 2, title: 'Sub 2', data: totals.sub2, badge: 'Graded', badgeClass: 'border-profit/30 bg-profit/10 text-profit', desc: 'Pokemon', solid: true },
          { key: 3, title: 'Sub 3', data: totals.sub3, badge: 'Graded', badgeClass: 'border-profit/30 bg-profit/10 text-profit', desc: 'One Piece / Naruto', solid: true },
          { key: 4, title: 'Sub 4', data: totals.sub4, badge: 'Submitted', badgeClass: 'pulse-soft border-accent/30 bg-accent/10 text-accent-light', desc: 'Mixed', solid: false },
          { key: 5, title: 'Sub 5', data: totals.sub5, badge: 'Submitted', badgeClass: 'pulse-soft border-accent/30 bg-accent/10 text-accent-light', desc: 'Chinese Pokemon', solid: false },
        ].map((sub) => {
          // If nothing has sold yet, show projected profit from market values.
          // Once sales start coming in, switch to realized P/L.
          const hasSales = sub.data.soldCount > 0;
          const pl = hasSales ? sub.data.currentPL : sub.data.profit;
          const roi = sub.data.invested > 0 ? (pl / sub.data.invested) * 100 : 0;
          return (
            <div
              key={sub.key}
              onClick={() => setOpenSim(openSim === sub.key ? null : sub.key)}
              className={`panel panel-hover p-5 cursor-pointer ${
                sub.solid ? '' : 'border-dashed'
              } ${openSim === sub.key ? 'ring-1 ring-accent/70 border-accent/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-primary">{sub.title}</h3>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${sub.badgeClass}`}>{sub.badge}</span>
              </div>
              <p className="font-mono text-[10px] text-text-secondary mb-3">
                {sub.data.cards} cards{sub.desc ? ` · ${sub.desc}` : ''} · {formatCurrency(sub.data.invested)} invested
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-2xl font-medium tracking-tight tabular-nums ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(pl)}
                </span>
                <span className={`font-mono text-xs ${pl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatPercent(roi)} ROI
                </span>
              </div>
              <p className="font-mono text-[10px] text-text-secondary mt-1.5">
                {hasSales
                  ? `${sub.data.soldCount}/${sub.data.cards} sold · ${formatCurrency(sub.data.soldRevenue)} revenue`
                  : `projected · 0/${sub.data.cards} sold`}
                {' · '}
                <span className="text-accent">simulate</span>
              </p>
            </div>
          );
        })}
      </div>

      {openSim === 1 && (
        <SubmissionDetail
          title="Sub 1 — Order 26141760"
          cards={sellableCards
            .filter((c) => SUB1_MAP[c.id])
            .map((c) => ({ card: c, subQty: SUB1_MAP[c.id] }))}
          shippingCost={SUB1_SHIPPING}
          onClose={() => setOpenSim(null)}
          onAddSale={addSale}
          onRemoveSale={removeSale}
          onUpdateSale={updateSale}
          onUpdateCard={updateGradingCard}
        />
      )}
      {openSim === 2 && (
        <SubmissionDetail
          title="Sub 2 — Order 26141834"
          cards={sellableCards
            .filter((c) => SUB2_MAP[c.id])
            .map((c) => ({ card: c, subQty: SUB2_MAP[c.id] }))}
          shippingCost={SUB2_SHIPPING}
          onClose={() => setOpenSim(null)}
          onAddSale={addSale}
          onRemoveSale={removeSale}
          onUpdateSale={updateSale}
          onUpdateCard={updateGradingCard}
        />
      )}
      {openSim === 3 && (
        <SubmissionDetail
          title="Sub 3 — Order 26541215"
          cards={sellableCards
            .filter((c) => SUB3_MAP[c.id])
            .map((c) => ({ card: c, subQty: SUB3_MAP[c.id] }))}
          shippingCost={SUB3_SHIPPING}
          onClose={() => setOpenSim(null)}
          onAddSale={addSale}
          onRemoveSale={removeSale}
          onUpdateSale={updateSale}
          onUpdateCard={updateGradingCard}
        />
      )}
      {openSim === 4 && (
        <SubmissionDetail
          title="Sub 4 — Submission #14972306"
          cards={sellableCards
            .filter((c) => SUB4_MAP[c.id])
            .map((c) => ({ card: c, subQty: SUB4_MAP[c.id] }))}
          shippingCost={SUB4_SHIPPING}
          onClose={() => setOpenSim(null)}
          onAddSale={addSale}
          onRemoveSale={removeSale}
          onUpdateSale={updateSale}
          onUpdateCard={updateGradingCard}
          defaultMode="pricing"
        />
      )}
      {openSim === 5 && (
        <SubmissionDetail
          title="Sub 5 — Chinese Pokemon"
          cards={sellableCards
            .filter((c) => SUB5_MAP[c.id])
            .map((c) => ({ card: c, subQty: SUB5_MAP[c.id] }))}
          shippingCost={SUB5_SHIPPING}
          onClose={() => setOpenSim(null)}
          onAddSale={addSale}
          onRemoveSale={removeSale}
          onUpdateSale={updateSale}
          onUpdateCard={updateGradingCard}
          defaultMode="pricing"
        />
      )}

      {/* Actual Results Banner */}
      {actualStats.totalGraded > 0 && (
        <div className="panel gold-hairline p-5 mb-8 rise rise-3">
          <Peeker src={FLAIR_HERO.mewtwo} category="Pokemon" className="right-12" size={44} alt="Mewtwo peeking" />
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle size={16} className="text-profit" />
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-primary">
              Grading Results — {actualStats.totalGraded} of {totals.totalCards} Cards Returned
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">PSA 10s</div>
              <div className="font-display text-xl font-medium tabular-nums text-profit">{actualStats.total10s}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">PSA 9s</div>
              <div className="font-display text-xl font-medium tabular-nums text-accent-light">{actualStats.total9s}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">Sub-9s</div>
              <div className="font-display text-xl font-medium tabular-nums text-loss">{actualStats.totalSub9s}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">PSA 10 Rate</div>
              <div className="font-display text-xl font-medium tabular-nums text-text-primary">{formatPercent(psa10Rate)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">Actual Revenue</div>
              <div className="font-display text-xl font-medium tabular-nums text-text-primary">{formatCurrency(actualStats.actualRevenue)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">Shipping Fees</div>
              <div className="font-display text-xl font-medium tabular-nums text-loss">{formatCurrency(SUB1_SHIPPING + SUB2_SHIPPING)}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">Actual Profit</div>
              <div className={`font-display text-xl font-medium tabular-nums ${actualStats.actualProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(actualStats.actualProfit)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 rise rise-4">
        <ChartCard title="ROI Distribution" subtitle="Cards by ROI range">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roiDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222940" />
              <XAxis dataKey="range" tick={{ fill: '#8d96b2', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8d96b2', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Cards" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expected Grade Split" subtitle="Multi-copy submissions">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gradeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222940" />
              <XAxis dataKey="name" tick={{ fill: '#8d96b2', fontSize: 10 }} />
              <YAxis tick={{ fill: '#8d96b2', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="PSA 10" stackId="a" fill="#34d399" />
              <Bar dataKey="PSA 9" stackId="a" fill="#38bdf8" />
              <Bar dataKey="Sub-9" stackId="a" fill="#fb7185" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Profit by Category">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryProfit}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                strokeWidth={0}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {categoryProfit.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[0]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="panel p-5 rise rise-5">
        <Peeker src={FLAIR_HERO.pikachu} category="Pokemon" className="left-12" size={38} alt="Pikachu peeking" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-primary">All Grading Submissions</h3>
          {isAdmin && (
            <button
              onClick={addGradingCard}
              className="rounded-lg bg-gradient-to-r from-accent to-holo px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-background transition-all hover:brightness-125 hover:shadow-[0_0_16px_-2px_rgba(56,189,248,0.6)]"
            >
              + Add Card
            </button>
          )}
        </div>
        <DataTable data={sellableCards} columns={columns} categories={categories} csvName="grading-portfolio" />
      </div>
    </div>
  );
}
