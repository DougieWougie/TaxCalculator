import { formatCurrency, formatPercent, type CalculationResult } from '../taxEngine';

export function NiBreakdownCard({
  result,
  hasMilitaryPension,
}: {
  result: CalculationResult;
  hasMilitaryPension: boolean;
}) {
  return (
    <div className="card" style={{ animationDelay: '0.3s' }}>
      <div className="card-title">
        <span className="card-title-icon">&#128179;</span>
        National Insurance Breakdown
      </div>
      <div className="breakdown-table-wrapper">
        <table className="breakdown-table">
          <thead>
            <tr>
              <th scope="col">Band</th>
              <th scope="col">Rate</th>
              <th scope="col">Earnings</th>
              <th scope="col">NI</th>
            </tr>
          </thead>
          <tbody>
            {result.niBreakdown.map((band) => (
              <tr key={band.name}>
                <td className="band-name">{band.name}</td>
                <td className="rate">{formatPercent(band.rate)}</td>
                <td>{formatCurrency(band.earningsInBand)}</td>
                <td>{formatCurrency(band.contribution)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={3}>Total NI</td>
              <td>{formatCurrency(result.nationalInsurance)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {hasMilitaryPension && (
        <div className="rates-info">
          <span>&#127894;</span>
          <div>
            Military pension of {formatCurrency(result.militaryPension)} is <strong>exempt from NI</strong>.
            Tax on military pension: {formatCurrency(result.militaryPensionTax)}/year.
          </div>
        </div>
      )}
    </div>
  );
}
