import { formatPercent, type CalculationResult, type ScenarioDiff } from '../taxEngine';
import { formatForPeriod, periodSuffix, type DisplayPeriod } from '../display';
import { buildWaterfall, totalGross } from '../waterfall';

export function Readout({
  result,
  period,
  diff,
}: {
  result: CalculationResult;
  period: DisplayPeriod;
  diff: ScenarioDiff | null;
}) {
  const segments = buildWaterfall(result);
  const gross = totalGross(result);
  const otherPeriod: DisplayPeriod = period === 'monthly' ? 'annual' : 'monthly';

  return (
    <section className="readout" aria-label="Take-home summary">
      <div className="readout-head">
        <span className="label">Take-home · {period}</span>
        {diff && (
          <span
            className={`readout-delta ${diff.netAnnualIncome >= 0 ? 'up' : 'down'}`}
            aria-label={`Change versus baseline: ${formatForPeriod(diff.netAnnualIncome, period)}`}
          >
            {diff.netAnnualIncome >= 0 ? '▲' : '▼'} {formatForPeriod(Math.abs(diff.netAnnualIncome), period)}
          </span>
        )}
      </div>

      <div className="readout-figure figure">
        {formatForPeriod(result.netAnnualIncome, period)}
      </div>

      <div className="readout-sub">
        {formatForPeriod(result.netAnnualIncome, otherPeriod)} {periodSuffix(otherPeriod)}
        {' · '}eff {formatPercent(result.effectiveTaxRate)}
        {' · '}marg {formatPercent(result.marginalTaxRate)}
      </div>

      {segments.length > 0 && (
        <>
          <div
            className="readout-bar"
            role="img"
            aria-label={`Breakdown of ${formatForPeriod(gross, period)} gross income`}
          >
            {segments.map((segment) => (
              <i
                key={segment.key}
                className={`readout-bar-seg seg-${segment.key}`}
                style={{ width: `${segment.percentOfGross}%` }}
              />
            ))}
          </div>

          <dl className="readout-legend">
            {segments.map((segment) => (
              <div key={segment.key} className="readout-legend-row">
                <dt>
                  <i className={`readout-swatch seg-${segment.key}`} aria-hidden="true" />
                  {segment.label}
                </dt>
                <dd className="figure">{formatForPeriod(segment.amount, period)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
