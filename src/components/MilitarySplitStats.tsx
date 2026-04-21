import { formatCurrency, scalePeriod } from '../taxEngine';

export function MilitarySplitStats({
  netAnnualIncome,
  militaryPension,
  militaryPensionTax,
}: {
  netAnnualIncome: number;
  militaryPension: number;
  militaryPensionTax: number;
}) {
  const netMilitary = militaryPension - militaryPensionTax;
  return (
    <div className="stats-grid" style={{ marginTop: '0.75rem' }}>
      <div className="stat-card">
        <div className="stat-label">Net Salary</div>
        <div className="stat-value">
          {formatCurrency(scalePeriod(netAnnualIncome - netMilitary, 'monthly'))}
        </div>
        <div className="stat-sub">per month</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Net Military Pension</div>
        <div className="stat-value">{formatCurrency(scalePeriod(netMilitary, 'monthly'))}</div>
        <div className="stat-sub">per month</div>
      </div>
    </div>
  );
}
