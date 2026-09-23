import { useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useGradingDesk } from '../../context/GradingDeskContext';
import {
  applyCalibration, calibrationFor, cheapestTier, gradeOutcome, verdictFor,
  type Calibration, type GradeOutcome, type Verdict,
} from '../../utils/gradingMath';
import type { Candidate, PsaTier } from '../../types/grading';

const FALLBACK_SHIPPING_PER_CARD = 3;

// Portfolio-derived defaults for the grading tools: how your past 10-rate
// estimates landed, and what shipping has actually cost you per card.
export function useDeskStats() {
  const { gradingPortfolio, submissionMaps } = usePortfolio();
  const { submissions } = useGradingDesk();

  return useMemo(() => {
    const invoiced = submissions.filter((s) => s.shipping > 0);
    const cards = invoiced.reduce((n, s) => n + Object.values(submissionMaps[s.key] ?? {}).reduce((a, b) => a + b, 0), 0);
    const shipping = invoiced.reduce((n, s) => n + s.shipping, 0);
    return {
      calibrationFor: (category?: string) => calibrationFor(gradingPortfolio, category),
      shippingPerCard: cards > 0 ? +(shipping / cards).toFixed(2) : FALLBACK_SHIPPING_PER_CARD,
    };
  }, [gradingPortfolio, submissionMaps, submissions]);
}

export interface CandidateEvaluation {
  calibration: Calibration | null;
  tier: PsaTier | undefined;
  psa10Rate: number;
  psa9Rate: number;
  outcome: GradeOutcome;
  verdict: Verdict;
}

export function evaluateCandidate(
  c: Candidate,
  tiers: PsaTier[],
  shippingPerCard: number,
  calibration: Calibration | null,
): CandidateEvaluation {
  const tier = cheapestTier(tiers, c.psa10Value);
  const rates = applyCalibration(c.psa10Rate, c.psa9Rate, calibration?.factor ?? null);
  const outcome = gradeOutcome({
    qty: c.qty,
    rawCost: c.rawCost,
    psa10Value: c.psa10Value,
    psa9Value: c.psa9Value,
    sub9Value: c.sub9Value,
    psa10Rate: rates.psa10Rate,
    psa9Rate: rates.psa9Rate,
    feePerCard: tier?.feePerCard ?? 0,
    shippingPerCard,
  });
  return { calibration, tier, ...rates, outcome, verdict: verdictFor(outcome, rates.psa10Rate) };
}
