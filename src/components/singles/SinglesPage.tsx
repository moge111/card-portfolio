import { useMemo } from 'react';
import { Layers, DollarSign, TrendingUp, Target } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import StatCard from '../shared/StatCard';
import DataTable from '../shared/DataTable';
import EditableCell, { EditableSelect } from '../shared/EditableCell';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { Single } from '../../types/portfolio';

export default function SinglesPage() {
  const { singlesCollection, updateSingle, addSingle, deleteSingle } = usePortfolio();
  const isAdmin = useAdmin();
  const CATEGORIES = ['Pokemon', 'One Piece', 'MTG', 'Naruto'];

  const columns: ColumnDef<Single, any>[] = useMemo(() => {
    const cols: ColumnDef<Single, any>[] = [
      {
        accessorKey: 'name',
        header: 'Card',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <EditableCell
              value={row.original.name}
              onSave={(v) => updateSingle(row.original.id, 'name', v)}
              type="text"
              inputWidth="w-40"
              className="text-text-primary font-medium text-sm"
            />
            <EditableSelect
              value={row.original.category}
              options={CATEGORIES}
              onSave={(v) => updateSingle(row.original.id, 'category', v)}
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
            onSave={(v) => updateSingle(row.original.id, 'qty', v)}
          />
        ),
      },
      {
        accessorKey: 'costPerCard',
        header: 'Cost/Card',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.costPerCard}
            onSave={(v) => updateSingle(row.original.id, 'costPerCard', v)}
            format={formatCurrency}
          />
        ),
      },
      {
        accessorKey: 'marketValue',
        header: 'Market/Card',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.marketValue}
            onSave={(v) => updateSingle(row.original.id, 'marketValue', v)}
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
            onClick={() => { if (confirm('Delete this card?')) deleteSingle(row.original.id); }}
            className="text-loss/50 hover:text-loss text-xs transition-colors"
            title="Delete"
          >✕</button>
        ),
      });
    }
    return cols;
  }, [updateSingle, deleteSingle, isAdmin]);

  const totals = useMemo(() => {
    const totalCards = singlesCollection.reduce((s, c) => s + c.qty, 0);
    const invested = singlesCollection.reduce((s, c) => s + c.totalCost, 0);
    const profit = singlesCollection.reduce((s, c) => s + c.profit, 0);
    const marketValue = singlesCollection.reduce((s, c) => s + c.totalMarketValue, 0);
    return { totalCards, invested, profit, marketValue, roi: invested > 0 ? (profit / invested) * 100 : 0 };
  }, [singlesCollection]);

  const categories = [...new Set(singlesCollection.map((c) => c.category))];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Singles</h2>
        <p className="text-text-secondary text-sm mt-1">Raw cards and keepers — not for sale</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Cards" value={String(totals.totalCards)} icon={Layers} />
        <StatCard title="Total Invested" value={formatCurrency(totals.invested)} icon={DollarSign} />
        <StatCard title="Unrealized Profit" value={formatCurrency(totals.profit)} icon={TrendingUp} trend={totals.profit >= 0 ? 'up' : 'down'} />
        <StatCard title="Portfolio ROI" value={formatPercent(totals.roi)} icon={Target} trend={totals.roi >= 0 ? 'up' : 'down'} />
      </div>

      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">All Singles</h3>
          <button
            onClick={addSingle}
            className="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/80 transition-colors"
          >
            + Add Card
          </button>
        </div>
        {singlesCollection.length === 0 ? (
          <div className="text-center py-12">
            <Layers size={32} className="mx-auto text-text-secondary mb-3" />
            <p className="text-text-secondary text-sm">No singles yet. Click "+ Add Card" to start tracking your raw cards.</p>
          </div>
        ) : (
          <DataTable data={singlesCollection} columns={columns} categories={categories} />
        )}
      </div>
    </div>
  );
}
