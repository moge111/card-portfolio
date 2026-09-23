import { EBAY_FEE, SHIPPING_COST_PER_SALE } from '../constants/fees';
import type { GradingCard } from '../types/portfolio';
import type { AxisCall, GradeAxis, PsaTier, Submission } from '../types/grading';
import { addBusinessDays, addDays, businessDaysBetween, parseDate, today } from './dates';

export const TRANSIT_TO_PSA_DAYS = 4;
export const RETURN_TRANSIT_DAYS = 7;
export const DEFAULT_DAYS_TO_SHIP = 7;
export const DEFAULT_DAYS_TO_SELL = 21;

// Net cash from one eBay sale at a given price.
export function netSale(price: number): number {
  return price > 0 ? price * (1 - EBAY_FEE) - SHIPPING_COST_PER_SALE : 0;
}

export interface GradeInputs {
  qty: number;
  rawCost: number;
  psa10Value: number;
  psa9Value: number;
  sub9Value: number;
  psa10Rate: number;
  psa9Rate: number;
  feePerCard: number;
  shippingPerCard: number;
}

export interface GradeOutcome {
  costPerCard: number;
  expectedNetPerCard: number;
  profitPerCard: number;
  profit: number;
  roi: number;
  breakEven10Rate: number; // 0–1; <0 means profitable with zero 10s, >1 means never
  allTensProfit: number;
  noTensProfit: number;
  worstCaseProfit: number;
}

export function gradeOutcome(i: GradeInputs): GradeOutcome {
  const sub9Rate = Math.max(0, 1 - i.psa10Rate - i.psa9Rate);
  const net10 = netSale(i.psa10Value);
  const net9 = netSale(i.psa9Value);
  const netSub9 = netSale(i.sub9Value);
  const costPerCard = i.rawCost + i.feePerCard + i.shippingPerCard;
  const expectedNetPerCard = i.psa10Rate * net10 + i.psa9Rate * net9 + sub9Rate * netSub9;
  const profitPerCard = expectedNetPerCard - costPerCard;

  // Non-10s keep their current 9 vs sub-9 split while the 10 rate moves
  const non10 = i.psa9Rate + sub9Rate;
  const share9 = non10 > 0 ? i.psa9Rate / non10 : 1;
  const non10Net = share9 * net9 + (1 - share9) * netSub9;
  const breakEven10Rate = net10 !== non10Net ? (costPerCard - non10Net) / (net10 - non10Net) : Infinity;

  return {
    costPerCard,
    expectedNetPerCard,
    profitPerCard,
    profit: profitPerCard * i.qty,
    roi: costPerCard > 0 ? (profitPerCard / costPerCard) * 100 : 0,
    breakEven10Rate,
    allTensProfit: (net10 - costPerCard) * i.qty,
    noTensProfit: (non10Net - costPerCard) * i.qty,
    worstCaseProfit: (netSub9 - costPerCard) * i.qty,
  };
}

export type Verdict = 'go' | 'marginal' | 'pass';

export function verdictFor(outcome: GradeOutcome, psa10Rate: number): Verdict {
  if (outcome.profit <= 0) return 'pass';
  const cushion = psa10Rate - outcome.breakEven10Rate;
  if (outcome.roi >= 20 && cushion >= 0.1) return 'go';
  return 'marginal';
}

// PSA prices by declared value = what the card is worth AFTER grading. Declaring
// the PSA 10 value avoids an upcharge if it gems.
export function eligibleTiers(tiers: PsaTier[], declaredValue: number): PsaTier[] {
  return tiers
    .filter((t) => !t.paused && t.maxDeclaredValue >= declaredValue)
    .sort((a, b) => a.feePerCard - b.feePerCard);
}

export function cheapestTier(tiers: PsaTier[], declaredValue: number): PsaTier | undefined {
  return eligibleTiers(tiers, declaredValue)[0];
}

// ---------- Pre-grade calls → suggested 10 rate ----------

export const AXES: GradeAxis[] = ['centering', 'corners', 'edges', 'surface'];
export const AXIS_CALLS: AxisCall[] = ['10', '9-10', '9', '≤8', '?'];

const CALL_FACTOR: Record<AxisCall, number> = { '10': 1, '9-10': 0.6, '9': 0.3, '≤8': 0, '?': 0.75 };
const CLEAN_CARD_TEN_RATE = 0.85;

