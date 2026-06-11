import { CATEGORY_COLORS } from '../../constants/theme';

export default function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || '#d4a24e';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{ borderColor: color + '35', backgroundColor: color + '12', color }}
    >
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
      {category}
    </span>
  );
}
