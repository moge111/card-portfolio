import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div className={`panel p-5 ${className}`}>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-text-primary">{title}</h3>
        {subtitle && <p className="font-mono text-[10px] text-text-secondary/80">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
