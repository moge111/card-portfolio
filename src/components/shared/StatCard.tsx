import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend }: StatCardProps) {
  const trendColor = trend === 'up' ? 'text-profit' : trend === 'down' ? 'text-loss' : 'text-text-secondary';

  return (
    <div className="bg-surface rounded-xl border border-border p-5 hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-text-secondary text-sm font-medium">{title}</span>
        <div className="p-2 rounded-lg bg-accent/10">
          <Icon size={18} className="text-accent" />
        </div>
      </div>
      <div className={`text-2xl font-bold ${trendColor}`}>{value}</div>
      {subtitle && <div className="text-xs text-text-secondary mt-1">{subtitle}</div>}
    </div>
  );
}
