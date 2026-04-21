import { useState } from 'react';
import { Scale } from 'lucide-react';
import {
  formatCurrency,
  formatPercent,
  scalePeriod,
  type CalculationInput,
  type CalculationResult,
  type ScenarioDiff,
  type OptimisationTarget,
} from '../taxEngine';

export function ScenarioComparison({
  baseline,
  scenarioResult,
  scenarioDiff,
  scenarioPreset,
  onSelectPreset,
  onApplyOptimise,
  onApplySalaryChange,
  onApplySacrifice,
  optimisationTargets,
}: {
  baseline: { input: CalculationInput; result: CalculationResult };
  scenarioResult: CalculationResult | null;
  scenarioDiff: ScenarioDiff | null;
  scenarioPreset: string | null;
  onSelectPreset: (preset: string | null) => void;
  onApplyOptimise: (threshold: number) => void;
  onApplySalaryChange: (amount: number, isPercentage: boolean) => void;
  onApplySacrifice: (amount: number) => void;
  optimisationTargets: OptimisationTarget[];
}) {
  const [salaryChangeValue, setSalaryChangeValue] = useState('');
  const [salaryChangeIsPercent, setSalaryChangeIsPercent] = useState(true);
  const [sacrificeValue, setSacrificeValue] = useState('');

  const formatDelta = (value: number, isCurrency: boolean, invertSign: boolean = false) => {
    const displayValue = invertSign ? -value : value;
    if (Math.abs(value) < 0.005) return { text: '\u2014', className: 'delta-neutral' };
    const sign = displayValue > 0 ? '+' : '';
    const formatted = isCurrency ? formatCurrency(Math.abs(displayValue)) : formatPercent(Math.abs(displayValue));
    const text = displayValue >= 0 ? `${sign}${formatted}` : `\u2212${formatted}`;
    const className = displayValue > 0 ? 'delta-positive' : 'delta-negative';
    return { text, className };
  };

  type ComparisonRow = {
    label: string;
    baselineValue: string;
    scenarioValue: string;
    diffValue: number;
    isCurrency: boolean;
    invertSign?: boolean;
    highlight?: boolean;
  };

  const rows: ComparisonRow[] = scenarioResult && scenarioDiff ? [
    { label: 'Gross Salary', baselineValue: formatCurrency(baseline.result.grossSalary), scenarioValue: formatCurrency(scenarioResult.grossSalary), diffValue: scenarioDiff.grossSalary, isCurrency: true },
    { label: 'Pension Contribution', baselineValue: formatCurrency(baseline.result.pensionContribution), scenarioValue: formatCurrency(scenarioResult.pensionContribution), diffValue: scenarioDiff.pensionContribution, isCurrency: true },
    { label: 'Salary Sacrifice', baselineValue: formatCurrency(baseline.result.otherSalarySacrifice), scenarioValue: formatCurrency(scenarioResult.otherSalarySacrifice), diffValue: scenarioDiff.salarySacrifice, isCurrency: true },
    { label: 'Income Tax', baselineValue: formatCurrency(baseline.result.incomeTax), scenarioValue: formatCurrency(scenarioResult.incomeTax), diffValue: scenarioDiff.incomeTax, isCurrency: true, invertSign: true },
    { label: 'National Insurance', baselineValue: formatCurrency(baseline.result.nationalInsurance), scenarioValue: formatCurrency(scenarioResult.nationalInsurance), diffValue: scenarioDiff.nationalInsurance, isCurrency: true, invertSign: true },
    { label: 'Take-Home / month', baselineValue: formatCurrency(scalePeriod(baseline.result.netAnnualIncome, 'monthly')), scenarioValue: formatCurrency(scalePeriod(scenarioResult.netAnnualIncome, 'monthly')), diffValue: scalePeriod(scenarioDiff.netAnnualIncome, 'monthly'), isCurrency: true, highlight: true },
    { label: 'Take-Home / year', baselineValue: formatCurrency(baseline.result.netAnnualIncome), scenarioValue: formatCurrency(scenarioResult.netAnnualIncome), diffValue: scenarioDiff.netAnnualIncome, isCurrency: true },
    { label: 'Effective Rate', baselineValue: formatPercent(baseline.result.effectiveTaxRate), scenarioValue: formatPercent(scenarioResult.effectiveTaxRate), diffValue: scenarioDiff.effectiveTaxRate, isCurrency: false, invertSign: true },
    { label: 'Marginal Rate', baselineValue: formatPercent(baseline.result.marginalTaxRate), scenarioValue: formatPercent(scenarioResult.marginalTaxRate), diffValue: scenarioDiff.marginalTaxRate, isCurrency: false, invertSign: true },
    { label: 'Pension Pot', baselineValue: formatCurrency(baseline.result.totalPensionPot), scenarioValue: formatCurrency(scenarioResult.totalPensionPot), diffValue: scenarioDiff.totalPensionPot, isCurrency: true },
  ] : [];

  return (
    <div className="card" style={{ animationDelay: '0.45s' }}>
      <div className="card-title">
        <span className="card-title-icon"><Scale size={18} /></span>
        Scenario Comparison
      </div>

      {/* Preset buttons */}
      <div className="preset-buttons">
        <button
          className={`preset-btn ${scenarioPreset === 'optimise' ? 'active' : ''}`}
          onClick={() => onSelectPreset(scenarioPreset === 'optimise' ? null : 'optimise')}
        >
          Optimise Tax Band
        </button>
        <button
          className={`preset-btn ${scenarioPreset === 'salary' ? 'active' : ''}`}
          onClick={() => onSelectPreset(scenarioPreset === 'salary' ? null : 'salary')}
        >
          Salary Change
        </button>
        <button
          className={`preset-btn ${scenarioPreset === 'sacrifice' ? 'active' : ''}`}
          onClick={() => onSelectPreset(scenarioPreset === 'sacrifice' ? null : 'sacrifice')}
        >
          Add Sacrifice
        </button>
      </div>

      {/* Optimise tax band sub-options */}
      {scenarioPreset === 'optimise' && (
        <div className="preset-sub-options">
          {optimisationTargets.length > 0 ? (
            optimisationTargets.map((target) => (
              <button
                key={target.threshold}
                className="preset-sub-btn"
                onClick={() => onApplyOptimise(target.threshold)}
              >
                Drop below {target.name}
              </button>
            ))
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.25rem' }}>
              Already in the lowest available tax band
            </span>
          )}
        </div>
      )}

      {/* Salary change input */}
      {scenarioPreset === 'salary' && (
        <div className="preset-param-row">
          <div className="period-toggle" role="group" aria-label="Salary change type">
            <button
              type="button"
              className={`period-toggle-btn ${salaryChangeIsPercent ? 'active' : ''}`}
              onClick={() => setSalaryChangeIsPercent(true)}
              aria-pressed={salaryChangeIsPercent}
            >
              %
            </button>
            <button
              type="button"
              className={`period-toggle-btn ${!salaryChangeIsPercent ? 'active' : ''}`}
              onClick={() => setSalaryChangeIsPercent(false)}
              aria-pressed={!salaryChangeIsPercent}
            >
              £
            </button>
          </div>
          <div className="input-wrapper">
            <span className="input-prefix">{salaryChangeIsPercent ? '%' : '\u00A3'}</span>
            <input
              className="input-field"
              type="text"
              inputMode="decimal"
              value={salaryChangeValue}
              onChange={(e) => setSalaryChangeValue(e.target.value)}
              placeholder={salaryChangeIsPercent ? 'e.g. 5' : 'e.g. 3000'}
              autoComplete="off"
            />
          </div>
          <button
            className="preset-apply-btn"
            onClick={() => {
              const val = parseFloat(salaryChangeValue);
              if (!isNaN(val)) onApplySalaryChange(val, salaryChangeIsPercent);
            }}
          >
            Apply
          </button>
        </div>
      )}

      {/* Add sacrifice input */}
      {scenarioPreset === 'sacrifice' && (
        <div className="preset-param-row">
          <div className="input-wrapper">
            <span className="input-prefix">£</span>
            <input
              className="input-field"
              type="text"
              inputMode="decimal"
              value={sacrificeValue}
              onChange={(e) => setSacrificeValue(e.target.value)}
              placeholder="e.g. 2400 (annual)"
              autoComplete="off"
            />
          </div>
          <button
            className="preset-apply-btn"
            onClick={() => {
              const val = parseFloat(sacrificeValue);
              if (!isNaN(val) && val > 0) onApplySacrifice(val);
            }}
          >
            Apply
          </button>
        </div>
      )}

      {/* Comparison table */}
      {scenarioResult && scenarioDiff && (
        <>
          <div className="breakdown-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Baseline</th>
                  <th>Scenario</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const delta = formatDelta(row.diffValue, row.isCurrency, row.invertSign);
                  return (
                    <tr key={row.label} className={row.highlight ? 'highlight-row' : ''}>
                      <td>{row.label}</td>
                      <td>{row.baselineValue}</td>
                      <td>{row.scenarioValue}</td>
                      <td className={delta.className}>{delta.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary sentence */}
          <div className="scenario-summary">
            {scenarioDiff.netAnnualIncome > 0 ? (
              <>
                Scenario increases take-home by{' '}
                <strong>{formatCurrency(Math.abs(scalePeriod(scenarioDiff.netAnnualIncome, 'monthly')))}/mo</strong>
                {' '}({formatCurrency(Math.abs(scenarioDiff.netAnnualIncome))}/yr)
              </>
            ) : scenarioDiff.netAnnualIncome < 0 ? (
              <>
                Scenario reduces take-home by{' '}
                <strong>{formatCurrency(Math.abs(scalePeriod(scenarioDiff.netAnnualIncome, 'monthly')))}/mo</strong>
                {' '}({formatCurrency(Math.abs(scenarioDiff.netAnnualIncome))}/yr)
                {scenarioDiff.totalPensionPot > 0 && (
                  <>, but adds <strong>{formatCurrency(scenarioDiff.totalPensionPot)}/yr</strong> to your pension pot</>
                )}
                {scenarioDiff.incomeTax < 0 && (
                  <>, saving <strong>{formatCurrency(Math.abs(scenarioDiff.incomeTax))}/yr</strong> in tax</>
                )}
              </>
            ) : (
              <span>No change to take-home pay.</span>
            )}
          </div>
        </>
      )}

      {!scenarioResult && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Choose a preset above to generate a comparison scenario.
        </p>
      )}
    </div>
  );
}
