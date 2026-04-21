export function PeriodToggle({
  isMonthly,
  onChange,
  ariaLabel = 'Input period',
}: {
  isMonthly: boolean;
  onChange: (isMonthly: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="period-toggle" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={`period-toggle-btn ${!isMonthly ? 'active' : ''}`}
        onClick={() => onChange(false)}
        aria-pressed={!isMonthly}
      >
        Annual
      </button>
      <button
        type="button"
        className={`period-toggle-btn ${isMonthly ? 'active' : ''}`}
        onClick={() => onChange(true)}
        aria-pressed={isMonthly}
      >
        Monthly
      </button>
    </div>
  );
}
