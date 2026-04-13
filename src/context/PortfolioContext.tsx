import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { gradingPortfolio as defaultGrading, sealedCollection as defaultSealed, singlesCollection as defaultSingles } from '../data';
import { recalcGradingCard, recalcSealedProduct, recalcSingle } from '../utils/calculations';
import type { GradingCard, SealedProduct, Single, Category } from '../types/portfolio';

const STORAGE_KEY_GRADING = 'portfolio-grading';
const STORAGE_KEY_SEALED = 'portfolio-sealed';
const STORAGE_KEY_SINGLES = 'portfolio-singles';
const STORAGE_KEY_VERSION = 'portfolio-data-version';
const CURRENT_DATA_VERSION = 5; // Bump when default data changes

function loadGradingWithMerge(defaults: GradingCard[]): GradingCard[] {
  try {
    const version = parseInt(localStorage.getItem(STORAGE_KEY_VERSION) || '0');
    const raw = localStorage.getItem(STORAGE_KEY_GRADING);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_VERSION, String(CURRENT_DATA_VERSION));
      return defaults;
    }
    const stored: GradingCard[] = JSON.parse(raw);
    if (version >= CURRENT_DATA_VERSION) {
      for (const card of stored) {
        if (!Array.isArray(card.soldPrices)) card.soldPrices = [];
      }
      return stored;
    }
    // Merge: use defaults but preserve user-entered soldPrices
    // v5 migration: subtract $2 shipping cost from all existing sales
    const soldMap = new Map(stored.map((c) => [c.id, c.soldPrices || []]));
    if (version < 5) {
      for (const [id, prices] of soldMap) {
        soldMap.set(id, prices.map((p) => +(p - 2).toFixed(2)));
      }
    }
    const merged = defaults.map((c) => ({
      ...c,
      soldPrices: soldMap.get(c.id) || [],
    }));
    // Keep any user-added cards not in defaults
    const defaultIds = new Set(defaults.map((c) => c.id));
    for (const c of stored) {
      if (!defaultIds.has(c.id)) {
        if (!Array.isArray(c.soldPrices)) c.soldPrices = [];
        merged.push(c);
      }
    }
    localStorage.setItem(STORAGE_KEY_GRADING, JSON.stringify(merged));
    localStorage.setItem(STORAGE_KEY_VERSION, String(CURRENT_DATA_VERSION));
    return merged;
  } catch {
    return defaults;
  }
}

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

interface PortfolioContextType {
  gradingPortfolio: GradingCard[];
  sealedCollection: SealedProduct[];
  singlesCollection: Single[];
  updateGradingCard: (id: number, field: keyof GradingCard, value: number | string) => void;
  updateSealedProduct: (id: number, field: keyof SealedProduct, value: number | string) => void;
  updateSingle: (id: number, field: keyof Single, value: number | string) => void;
  addGradingCard: () => void;
  addSealedProduct: () => void;
  addSingle: () => void;
  deleteGradingCard: (id: number) => void;
  deleteSealedProduct: (id: number) => void;
  deleteSingle: (id: number) => void;
  addSale: (cardId: number, price: number) => void;
  removeSale: (cardId: number, index: number) => void;
  updateSale: (cardId: number, index: number, newPrice: number) => void;
  resetAll: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [grading, setGrading] = useState<GradingCard[]>(() =>
    loadGradingWithMerge(defaultGrading),
  );
  const [sealed, setSealed] = useState<SealedProduct[]>(() =>
    loadFromStorage(STORAGE_KEY_SEALED, defaultSealed),
  );
  const [singles, setSingles] = useState<Single[]>(() =>
    loadFromStorage(STORAGE_KEY_SINGLES, defaultSingles),
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

  const updateSale = useCallback((cardId: number, index: number, newPrice: number) => {
    setGrading((prev) => {
      const next = prev.map((c) => {
        if (c.id !== cardId) return c;
        const soldPrices = [...c.soldPrices];
        soldPrices[index] = newPrice;
        return { ...c, soldPrices };
      });
      localStorage.setItem(STORAGE_KEY_GRADING, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateSingle = useCallback((id: number, field: keyof Single, value: number | string) => {
    setSingles((prev) => {
      const next = prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        return recalcSingle(updated);
      });
      localStorage.setItem(STORAGE_KEY_SINGLES, JSON.stringify(next));
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

  const addSingle = useCallback(() => {
    setSingles((prev) => {
      const maxId = prev.reduce((max, s) => Math.max(max, s.id), 0);
      const newSingle: Single = {
        id: maxId + 1,
        name: 'New Card',
        category: 'Pokemon' as Category,
        qty: 1,
        costPerCard: 0,
        marketValue: 0,
        totalCost: 0,
        totalMarketValue: 0,
        profit: 0,
        roi: 0,
      };
      const next = [...prev, newSingle];
      localStorage.setItem(STORAGE_KEY_SINGLES, JSON.stringify(next));
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

  const deleteSingle = useCallback((id: number) => {
    setSingles((prev) => {
      const next = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY_SINGLES, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_GRADING);
    localStorage.removeItem(STORAGE_KEY_SEALED);
    localStorage.removeItem(STORAGE_KEY_SINGLES);
    setGrading(defaultGrading);
    setSealed(defaultSealed);
    setSingles(defaultSingles);
  }, []);

  return (
    <PortfolioContext.Provider value={{
      gradingPortfolio: grading, sealedCollection: sealed, singlesCollection: singles,
      updateGradingCard, updateSealedProduct, updateSingle,
      addGradingCard, addSealedProduct, addSingle,
      deleteGradingCard, deleteSealedProduct, deleteSingle,
      addSale, removeSale, updateSale,
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
