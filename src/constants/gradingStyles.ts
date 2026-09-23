import type { Verdict } from '../utils/gradingMath';
import type { SubmissionStatus } from '../types/grading';

export const VERDICT_STYLE: Record<Verdict, { label: string; className: string; textClass: string; blurb: string }> = {
  go: { label: 'Grade it', className: 'border-profit/40 bg-profit/10 text-profit', textClass: 'text-profit', blurb: '20%+ expected ROI with a 10-point cushion over break-even.' },
  marginal: { label: 'Marginal', className: 'border-pokemon/40 bg-pokemon/10 text-pokemon', textClass: 'text-pokemon', blurb: 'Profitable on paper, but thin — one bad grade erases it.' },
  pass: { label: 'Pass', className: 'border-loss/40 bg-loss/10 text-loss', textClass: 'text-loss', blurb: 'Expected value is below what it costs you.' },
};

export const STATUS_STYLE: Record<SubmissionStatus, { label: string; className: string }> = {
  planned: { label: 'Not Sent', className: 'border-text-secondary/30 bg-text-secondary/10 text-text-secondary' },
  shipped: { label: 'In Transit', className: 'pulse-soft border-accent/30 bg-accent/10 text-accent-light' },
  'at-psa': { label: 'At PSA', className: 'pulse-soft border-accent/30 bg-accent/10 text-accent-light' },
  returned: { label: 'Graded', className: 'border-profit/30 bg-profit/10 text-profit' },
};
