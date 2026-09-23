import type { Submission } from '../types/grading';

// Defaults for submission metadata; user edits persist to localStorage.
// Keys match defaultSubmissionMaps (5 = Sub 5A, 6 = Sub 5B, 7 = Sub 6).
// Return dates for Subs 1–3 are when results were logged in this repo, not
// PSA's exact ship date. Sub 5A/5B ship date is approximate (contents were
// finalized 7/10/26). Sub 4 went in as PSA paused Value — its real turnaround
// is running ~6 months (~130 business days), not the published 95.
export const defaultSubmissionMeta: Submission[] = [
  { key: 1, name: 'Sub 1', orderNumber: '26141760', tier: 'TCG Bulk', shipping: 47.33, status: 'returned', dateReturned: '2026-03-20' },
  { key: 2, name: 'Sub 2', description: 'Pokemon', orderNumber: '26141834', tier: 'TCG Bulk', shipping: 46.55, status: 'returned', dateReturned: '2026-03-28' },
  { key: 3, name: 'Sub 3', description: 'One Piece / Naruto', orderNumber: '26541215', shipping: 0, status: 'returned', dateReturned: '2026-05-18' },
  { key: 4, name: 'Sub 4', description: 'Mixed', orderNumber: '14972306', tier: 'Value Bulk', turnaroundDays: 130, shipping: 112.07, status: 'at-psa', dateShipped: '2026-05-28' },
  { key: 5, name: 'Sub 5A', description: 'Chinese Pokemon', tier: 'Priority', turnaroundDays: 80, shipping: 0, status: 'at-psa', dateShipped: '2026-07-10' },
  { key: 6, name: 'Sub 5B', description: 'Chinese Pokemon', tier: 'Priority', turnaroundDays: 80, shipping: 0, status: 'at-psa', dateShipped: '2026-07-10' },
  { key: 7, name: 'Sub 6', description: 'High-value singles', shipping: 0, status: 'planned' },
];
