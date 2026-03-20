import { CATEGORY_COLORS } from '../../constants/theme';

export default function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || '#6366f1';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: color + '20', color }}
    >
      {category}
    </span>
  );
}
