import { useMemo } from 'react';
import { DollarSign, TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import StatCard from '../shared/StatCard';
import ChartCard from '../shared/ChartCard';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { CATEGORY_COLORS, CHART_COLORS } from '../../constants/theme';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-text-primary font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="text-text-secondary">
          {entry.name}: {typeof entry.value === 'number' && entry.value > 1 ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function OverviewPage() {
  const { gradingPortfolio, sealedCollection } = usePortfolio();
  const stats = useMemo(() => {
    const EBAY_FEE = 0.1325;
    const PSA_SHIPPING = 47.33;
    const gradingInvested = gradingPortfolio.reduce((s, c) => s + c.totalInvestment, 0);
    const sealedInvested = sealedCollection.reduce((s, c) => s + c.totalCost, 0);
    const sealedProfit = sealedCollection.reduce((s, c) => s + c.profit, 0);
    const totalInvested = gradingInvested + sealedInvested;

    // Blended grading revenue: sold (actual) + unsold graded (estimated) + ungraded (expected)
    const blendedGradingRevenue = gradingPortfolio.reduce((s, c) => {
      const prices = c.soldPrices || [];
      const sold = prices.reduce((a, p) => a + p, 0);
      const unsoldGraded = c.gradedQty - prices.length;
      const unsoldGradedRev = unsoldGraded > 0 && c.gradedQty > 0
        ? (c.actual10s * c.psa10Value + c.actual9s * c.psa9Value + c.actualSub9s * c.costPerCard) * (unsoldGraded / c.gradedQty) * (1 - EBAY_FEE)
        : 0;
      const remainingQty = c.qty - c.gradedQty;
      const expectedRevPerCard = c.qty > 0 ? c.netRevenue / c.qty : 0;
      return s + sold + unsoldGradedRev + remainingQty * expectedRevPerCard;
    }, 0);
    const gradingProfit = blendedGradingRevenue - gradingInvested - PSA_SHIPPING;

    const totalProfit = gradingProfit + sealedProfit;
    const sealedMarket = sealedCollection.reduce((s, c) => s + c.totalMarketValue, 0);
    const totalValue = blendedGradingRevenue + sealedMarket;

    return { gradingInvested, gradingProfit, sealedInvested, sealedProfit, totalInvested, totalProfit, totalValue };
  }, [gradingPortfolio, sealedCollection]);

  const investmentSplitData = [
    { name: 'PSA Grading', value: stats.gradingInvested },
    { name: 'Sealed', value: stats.sealedInvested },
  ];

  const profitComparisonData = [
    { name: 'PSA Grading', profit: stats.gradingProfit },
    { name: 'Sealed', profit: stats.sealedProfit },
  ];

  const categoryData = useMemo(() => {
    const map: Record<string, { invested: number; profit: number }> = {};
    gradingPortfolio.forEach((c) => {
      if (!map[c.category]) map[c.category] = { invested: 0, profit: 0 };
      map[c.category].invested += c.totalInvestment;
      map[c.category].profit += c.profit;
    });
    sealedCollection.forEach((p) => {
      if (!map[p.category]) map[p.category] = { invested: 0, profit: 0 };
      map[p.category].invested += p.totalCost;
      map[p.category].profit += p.profit;
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      invested: Math.round(data.invested),
      profit: Math.round(data.profit),
      roi: data.invested > 0 ? Math.round((data.profit / data.invested) * 100) : 0,
    })).sort((a, b) => b.invested - a.invested);
  }, [gradingPortfolio, sealedCollection]);

  const top10 = useMemo(() => {
    const all = [
      ...gradingPortfolio.map((c) => ({ name: c.name, profit: c.profit, category: c.category })),
      ...sealedCollection.map((p) => ({ name: p.name, profit: p.profit, category: p.category })),
    ];
    return all.sort((a, b) => b.profit - a.profit).slice(0, 10);
  }, [gradingPortfolio, sealedCollection]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Portfolio Overview</h2>
        <p className="text-text-secondary text-sm mt-1">Combined grading and sealed portfolio performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Value" value={formatCurrency(stats.totalValue)} icon={DollarSign} trend="up" />
        <StatCard title="Total Invested" value={formatCurrency(stats.totalInvested)} icon={PieIcon} />
        <StatCard title="Total Profit" value={formatCurrency(stats.totalProfit)} icon={TrendingUp} trend="up" />
        <StatCard
          title="Overall ROI"
          value={formatPercent((stats.totalProfit / stats.totalInvested) * 100)}
          icon={BarChart3}
          trend="up"
        />
      </div>

      {/* Row 2: Investment Split + Profit Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Investment Split" subtitle="Grading vs Sealed allocation">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={investmentSplitData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                strokeWidth={0}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {investmentSplitData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Profit Comparison" subtitle="Expected profit by portfolio type">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={profitComparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="profit" fill="#6366f1" radius={[0, 6, 6, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Category Investment + Category ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Investment by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="invested" name="Invested" radius={[6, 6, 0, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ROI by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => v + '%'} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="roi" name="ROI %" radius={[6, 6, 0, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4: Top 10 */}
      <ChartCard title="Top 10 Most Profitable Items" subtitle="Across both portfolios">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={top10} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={220}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="profit" name="Profit" radius={[0, 6, 6, 0]}>
              {top10.map((entry) => (
                <Cell key={entry.name} fill={CATEGORY_COLORS[entry.category] || '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
