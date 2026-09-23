import type { Verdict } from '../utils/gradingMath';
import type { SubmissionStatus } from '../types/grading';

export const VERDICT_STYLE: Record<Verdict, { label: string; className: string; textClass: string; blurb: string }> = {
  go: { label: 'Grade it', className: 'border-profit/40 bg-profit/10 text-profit', textClass: 'text-profit', blurb: '20%+ expected ROI with a 10-point cushion over break-even.' },
  marginal: { label: 'Marginal', className: 'border-caution/40 bg-caution/10 text-caution', textClass: 'text-caution', blurb: 'Profitable on paper, but thin — one bad grade erases it.' },
  pass: { label: 'Pass', className: 'border-loss/40 bg-loss/10 text-loss', textClass: 'text-loss', blurb: 'Expected value is below what it costs you.' },
};

// Printed where the grade sits on a slab label: big word + small caption
export const STATUS_STYLE: Record<SubmissionStatus, { label: string; word: string; caption: string; textClass: string }> = {
  planned: { label: 'Not sent', word: 'Not', caption: 'sent', textClass: 'text-text-secondary' },
  shipped: { label: 'In transit', word: 'Ship', caption: 'to PSA', textClass: 'text-accent' },
  'at-psa': { label: 'At PSA', word: 'At', caption: 'PSA', textClass: 'text-accent' },
  returned: { label: 'Graded', word: 'Graded', caption: 'returned', textClass: 'text-text-primary' },
};
