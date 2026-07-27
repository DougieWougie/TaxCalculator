import type { DisplayPeriod } from '../display';

export function PeriodSwitch({
  period,
  onChange,
}: {
  period: DisplayPeriod;
  onChange: (period: DisplayPeriod) => void;
}) {
  return (
    <div className="period-switch" role="group" aria-label="Display period">
      <button
        type="button"
        className={period === 'annual' ? 'active' : ''}
        aria-pressed={period === 'annual'}
        onClick={() => onChange('annual')}
      >
        Annual
      </button>
      <button
        type="button"
        className={period === 'monthly' ? 'active' : ''}
        aria-pressed={period === 'monthly'}
        onClick={() => onChange('monthly')}
      >
        Monthly
      </button>
    </div>
  );
}
