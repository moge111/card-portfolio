import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { gradingPortfolio as defaultGrading, sealedCollection as defaultSealed } from '../data';
import { recalcGradingCard, recalcSealedProduct } from '../utils/calculations';
import type { GradingCard, SealedProduct, Category } from '../types/portfolio';

const STORAGE_KEY_GRADING = 'portfolio-grading';
const STORAGE_KEY_SEALED = 'portfolio-sealed';

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Migrate grading cards: ensure soldPrices array exists
    if (key === STORAGE_KEY_GRADING) {
      for (const card of parsed) {
        if (!Array.isArray(card.soldPrices)) {
          card.soldPrices = [];
        }
      }
    }
    return parsed;
  } catch {
    return fallback;
  }
}

interface PortfolioContextType {
  gradingPortfolio: GradingCard[];
  sealedCollection: SealedProduct[];
  updateGradingCard: (id: number, field: keyof GradingCard, value: number | string) => void;
  updateSealedProduct: (id: number, field: keyof SealedProduct, value: number | string) => void;
  addGradingCard: () => void;
  addSealedProduct: () => void;
  deleteGradingCard: (id: number) => void;
  deleteSealedProduct: (id: number) => void;
  addSale: (cardId: number, price: number) => void;
  removeSale: (cardId: number, index: number) => void;
  resetAll: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [grading, setGrading] = useState<GradingCard[]>(() =>
    loadFromStorage(STORAGE_KEY_GRADING, defaultGrading),
  );
  const [sealed, setSealed] = useState<SealedProduct[]>(() =>
    loadFromStorage(STORAGE_KEY_SEALED, defaultSealed),
  );

  const updateGradingCard = useCallback((id: number, field: keyof GradingCard, value: number | string) => {
    setGrading((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        if (field === 'costPerCard') {
          updated.totalCost = (value as number) * updated.qty;
          updated.totalInvestment = updated.totalCost + updated.gradingCost;
        }
        if (field === 'qty') {
          updated.totalCost = updated.costPerCard * (value as number);
          updated.gradingCost = (value as number) * 18.99;
          updated.totalInvestment = updated.totalCost + updated.gradingCost;
        }
        return recalcGradingCard(updated);
      });
      localStorage.setItem(STORAGE_KEY_GRADING, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateSealedProduct = useCallback((id: number, field: keyof SealedProduct, value: number | string) => {
    setSealed((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        return recalcSealedProduct(updated);
      });
      localStorage.setItem(STORAGE_KEY_SEALED, JSON.stringify(next));
      return next;
    });
  }, []);

  const addSale = useCallback((cardId: number, price: number) => {
    setGrading((prev) => {
      const next = prev.map((c) =>
        c.id === cardId ? { ...c, soldPrices: [...c.soldPrices, price] } : c,
      );
      localStorage.setItem(STORAGE_KEY_GRADING, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeSale = useCallback((cardId: number, index: number) => {
    setGrading((prev) => {
      const next = prev.map((c) => {
        if (c.id !== cardId) return c;
        const soldPrices = c.soldPrices.filter((_, i) => i !== index);
        return { ...c, soldPrices };
      });
      localStorage.setItem(STORAGE_KEY_GRADING, JSON.stringify(next));
      return next;
    });
  }, []);

  const addGradingCard = useCallback(() => {
    setGrading((prev) => {
      const maxId = prev.reduce((max, c) => Math.max(max, c.id), 0);
      const newCard: GradingCard = {
        id: maxId + 1,
        name: 'New Card',
        category: 'Pokemon' as Category,
        qty: 1,
        totalCost: 0,
        costPerCard: 0,
        gradingCost: 18.99,
        totalInvestment: 18.99,
        psa10Value: 0,
        psa9Value: 0,
        psa10Rate: 0.5,
        psa9Rate: 0.4,
        sub9Rate: 0.1,
        expected10s: 0.5,
        expected9s: 0.4,
        expectedSub9s: 0.1,
        netRevenue: 0,
        profit: -18.99,
        roi: -100,
        breakEven10Rate: 0,
        gradedQty: 0,
        actual10s: 0,
        actual9s: 0,
        actualSub9s: 0,
        soldPrices: [],
      };
      const next = [...prev, recalcGradingCard(newCard)];
      localStorage.setItem(STORAGE_KEY_GRADING, JSON.stringify(next));
      return next;
    });
  }, []);

  const addSealedProduct = useCallback(() => {
    setSealed((prev) => {
      const maxId = prev.reduce((max, p) => Math.max(max, p.id), 0);
      const newProduct: SealedProduct = {
        id: maxId + 1,
        name: 'New Product',
        category: 'Pokemon' as Category,
        qty: 1,
        costPerUnit: 0,
        marketValuePerUnit: 0,
        totalCost: 0,
        totalMarketValue: 0,
        profit: 0,
        roi: 0,
      };
      const next = [...prev, newProduct];
      localStorage.setItem(STORAGE_KEY_SEALED, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteGradingCard = useCallback((id: number) => {
    setGrading((prev) => {
      const next = prev.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEY_GRADING, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteSealedProduct = useCallback((id: number) => {
    setSealed((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEY_SEALED, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_GRADING);
    localStorage.removeItem(STORAGE_KEY_SEALED);
    setGrading(defaultGrading);
    setSealed(defaultSealed);
  }, []);

  return (
    <PortfolioContext.Provider value={{
      gradingPortfolio: grading, sealedCollection: sealed,
      updateGradingCard, updateSealedProduct,
      addGradingCard, addSealedProduct,
      deleteGradingCard, deleteSealedProduct,
      addSale, removeSale,
      resetAll,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
