import { Info, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  tone?: string;
  info?: string;
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend, tone, info }: StatCardProps) {
  const valueColor = tone ?? (trend === 'up' ? 'text-profit' : trend === 'down' ? 'text-loss' : 'text-text-primary');

  return (
    <div className="panel p-1.5">
      <div className="slab-label flex items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-text-primary">
          {title}
          {info && (
            <span title={info} className="cursor-help">
              <Info size={11} className="text-text-secondary/70 hover:text-accent" />
            </span>
          )}
        </span>
        {Icon && <Icon size={13} className="text-text-secondary/70" />}
      </div>
      <div className="px-3 pt-3 pb-2.5">
        <div className={`font-display text-[1.7rem] md:text-[2.1rem] font-bold leading-none tabular-nums ${valueColor}`}>{value}</div>
        {subtitle && <div className="mt-1.5 font-mono text-[10px] text-text-secondary">{subtitle}</div>}
      </div>
    </div>
  );
}
