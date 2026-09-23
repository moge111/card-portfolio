import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { defaultSubmissionMeta } from '../data/submissionMeta';
import { defaultPsaTiers } from '../constants/psaTiers';
import { toISODate, today } from '../utils/dates';
import type { Candidate, PsaTier, Submission } from '../types/grading';

export const STORAGE_KEY_SUBMISSION_META = 'portfolio-submission-meta';
export const STORAGE_KEY_CANDIDATES = 'portfolio-candidates';
export const STORAGE_KEY_TIERS = 'portfolio-psa-tiers';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

// Stored subs win; any default sub the user doesn't have yet is appended.
function loadSubmissionMeta(): Submission[] {
  const stored = load<Submission[]>(STORAGE_KEY_SUBMISSION_META, []);
  // Turnaround corrections (Sept 2026). Guarded on the originally shipped values
  // so hand edits in the UI win and a re-run is a no-op.
  for (const sub of stored) {
    if (sub.key === 4 && sub.turnaroundDays === 95) sub.turnaroundDays = 130;
    if ((sub.key === 5 || sub.key === 6) && !sub.tier && !sub.turnaroundDays) {
      sub.tier = 'Priority';
      sub.turnaroundDays = 80;
    }
  }
  const keys = new Set(stored.map((s) => s.key));
  return [...stored, ...defaultSubmissionMeta.filter((s) => !keys.has(s.key))].sort((a, b) => a.key - b.key);
}

export type NewCandidate = Omit<Candidate, 'id' | 'createdAt'>;

interface GradingDeskContextType {
  submissions: Submission[];
  candidates: Candidate[];
  tiers: PsaTier[];
  updateSubmission: (key: number, patch: Partial<Submission>) => void;
  addSubmission: () => number;
  deleteSubmission: (key: number) => void;
  addCandidate: (candidate: NewCandidate) => number;
  updateCandidate: (id: number, patch: Partial<Candidate>) => void;
  deleteCandidate: (id: number) => void;
  updateTier: (id: string, patch: Partial<PsaTier>) => void;
  resetTiers: () => void;
}

const GradingDeskContext = createContext<GradingDeskContextType | null>(null);

export function GradingDeskProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState<Submission[]>(loadSubmissionMeta);
  const [candidates, setCandidates] = useState<Candidate[]>(() => load(STORAGE_KEY_CANDIDATES, []));
  const [tiers, setTiers] = useState<PsaTier[]>(() => load(STORAGE_KEY_TIERS, defaultPsaTiers));

  const updateSubmission = useCallback((key: number, patch: Partial<Submission>) => {
    setSubmissions((prev) => {
      const next = prev.map((s) => (s.key === key ? { ...s, ...patch } : s));
      save(STORAGE_KEY_SUBMISSION_META, next);
      return next;
    });
  }, []);

  const addSubmission = useCallback(() => {
    const key = submissions.reduce((max, s) => Math.max(max, s.key), 0) + 1;
    // Display numbers lag map keys because Sub 5 was split into 5A/5B
    const displayNumber = key - 1;
    setSubmissions((prev) => {
      const next = [...prev, { key, name: `Sub ${displayNumber}`, shipping: 0, status: 'planned' as const }];
      save(STORAGE_KEY_SUBMISSION_META, next);
      return next;
    });
    return key;
  }, [submissions]);

  const deleteSubmission = useCallback((key: number) => {
    setSubmissions((prev) => {
      const next = prev.filter((s) => s.key !== key);
      save(STORAGE_KEY_SUBMISSION_META, next);
      return next;
    });
  }, []);

  const addCandidate = useCallback((candidate: NewCandidate) => {
    const id = candidates.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    setCandidates((prev) => {
      const next = [...prev, { ...candidate, id, createdAt: toISODate(today()) }];
      save(STORAGE_KEY_CANDIDATES, next);
      return next;
    });
    return id;
  }, [candidates]);

  const updateCandidate = useCallback((id: number, patch: Partial<Candidate>) => {
    setCandidates((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      save(STORAGE_KEY_CANDIDATES, next);
      return next;
    });
  }, []);

  const deleteCandidate = useCallback((id: number) => {
    setCandidates((prev) => {
      const next = prev.filter((c) => c.id !== id);
      save(STORAGE_KEY_CANDIDATES, next);
      return next;
    });
  }, []);

  const updateTier = useCallback((id: string, patch: Partial<PsaTier>) => {
    setTiers((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      save(STORAGE_KEY_TIERS, next);
      return next;
    });
  }, []);

  const resetTiers = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_TIERS);
    } catch {
      // ignore storage errors
    }
    setTiers(defaultPsaTiers);
  }, []);

  return (
    <GradingDeskContext.Provider value={{
      submissions, candidates, tiers,
      updateSubmission, addSubmission, deleteSubmission,
      addCandidate, updateCandidate, deleteCandidate,
      updateTier, resetTiers,
    }}>
      {children}
    </GradingDeskContext.Provider>
  );
}

export function useGradingDesk() {
  const ctx = useContext(GradingDeskContext);
  if (!ctx) throw new Error('useGradingDesk must be used within GradingDeskProvider');
  return ctx;
}
