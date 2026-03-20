import { useMemo } from 'react';
import { CreditCard, DollarSign, TrendingUp, Target, CheckCircle, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { type ColumnDef } from '@tanstack/react-table';
import StatCard from '../shared/StatCard';
import ChartCard from '../shared/ChartCard';
import DataTable from '../shared/DataTable';
import CategoryBadge from '../shared/CategoryBadge';
import { gradingPortfolio } from '../../data';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { CATEGORY_COLORS, CHART_COLORS } from '../../constants/theme';
import type { GradingCard } from '../../types/portfolio';

const EBAY_FEE = 0.1325;
// Shipping costs from PSA orders (receipt totals minus card grading fees)
const PSA_SHIPPING_COSTS = 22.08; // Order 26141760: $522.08 - (25 × $20)

function calcActualRevenue(c: GradingCard): number {
  return (c.actual10s * c.psa10Value + c.actual9s * c.psa9Value + c.actualSub9s * c.costPerCard) * (1 - EBAY_FEE);
}

const totalGradedCards = gradingPortfolio.reduce((s, card) => s + card.gradedQty, 0);
const shippingPerCard = totalGradedCards > 0 ? PSA_SHIPPING_COSTS / totalGradedCards : 0;

function calcActualProfit(c: GradingCard): number {
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

const columns: ColumnDef<GradingCard, any>[] = [
  {
    accessorKey: 'name',
    header: 'Card',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-text-primary font-medium text-sm">{row.original.name}</span>
        <div className="flex items-center gap-2">
          <CategoryBadge category={row.original.category} />
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
  { accessorKey: 'qty', header: 'Qty' },
  {
    accessorKey: 'totalInvestment',
    header: 'Investment',
    cell: ({ getValue }) => formatCurrency(getValue()),
  },
  {
    accessorKey: 'psa10Value',
    header: 'PSA 10 Val',
    cell: ({ getValue }) => formatCurrency(getValue()),
  },
  {
    accessorKey: 'psa10Rate',
    header: '10 Rate',
    cell: ({ getValue }) => formatPercent(getValue() * 100),
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
    id: 'actualPL',
    header: 'Actual P/L',
    cell: ({ row }) => {
      const c = row.original;
      if (c.gradedQty === 0) return <span className="text-text-secondary text-xs">Pending</span>;
      const pl = calcActualProfit(c);
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
    sortingFn: (a, b) => calcActualProfit(a.original) - calcActualProfit(b.original),
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

export default function GradingPage() {
  const totals = useMemo(() => {
    const totalCards = gradingPortfolio.reduce((s, c) => s + c.qty, 0);
    const invested = gradingPortfolio.reduce((s, c) => s + c.totalInvestment, 0);
    const profit = gradingPortfolio.reduce((s, c) => s + c.profit, 0);
    return { totalCards, invested, profit, roi: (profit / invested) * 100 };
  }, []);

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
    const totalWithShipping = gradedInvestment + PSA_SHIPPING_COSTS;
    const actualProfit = actualRevenue - totalWithShipping;
    return { totalGraded, total10s, total9s, totalSub9s, actualRevenue, gradedInvestment, totalWithShipping, actualProfit };
  }, []);

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
  }, []);

  const gradeDistribution = useMemo(() => {
    return gradingPortfolio
      .filter((c) => c.qty >= 2)
      .map((c) => ({
        name: c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name,
        'PSA 10': c.expected10s,
        'PSA 9': c.expected9s,
        'Sub-9': c.expectedSub9s,
      }));
  }, []);

  const categoryProfit = useMemo(() => {
    const map: Record<string, number> = {};
    gradingPortfolio.forEach((c) => {
      map[c.category] = (map[c.category] || 0) + c.profit;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, []);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Cards" value={String(totals.totalCards)} icon={CreditCard} />
        <StatCard title="Total Invested" value={formatCurrency(totals.invested)} icon={DollarSign} />
        <StatCard title="Expected Profit" value={formatCurrency(totals.profit)} icon={TrendingUp} trend="up" />
        <StatCard title="Portfolio ROI" value={formatPercent(totals.roi)} icon={Target} trend="up" />
      </div>

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
              <div className="text-lg font-bold text-loss">{formatCurrency(PSA_SHIPPING_COSTS)}</div>
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
        <h3 className="text-sm font-semibold text-text-primary mb-4">All Grading Submissions</h3>
        <DataTable data={gradingPortfolio} columns={columns} categories={categories} />
      </div>
    </div>
  );
}
