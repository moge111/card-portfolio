import { Info, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  info?: string;
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend, info }: StatCardProps) {
  const trendColor = trend === 'up' ? 'text-profit' : trend === 'down' ? 'text-loss' : 'text-text-primary';

  return (
    <div className="panel panel-hover gold-hairline group p-5">
      <div className="flex items-start justify-between mb-4">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
          {title}
          {info && (
            <span title={info} className="cursor-help">
              <Info size={11} className="text-text-secondary/50 transition-colors hover:text-accent" />
            </span>
          )}
        </span>
        <span className="rounded-lg bg-gradient-to-br from-accent/25 to-holo/25 p-1.5 shadow-[0_0_14px_-4px_rgba(56,189,248,0.55)]">
          <Icon size={15} className="wiggle text-accent-light" />
        </span>
      </div>
      <div className={`font-display text-[1.75rem] font-medium leading-none tracking-tight tabular-nums ${trendColor}`}>
        {value}
      </div>
      {subtitle && <div className="mt-2 font-mono text-[10px] text-text-secondary/80">{subtitle}</div>}
    </div>
  );
}
