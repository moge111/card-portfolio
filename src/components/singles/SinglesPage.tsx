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
        footer: () => <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Totals</span>,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <EditableCell
              value={row.original.name}
              onSave={(v) => updateSingle(row.original.id, 'name', v)}
              type="text"
              inputWidth="w-40"
              className="font-body text-text-primary font-medium text-sm"
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
        footer: ({ table }) => table.getFilteredRowModel().rows.reduce((s, r) => s + r.original.qty, 0),
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
      <div className="mb-10 rise">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-accent">The Vault · Personal Collection</div>
        <h2 className="font-display text-4xl font-medium tracking-tight text-text-primary">
          The <span className="italic text-accent-light">Singles</span>
        </h2>
        <p className="text-text-secondary text-sm mt-2">Raw cards and keepers — not for sale</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 rise rise-1">
        <StatCard title="Total Cards" value={String(totals.totalCards)} icon={Layers} />
        <StatCard title="Total Invested" value={formatCurrency(totals.invested)} icon={DollarSign} />
        <StatCard title="Unrealized Profit" value={formatCurrency(totals.profit)} icon={TrendingUp} trend={totals.profit >= 0 ? 'up' : 'down'} />
        <StatCard title="Portfolio ROI" value={formatPercent(totals.roi)} icon={Target} trend={totals.roi >= 0 ? 'up' : 'down'} />
      </div>

      <div className="panel p-5 rise rise-2">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-primary">All Singles</h3>
          <button
            onClick={addSingle}
            className="rounded-lg bg-accent px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-accent-light"
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
          <DataTable data={singlesCollection} columns={columns} categories={categories} csvName="singles" />
        )}
      </div>
    </div>
  );
}