// Transparent heuristic: a card clean on all four axes starts at 85%, and each
// weaker or unverified axis multiplies it down. Any axis at 8 or below ≈ no 10.
export function suggestedTenRate(calls: Partial<Record<GradeAxis, AxisCall>>): number | null {
  const assessed = AXES.filter((a) => calls[a]);
  if (assessed.length === 0) return null;
  if (AXES.some((a) => calls[a] === '≤8')) return 0.03;
  return AXES.reduce((rate, a) => rate * CALL_FACTOR[calls[a] ?? '?'], CLEAN_CARD_TEN_RATE);
}

// Maps the free-text calls in a /grade findings.json onto the fixed scale.
export function normalizeCall(raw: string): AxisCall {
  const s = raw.trim().toLowerCase().replace('–', '-');
  if (s === '10') return '10';
  if (s === '9-10') return '9-10';
  if (s === '9') return '9';
  if (/^[1-8](-[0-9])?$/.test(s) || s === 'lower') return '≤8';
  return '?';
}

// ---------- Calibration: predicted vs actual PSA results ----------

export interface CalibrationRow {
  label: string;
  graded: number;
  predicted10s: number;
  actual10s: number;
  predicted9s: number;
  actual9s: number;
}

export function calibrationRow(label: string, cards: GradingCard[]): CalibrationRow {
  return cards.reduce<CalibrationRow>(
    (row, c) => ({
      ...row,
      graded: row.graded + c.gradedQty,
      predicted10s: row.predicted10s + c.psa10Rate * c.gradedQty,
      actual10s: row.actual10s + c.actual10s,
      predicted9s: row.predicted9s + c.psa9Rate * c.gradedQty,
      actual9s: row.actual9s + c.actual9s,
    }),
    { label, graded: 0, predicted10s: 0, actual10s: 0, predicted9s: 0, actual9s: 0 },
  );
}

export const CALIBRATION_BUCKETS = [
  { label: 'Under 40%', min: 0, max: 0.4 },
  { label: '40–70%', min: 0.4, max: 0.7 },
  { label: '70–85%', min: 0.7, max: 0.85 },
  { label: '85%+', min: 0.85, max: Infinity },
];

export function gradedCards(cards: GradingCard[]): GradingCard[] {
  return cards.filter((c) => c.gradedQty > 0);
}

const MIN_GRADED_FOR_CALIBRATION = 10;

export interface Calibration {
  factor: number;
  scope: string; // the category it came from, or 'all cards'
}

// actual 10s ÷ predicted 10s, clamped so a small sample can't swing estimates wildly
function factorFrom(cards: GradingCard[]): number | null {
  const row = calibrationRow('', cards);
  if (row.graded < MIN_GRADED_FOR_CALIBRATION || row.predicted10s === 0) return null;
  return Math.min(1.5, Math.max(0.5, row.actual10s / row.predicted10s));
}

// Category-specific when that category has enough graded cards, since one
// franchise missing badly shouldn't drag down estimates for the others.
export function calibrationFor(cards: GradingCard[], category?: string): Calibration | null {
  const graded = gradedCards(cards);
  if (category) {
    const factor = factorFrom(graded.filter((c) => c.category === category));
    if (factor) return { factor, scope: category };
  }
  const factor = factorFrom(graded);
  return factor ? { factor, scope: 'all cards' } : null;
}

// ---------- Submission ETAs ----------

export interface SubmissionEta {
  arrived: Date;
  gradesBack: Date;
  home: Date;
  elapsed: number; // business days at PSA so far
  progress: number; // 0–1
}

export function submissionEta(sub: Submission): SubmissionEta | null {
  if (!sub.dateShipped || !sub.turnaroundDays) return null;
  if (sub.status !== 'shipped' && sub.status !== 'at-psa') return null;
  const arrived = addDays(parseDate(sub.dateShipped), TRANSIT_TO_PSA_DAYS);
  const gradesBack = addBusinessDays(arrived, sub.turnaroundDays);
  const elapsed = businessDaysBetween(arrived, today());
  return {
    arrived,
    gradesBack,
    home: addDays(gradesBack, RETURN_TRANSIT_DAYS),
    elapsed,
    progress: Math.min(1, elapsed / sub.turnaroundDays),
  };
}

