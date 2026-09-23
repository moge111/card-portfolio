import type { PsaTier } from '../types/grading';

// PSA trading-card tiers. Open tiers verified on psacard.com 2026-09-23.
// Value tiers are from PSA's Feb 2026 update and have been paused since —
// kept here so they can be flipped back on when PSA reopens them.
// Editable in the app (Should I Grade? → PSA tiers); these are the defaults.
export const PSA_TIERS_VERIFIED = '2026-09-23';

export const defaultPsaTiers: PsaTier[] = [
  { id: 'value-bulk', name: 'Value Bulk', feePerCard: 24.99, maxDeclaredValue: 500, turnaroundMin: 95, turnaroundMax: 95, paused: true, minCards: 20 },
  { id: 'value', name: 'Value', feePerCard: 32.99, maxDeclaredValue: 500, turnaroundMin: 75, turnaroundMax: 75, paused: true },
  { id: 'value-plus', name: 'Value Plus', feePerCard: 49.99, maxDeclaredValue: 1000, turnaroundMin: 45, turnaroundMax: 45, paused: true },
  { id: 'value-max', name: 'Value Max', feePerCard: 64.99, maxDeclaredValue: 2500, turnaroundMin: 35, turnaroundMax: 35, paused: true },
  { id: 'standard', name: 'Standard', feePerCard: 59.99, maxDeclaredValue: 1000, turnaroundMin: 90, turnaroundMax: 100 },
  { id: 'priority', name: 'Priority', feePerCard: 79.99, maxDeclaredValue: 1500, turnaroundMin: 70, turnaroundMax: 80 },
  { id: 'express', name: 'Express', feePerCard: 199, maxDeclaredValue: 2500, turnaroundMin: 20, turnaroundMax: 30 },
  { id: 'super-express', name: 'Super Express', feePerCard: 349, maxDeclaredValue: 5000, turnaroundMin: 10, turnaroundMax: 15 },
  { id: 'premier', name: 'Premier', feePerCard: 599, maxDeclaredValue: 10000, turnaroundMin: 7, turnaroundMax: 10 },
];
