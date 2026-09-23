import type { ReactNode } from 'react';

interface SlabProps {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

// A panel with its title on a red-bordered label strip
export default function Slab({ title, actions, className = '', children }: SlabProps) {
  return (
    <div className={`panel p-1.5 ${className}`}>
      <div className="slab-label flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-primary">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}