// ---------- Cashflow timeline for a buy-and-grade decision ----------

export interface CashEvent {
  date: Date;
  label: string;
  detail: string;
  amount: number;
  balance: number;
}

export interface TimelineInputs {
  start: Date;
  alreadyOwned: boolean;
  daysToShip: number;
  turnaroundMin: number;
  turnaroundMax: number;
  daysToSell: number;
  rawTotal: number;
  gradingTotal: number;
  shippingTotal: number;
  expectedRevenue: number;
}

export interface Timeline {
  events: CashEvent[];
  gradesBackEarliest: Date;
  gradesBackLatest: Date;
  cashBack: Date;
  daysTiedUp: number;
  peakOutlay: number;
}

export function buildTimeline(i: TimelineInputs): Timeline {
  const shipDate = addDays(i.start, i.alreadyOwned ? 0 : i.daysToShip);
  const arrived = addDays(shipDate, TRANSIT_TO_PSA_DAYS);
  const gradesBackEarliest = addBusinessDays(arrived, i.turnaroundMin);
  const gradesBackLatest = addBusinessDays(arrived, i.turnaroundMax);
  const home = addDays(gradesBackLatest, RETURN_TRANSIT_DAYS);
  const cashBack = addDays(home, i.daysToSell);

  const raw: Omit<CashEvent, 'balance'>[] = [
    ...(i.alreadyOwned ? [] : [{ date: i.start, label: 'Buy', detail: 'Pay for the raw card(s)', amount: -i.rawTotal }]),
    { date: shipDate, label: 'Ship to PSA', detail: 'Grading fee + shipping/insurance', amount: -(i.gradingTotal + i.shippingTotal) },
    { date: arrived, label: 'PSA receives', detail: `Clock starts · ${i.turnaroundMin === i.turnaroundMax ? i.turnaroundMax : `${i.turnaroundMin}–${i.turnaroundMax}`} business days`, amount: 0 },
    { date: gradesBackLatest, label: 'Grades posted', detail: 'Latest estimate; could be earlier', amount: 0 },
    { date: home, label: 'Slabs home', detail: `~${RETURN_TRANSIT_DAYS} days return transit`, amount: 0 },
    { date: cashBack, label: 'Sold', detail: `Expected net after eBay fees, ~${i.daysToSell} days to sell`, amount: i.expectedRevenue },
  ];

  let balance = i.alreadyOwned ? -i.rawTotal : 0;
  const events = raw.map((e) => {
    balance += e.amount;
    return { ...e, balance };
  });
  const peakOutlay = -Math.min(...events.map((e) => e.balance));

  return {
    events,
    gradesBackEarliest,
    gradesBackLatest,
    cashBack,
    daysTiedUp: Math.round((cashBack.getTime() - i.start.getTime()) / 86_400_000),
    peakOutlay,
  };
}

// Scale your 10 rate by how your past estimates actually landed. Tens that
// disappear mostly become 9s; extra tens come out of the 9s.
export function applyCalibration(psa10Rate: number, psa9Rate: number, factor: number | null): { psa10Rate: number; psa9Rate: number } {
  if (!factor) return { psa10Rate, psa9Rate };
  const adjusted10 = Math.min(0.98, psa10Rate * factor);
  const adjusted9 = Math.min(1 - adjusted10, Math.max(0, psa9Rate + (psa10Rate - adjusted10)));
  return { psa10Rate: adjusted10, psa9Rate: adjusted9 };
}

// ---------- Fee check for planned subs ----------

export interface FeeCheckRow {
  card: GradingCard;
  subQty: number;
  budgetPerCard: number;
  tier: PsaTier | undefined;
  shortfall: number; // for all copies in this sub
}

// Compares each card's budgeted grading fee with the cheapest open PSA tier
// that covers its PSA 10 value (declared value = value after grading).
export function feeCheck(entries: { card: GradingCard; subQty: number }[], tiers: PsaTier[]): FeeCheckRow[] {
  return entries.map(({ card, subQty }) => {
    const budgetPerCard = card.qty > 0 ? card.gradingCost / card.qty : 0;
    const tier = cheapestTier(tiers, card.psa10Value);
    const required = tier?.feePerCard ?? budgetPerCard;
    return { card, subQty, budgetPerCard, tier, shortfall: Math.max(0, required - budgetPerCard) * subQty };
  });
}
