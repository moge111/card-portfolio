import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  detail: string;
  figure?: { value: string; caption: string; tone?: string };
  children?: ReactNode;
}

// Every page opens with a slab label: page name where the card name goes,
// the page's headline number where the grade goes.
export default function PageHeader({ title, detail, figure, children }: PageHeaderProps) {
  return (
    <div className="mb-8 rise">
      <div className="slab-label px-4 pt-3 pb-2.5 md:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-secondary">Card Portfolio · {detail}</div>
            <h1 className="mt-1 font-display text-4xl md:text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-text-primary">{title}</h1>
          </div>
          {figure && (
            <div className="shrink-0 sm:text-right">
              <div className={`font-display text-4xl md:text-5xl font-extrabold leading-[0.9] tabular-nums ${figure.tone ?? 'text-text-primary'}`}>{figure.value}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-secondary">{figure.caption}</div>
            </div>
          )}
        </div>
        <div className="barcode mt-2.5" />
      </div>
      {children && <div className="mt-3 flex flex-wrap justify-end gap-2">{children}</div>}
    </div>
  );
}
