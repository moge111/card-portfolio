import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, FileDown } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import { CATEGORY_EMOJI } from '../../constants/theme';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  categories?: string[];
  csvName?: string;
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function exportCsv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter((k) => k !== 'id');
  const lines = [keys.join(',')];
  for (const row of rows) {
    const cells = keys.map((k) => {
      const v = row[k];
      return csvEscape(Array.isArray(v) ? v.join('; ') : v);
    });
    lines.push(cells.join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DataTable<T>({ data, columns, categories, csvName }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredData = useMemo(() => {
    if (!categoryFilter) return data;
    return data.filter((row: any) => row.category === categoryFilter);
  }, [data, categoryFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" />
          <input
            type="text"
            placeholder="Search by name..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-background/70 pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 outline-none transition-colors focus:border-accent/60"
          />
        </div>
        {categories && categories.length > 0 && (
          <div className="flex gap-1.5 items-center flex-wrap">
            <button
              onClick={() => setCategoryFilter('')}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                !categoryFilter
                  ? 'border-accent/60 bg-accent/15 text-accent-light'
                  : 'border-border bg-background/50 text-text-secondary hover:border-border-bright hover:text-text-primary'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  categoryFilter === cat
                    ? 'border-accent/60 bg-accent/15 text-accent-light'
                    : 'border-border bg-background/50 text-text-secondary hover:border-border-bright hover:text-text-primary'
                }`}
              >
                {CATEGORY_EMOJI[cat] ? `${CATEGORY_EMOJI[cat]} ` : ''}{cat}
              </button>
            ))}
          </div>
        )}
        {csvName && (
          <button
            onClick={() => exportCsv(table.getFilteredRowModel().rows.map((r) => r.original as Record<string, unknown>), csvName)}
            title="Download the rows below (with current filters applied) as a CSV file"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary transition-colors hover:border-accent/40 hover:text-accent-light"
          >
            <FileDown size={12} /> CSV
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-background/60">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary cursor-pointer hover:text-accent-light select-none whitespace-nowrap transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp size={12} className="text-accent" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown size={12} className="text-accent" />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-25" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="font-mono text-[13px] tabular-nums">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/40 transition-colors hover:bg-accent/[0.04]"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {columns.some((c) => c.footer) && table.getRowModel().rows.length > 0 && (
            <tfoot>
              {table.getFooterGroups().map((footerGroup) => (
                <tr key={footerGroup.id} className="border-t border-border-bright bg-background/60 font-mono text-[12px] tabular-nums">
                  {footerGroup.headers.map((header) => (
                    <td key={header.id} className="px-4 py-3 whitespace-nowrap font-medium text-accent-light">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-10 font-mono text-xs text-text-secondary">No items found</div>
        )}
      </div>
    </div>
  );
}

// Re-export CategoryBadge for convenient use in column definitions
export { CategoryBadge };
