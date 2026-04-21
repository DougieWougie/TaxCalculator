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
        <span className="theme-toggle-icon sun" aria-hidden="true">&#9728;</span>
        <span className="theme-toggle-icon moon" aria-hidden="true">&#9790;</span>
      </button>
    </div>
  );
}
