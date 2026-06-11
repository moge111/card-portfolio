import { CATEGORY_COLORS } from '../../constants/theme';
import { triggerFlyBy } from './FlyBy';

export default function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || '#38bdf8';
  return (
    <span
      onMouseEnter={() => triggerFlyBy(category)}
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{ borderColor: color + '35', backgroundColor: color + '12', color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      {category}
    </span>
  );
}
