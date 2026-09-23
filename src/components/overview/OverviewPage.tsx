import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, PieChart as PieIcon, BarChart3, CheckCircle, CreditCard, Package, Layers, ArrowUpRight, Sparkles } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import StatCard from '../shared/StatCard';
import ChartCard from '../shared/ChartCard';
import CategoryBadge from '../shared/CategoryBadge';
import { usePortfolio } from '../../context/PortfolioContext';
import { useGradingDesk } from '../../context/GradingDeskContext';
import { EBAY_FEE } from '../../constants/fees';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { BAR_RADIUS, CATEGORY_COLORS, CHART_COLORS, CHART_GRID, CHART_TICK_STYLE, SERIES } from '../../constants/theme';
import PageHeader from '../shared/PageHeader';
import ChartTooltip from '../shared/ChartTooltip';

export default function OverviewPage() {
  const { gradingPortfolio, sealedCollection, singlesCollection } = usePortfolio();
  const { submissions } = useGradingDesk();
  const stats = useMemo(() => {
    const TOTAL_SHIPPING = submissions.reduce((sum, sub) => sum + sub.shipping, 0);
    const sellable = gradingPortfolio.filter((c) => !c.isKeeper);
    const gradingInvested = gradingPortfolio.reduce((s, c) => s + c.totalInvestment, 0);
    const sealedInvested = sealedCollection.reduce((s, c) => s + c.totalCost, 0);
    const sealedProfit = sealedCollection.reduce((s, c) => s + c.profit, 0);
    const singlesInvested = singlesCollection.reduce((s, c) => s + c.totalCost, 0);
    const singlesMarket = singlesCollection.reduce((s, c) => s + c.totalMarketValue, 0);
    const singlesProfit = singlesCollection.reduce((s, c) => s + c.profit, 0);
    const totalInvested = gradingInvested + sealedInvested + singlesInvested;

    // Realized profit: actual sales minus cost basis of sold cards
    let totalSoldRevenue = 0;
    let soldCostBasis = 0;
    let totalSoldCount = 0;
    let totalReceivedCards = 0;
    sellable.forEach((c) => {
      const prices = c.soldPrices || [];
      totalSoldRevenue += prices.reduce((a, p) => a + p, 0);
      const costPerCard = c.qty > 0 ? c.totalInvestment / c.qty : 0;
      soldCostBasis += costPerCard * prices.length;
      totalSoldCount += prices.length;
      if (c.gradedQty > 0) totalReceivedCards += c.gradedQty;
    });
    const proportionalShipping = totalReceivedCards > 0
      ? TOTAL_SHIPPING * (totalSoldCount / totalReceivedCards)
      : 0;
    const realizedProfit = totalSoldRevenue - soldCostBasis - proportionalShipping;

    // Unsold holdings value: graded unsold + ungraded expected + sealed market + singles market
    const unsoldGradingValue = sellable.reduce((s, c) => {
      const prices = c.soldPrices || [];
      const unsoldGraded = c.gradedQty - prices.length;
      const unsoldGradedRev = unsoldGraded > 0 && c.gradedQty > 0
        ? (c.actual10s * c.psa10Value + c.actual9s * c.psa9Value + c.actualSub9s * c.costPerCard) * (unsoldGraded / c.gradedQty) * (1 - EBAY_FEE)
        : 0;
      const remainingQty = c.qty - c.gradedQty;
      const expectedRevPerCard = c.qty > 0 ? c.netRevenue / c.qty : 0;
      return s + unsoldGradedRev + remainingQty * expectedRevPerCard;
    }, 0);
    const sealedMarket = sealedCollection.reduce((s, c) => s + c.totalMarketValue, 0);
    const holdingsValue = unsoldGradingValue + sealedMarket + singlesMarket;

    const gradingProfit = (unsoldGradingValue + totalSoldRevenue) - gradingInvested - TOTAL_SHIPPING;
    // Total profit counts only realized sales from grading — no projected
    // value for graded/ungraded cards still held. Sealed and singles count
    // at market since those are straightforward holdings.
    const totalProfit = realizedProfit + sealedProfit + singlesProfit;
    // Expected profit on grading inventory that hasn't sold yet
    const gradedPotential = gradingProfit - realizedProfit;

    return {
      gradingInvested, gradingProfit, sealedInvested, sealedProfit,
      singlesInvested, singlesMarket, singlesProfit,
      totalInvested, totalProfit, holdingsValue,
      realizedProfit, totalSoldCount, totalSoldRevenue,
      sealedMarket, gradingValue: unsoldGradingValue + totalSoldRevenue,
      totalReceivedCards, gradedPotential,
    };
  }, [gradingPortfolio, sealedCollection, singlesCollection, submissions]);

  const investmentSplitData = [
    { name: 'PSA Grading', value: stats.gradingInvested },
    { name: 'Sealed', value: stats.sealedInvested },
    ...(stats.singlesInvested > 0 ? [{ name: 'Singles', value: stats.singlesInvested }] : []),
  ];

  const profitComparisonData = [
    { name: 'PSA Grading', profit: stats.gradingProfit },
    { name: 'Sealed', profit: stats.sealedProfit },
    ...(stats.singlesMarket > 0 ? [{ name: 'Singles', profit: stats.singlesProfit }] : []),
  ];

  const categoryData = useMemo(() => {
    const map: Record<string, { invested: number; profit: number }> = {};
    gradingPortfolio.filter((c) => !c.isKeeper).forEach((c) => {
      if (!map[c.category]) map[c.category] = { invested: 0, profit: 0 };
      map[c.category].invested += c.totalInvestment;
      map[c.category].profit += c.profit;
    });
    sealedCollection.forEach((p) => {
      if (!map[p.category]) map[p.category] = { invested: 0, profit: 0 };
      map[p.category].invested += p.totalCost;
      map[p.category].profit += p.profit;
    });
    singlesCollection.forEach((s) => {
      if (!map[s.category]) map[s.category] = { invested: 0, profit: 0 };
      map[s.category].invested += s.totalCost;
      map[s.category].profit += s.profit;
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      invested: Math.round(data.invested),
      profit: Math.round(data.profit),
      roi: data.invested > 0 ? Math.round((data.profit / data.invested) * 100) : 0,
    })).sort((a, b) => b.invested - a.invested);
  }, [gradingPortfolio, sealedCollection, singlesCollection]);

  const performers = useMemo(() => {
    const all = [
      ...gradingPortfolio.filter((c) => !c.isKeeper).map((c) => ({ name: c.name, profit: c.profit, invested: c.totalInvestment, category: c.category, source: 'Grading' })),
      ...sealedCollection.map((p) => ({ name: p.name, profit: p.profit, invested: p.totalCost, category: p.category, source: 'Sealed' })),
      ...singlesCollection.map((s) => ({ name: s.name, profit: s.profit, invested: s.totalCost, category: s.category, source: 'Singles' })),
    ];
    const sorted = [...all].sort((a, b) => b.profit - a.profit);
    return {
      top: sorted.slice(0, 8),
      bottom: sorted.filter((i) => i.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 8),
      maxProfit: Math.max(...sorted.map((i) => i.profit), 1),
      minProfit: Math.min(...sorted.map((i) => i.profit), -1),
    };
  }, [gradingPortfolio, sealedCollection, singlesCollection]);

  return (
    <div>
      <PageHeader
        title="Overview"
        detail="Every collection"
        figure={{ value: formatCurrency(stats.totalProfit), caption: 'Total profit', tone: stats.totalProfit >= 0 ? 'text-profit' : 'text-loss' }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 rise rise-1">
        <StatCard
          title="Holdings Value"
          value={formatCurrency(stats.holdingsValue)}
          subtitle="Unsold cards + sealed"
          icon={DollarSign}
          trend="up"
          info="What everything you still hold is worth today: unsold graded cards (after 13.25% eBay fee), expected value of cards still at PSA, plus sealed and singles at market value."
        />
        <StatCard
          title="Total Invested"
          value={formatCurrency(stats.totalInvested)}
          icon={PieIcon}
          info="Every dollar put in: card costs, grading fees, sealed and singles purchases."
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(stats.totalProfit)}
          subtitle="Excludes graded potential"
          icon={TrendingUp}
          trend={stats.totalProfit >= 0 ? 'up' : 'down'}
          info="Realized sales profit plus paper gains on sealed and singles. Graded-card potential is tracked separately below and only moves here when cards actually sell."
        />
        <StatCard
          title="Overall ROI"
          value={formatPercent((stats.totalProfit / stats.totalInvested) * 100)}
          icon={BarChart3}
          trend="up"
          info="Total profit divided by total invested. Excludes graded potential."
        />
      </div>

      {/* Profit breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 rise rise-1">
        <StatCard
          title="Realized Profit"
          value={formatCurrency(stats.realizedProfit)}
          subtitle={`${stats.totalSoldCount} sold · ${formatCurrency(stats.totalSoldRevenue)} revenue`}
          icon={CheckCircle}
          trend={stats.realizedProfit >= 0 ? 'up' : 'down'}
          info="Locked-in profit from actual sales: net sale proceeds minus the cost basis of the sold cards and their share of PSA shipping."
        />
        <StatCard
          title="Sealed Unrealized"
          value={formatCurrency(stats.sealedProfit)}
          subtitle="Market value − cost"
          icon={Package}
          trend={stats.sealedProfit >= 0 ? 'up' : 'down'}
          info="Paper gain on sealed products: current market value minus what you paid. Realized only if you sell."
        />
        <StatCard
          title="Singles Unrealized"
          value={formatCurrency(stats.singlesProfit)}
          subtitle="Market value − cost"
          icon={Layers}
          trend={stats.singlesProfit >= 0 ? 'up' : 'down'}
          info="Paper gain on raw singles and keepers: current market value minus what you paid."
        />
        <StatCard
          title="Graded Potential"
          value={formatCurrency(stats.gradedPotential)}
          subtitle="If remaining cards sell at market"
          icon={Sparkles}
          trend="neutral"
          info="Expected profit on grading inventory that hasn't sold yet: unsold graded cards at market (after eBay fees) plus expected value of cards still at PSA, minus their remaining cost basis and shipping."
        />
      </div>

      {/* Segment breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 rise rise-2">
        {[
          {
            name: 'PSA Grading', to: '/grading', icon: CreditCard,
            invested: stats.gradingInvested, value: stats.gradingValue, profit: stats.gradingProfit,
            note: `${stats.totalSoldCount}/${stats.totalReceivedCards} returned cards sold`,
            progress: stats.totalReceivedCards > 0 ? stats.totalSoldCount / stats.totalReceivedCards : 0,
          },
          {
            name: 'Sealed', to: '/sealed', icon: Package,
            invested: stats.sealedInvested, value: stats.sealedMarket, profit: stats.sealedProfit,
            note: 'held long — unrealized', progress: null,
          },
          {
            name: 'Singles', to: '/singles', icon: Layers,
            invested: stats.singlesInvested, value: stats.singlesMarket, profit: stats.singlesProfit,
            note: 'keepers & raw cards', progress: null,
          },
        ].map((seg) => {
          const roi = seg.invested > 0 ? (seg.profit / seg.invested) * 100 : 0;
          return (
            <Link key={seg.to} to={seg.to} className="panel panel-hover group p-1.5 block">
              <div className="slab-label flex items-center justify-between px-2.5 py-1.5">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-primary">
                  <seg.icon size={13} className="text-text-secondary" /> {seg.name}
                </span>
                <ArrowUpRight size={14} className="text-text-secondary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div className="grid grid-cols-3 gap-3 px-3 pt-3">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-text-secondary mb-1">Invested</div>
                  <div className="font-display text-2xl font-bold tabular-nums text-text-primary">{formatCurrency(seg.invested)}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-text-secondary mb-1">Value</div>
                  <div className="font-display text-2xl font-bold tabular-nums text-text-primary">{formatCurrency(seg.value)}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-text-secondary mb-1">Profit</div>
                  <div className={`font-display text-2xl font-bold tabular-nums ${seg.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(seg.profit)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between px-3 pb-2.5">
                <span className="font-mono text-[10px] text-text-secondary">{seg.note}</span>
                <span className={`font-mono text-[10px] font-medium ${seg.profit >= 0 ? 'text-profit' : 'text-loss'}`}>{formatPercent(roi)} ROI</span>
              </div>
              {seg.progress !== null && (
                <div className="mx-3 mb-2.5 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-text-primary"
                    style={{ width: `${Math.min(100, seg.progress * 100)}%` }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Row 2: Investment Split + Profit Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 rise rise-3">
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
                stroke="var(--color-surface)"
                strokeWidth={2}
                label={({ x, y, name, percent, textAnchor }) => (
                  <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill="var(--color-text-primary)" fontSize={12} fontFamily="var(--font-mono)">
                    {name} {((percent ?? 0) * 100).toFixed(0)}%
                  </text>
                )}
                labelLine={{ stroke: 'var(--color-border-bright)' }}
              >
                {investmentSplitData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'var(--color-border)', opacity: 0.35 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Profit Comparison" subtitle="Expected profit by portfolio type">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={profitComparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={CHART_TICK_STYLE} />
              <YAxis type="category" dataKey="name" tick={CHART_TICK_STYLE} width={90} />
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'var(--color-border)', opacity: 0.35 }} />
              <Bar dataKey="profit" fill={SERIES.blue} radius={[0, 4, 4, 0]} name="Profit" barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Category Investment + Category ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 rise rise-4">
        <ChartCard title="Investment by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="name" tick={CHART_TICK_STYLE} />
              <YAxis tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} tick={CHART_TICK_STYLE} />
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'var(--color-border)', opacity: 0.35 }} />
              <Bar dataKey="invested" name="Invested" radius={BAR_RADIUS}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? SERIES.blue} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ROI by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="name" tick={CHART_TICK_STYLE} />
              <YAxis tickFormatter={(v) => v + '%'} tick={CHART_TICK_STYLE} />
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'var(--color-border)', opacity: 0.35 }} />
              <Bar dataKey="roi" name="ROI %" radius={BAR_RADIUS}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? SERIES.blue} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4: Best & worst performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rise rise-5">
        <ChartCard title="Top Performers" subtitle="By expected profit">
          <div className="space-y-1">
            {performers.top.map((item, i) => {
              const roi = item.invested > 0 ? (item.profit / item.invested) * 100 : 0;
              return (
                <div key={`${item.source}-${item.name}`} className="relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover">
                  <div
                    className="absolute inset-y-1 left-0 rounded-md bg-profit/[0.07]"
                    style={{ width: `${Math.max(2, (item.profit / performers.maxProfit) * 100)}%` }}
                  />
                  <span className="relative w-5 font-mono text-[10px] text-text-secondary/60 tabular-nums">{i + 1}</span>
                  <div className="relative min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text-primary">{item.name}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <CategoryBadge category={item.category} />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary/60">{item.source}</span>
                    </div>
                  </div>
                  <div className="relative text-right">
                    <div className="font-mono text-sm font-medium tabular-nums text-profit">{formatCurrency(item.profit)}</div>
                    <div className="font-mono text-[10px] tabular-nums text-text-secondary">{formatPercent(roi)} ROI</div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Needs Attention" subtitle="Items currently underwater">
          {performers.bottom.length === 0 ? (
            <div className="py-10 text-center font-mono text-xs text-text-secondary">
              Nothing underwater — every item is in profit.
            </div>
          ) : (
            <div className="space-y-1">
              {performers.bottom.map((item, i) => {
                const roi = item.invested > 0 ? (item.profit / item.invested) * 100 : 0;
                return (
                  <div key={`${item.source}-${item.name}`} className="relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover">
                    <div
                      className="absolute inset-y-1 left-0 rounded-md bg-loss/[0.07]"
                      style={{ width: `${Math.max(2, (item.profit / performers.minProfit) * 100)}%` }}
                    />
                    <span className="relative w-5 font-mono text-[10px] text-text-secondary/60 tabular-nums">{i + 1}</span>
                    <div className="relative min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">{item.name}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <CategoryBadge category={item.category} />
                        <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary/60">{item.source}</span>
                      </div>
                    </div>
                    <div className="relative text-right">
                      <div className="font-mono text-sm font-medium tabular-nums text-loss">{formatCurrency(item.profit)}</div>
                      <div className="font-mono text-[10px] tabular-nums text-text-secondary">{formatPercent(roi)} ROI</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
