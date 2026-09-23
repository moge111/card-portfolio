// Chart colors are CSS variables so they follow light/dark mode. The series
// values are validated for colorblind separation and contrast in index.css.
export const SERIES = {
  blue: 'var(--color-series-blue)',
  gold: 'var(--color-series-gold)',
  orange: 'var(--color-series-orange)',
  aqua: 'var(--color-series-aqua)',
  violet: 'var(--color-series-violet)',
};

// Fixed order keeps gold and orange apart (they fail side by side) and gives
// each franchise the same color on every chart.
export const CATEGORY_ORDER = ['Pokemon', 'MTG', 'Naruto', 'One Piece', 'Sports'];

export const CATEGORY_COLORS: Record<string, string> = {
  'Pokemon': SERIES.gold,
  'MTG': SERIES.violet,
  'Naruto': SERIES.aqua,
  'One Piece': SERIES.orange,
  'Sports': SERIES.blue,
};

export const CATEGORY_DOT: Record<string, string> = {
  'Pokemon': 'bg-series-gold',
  'MTG': 'bg-series-violet',
  'Naruto': 'bg-series-aqua',
  'One Piece': 'bg-series-orange',
  'Sports': 'bg-series-blue',
};

export function byCategoryOrder<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => CATEGORY_ORDER.indexOf(a.name) - CATEGORY_ORDER.indexOf(b.name));
}

// Non-category splits (e.g. Grading / Sealed / Singles)
export const CHART_COLORS = [SERIES.blue, SERIES.orange, SERIES.aqua];

// Grade outcomes: gold is reserved for 10s
export const GRADE_COLORS = { psa10: SERIES.gold, psa9: SERIES.blue, sub9: SERIES.orange };

export const CHART_GRID = 'var(--color-border)';
export const CHART_TICK = 'var(--color-text-secondary)';
export const CHART_TICK_STYLE = { fill: CHART_TICK, fontSize: 11, fontFamily: 'var(--font-mono)' };
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
