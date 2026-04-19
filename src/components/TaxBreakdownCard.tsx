import { formatCurrency, formatPercent, type CalculationResult } from '../taxEngine';

export function TaxBreakdownCard({ result }: { result: CalculationResult }) {
  return (
    <div className="card" style={{ animationDelay: '0.25s' }}>
      <div className="card-title">
        <span className="card-title-icon">&#128209;</span>
        Income Tax Breakdown
        {result.usingTaxCodes && (
          <span className="tax-code-badge">Using Tax Codes</span>
        )}
      </div>

      {result.usingTaxCodes && result.employmentTaxBreakdown.length > 0 && (
        <>
          <div className="breakdown-section-label">
            Employment Income
            {result.employmentTaxCodeInfo && (
              <span className="tax-code-inline">{result.employmentTaxCodeInfo.raw}</span>
            )}
          </div>
          <div className="breakdown-table-wrapper">
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th scope="col">Band</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Taxable</th>
                  <th scope="col">Tax</th>
                </tr>
              </thead>
              <tbody>
                {result.employmentTaxBreakdown.map((band) => (
                  <tr key={band.name}>
                    <td className="band-name">{band.name}</td>
                    <td className="rate">{formatPercent(band.rate)}</td>
                    <td>{formatCurrency(band.taxableInBand)}</td>
                    <td>{formatCurrency(band.tax)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}>Employment Tax</td>
                  <td>{formatCurrency(result.employmentIncomeTax)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {result.usingTaxCodes && result.militaryTaxBreakdown.length > 0 && (
        <>
          <div className="breakdown-section-label" style={{ marginTop: '1.25rem' }}>
            Military Pension
            {result.militaryTaxCodeInfo && (
              <span className="tax-code-inline">{result.militaryTaxCodeInfo.raw}</span>
            )}
          </div>
          <div className="breakdown-table-wrapper">
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th scope="col">Band</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Taxable</th>
                  <th scope="col">Tax</th>
                </tr>
              </thead>
              <tbody>
                {result.militaryTaxBreakdown.map((band) => (
                  <tr key={band.name}>
                    <td className="band-name">{band.name}</td>
                    <td className="rate">{formatPercent(band.rate)}</td>
                    <td>{formatCurrency(band.taxableInBand)}</td>
                    <td>{formatCurrency(band.tax)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={3}>Military Pension Tax</td>
                  <td>{formatCurrency(result.militaryPensionTax)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!result.usingTaxCodes && (
        <div className="breakdown-table-wrapper">
          <table className="breakdown-table">
            <thead>
              <tr>
                <th scope="col">Band</th>
                <th scope="col">Rate</th>
                <th scope="col">Taxable</th>
                <th scope="col">Tax</th>
              </tr>
            </thead>
            <tbody>
              {result.taxBreakdown.map((band) => (
                <tr key={band.name}>
                  <td className="band-name">{band.name}</td>
                  <td className="rate">{formatPercent(band.rate)}</td>
                  <td>{formatCurrency(band.taxableInBand)}</td>
                  <td>{formatCurrency(band.tax)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={3}>Total Income Tax</td>
                <td>{formatCurrency(result.incomeTax)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {result.usingTaxCodes && (
        <div className="tax-code-total">
          <span>Combined Income Tax</span>
          <span>{formatCurrency(result.incomeTax)}</span>
        </div>
      )}
    </div>
  );
}
