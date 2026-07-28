import { formatCurrency, scalePeriod } from '../taxEngine';

export function MobileSummaryBar({ netAnnualIncome }: { netAnnualIncome: number }) {
  return (
    <div className="mobile-summary-bar" aria-hidden="true">
      <div className="mobile-summary-primary">
        <span className="mobile-summary-label">Monthly</span>
        <span className="mobile-summary-value">
          {formatCurrency(scalePeriod(netAnnualIncome, 'monthly'))}
        </span>
      </div>
      <div className="mobile-summary-secondary">
        <span className="mobile-summary-label">Annual</span>
        <span className="mobile-summary-value">{formatCurrency(netAnnualIncome)}</span>
      </div>
    </div>
  );
}
