import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useTheme() {
  const [isDark, setIsDark] = useLocalStorage<boolean>('theme-dark', readLegacyTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d) };
}

function readLegacyTheme(): boolean {
  if (typeof window === 'undefined') return true;
  const legacy = window.localStorage.getItem('theme');
  if (legacy === 'light') return false;
  return true;
}
