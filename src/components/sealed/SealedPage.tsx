import { useMemo } from 'react';
import { Package, DollarSign, TrendingUp, Target } from 'lucide-react';
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
import type { SealedProduct } from '../../types/portfolio';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-text-primary font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function SealedPage() {
  const { sealedCollection, updateSealedProduct, addSealedProduct, deleteSealedProduct } = usePortfolio();
  const isAdmin = useAdmin();
  const CATEGORIES = ['Pokemon', 'One Piece', 'MTG', 'Naruto'];

  const columns: ColumnDef<SealedProduct, any>[] = useMemo(() => {
    const cols: ColumnDef<SealedProduct, any>[] = [
      {
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <EditableCell
              value={row.original.name}
              onSave={(v) => updateSealedProduct(row.original.id, 'name', v)}
              type="text"
              inputWidth="w-40"
              className="text-text-primary font-medium text-sm"
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
      },
      {
        accessorKey: 'totalMarketValue',
        header: 'Market Value',
        cell: ({ getValue }) => <span className="text-text-primary font-medium">{formatCurrency(getValue())}</span>,
      },
      {
        accessorKey: 'profit',
        header: 'Profit',
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return <span className={v >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(v)}</span>;
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
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sealedCollection]);

  const categories = [...new Set(sealedCollection.map((p) => p.category))];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Sealed Collection</h2>
        <p className="text-text-secondary text-sm mt-1">20 products, {totals.totalUnits} total units held</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Units" value={String(totals.totalUnits)} icon={Package} />
        <StatCard title="Total Invested" value={formatCurrency(totals.invested)} icon={DollarSign} />
        <StatCard title="Unrealized Profit" value={formatCurrency(totals.profit)} icon={TrendingUp} trend={totals.profit >= 0 ? 'up' : 'down'} />
        <StatCard title="Portfolio ROI" value={formatPercent(totals.roi)} icon={Target} trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <ChartCard title="ROI Distribution" subtitle="Products by ROI range">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roiDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="range" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Products" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category Allocation" subtitle="Investment by category">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryAllocation}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                strokeWidth={0}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {categoryAllocation.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[0]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Market Gainers" subtitle="Cost vs Market Value">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costVsMarket.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 9 }} />
              <YAxis tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cost" name="Cost" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="market" name="Market" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">All Sealed Products</h3>
          {isAdmin && (
            <button
              onClick={addSealedProduct}
              className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/80 transition-colors"
            >
              + Add Product
            </button>
          )}
        </div>
        <DataTable data={sealedCollection} columns={columns} categories={categories} />
      </div>
    </div>
  );
}
