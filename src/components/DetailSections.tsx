import { formatPercent, type CalculationResult, type TaxBreakdownBand } from '../taxEngine';
import { formatForPeriod, type DisplayPeriod } from '../display';

function BandTable({
  bands,
  totalLabel,
  total,
  period,
}: {
  bands: TaxBreakdownBand[];
  totalLabel: string;
  total: number;
  period: DisplayPeriod;
}) {
  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            <th scope="col">Band</th>
            <th scope="col">Rate</th>
            <th scope="col">Taxable</th>
            <th scope="col">Tax</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band) => (
            <tr key={band.name}>
              <td>{band.name}</td>
              <td>{formatPercent(band.rate)}</td>
              <td className="figure">{formatForPeriod(band.taxableInBand, period)}</td>
              <td className="figure">{formatForPeriod(band.tax, period)}</td>
            </tr>
          ))}
          <tr className="detail-total">
            <td colSpan={3}>{totalLabel}</td>
            <td className="figure">{formatForPeriod(total, period)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="detail-section">
      <summary>
        <span className="detail-title">{title}</span>
        <span className="detail-summary figure">{summary}</span>
      </summary>
      <div className="detail-body">{children}</div>
    </details>
  );
}

export function DetailSections({
  result,
  period,
}: {
  result: CalculationResult;
  period: DisplayPeriod;
}) {
  return (
    <div className="detail-sections">
      <Section title="Income tax" summary={formatForPeriod(result.incomeTax, period)}>
        {result.usingTaxCodes ? (
          <>
            {result.employmentTaxBreakdown.length > 0 && (
              <>
                <p className="detail-label">
                  Employment
                  {result.employmentTaxCodeInfo && ` · ${result.employmentTaxCodeInfo.raw}`}
                </p>
                <BandTable
                  bands={result.employmentTaxBreakdown}
                  totalLabel="Employment tax"
                  total={result.employmentIncomeTax}
                  period={period}
                />
              </>
            )}
            {result.militaryTaxBreakdown.length > 0 && (
              <>
                <p className="detail-label">
                  Military pension
                  {result.militaryTaxCodeInfo && ` · ${result.militaryTaxCodeInfo.raw}`}
                </p>
                <BandTable
                  bands={result.militaryTaxBreakdown}
                  totalLabel="Military pension tax"
                  total={result.militaryPensionTax}
                  period={period}
                />
              </>
            )}
          </>
        ) : (
          <BandTable
            bands={result.taxBreakdown}
            totalLabel="Total income tax"
            total={result.incomeTax}
            period={period}
          />
        )}
      </Section>

      <Section
        title="National Insurance"
        summary={formatForPeriod(result.nationalInsurance, period)}
      >
        <p className="detail-label">Charged on employment income only</p>
        <div className="detail-table-wrap">
          <table className="detail-table">
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
                  <td>{band.name}</td>
                  <td>{formatPercent(band.rate)}</td>
                  <td className="figure">{formatForPeriod(band.earningsInBand, period)}</td>
                  <td className="figure">{formatForPeriod(band.contribution, period)}</td>
                </tr>
              ))}
              <tr className="detail-total">
                <td colSpan={3}>Total NI</td>
                <td className="figure">{formatForPeriod(result.nationalInsurance, period)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Pension" summary={formatForPeriod(result.totalPensionPot, period)}>
        <dl className="detail-rows">
          <div><dt>Your contribution</dt><dd className="figure">{formatForPeriod(result.pensionContribution, period)}</dd></div>
          <div><dt>Employer contribution</dt><dd className="figure">{formatForPeriod(result.employerPension, period)}</dd></div>
          <div className="detail-total-row"><dt>Total into pot</dt><dd className="figure">{formatForPeriod(result.totalPensionPot, period)}</dd></div>
        </dl>
      </Section>

      {result.postTaxDeductions.length > 0 && (
        <Section
          title="Post-tax deductions"
          summary={formatForPeriod(result.totalPostTaxDeductions, period)}
        >
          <dl className="detail-rows">
            {result.postTaxDeductions.map((deduction, index) => (
              <div key={`${deduction.name}-${index}`}>
                <dt>{deduction.name}</dt>
                <dd className="figure">{formatForPeriod(deduction.amount, period)}</dd>
              </div>
            ))}
            <div className="detail-total-row">
              <dt>Total</dt>
              <dd className="figure">{formatForPeriod(result.totalPostTaxDeductions, period)}</dd>
            </div>
          </dl>
        </Section>
      )}

      <Section
        title="Allowances"
        summary={formatForPeriod(result.personalAllowance, period)}
      >
        <dl className="detail-rows">
          <div><dt>Personal allowance</dt><dd className="figure">{formatForPeriod(result.personalAllowance, period)}</dd></div>
          <div><dt>Taxable income</dt><dd className="figure">{formatForPeriod(result.totalTaxableIncome, period)}</dd></div>
          <div><dt>Effective rate</dt><dd className="figure">{formatPercent(result.effectiveTaxRate)}</dd></div>
          <div><dt>Marginal rate</dt><dd className="figure">{formatPercent(result.marginalTaxRate)}</dd></div>
        </dl>
      </Section>
    </div>
  );
}
