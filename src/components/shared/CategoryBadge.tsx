import { CATEGORY_DOT } from '../../constants/theme';

export default function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
      <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[category] ?? 'bg-series-blue'}`} />
      {category}
    </span>
  );
}
