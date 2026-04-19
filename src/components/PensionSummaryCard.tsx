import { formatCurrency, type CalculationResult } from '../taxEngine';

export function PensionSummaryCard({
  result,
  pensionContributionAnnual,
}: {
  result: CalculationResult;
  pensionContributionAnnual: number;
}) {
  if (result.totalPensionPot <= 0) return null;

  const niSaving =
    result.taxableEmploymentIncome >= 50_270
      ? 0.02
      : result.taxableEmploymentIncome > 12_570
      ? 0.08
      : 0;
  const effectiveRate = result.effectiveTaxRate > 0 ? result.marginalTaxRate + niSaving : 0;
  const saving = pensionContributionAnnual * effectiveRate;

  return (
    <div className="card" style={{ animationDelay: '0.35s' }}>
      <div className="card-title">
        <span className="card-title-icon">&#127974;</span>
        Pension Summary
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Your Contribution</div>
          <div className="stat-value">{formatCurrency(pensionContributionAnnual)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Employer Contribution</div>
          <div className="stat-value">{formatCurrency(result.employerPension)}</div>
        </div>
        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
          <div className="stat-label">Total Annual Pension Pot</div>
          <div className="stat-value positive">{formatCurrency(result.totalPensionPot)}</div>
        </div>
      </div>
      <div className="rates-info">
        <span aria-hidden="true">&#9432;</span>
        <div>
          Your contribution of {formatCurrency(pensionContributionAnnual)}/year is via salary sacrifice (pre-tax), saving you{' '}
          {formatCurrency(saving)}{' '}
          in tax and NI. Employer contributions are paid on top of your salary.
        </div>
      </div>
    </div>
  );
}
