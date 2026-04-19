import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  calculate,
  formatCurrency,
  formatPercent,
  parseTaxCode,
  getOptimisationTargets,
  calculateOptimalPension,
  diffResults,
  scalePeriod,
  type TaxRegion,
  type CalculationInput,
  type CalculationResult,
  type PostTaxDeduction,
  type ScenarioDiff,
} from './taxEngine';
import { sanitizeNumber } from './sanitize';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { useNumericInput } from './hooks/useNumericInput';
import { BarRow } from './components/BarRow';
import { PeriodToggle } from './components/PeriodToggle';
import { ScenarioComparison } from './components/ScenarioComparison';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { ThemeToggle } from './components/ThemeToggle';
import { RegionCard } from './components/RegionCard';
import { IncomeCard } from './components/IncomeCard';
import { MilitaryPensionCard } from './components/MilitaryPensionCard';
import { PostTaxDeductionsCard } from './components/PostTaxDeductionsCard';

export default function App() {
  const { isDark, toggle } = useTheme();
  const [disclaimerDismissed, setDisclaimerDismissed] = useLocalStorage<boolean>(
    'disclaimer-dismissed',
    false
  );
  const showDisclaimer = !disclaimerDismissed;

  const dismissDisclaimer = useCallback(() => {
    setDisclaimerDismissed(true);
  }, [setDisclaimerDismissed]);

  const [annualSalary, setAnnualSalary] = useState('45000');
  const salarySacrificeInput = useNumericInput('0');
  const pensionContributionInput = useNumericInput('0');
  const [plTableShowMonthly, setPlTableShowMonthly] = useState(true);
  const [employerPension, setEmployerPension] = useState('0');
  const [militaryPension, setMilitaryPension] = useState('0');
  const [hasMilitaryPension, setHasMilitaryPension] = useState(false);
  const [taxRegion, setTaxRegion] = useState<TaxRegion>('scottish');
  const [postTaxDeductions, setPostTaxDeductions] = useState<{
    id: number;
    name: string;
    amount: string;
    isMonthly: boolean;
    monthlyInput: string;
  }[]>([]);
  const [nextDeductionId, setNextDeductionId] = useState(1);
  const [employmentTaxCode, setEmploymentTaxCode] = useState('');
  const [militaryPensionTaxCode, setMilitaryPensionTaxCode] = useState('');

  // Scenario comparison
  const [baseline, setBaseline] = useState<{
    input: CalculationInput;
    result: CalculationResult;
  } | null>(null);
  const [scenarioPreset, setScenarioPreset] = useState<string | null>(null);
  const [scenarioInput, setScenarioInput] = useState<CalculationInput | null>(null);

  // Slider for pension % (convenience)
  const [pensionPct, setPensionPct] = useState(0);

  // Slider for employer pension %
  const [employerPensionPct, setEmployerPensionPct] = useState(0);

  const handleEmployerPensionPctChange = useCallback(
    (pct: number) => {
      setEmployerPensionPct(pct);
      const salary = sanitizeNumber(annualSalary);
      setEmployerPension(((salary * pct) / 100).toFixed(0));
    },
    [annualSalary]
  );

  const handleEmployerPensionChange = useCallback((value: string) => {
    setEmployerPension(value);
    setEmployerPensionPct(0);
  }, []);

  const handlePensionTyped = useCallback(() => {
    setPensionPct(0);
  }, []);

  // Recalc employer pension when salary changes (if using slider)
  useEffect(() => {
    if (employerPensionPct > 0) {
      const salary = sanitizeNumber(annualSalary);
      setEmployerPension(((salary * employerPensionPct) / 100).toFixed(0));
    }
  }, [annualSalary, employerPensionPct]);

  const { setAnnualValue: setPensionAnnualValue } = pensionContributionInput;

  const handlePensionPctChange = useCallback(
    (pct: number) => {
      setPensionPct(pct);
      const salary = sanitizeNumber(annualSalary);
      setPensionAnnualValue(Math.round((salary * pct) / 100));
    },
    [annualSalary, setPensionAnnualValue]
  );

  // Recalc pension amount when salary changes (if using slider)
  useEffect(() => {
    if (pensionPct > 0) {
      const salary = sanitizeNumber(annualSalary);
      setPensionAnnualValue(Math.round((salary * pensionPct) / 100));
    }
  }, [annualSalary, pensionPct, setPensionAnnualValue]);

  const parsedPostTaxDeductions: PostTaxDeduction[] = useMemo(
    () => postTaxDeductions.map((d) => ({ name: d.name || 'Deduction', amount: sanitizeNumber(d.amount) })),
    [postTaxDeductions]
  );

  // Tax code validation (for display hints)
  const empTaxCodeInfo = useMemo(
    () => employmentTaxCode ? parseTaxCode(employmentTaxCode) : null,
    [employmentTaxCode]
  );
  const milTaxCodeInfo = useMemo(
    () => militaryPensionTaxCode ? parseTaxCode(militaryPensionTaxCode) : null,
    [militaryPensionTaxCode]
  );

  const currentInput: CalculationInput = useMemo(
    () => ({
      annualSalary: sanitizeNumber(annualSalary),
      salarySacrifice: salarySacrificeInput.annualValue,
      pensionContribution: pensionContributionInput.annualValue,
      employerPension: sanitizeNumber(employerPension),
      militaryPension: hasMilitaryPension ? sanitizeNumber(militaryPension) : 0,
      postTaxDeductions: parsedPostTaxDeductions,
      taxRegion,
      employmentTaxCode,
      militaryPensionTaxCode: hasMilitaryPension ? militaryPensionTaxCode : '',
    }),
    [annualSalary, salarySacrificeInput.annualValue, pensionContributionInput.annualValue, employerPension, militaryPension, hasMilitaryPension, parsedPostTaxDeductions, taxRegion, employmentTaxCode, militaryPensionTaxCode]
  );

  const result: CalculationResult = useMemo(
    () => calculate(currentInput),
    [currentInput]
  );

  const scenarioResult: CalculationResult | null = useMemo(
    () => scenarioInput ? calculate(scenarioInput) : null,
    [scenarioInput]
  );

  const scenarioDiff: ScenarioDiff | null = useMemo(
    () => (baseline && scenarioResult) ? diffResults(baseline.result, scenarioResult) : null,
    [baseline, scenarioResult]
  );

  const totalGross = sanitizeNumber(annualSalary) + (hasMilitaryPension ? sanitizeNumber(militaryPension) : 0);

  const optimisationTargets = useMemo(
    () => baseline ? getOptimisationTargets(baseline.input, baseline.result) : [],
    [baseline]
  );

  const handleApplyOptimise = useCallback(
    (threshold: number) => {
      if (!baseline) return;
      const pension = calculateOptimalPension(baseline.input, threshold);
      if (pension === null) return;
      const modified: CalculationInput = {
        ...baseline.input,
        pensionContribution: pension,
      };
      setScenarioInput(modified);
    },
    [baseline]
  );

  const handleApplySalaryChange = useCallback(
    (amount: number, isPercentage: boolean) => {
      if (!baseline) return;
      const newSalary = isPercentage
        ? baseline.input.annualSalary * (1 + amount / 100)
        : baseline.input.annualSalary + amount;
      const modified: CalculationInput = {
        ...baseline.input,
        annualSalary: Math.max(0, newSalary),
      };
      setScenarioInput(modified);
    },
    [baseline]
  );

  const handleApplySacrifice = useCallback(
    (amount: number) => {
      if (!baseline) return;
      const modified: CalculationInput = {
        ...baseline.input,
        salarySacrifice: Math.min(baseline.input.salarySacrifice + amount, baseline.input.annualSalary),
      };
      setScenarioInput(modified);
    },
    [baseline]
  );

  return (
    <>
      <div className="bg-pattern" />

      {showDisclaimer && <DisclaimerBanner onDismiss={dismissDisclaimer} />}

      <ThemeToggle isDark={isDark} onToggle={toggle} />

      <div className="app-container">
        <Header />

        <div className="main-grid">
          {/* LEFT: Inputs */}
          <div className="input-column">
            <RegionCard taxRegion={taxRegion} onChange={setTaxRegion} />

            <IncomeCard
              annualSalary={annualSalary}
              onAnnualSalaryChange={setAnnualSalary}
              salarySacrifice={salarySacrificeInput}
              pensionContribution={pensionContributionInput}
              pensionPct={pensionPct}
              onPensionPctChange={handlePensionPctChange}
              onPensionTyped={handlePensionTyped}
              employerPension={employerPension}
              onEmployerPensionChange={handleEmployerPensionChange}
              employerPensionPct={employerPensionPct}
              onEmployerPensionPctChange={handleEmployerPensionPctChange}
              employmentTaxCode={employmentTaxCode}
              onEmploymentTaxCodeChange={setEmploymentTaxCode}
              empTaxCodeInfo={empTaxCodeInfo}
              taxRegion={taxRegion}
            />

            <MilitaryPensionCard
              hasMilitaryPension={hasMilitaryPension}
              onHasMilitaryPensionChange={setHasMilitaryPension}
              militaryPension={militaryPension}
              onMilitaryPensionChange={setMilitaryPension}
              militaryPensionTaxCode={militaryPensionTaxCode}
              onMilitaryPensionTaxCodeChange={setMilitaryPensionTaxCode}
              milTaxCodeInfo={milTaxCodeInfo}
            />

            <PostTaxDeductionsCard
              postTaxDeductions={postTaxDeductions}
              setPostTaxDeductions={setPostTaxDeductions}
              nextDeductionId={nextDeductionId}
              setNextDeductionId={setNextDeductionId}
            />
          </div>

          {/* RIGHT: Results */}
          <div className="results-column">
            {/* Hero take-home */}
            <div className="summary-hero">
              <div className="summary-hero-label">Monthly Take-Home Pay</div>
              <div className="summary-hero-value">{formatCurrency(scalePeriod(result.netAnnualIncome, 'monthly'))}</div>
              <div className="summary-hero-sub">
                {formatCurrency(result.netAnnualIncome)} per year
              </div>
            </div>

            {/* Save as Baseline */}
            <div className="baseline-actions">
              <button
                className="baseline-btn"
                onClick={() => {
                  setBaseline({ input: currentInput, result });
                  setScenarioPreset(null);
                  setScenarioInput(null);
                }}
              >
                {baseline ? 'Update Baseline' : 'Save as Baseline'}
              </button>
              {baseline && (
                <button
                  className="baseline-clear"
                  onClick={() => {
                    setBaseline(null);
                    setScenarioPreset(null);
                    setScenarioInput(null);
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Net salary / net military pension sub-tiles */}
            {hasMilitaryPension && (
              <div className="stats-grid" style={{ marginTop: '0.75rem' }}>
                <div className="stat-card">
                  <div className="stat-label">Net Salary</div>
                  <div className="stat-value">
                    {formatCurrency(scalePeriod(result.netAnnualIncome - (result.militaryPension - result.militaryPensionTax), 'monthly'))}
                  </div>
                  <div className="stat-sub">per month</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Net Military Pension</div>
                  <div className="stat-value">
                    {formatCurrency(scalePeriod(result.militaryPension - result.militaryPensionTax, 'monthly'))}
                  </div>
                  <div className="stat-sub">per month</div>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div className="card" style={{ animationDelay: '0.15s' }}>
              <div className="card-title">
                <span className="card-title-icon">&#128202;</span>
                Income &amp; Deductions
                <span className="pl-table-period-toggle">
                  <PeriodToggle
                    isMonthly={plTableShowMonthly}
                    onChange={setPlTableShowMonthly}
                    ariaLabel="Display period"
                  />
                </span>
              </div>
              <table className={`pl-table ${plTableShowMonthly ? 'hide-annual' : 'hide-monthly'}`}>
                <thead>
                  <tr>
                    <th></th>
                    <th className="pl-col-monthly">Monthly</th>
                    <th className="pl-col-annual">Annual</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Income section */}
                  <tr className="section-header">
                    <td colSpan={3}>Income</td>
                  </tr>
                  <tr>
                    <td>Gross Salary</td>
                    <td className="pl-col-monthly">{formatCurrency(scalePeriod(result.grossSalary, 'monthly'))}</td>
                    <td className="pl-col-annual">{formatCurrency(result.grossSalary)}</td>
                  </tr>
                  {hasMilitaryPension && (
                    <tr>
                      <td>Military Pension</td>
                      <td className="pl-col-monthly">{formatCurrency(scalePeriod(result.militaryPension, 'monthly'))}</td>
                      <td className="pl-col-annual">{formatCurrency(result.militaryPension)}</td>
                    </tr>
                  )}
                  <tr className="subtotal-row">
                    <td>Total Income</td>
                    <td className="pl-col-monthly">{formatCurrency(scalePeriod(result.grossSalary + (hasMilitaryPension ? result.militaryPension : 0), 'monthly'))}</td>
                    <td className="pl-col-annual">{formatCurrency(result.grossSalary + (hasMilitaryPension ? result.militaryPension : 0))}</td>
                  </tr>

                  {/* Deductions section */}
                  <tr className="section-header">
                    <td colSpan={3}>Deductions</td>
                  </tr>
                  <tr>
                    <td>Income Tax</td>
                    <td className="pl-col-monthly negative">&minus;{formatCurrency(scalePeriod(result.incomeTax, 'monthly'))}</td>
                    <td className="pl-col-annual negative">&minus;{formatCurrency(result.incomeTax)}</td>
                  </tr>
                  <tr>
                    <td>National Insurance</td>
                    <td className="pl-col-monthly negative">&minus;{formatCurrency(scalePeriod(result.nationalInsurance, 'monthly'))}</td>
                    <td className="pl-col-annual negative">&minus;{formatCurrency(result.nationalInsurance)}</td>
                  </tr>
                  {result.otherSalarySacrifice > 0 && (
                    <tr>
                      <td>Pre-Tax Salary Sacrifice</td>
                      <td className="pl-col-monthly negative">&minus;{formatCurrency(scalePeriod(result.otherSalarySacrifice, 'monthly'))}</td>
                      <td className="pl-col-annual negative">&minus;{formatCurrency(result.otherSalarySacrifice)}</td>
                    </tr>
                  )}
                  {result.pensionContribution > 0 && (
                    <tr>
                      <td>Pension Contribution</td>
                      <td className="pl-col-monthly negative">&minus;{formatCurrency(scalePeriod(result.pensionContribution, 'monthly'))}</td>
                      <td className="pl-col-annual negative">&minus;{formatCurrency(result.pensionContribution)}</td>
                    </tr>
                  )}
                  {result.totalPostTaxDeductions > 0 && (
                    <tr>
                      <td>Post-Tax Deductions</td>
                      <td className="pl-col-monthly negative">&minus;{formatCurrency(scalePeriod(result.totalPostTaxDeductions, 'monthly'))}</td>
                      <td className="pl-col-annual negative">&minus;{formatCurrency(result.totalPostTaxDeductions)}</td>
                    </tr>
                  )}
                  <tr className="subtotal-row">
                    <td>Total Deductions</td>
                    <td className="pl-col-monthly negative">&minus;{formatCurrency(scalePeriod(result.incomeTax + result.nationalInsurance + result.totalSalarySacrifice + result.totalPostTaxDeductions, 'monthly'))}</td>
                    <td className="pl-col-annual negative">&minus;{formatCurrency(result.incomeTax + result.nationalInsurance + result.totalSalarySacrifice + result.totalPostTaxDeductions)}</td>
                  </tr>

                  {/* Net row */}
                  <tr className="net-row">
                    <td>Net Take-Home</td>
                    <td className="pl-col-monthly">{formatCurrency(scalePeriod(result.netAnnualIncome, 'monthly'))}</td>
                    <td className="pl-col-annual">{formatCurrency(result.netAnnualIncome)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Visual bar chart */}
              <div style={{ marginTop: '1.25rem' }}>
                <div className="bar-chart">
                  <BarRow label="Take Home" value={result.netAnnualIncome} total={totalGross} className="take-home" />
                  <BarRow label="Income Tax" value={result.incomeTax} total={totalGross} className="tax" />
                  <BarRow label="NI" value={result.nationalInsurance} total={totalGross} className="ni" />
                  {result.totalSalarySacrifice > 0 && (
                    <BarRow label="Sacrifice" value={result.totalSalarySacrifice} total={totalGross} className="sacrifice" />
                  )}
                  {result.totalPostTaxDeductions > 0 && (
                    <BarRow label="Post-Tax" value={result.totalPostTaxDeductions} total={totalGross} className="post-tax" />
                  )}
                  {hasMilitaryPension && result.militaryPension > 0 && (
                    <BarRow label="Military (net)" value={result.militaryPension - result.militaryPensionTax} total={totalGross} className="military" />
                  )}
                </div>
              </div>
            </div>

            {/* Tax rates */}
            <div className="card" style={{ animationDelay: '0.2s' }}>
              <div className="card-title">
                <span className="card-title-icon">&#128200;</span>
                Effective Rates
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Effective Tax Rate</div>
                  <div className="stat-value">{formatPercent(result.effectiveTaxRate)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Marginal Rate</div>
                  <div className="stat-value">{formatPercent(result.marginalTaxRate)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Personal Allowance</div>
                  <div className="stat-value">{formatCurrency(result.personalAllowance)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Taxable Income</div>
                  <div className="stat-value">{formatCurrency(result.totalTaxableIncome)}</div>
                </div>
              </div>
            </div>

            {/* Tax breakdown table */}
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

            {/* NI breakdown */}
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

            {/* Pension Summary */}
            {result.totalPensionPot > 0 && (
              <div className="card" style={{ animationDelay: '0.35s' }}>
                <div className="card-title">
                  <span className="card-title-icon">&#127974;</span>
                  Pension Summary
                </div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Your Contribution</div>
                    <div className="stat-value">{formatCurrency(pensionContributionInput.annualValue)}</div>
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
                    Your contribution of {formatCurrency(pensionContributionInput.annualValue)}/year is via salary sacrifice (pre-tax), saving you{' '}
                    {formatCurrency(
                      pensionContributionInput.annualValue * (result.effectiveTaxRate > 0
                        ? result.marginalTaxRate + (result.taxableEmploymentIncome >= 50_270 ? 0.02 : result.taxableEmploymentIncome > 12_570 ? 0.08 : 0)
                        : 0)
                    )}{' '}
                    in tax and NI. Employer contributions are paid on top of your salary.
                  </div>
                </div>
              </div>
            )}

            {/* Post-Tax Deductions Summary */}
            {result.totalPostTaxDeductions > 0 && (
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
            )}

            {/* Scenario Comparison */}
            {baseline && (
              <ScenarioComparison
                baseline={baseline}
                scenarioResult={scenarioResult}
                scenarioDiff={scenarioDiff}
                scenarioPreset={scenarioPreset}
                onSelectPreset={setScenarioPreset}
                onApplyOptimise={handleApplyOptimise}
                onApplySalaryChange={handleApplySalaryChange}
                onApplySacrifice={handleApplySacrifice}
                optimisationTargets={optimisationTargets}
              />
            )}
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
