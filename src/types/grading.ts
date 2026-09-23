import type { Category } from './portfolio';

export interface PsaTier {
  id: string;
  name: string;
  feePerCard: number;
  maxDeclaredValue: number;
  turnaroundMin: number; // business days
  turnaroundMax: number; // business days
  paused?: boolean;
  minCards?: number;
}

export type SubmissionStatus = 'planned' | 'shipped' | 'at-psa' | 'returned';

// Metadata for a PSA submission. `key` matches the key in SubmissionMaps
// (which cards + quantities are in the sub).
export interface Submission {
  key: number;
  name: string;
  description?: string;
  orderNumber?: string;
  tier?: string; // free-text label — PSA renames/reprices tiers, past subs keep what they paid
  turnaroundDays?: number; // expected business days at PSA
  shipping: number; // inbound + insurance + return shipping for the whole sub
  status: SubmissionStatus;
  dateShipped?: string; // YYYY-MM-DD
  dateReturned?: string; // YYYY-MM-DD
}

export type GradeAxis = 'centering' | 'corners' | 'edges' | 'surface';
export type AxisCall = '10' | '9-10' | '9' | '≤8' | '?';

export type CandidateStage = 'watching' | 'bought' | 'pregraded' | 'queued' | 'submitted' | 'passed';

export interface Candidate {
  id: number;
  name: string;
  category: Category;
  stage: CandidateStage;
  qty: number;
  rawCost: number; // per card — ask price or what you paid
  psa10Value: number;
  psa9Value: number;
  sub9Value: number; // what a sub-9 slab resells for
  psa10Rate: number; // your call, 0–1
  psa9Rate: number;
  calls: Partial<Record<GradeAxis, AxisCall>>;
  confidence?: 'low' | 'medium' | 'high';
  limitingDefect?: string;
  notes?: string;
  link?: string; // listing URL
  reportPath?: string; // /grade HTML report
  createdAt: string;
  submissionKey?: number;
  gradingCardId?: number;
}
