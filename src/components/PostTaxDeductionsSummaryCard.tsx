import { formatCurrency, scalePeriod, type CalculationResult } from '../taxEngine';

export function PostTaxDeductionsSummaryCard({ result }: { result: CalculationResult }) {
  if (result.totalPostTaxDeductions <= 0) return null;

  return (
    <div className="card" style={{ animationDelay: '0.4s' }}>
      <div className="card-title">
        <span className="card-title-icon">&#128181;</span>
        Post-Tax Deductions
      </div>
      <div className="breakdown-table-wrapper">
        <table className="breakdown-table">
          <thead>
            <tr>
              <th scope="col">Deduction</th>
              <th scope="col">Annual</th>
              <th scope="col">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {result.postTaxDeductions.filter((d) => d.amount > 0).map((d) => (
              <tr key={d.name}>
                <td className="band-name">{d.name}</td>
                <td>{formatCurrency(d.amount)}</td>
                <td>{formatCurrency(d.amount / 12)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>Total</td>
              <td>{formatCurrency(result.totalPostTaxDeductions)}</td>
              <td>{formatCurrency(scalePeriod(result.totalPostTaxDeductions, 'monthly'))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
