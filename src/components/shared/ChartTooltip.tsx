import { formatCurrency } from '../../utils/formatters';

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: { fill?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  currency?: boolean;
}

// Values stay in text ink; the swatch beside them carries the series color.
export default function ChartTooltip({ active, payload, label, currency }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border-bright bg-surface px-3 py-2 font-mono text-xs shadow-lg">
      <p className="mb-1 text-text-primary">{label || payload[0]?.name}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2 text-text-secondary">
          <span className="h-2 w-2 rounded-sm" style={{ background: entry.color ?? entry.payload?.fill }} />
          {entry.name}: <span className="text-text-primary">
            {currency && typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}
