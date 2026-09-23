import { useMemo } from 'react';
import { Package, DollarSign, TrendingUp, Target } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { type ColumnDef } from '@tanstack/react-table';
import StatCard from '../shared/StatCard';
import ChartCard from '../shared/ChartCard';
import DataTable from '../shared/DataTable';
import EditableCell, { EditableSelect } from '../shared/EditableCell';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { BAR_RADIUS, CATEGORY_COLORS, CHART_GRID, CHART_TICK_STYLE, SERIES, byCategoryOrder } from '../../constants/theme';
import ChartTooltip from '../shared/ChartTooltip';
import PageHeader from '../shared/PageHeader';
import Slab from '../shared/Slab';
import { primaryButton } from '../shared/buttons';
import type { SealedProduct } from '../../types/portfolio';

export default function SealedPage() {
  const { sealedCollection, updateSealedProduct, addSealedProduct, deleteSealedProduct } = usePortfolio();
  const isAdmin = useAdmin();
  const CATEGORIES = ['Pokemon', 'One Piece', 'MTG', 'Naruto'];

  const columns: ColumnDef<SealedProduct, any>[] = useMemo(() => {
    const cols: ColumnDef<SealedProduct, any>[] = [
      {
        accessorKey: 'name',
        header: 'Product',
        footer: () => <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Totals</span>,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <EditableCell
              value={row.original.name}
              onSave={(v) => updateSealedProduct(row.original.id, 'name', v)}
              type="text"
              inputWidth="w-40"
              className="font-body text-text-primary font-medium text-sm"
            />
            <EditableSelect
              value={row.original.category}
              options={CATEGORIES}
              onSave={(v) => updateSealedProduct(row.original.id, 'category', v)}
            />
          </div>
        ),
      },
      {
        accessorKey: 'qty',
        header: 'Qty',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.qty}
            onSave={(v) => updateSealedProduct(row.original.id, 'qty', v)}
          />
        ),
        footer: ({ table }) => table.getFilteredRowModel().rows.reduce((s, r) => s + r.original.qty, 0),
      },
      {
        accessorKey: 'costPerUnit',
        header: 'Cost/Unit',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.costPerUnit}
            onSave={(v) => updateSealedProduct(row.original.id, 'costPerUnit', v)}
            format={formatCurrency}
          />
        ),
      },
      {
        accessorKey: 'marketValuePerUnit',
        header: 'Market/Unit',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.marketValuePerUnit}
            onSave={(v) => updateSealedProduct(row.original.id, 'marketValuePerUnit', v)}
            format={formatCurrency}
          />
        ),
      },
      {
        accessorKey: 'totalCost',
        header: 'Total Cost',
        cell: ({ getValue }) => formatCurrency(getValue()),
        footer: ({ table }) => formatCurrency(table.getFilteredRowModel().rows.reduce((s, r) => s + r.original.totalCost, 0)),
      },
      {
        accessorKey: 'totalMarketValue',
        header: 'Market Value',
        cell: ({ getValue }) => <span className="text-text-primary font-medium">{formatCurrency(getValue())}</span>,
        footer: ({ table }) => formatCurrency(table.getFilteredRowModel().rows.reduce((s, r) => s + r.original.totalMarketValue, 0)),
      },
      {
        accessorKey: 'profit',
        header: 'Profit',
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
        header: 'ROI',
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
            onClick={() => { if (confirm('Delete this product?')) deleteSealedProduct(row.original.id); }}
            className="text-loss/50 hover:text-loss text-xs transition-colors"
            title="Delete"
          >✕</button>
        ),
      });
    }
    return cols;
  }, [updateSealedProduct, deleteSealedProduct, isAdmin]);

  const totals = useMemo(() => {
    const totalUnits = sealedCollection.reduce((s, p) => s + p.qty, 0);
    const invested = sealedCollection.reduce((s, p) => s + p.totalCost, 0);
    const profit = sealedCollection.reduce((s, p) => s + p.profit, 0);
    const marketValue = sealedCollection.reduce((s, p) => s + p.totalMarketValue, 0);
    return { totalUnits, invested, profit, marketValue, roi: (profit / invested) * 100 };
  }, [sealedCollection]);

  const costVsMarket = useMemo(() => {
    return sealedCollection
      .map((p) => ({
        name: p.name.length > 25 ? p.name.slice(0, 23) + '...' : p.name,
        cost: p.totalCost,
        market: p.totalMarketValue,
      }))
      .sort((a, b) => b.market - a.market)
      .slice(0, 10);
  }, [sealedCollection]);

  const roiDistribution = useMemo(() => {
    const ranges = [
      { range: 'Loss', min: -Infinity, max: 0, count: 0 },
      { range: '0-100%', min: 0, max: 100, count: 0 },
      { range: '100-200%', min: 100, max: 200, count: 0 },
      { range: '200-400%', min: 200, max: 400, count: 0 },
      { range: '400%+', min: 400, max: Infinity, count: 0 },
    ];
    sealedCollection.forEach((p) => {
      const r = ranges.find((r) => p.roi >= r.min && p.roi < r.max);
      if (r) r.count++;
    });
    return ranges;
  }, [sealedCollection]);

  const categoryAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    sealedCollection.forEach((p) => {
      map[p.category] = (map[p.category] || 0) + p.totalCost;
    });
    return byCategoryOrder(Object.entries(map).map(([name, value]) => ({ name, value })));
  }, [sealedCollection]);

  const categories = [...new Set(sealedCollection.map((p) => p.category))];

  return (
    <div>
      <PageHeader
        title="Sealed"
        detail={`${sealedCollection.length} products · ${totals.totalUnits} units held`}
        figure={{ value: formatPercent(totals.roi), caption: 'Unrealized ROI', tone: totals.roi >= 0 ? 'text-profit' : 'text-loss' }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 rise rise-1">
        <StatCard title="Total Units" value={String(totals.totalUnits)} icon={Package} />
        <StatCard title="Total Invested" value={formatCurrency(totals.invested)} icon={DollarSign} />
        <StatCard title="Unrealized Profit" value={formatCurrency(totals.profit)} icon={TrendingUp} trend={totals.profit >= 0 ? 'up' : 'down'} />
        <StatCard title="Portfolio ROI" value={formatPercent(totals.roi)} icon={Target} trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 rise rise-2">
        <ChartCard title="ROI Distribution" subtitle="Products by ROI range">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roiDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="range" tick={CHART_TICK_STYLE} />
              <YAxis tick={CHART_TICK_STYLE} />
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'var(--color-border)', opacity: 0.35 }} />
              <Bar dataKey="count" name="Products" fill={SERIES.blue} radius={BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category Allocation" subtitle="Investment by category">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryAllocation}
                cx="50%"
                cy="45%"
                innerRadius={48}
                outerRadius={75}
                dataKey="value"
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                {categoryAllocation.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? SERIES.blue} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'var(--color-border)', opacity: 0.35 }} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={7}
                formatter={(name: string) => {
                  const total = categoryAllocation.reduce((s, e) => s + e.value, 0);
                  const entry = categoryAllocation.find((e) => e.name === name);
                  const pct = total > 0 && entry ? Math.round((entry.value / total) * 100) : 0;
                  return <span className="font-mono text-[11px] text-text-secondary">{name} · {pct}%</span>;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Market Gainers" subtitle="Cost vs Market Value">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costVsMarket.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="name" tick={CHART_TICK_STYLE} />
              <YAxis tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} tick={CHART_TICK_STYLE} />
              <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'var(--color-border)', opacity: 0.35 }} />
              <Bar dataKey="cost" name="Cost" fill={SERIES.blue} radius={BAR_RADIUS} />
              <Bar dataKey="market" name="Market" fill={SERIES.gold} radius={BAR_RADIUS} />
              <Legend iconType="square" iconSize={8} formatter={(name: string) => <span className="font-mono text-[11px] text-text-secondary">{name}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Slab className="rise rise-3" title="All sealed products" actions={isAdmin && <button onClick={addSealedProduct} className={primaryButton}>+ Add product</button>}>
        <DataTable data={sealedCollection} columns={columns} categories={categories} csvName="sealed-collection" />
      </Slab>
    </div>
  );
}
