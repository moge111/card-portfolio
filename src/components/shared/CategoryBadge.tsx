import { CATEGORY_COLORS, CATEGORY_EMOJI } from '../../constants/theme';

export default function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || '#38bdf8';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{ borderColor: color + '35', backgroundColor: color + '12', color }}
    >
      <span className="text-[11px] leading-none">{CATEGORY_EMOJI[category] || '✨'}</span>
      {category}
    </span>
  );
}
