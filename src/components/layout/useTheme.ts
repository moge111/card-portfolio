import { useCallback, useState } from 'react';

export type ThemePreference = 'auto' | 'light' | 'dark';
const THEME_KEY = 'portfolio-theme';

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

// 'auto' follows the OS; light/dark pin it via data-theme (index.html applies it before first paint)
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);

  const choose = useCallback((next: ThemePreference) => {
    setPreference(next);
    if (next === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    try {
      if (next === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  return { preference, choose };
}
