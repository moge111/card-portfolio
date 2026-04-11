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
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-text-primary font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

function SalesCell({ card, onAdd, onRemove, isAdmin }: { card: GradingCard; onAdd: (price: number) => void; onRemove: (index: number) => void; isAdmin: boolean }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [promoDraft, setPromoDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex flex-col gap-0.5">
      {card.soldPrices.map((price, i) => (
        <div key={i} className="flex items-center gap-1 text-xs">
          <span className="text-profit">{formatCurrency(price)}</span>
          {isAdmin && (
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
const SUB2_MAP: Record<number, number> = {
  1: 4, 2: 3, 3: 1, 4: 2, 5: 1, 6: 1, 7: 1,
  21: 1, 22: 1, 23: 1, 24: 1, 25: 1, 26: 1, 27: 1, 28: 1, 29: 1, 30: 1,
};
const SUB3_IDS = new Set([31, 32, 33, 34]);

export default function GradingPage() {
  const { gradingPortfolio, updateGradingCard, addGradingCard, deleteGradingCard, addSale, removeSale } = usePortfolio();
  const isAdmin = useAdmin();
  const CATEGORIES = ['Pokemon', 'One Piece', 'MTG', 'Naruto'];
  const [openSim, setOpenSim] = useState<number | null>(null);

  const totalGradedCards = gradingPortfolio.reduce((s, card) => s + card.gradedQty, 0);
  const totalShipping = SUB1_SHIPPING + SUB2_SHIPPING;
  const shippingPerCard = totalGradedCards > 0 ? totalShipping / totalGradedCards : 0;

  const columns: ColumnDef<GradingCard, any>[] = useMemo(() => {
    const cols: ColumnDef<GradingCard, any>[] = [
      {
        accessorKey: 'name',
        header: 'Card',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <EditableCell
              value={row.original.name}
              onSave={(v) => updateGradingCard(row.original.id, 'name', v)}
              type="text"
              inputWidth="w-40"
              className="text-text-primary font-medium text-sm"
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
            isAdmin={isAdmin}
          />
        ),
        sortingFn: (a, b) => soldTotal(a.original) - soldTotal(b.original),
      },
      {
        id: 'actualPL',
        header: 'Actual P/L',
        cell: ({ row }) => {
          const c = row.original;
          if (c.gradedQty === 0) return <span className="text-text-secondary text-xs">Pending</span>;
          const pl = calcActualProfit(c, shippingPerCard);
          const label = pl > 5 ? 'Profit' : pl < -5 ? 'Loss' : 'Break-even';
          const color = pl > 5 ? 'text-profit' : pl < -5 ? 'text-loss' : 'text-yellow-400';
          const bgColor = pl > 5 ? 'bg-profit/10' : pl < -5 ? 'bg-loss/10' : 'bg-yellow-400/10';
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
      },
      {
        accessorKey: 'profit',
        header: 'Exp. Profit',
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return <span className={v >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(v)}</span>;
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
  }, [updateGradingCard, deleteGradingCard, addSale, removeSale, shippingPerCard, isAdmin]);
  const totals = useMemo(() => {
    const totalCards = gradingPortfolio.reduce((s, c) => s + c.qty, 0);
    const invested = gradingPortfolio.reduce((s, c) => s + c.totalInvestment, 0);

    // Blended profit: actual results for graded cards + expected for ungraded
    const blendedRevenue = gradingPortfolio.reduce((s, c) => {
      const actualRev = calcActualRevenue(c); // revenue from graded cards
      const remainingQty = c.qty - c.gradedQty;
      const expectedRevPerCard = c.netRevenue / c.qty;
      return s + actualRev + remainingQty * expectedRevPerCard;
    }, 0);
    const blendedProfit = blendedRevenue - invested - SUB1_SHIPPING - SUB2_SHIPPING;

    // Original expected (no actuals)
    const expectedProfit = gradingPortfolio.reduce((s, c) => s + c.profit, 0);

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
        }
      });
      const soldShipping = cards > 0 ? shippingCost * (soldCount / cards) : 0;
      const soldProfit = soldRevenue - soldInvestment - soldShipping;
      const currentPL = soldRevenue - subInvested - shippingCost;
      return { invested: subInvested, profit: subRevenue - subInvested - shippingCost, cards, soldCount, soldProfit, soldRevenue, currentPL };
    };

    const calcExpectedSubStats = (getQty: (c: GradingCard) => number) => {
      let subInvested = 0;
      let subRevenue = 0;
      gradingPortfolio.forEach((c) => {
        const qty = getQty(c);
        if (qty <= 0) return;
        const investPerCard = c.totalInvestment / c.qty;
        const revPerCard = c.netRevenue / c.qty;
        subInvested += investPerCard * qty;
        subRevenue += revPerCard * qty;
      });
      return { invested: subInvested, profit: subRevenue - subInvested };
    };

    const sub1 = calcActualSubStats(SUB1_MAP, null, SUB1_SHIPPING);
    const sub2 = calcActualSubStats(SUB2_MAP, SUB1_MAP, SUB2_SHIPPING);

    // Sub 3: expected for these cards
    const sub3Raw = calcExpectedSubStats((c) => SUB3_IDS.has(c.id) ? c.qty : 0);
    const sub3 = { ...sub3Raw, cards: 23, soldCount: 0, soldProfit: 0, soldRevenue: 0, currentPL: -sub3Raw.invested };

    const totalSoldRevenue = gradingPortfolio.reduce((s, c) => s + (c.soldPrices || []).reduce((a, p) => a + p, 0), 0);
    const totalSoldCount = gradingPortfolio.reduce((s, c) => s + (c.soldPrices || []).length, 0);
    const receivedInvested = sub1.invested + sub2.invested;
    const currentPL = totalSoldRevenue - receivedInvested - SUB1_SHIPPING - SUB2_SHIPPING;

    return {
      totalCards, invested, blendedProfit, expectedProfit, roi: (blendedProfit / invested) * 100,
      sub1, sub2, sub3, currentPL, totalSoldRevenue, totalSoldCount,
    };
  }, [gradingPortfolio]);

  const actualStats = useMemo(() => {
    const graded = gradingPortfolio.filter((c) => c.gradedQty > 0);
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
    const totalWithShipping = gradedInvestment + SUB1_SHIPPING + SUB2_SHIPPING;
    const actualProfit = actualRevenue - totalWithShipping;
    return { totalGraded, total10s, total9s, totalSub9s, actualRevenue, gradedInvestment, totalWithShipping, actualProfit };
  }, [gradingPortfolio]);

  const roiDistribution = useMemo(() => {
    const ranges = [
      { range: '0-50%', min: 0, max: 50, count: 0 },
      { range: '50-100%', min: 50, max: 100, count: 0 },
      { range: '100-200%', min: 100, max: 200, count: 0 },
      { range: '200-400%', min: 200, max: 400, count: 0 },
      { range: '400%+', min: 400, max: Infinity, count: 0 },
    ];
    gradingPortfolio.forEach((c) => {
      const r = ranges.find((r) => c.roi >= r.min && c.roi < r.max);
      if (r) r.count++;
    });
    return ranges;
  }, [gradingPortfolio]);

  const gradeDistribution = useMemo(() => {
    return gradingPortfolio
      .filter((c) => c.qty >= 2)
      .map((c) => ({
        name: c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name,
        'PSA 10': c.expected10s,
        'PSA 9': c.expected9s,
        'Sub-9': c.expectedSub9s,
      }));
  }, [gradingPortfolio]);

  const categoryProfit = useMemo(() => {
    const map: Record<string, number> = {};
    gradingPortfolio.forEach((c) => {
      map[c.category] = (map[c.category] || 0) + c.profit;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [gradingPortfolio]);

  const categories = [...new Set(gradingPortfolio.map((c) => c.category))];

  const psa10Rate = actualStats.totalGraded > 0
    ? (actualStats.total10s / actualStats.totalGraded * 100)
    : 0;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">PSA Grading Portfolio</h2>
        <p className="text-text-secondary text-sm mt-1">34 card types, {totals.totalCards} total cards submitted</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Cards" value={String(totals.totalCards)} icon={CreditCard} />
        <StatCard title="Total Invested" value={formatCurrency(totals.invested)} icon={DollarSign} />
        <StatCard
          title="Current P/L"
          value={formatCurrency(totals.currentPL)}
          subtitle={`Sub 1 & 2 only · ${totals.totalSoldCount} sold · ${formatCurrency(totals.totalSoldRevenue)} revenue`}
          icon={DollarSign}
          trend={totals.currentPL >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Blended Profit"
          value={formatCurrency(totals.blendedProfit)}
          subtitle={`Originally expected: ${formatCurrency(totals.expectedProfit)}`}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard title="Portfolio ROI" value={formatPercent(totals.roi)} icon={Target} trend="up" />
      </div>

      {/* Profit by Submission */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { key: 1, title: 'Sub 1', data: totals.sub1, badge: 'Graded', badgeClass: 'bg-profit/10 text-profit', desc: '', label: 'Actual profit', solid: true },
          { key: 2, title: 'Sub 2', data: totals.sub2, badge: 'Graded', badgeClass: 'bg-profit/10 text-profit', desc: 'Pokemon', label: 'Actual profit', solid: true },
          { key: 3, title: 'Sub 3', data: totals.sub3, badge: '~3 months out', badgeClass: 'bg-accent/10 text-accent-light', desc: 'One Piece / Naruto', label: 'Estimated from pop report rates', solid: false },
        ].map((sub) => (
          <div
            key={sub.key}
            onClick={() => setOpenSim(openSim === sub.key ? null : sub.key)}
            className={`bg-surface rounded-xl border p-5 cursor-pointer transition-colors hover:border-accent/50 ${
              sub.solid ? 'border-border' : 'border-border border-dashed'
            } ${openSim === sub.key ? 'ring-1 ring-accent' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-text-primary">{sub.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${sub.badgeClass}`}>{sub.badge}</span>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              {sub.data.cards} cards{sub.desc ? ` · ${sub.desc}` : ''} · {formatCurrency(sub.data.invested)} invested
            </p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${sub.data.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                {sub.solid ? '' : '~'}{formatCurrency(sub.data.profit)}
              </span>
              <span className={`text-sm ${sub.data.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatPercent((sub.data.profit / sub.data.invested) * 100)} ROI
              </span>
            </div>
            {sub.solid && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-text-secondary">Current P/L</span>
                  <span className={`text-sm font-bold ${sub.data.currentPL >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(sub.data.currentPL)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  {sub.data.soldCount}/{sub.data.cards} sold · {formatCurrency(sub.data.soldRevenue)} revenue
                </p>
              </div>
            )}
            <p className="text-xs text-text-secondary mt-1">{sub.label} · <span className="text-accent">click to simulate</span></p>
          </div>
        ))}
      </div>

      {openSim === 1 && (
        <SubmissionDetail
          title="Sub 1 — Order 26141760"
          cards={gradingPortfolio
            .filter((c) => SUB1_MAP[c.id])
            .map((c) => ({ card: c, subQty: SUB1_MAP[c.id] }))}
          shippingCost={SUB1_SHIPPING}
          onClose={() => setOpenSim(null)}
          onAddSale={addSale}
          onRemoveSale={removeSale}
        />
      )}
      {openSim === 2 && (
        <SubmissionDetail
          title="Sub 2 — Order 26141834"
          cards={gradingPortfolio
            .filter((c) => SUB2_MAP[c.id])
            .map((c) => ({ card: c, subQty: SUB2_MAP[c.id] }))}
          shippingCost={SUB2_SHIPPING}
          onClose={() => setOpenSim(null)}
          onAddSale={addSale}
          onRemoveSale={removeSale}
        />
      )}
      {openSim === 3 && (
        <SubmissionDetail
          title="Sub 3 — Order 14231923"
          cards={gradingPortfolio
            .filter((c) => SUB3_IDS.has(c.id))
            .map((c) => ({ card: c, subQty: c.qty }))}
          shippingCost={0}
          onClose={() => setOpenSim(null)}
          onAddSale={addSale}
          onRemoveSale={removeSale}
        />
      )}

      {/* Actual Results Banner */}
      {actualStats.totalGraded > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} className="text-profit" />
            <h3 className="text-sm font-semibold text-text-primary">
              Grading Results — {actualStats.totalGraded} of {totals.totalCards} Cards Returned
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <div className="text-xs text-text-secondary mb-1">PSA 10s</div>
              <div className="text-lg font-bold text-profit">{actualStats.total10s}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">PSA 9s</div>
              <div className="text-lg font-bold text-accent-light">{actualStats.total9s}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">Sub-9s</div>
              <div className="text-lg font-bold text-loss">{actualStats.totalSub9s}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">PSA 10 Rate</div>
              <div className="text-lg font-bold text-text-primary">{formatPercent(psa10Rate)}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">Actual Revenue</div>
              <div className="text-lg font-bold text-text-primary">{formatCurrency(actualStats.actualRevenue)}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">Shipping Fees</div>
              <div className="text-lg font-bold text-loss">{formatCurrency(SUB1_SHIPPING + SUB2_SHIPPING)}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">Actual Profit</div>
              <div className={`text-lg font-bold ${actualStats.actualProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(actualStats.actualProfit)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <ChartCard title="ROI Distribution" subtitle="Cards by ROI range">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roiDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="range" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Cards" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expected Grade Split" subtitle="Multi-copy submissions">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gradeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="PSA 10" stackId="a" fill="#22c55e" />
              <Bar dataKey="PSA 9" stackId="a" fill="#6366f1" />
              <Bar dataKey="Sub-9" stackId="a" fill="#ef4444" />
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

      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">All Grading Submissions</h3>
          {isAdmin && (
            <button
              onClick={addGradingCard}
              className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/80 transition-colors"
            >
              + Add Card
            </button>
          )}
        </div>
        <DataTable data={gradingPortfolio} columns={columns} categories={categories} />
      </div>
    </div>
  );
}
