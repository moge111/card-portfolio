import type { GradingCard, SealedProduct } from '../types/portfolio';

const EBAY_FEE = 0.1325;

export function recalcGradingCard(c: GradingCard): GradingCard {
  const expected10s = +(c.qty * c.psa10Rate).toFixed(1);
  const expected9s = +(c.qty * c.psa9Rate).toFixed(1);
  const expectedSub9s = +(c.qty * c.sub9Rate).toFixed(1);
  const grossRevenue =
    c.qty * c.psa10Rate * c.psa10Value +
    c.qty * c.psa9Rate * c.psa9Value +
    c.qty * c.sub9Rate * c.costPerCard;
  const netRevenue = +(grossRevenue * (1 - EBAY_FEE)).toFixed(2);
  const profit = +(netRevenue - c.totalInvestment).toFixed(2);
  const roi = c.totalInvestment > 0 ? +((profit / c.totalInvestment) * 100).toFixed(1) : 0;
  const breakEven10Rate = c.psa10Value > 0
    ? +(((c.totalInvestment - c.qty * c.psa9Rate * c.psa9Value * (1 - EBAY_FEE) - c.qty * c.sub9Rate * c.costPerCard * (1 - EBAY_FEE)) / (c.qty * c.psa10Value * (1 - EBAY_FEE))) * 100).toFixed(1)
    : 0;

  return {
    ...c,
    expected10s,
    expected9s,
    expectedSub9s,
    netRevenue,
    profit,
    roi,
    breakEven10Rate,
  };
}

export function recalcSealedProduct(p: SealedProduct): SealedProduct {
  const totalCost = +(p.qty * p.costPerUnit).toFixed(2);
  const totalMarketValue = +(p.qty * p.marketValuePerUnit).toFixed(2);
  const profit = +(totalMarketValue - totalCost).toFixed(2);
  const roi = totalCost > 0 ? +((profit / totalCost) * 100).toFixed(1) : 0;

  return { ...p, totalCost, totalMarketValue, profit, roi };
}
