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
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { CATEGORY_COLORS, CHART_COLORS } from '../../constants/theme';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-bright bg-background/95 px-3 py-2 font-mono text-xs shadow-2xl backdrop-blur">
      <p className="text-text-primary font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.value > 1 ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function OverviewPage() {
  const { gradingPortfolio, sealedCollection, singlesCollection } = usePortfolio();
  const stats = useMemo(() => {
    const EBAY_FEE = 0.1325;
    const SUB1_SHIPPING = 47.33;
    const SUB2_SHIPPING = 46.55;
    const SUB3_SHIPPING = 0; // TBD — not yet invoiced
    const SUB4_SHIPPING = 112.07; // $19.99 inbound + $20 Cabrella + $72.08 insured return
    const SUB5_SHIPPING = 0; // TBD
    const TOTAL_SHIPPING = SUB1_SHIPPING + SUB2_SHIPPING + SUB3_SHIPPING + SUB4_SHIPPING + SUB5_SHIPPING;
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
  }, [gradingPortfolio, sealedCollection, singlesCollection]);

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
      <div className="mb-10 rise">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          <span className="twinkle mr-1">✦</span>Trainer HQ · Every Collection
        </div>
        <h2 className="font-display text-5xl font-medium tracking-tight text-text-primary">
          Portfolio <span className="holo-text italic">Overview</span>
          <span className="ml-4 align-middle text-2xl">
            <span className="floaty">⚡</span>
            <span className="floaty ml-1.5" style={{ animationDelay: '-1.1s' }}>🏴‍☠️</span>
            <span className="floaty ml-1.5" style={{ animationDelay: '-2.2s' }}>🍥</span>
          </span>
        </h2>
        <p className="text-text-secondary text-sm mt-2">Grading, sealed and singles performance in one view</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 rise rise-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 rise rise-1">
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
            <Link key={seg.to} to={seg.to} className="panel panel-hover group p-5 block">
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-primary">
                  <seg.icon size={14} className="wiggle text-accent" /> {seg.name}
                </span>
                <ArrowUpRight size={14} className="text-text-secondary/40 transition-all group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-text-secondary mb-1">Invested</div>
                  <div className="font-display text-lg font-medium tabular-nums text-text-primary">{formatCurrency(seg.invested)}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-text-secondary mb-1">Value</div>
                  <div className="font-display text-lg font-medium tabular-nums text-text-primary">{formatCurrency(seg.value)}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-text-secondary mb-1">Profit</div>
                  <div className={`font-display text-lg font-medium tabular-nums ${seg.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(seg.profit)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[10px] text-text-secondary">{seg.note}</span>
                <span className={`font-mono text-[10px] font-medium ${seg.profit >= 0 ? 'text-profit' : 'text-loss'}`}>{formatPercent(roi)} ROI</span>
              </div>
              {seg.progress !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="stripes h-full rounded-full bg-gradient-to-r from-accent to-profit"
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
              <CartesianGrid strokeDasharray="3 3" stroke="#222940" />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fill: '#8d96b2', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#8d96b2', fontSize: 12 }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="profit" fill="#38bdf8" radius={[0, 6, 6, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Category Investment + Category ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 rise rise-4">
        <ChartCard title="Investment by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222940" />
              <XAxis dataKey="name" tick={{ fill: '#8d96b2', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} tick={{ fill: '#8d96b2', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="invested" name="Invested" radius={[6, 6, 0, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#38bdf8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ROI by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222940" />
              <XAxis dataKey="name" tick={{ fill: '#8d96b2', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => v + '%'} tick={{ fill: '#8d96b2', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="roi" name="ROI %" radius={[6, 6, 0, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#38bdf8'} />
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
            <div className="py-12 text-center font-mono text-xs text-text-secondary">
              <span className="floaty mb-3 block text-3xl">🎉</span>
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
