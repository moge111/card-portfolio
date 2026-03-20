export type Category = 'Pokemon' | 'One Piece' | 'MTG' | 'Naruto';

export interface GradingCard {
  id: number;
  name: string;
  category: Category;
  qty: number;
  totalCost: number;
  costPerCard: number;
  gradingCost: number;
  totalInvestment: number;
  psa10Value: number;
  psa9Value: number;
  psa10Rate: number;
  psa9Rate: number;
  sub9Rate: number;
  expected10s: number;
  expected9s: number;
  expectedSub9s: number;
  netRevenue: number;
  profit: number;
  roi: number;
  breakEven10Rate: number;
  // Actual grading results (if returned from PSA)
  gradedQty: number;
  actual10s: number;
  actual9s: number;
  actualSub9s: number;
}

export interface SealedProduct {
  id: number;
  name: string;
  category: Category;
  qty: number;
  costPerUnit: number;
  marketValuePerUnit: number;
  totalCost: number;
  totalMarketValue: number;
  profit: number;
  roi: number;
}

export interface PortfolioSummary {
  totalItems: number;
  totalInvested: number;
  totalExpectedProfit: number;
  overallROI: number;
  gradingTotals: { items: number; invested: number; profit: number; roi: number };
  sealedTotals: { items: number; invested: number; profit: number; roi: number };
  categoryBreakdown: Record<string, { invested: number; profit: number; count: number }>;
}
