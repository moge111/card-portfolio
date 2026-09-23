import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div className={`panel p-1.5 ${className}`}>
      <div className="slab-label flex items-baseline justify-between gap-3 px-2.5 py-1.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-primary">{title}</h3>
        {subtitle && <p className="font-mono text-[10px] text-text-secondary">{subtitle}</p>}
      </div>
      <div className="relative z-[1] p-3.5">{children}</div>
    </div>
  );
}
