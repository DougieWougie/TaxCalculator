import { formatCurrency, scalePeriod } from '../taxEngine';

export function SummaryHero({ netAnnualIncome }: { netAnnualIncome: number }) {
  return (
    <div className="summary-hero">
      <div className="summary-hero-label">Monthly Take-Home Pay</div>
      <div className="summary-hero-value">{formatCurrency(scalePeriod(netAnnualIncome, 'monthly'))}</div>
      <div className="summary-hero-sub">
        {formatCurrency(netAnnualIncome)} per year
      </div>
    </div>
  );
}
