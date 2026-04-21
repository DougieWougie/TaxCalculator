import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <div className="theme-toggle-wrapper">
      <button
        className="theme-toggle"
        onClick={onToggle}
        aria-label={label}
        title={label}
      >
        <Sun className="theme-toggle-icon sun" size={14} aria-hidden="true" />
        <Moon className="theme-toggle-icon moon" size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
