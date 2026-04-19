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
  type OptimisationTarget,
} from './taxEngine';
import { sanitizeNumber } from './sanitize';
import { useLocalStorage } from './hooks/useLocalStorage';

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true; // dark by default
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d) };
}

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
  const [salarySacrifice, setSalarySacrifice] = useState('0');
  const [salarySacrificeIsMonthly, setSalarySacrificeIsMonthly] = useState(false);
  const [plTableShowMonthly, setPlTableShowMonthly] = useState(true);
  const [salarySacrificeMonthlyInput, setSalarySacrificeMonthlyInput] = useState('0');
  const [pensionContribution, setPensionContribution] = useState('0');
  const [pensionContributionIsMonthly, setPensionContributionIsMonthly] = useState(false);
  const [pensionContributionMonthlyInput, setPensionContributionMonthlyInput] = useState('0');
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

  // Recalc employer pension when salary changes (if using slider)
  useEffect(() => {
    if (employerPensionPct > 0) {
      const salary = sanitizeNumber(annualSalary);
      setEmployerPension(((salary * employerPensionPct) / 100).toFixed(0));
    }
  }, [annualSalary, employerPensionPct]);

  const handlePensionPctChange = useCallback(
    (pct: number) => {
      setPensionPct(pct);
      const salary = sanitizeNumber(annualSalary);
      const annual = ((salary * pct) / 100).toFixed(0);
      setPensionContribution(annual);
      if (pensionContributionIsMonthly) {
        setPensionContributionMonthlyInput((parseFloat(annual) / 12).toFixed(2));
      }
    },
    [annualSalary, pensionContributionIsMonthly]
  );

  // Recalc pension amount when salary changes (if using slider)
  useEffect(() => {
    if (pensionPct > 0) {
      const salary = sanitizeNumber(annualSalary);
      const annual = ((salary * pensionPct) / 100).toFixed(0);
      setPensionContribution(annual);
      if (pensionContributionIsMonthly) {
        setPensionContributionMonthlyInput((parseFloat(annual) / 12).toFixed(2));
      }
    }
  }, [annualSalary, pensionPct, pensionContributionIsMonthly]);

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

  const result: CalculationResult = useMemo(
    () =>
      calculate({
        annualSalary: sanitizeNumber(annualSalary),
        salarySacrifice: sanitizeNumber(salarySacrifice),
        pensionContribution: sanitizeNumber(pensionContribution),
        employerPension: sanitizeNumber(employerPension),
        militaryPension: hasMilitaryPension ? sanitizeNumber(militaryPension) : 0,
        postTaxDeductions: parsedPostTaxDeductions,
        taxRegion,
        employmentTaxCode,
        militaryPensionTaxCode: hasMilitaryPension ? militaryPensionTaxCode : '',
      }),
    [annualSalary, salarySacrifice, pensionContribution, employerPension, militaryPension, hasMilitaryPension, parsedPostTaxDeductions, taxRegion, employmentTaxCode, militaryPensionTaxCode]
  );

  const currentInput: CalculationInput = useMemo(
    () => ({
      annualSalary: sanitizeNumber(annualSalary),
      salarySacrifice: sanitizeNumber(salarySacrifice),
      pensionContribution: sanitizeNumber(pensionContribution),
      employerPension: sanitizeNumber(employerPension),
      militaryPension: hasMilitaryPension ? sanitizeNumber(militaryPension) : 0,
      postTaxDeductions: parsedPostTaxDeductions,
      taxRegion,
      employmentTaxCode,
      militaryPensionTaxCode: hasMilitaryPension ? militaryPensionTaxCode : '',
    }),
    [annualSalary, salarySacrifice, pensionContribution, employerPension, militaryPension, hasMilitaryPension, parsedPostTaxDeductions, taxRegion, employmentTaxCode, militaryPensionTaxCode]
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

      {showDisclaimer && (
        <div className="disclaimer-banner" role="alert">
          <div className="disclaimer-content">
            <span className="disclaimer-icon" aria-hidden="true">&#9888;</span>
            <p>
              <strong>Disclaimer:</strong> This application was developed using AI for AI research purposes.
              It should only be used as a guide. All AI-generated output should be independently verified.
            </p>
            <button
              className="disclaimer-dismiss"
              onClick={dismissDisclaimer}
              aria-label="Dismiss disclaimer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="theme-toggle-wrapper">
        <button
          className="theme-toggle"
          onClick={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="theme-toggle-icon sun" aria-hidden="true">&#9728;</span>
          <span className="theme-toggle-icon moon" aria-hidden="true">&#9790;</span>
        </button>
      </div>

      <div className="app-container">
        <header className="header">
          <h1>UK Pension &amp; Salary Calculator</h1>
          <p>See exactly what you take home after tax, NI, and pension contributions</p>
          <div className="tax-year-badge">Tax Year 2025 &ndash; 26</div>
        </header>

        <div className="main-grid">
          {/* LEFT: Inputs */}
          <div className="input-column">
            {/* Tax Region */}
            <div className="card" style={{ animationDelay: '0.05s' }}>
              <div className="card-title">
                <span className="card-title-icon">&#127988;</span>
                Tax Region
              </div>
              <div className="region-toggle">
                <button
                  className={`region-btn scottish ${taxRegion === 'scottish' ? 'active' : ''}`}
                  onClick={() => setTaxRegion('scottish')}
                >
                  &#127988;&#917607;&#917602;&#917619;&#917603;&#917620;&#917631; Scotland
                </button>
                <button
                  className={`region-btn english ${taxRegion === 'english' ? 'active' : ''}`}
                  onClick={() => setTaxRegion('english')}
                >
                  &#127468;&#127463; England / Wales / NI
                </button>
              </div>
              <div className="rates-info" style={{ marginTop: '1rem' }} aria-live="polite">
                <span aria-hidden="true">&#9432;</span>
                <div>
                  {taxRegion === 'scottish'
                    ? 'Scotland has 6 income tax bands (19%\u201348%). Your tax code starts with "S".'
                    : 'England, Wales & NI use 3 income tax bands (20%\u201345%).'}
                </div>
              </div>
            </div>

            {/* Income */}
            <div className="card" style={{ animationDelay: '0.1s' }}>
              <div className="card-title">
                <span className="card-title-icon">&#128176;</span>
                Employment Income
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="salary">Annual Gross Salary</label>
                <div className="input-wrapper">
                  <span className="input-prefix">&pound;</span>
                  <input
                    id="salary"
                    className="input-field"
                    type="text"
                    inputMode="decimal"
                    value={annualSalary}
                    onChange={(e) => setAnnualSalary(e.target.value)}
                    placeholder="45000"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-label-row">
                  <label className="input-label" htmlFor="sacrifice">
                    Pre-Tax Salary Sacrifice (excl. pension)
                  </label>
                  <PeriodToggle
                    isMonthly={salarySacrificeIsMonthly}
                    onChange={(newIsMonthly) => {
                      setSalarySacrificeIsMonthly(newIsMonthly);
                      if (newIsMonthly) {
                        setSalarySacrificeMonthlyInput(
                          (sanitizeNumber(salarySacrifice) / 12).toFixed(2)
                        );
                      }
                    }}
                  />
                </div>
                <div className="input-wrapper">
                  <span className="input-prefix">&pound;</span>
                  <input
                    id="sacrifice"
                    className="input-field"
                    type="text"
                    inputMode="decimal"
                    value={salarySacrificeIsMonthly ? salarySacrificeMonthlyInput : salarySacrifice}
                    onChange={(e) => {
                      if (salarySacrificeIsMonthly) {
                        setSalarySacrificeMonthlyInput(e.target.value);
                        setSalarySacrifice((sanitizeNumber(e.target.value) * 12).toString());
                      } else {
                        setSalarySacrifice(e.target.value);
                      }
                    }}
                    placeholder={salarySacrificeIsMonthly ? 'e.g. 200' : 'e.g. 2400'}
                    autoComplete="off"
                  />
                </div>
                <p className="input-hint">
                  E.g. cycle-to-work, childcare vouchers — enter{' '}
                  {salarySacrificeIsMonthly ? 'monthly' : 'annual'} amount
                </p>
              </div>

              <div className="input-group">
                <div className="input-label-row">
                  <label className="input-label" htmlFor="pension">
                    Pension Contribution (salary sacrifice)
                  </label>
                  <PeriodToggle
                    isMonthly={pensionContributionIsMonthly}
                    onChange={(newIsMonthly) => {
                      setPensionContributionIsMonthly(newIsMonthly);
                      if (newIsMonthly) {
                        setPensionContributionMonthlyInput(
                          (sanitizeNumber(pensionContribution) / 12).toFixed(2)
                        );
                      }
                    }}
                  />
                </div>
                <div className="input-wrapper">
                  <span className="input-prefix">&pound;</span>
                  <input
                    id="pension"
                    className="input-field"
                    type="text"
                    inputMode="decimal"
                    value={pensionContributionIsMonthly ? pensionContributionMonthlyInput : pensionContribution}
                    onChange={(e) => {
                      if (pensionContributionIsMonthly) {
                        setPensionContributionMonthlyInput(e.target.value);
                        setPensionContribution((sanitizeNumber(e.target.value) * 12).toString());
                      } else {
                        setPensionContribution(e.target.value);
                      }
                      setPensionPct(0); // detach slider when typing
                    }}
                    placeholder={pensionContributionIsMonthly ? 'e.g. 683' : 'e.g. 8200'}
                    autoComplete="off"
                  />
                </div>
                <SliderSpinner
                  value={pensionPct}
                  min={0}
                  max={40}
                  step={0.5}
                  onChange={handlePensionPctChange}
                  ariaLabel="Pension contribution percentage"
                />
                <p className="input-hint">
                  Drag the slider to set as % of gross salary, or enter{' '}
                  {pensionContributionIsMonthly ? 'monthly' : 'annual'} amount above
                </p>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="employer-pension">
                  Employer Pension Contribution
                </label>
                <div className="input-wrapper">
                  <span className="input-prefix">&pound;</span>
                  <input
                    id="employer-pension"
                    className="input-field"
                    type="text"
                    inputMode="decimal"
                    value={employerPension}
                    onChange={(e) => {
                      setEmployerPension(e.target.value);
                      setEmployerPensionPct(0); // detach slider
                    }}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <SliderSpinner
                  value={employerPensionPct}
                  min={0}
                  max={30}
                  step={0.5}
                  onChange={handleEmployerPensionPctChange}
                  ariaLabel="Employer pension contribution percentage"
                />
                <p className="input-hint">
                  Paid by your employer on top of your salary &mdash; does not reduce your take-home pay
                </p>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="emp-tax-code">
                  Tax Code (optional)
                </label>
                <div className="input-wrapper tax-code-wrapper">
                  <input
                    id="emp-tax-code"
                    className={`input-field tax-code-input ${employmentTaxCode && empTaxCodeInfo && !empTaxCodeInfo.isValid ? 'invalid' : ''} ${employmentTaxCode && empTaxCodeInfo?.isValid ? 'valid' : ''}`}
                    type="text"
                    value={employmentTaxCode}
                    onChange={(e) => setEmploymentTaxCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 1257L"
                    autoComplete="off"
                    maxLength={10}
                  />
                  {employmentTaxCode && empTaxCodeInfo && (
                    <span className={`tax-code-status ${empTaxCodeInfo.isValid ? 'valid' : 'invalid'}`}>
                      {empTaxCodeInfo.isValid ? '\u2713' : '\u2717'}
                    </span>
                  )}
                </div>
                {employmentTaxCode && empTaxCodeInfo?.isValid && (
                  <p className="input-hint tax-code-hint valid">
                    {empTaxCodeInfo.isScottish ? 'Scottish ' : ''}
                    {empTaxCodeInfo.type === 'cumulative' && `Personal allowance: ${formatCurrency(empTaxCodeInfo.personalAllowance)}`}
                    {empTaxCodeInfo.type === 'K' && `K code: adds ${formatCurrency(empTaxCodeInfo.kAdjustment)} to taxable income`}
                    {empTaxCodeInfo.type === 'NT' && 'No tax deducted'}
                    {empTaxCodeInfo.type === '0T' && 'Zero personal allowance'}
                    {(empTaxCodeInfo.type === 'BR' || empTaxCodeInfo.type === 'D0' || empTaxCodeInfo.type === 'D1' || empTaxCodeInfo.type === 'D2' || empTaxCodeInfo.type === 'D3') && `Flat rate: ${empTaxCodeInfo.type}`}
                  </p>
                )}
                {employmentTaxCode && empTaxCodeInfo && !empTaxCodeInfo.isValid && (
                  <p className="input-hint tax-code-hint invalid">
                    Invalid tax code. Examples: 1257L, S1257L, BR, K100, 0T, NT
                  </p>
                )}
                {!employmentTaxCode && (
                  <p className="input-hint">
                    Leave blank to use standard {taxRegion === 'scottish' ? 'Scottish' : 'English'} rates with calculated personal allowance
                  </p>
                )}
              </div>
            </div>

            {/* Military Pension */}
            <div className="card" style={{ animationDelay: '0.15s' }}>
              <div className="card-title">
                <span className="card-title-icon">&#127894;</span>
                Military Pension
              </div>

              <div
                className={`checkbox-group ${hasMilitaryPension ? 'checked' : ''}`}
                onClick={() => setHasMilitaryPension((v) => !v)}
                role="checkbox"
                aria-checked={hasMilitaryPension}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    setHasMilitaryPension((v) => !v);
                  }
                }}
              >
                <div className="custom-checkbox">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="checkbox-label">I receive a military pension</span>
              </div>

              {hasMilitaryPension && (
                <>
                  <div className="input-group" style={{ marginTop: '1rem' }}>
                    <label className="input-label" htmlFor="military">
                      Annual Military Pension
                    </label>
                    <div className="input-wrapper">
                      <span className="input-prefix">&pound;</span>
                      <input
                        id="military"
                        className="input-field"
                        type="text"
                        inputMode="decimal"
                        value={militaryPension}
                        onChange={(e) => setMilitaryPension(e.target.value)}
                        placeholder="0"
                        autoComplete="off"
                      />
                    </div>
                    <p className="input-hint">
                      Military pensions are subject to income tax but <strong>not</strong> National Insurance contributions
                    </p>
                  </div>

                  <div className="input-group">
                    <label className="input-label" htmlFor="mil-tax-code">
                      Military Pension Tax Code (optional)
                    </label>
                    <div className="input-wrapper tax-code-wrapper">
                      <input
                        id="mil-tax-code"
                        className={`input-field tax-code-input ${militaryPensionTaxCode && milTaxCodeInfo && !milTaxCodeInfo.isValid ? 'invalid' : ''} ${militaryPensionTaxCode && milTaxCodeInfo?.isValid ? 'valid' : ''}`}
                        type="text"
                        value={militaryPensionTaxCode}
                        onChange={(e) => setMilitaryPensionTaxCode(e.target.value.toUpperCase())}
                        placeholder="e.g. BR"
                        autoComplete="off"
                        maxLength={10}
                      />
                      {militaryPensionTaxCode && milTaxCodeInfo && (
                        <span className={`tax-code-status ${milTaxCodeInfo.isValid ? 'valid' : 'invalid'}`}>
                          {milTaxCodeInfo.isValid ? '\u2713' : '\u2717'}
                        </span>
                      )}
                    </div>
                    {militaryPensionTaxCode && milTaxCodeInfo?.isValid && (
                      <p className="input-hint tax-code-hint valid">
                        {milTaxCodeInfo.isScottish ? 'Scottish ' : ''}
                        {milTaxCodeInfo.type === 'cumulative' && `Personal allowance: ${formatCurrency(milTaxCodeInfo.personalAllowance)}`}
                        {milTaxCodeInfo.type === 'K' && `K code: adds ${formatCurrency(milTaxCodeInfo.kAdjustment)} to taxable income`}
                        {milTaxCodeInfo.type === 'NT' && 'No tax deducted'}
                        {milTaxCodeInfo.type === '0T' && 'Zero personal allowance'}
                        {(milTaxCodeInfo.type === 'BR' || milTaxCodeInfo.type === 'D0' || milTaxCodeInfo.type === 'D1' || milTaxCodeInfo.type === 'D2' || milTaxCodeInfo.type === 'D3') && `Flat rate: ${milTaxCodeInfo.type}`}
                      </p>
                    )}
                    {militaryPensionTaxCode && milTaxCodeInfo && !milTaxCodeInfo.isValid && (
                      <p className="input-hint tax-code-hint invalid">
                        Invalid tax code. Examples: 1257L, BR, D0, NT
                      </p>
                    )}
                    {!militaryPensionTaxCode && (
                      <p className="input-hint">
                        Leave blank to calculate tax at marginal rates
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Post-Tax Deductions */}
            <div className="card" style={{ animationDelay: '0.2s' }}>
              <div className="card-title">
                <span className="card-title-icon">&#128181;</span>
                Post-Tax Deductions
              </div>
              <p className="input-hint" style={{ marginBottom: '0.75rem' }}>
                Deducted from net pay after tax and NI. Enter annual or monthly — use the toggle per row. E.g. Share Save (SAYE), Give As You Earn, union dues.
              </p>

              {postTaxDeductions.map((deduction) => (
                <div key={deduction.id} className="deduction-row">
                  <input
                    className="input-field deduction-name"
                    type="text"
                    value={deduction.name}
                    onChange={(e) =>
                      setPostTaxDeductions((prev) =>
                        prev.map((d) => d.id === deduction.id ? { ...d, name: e.target.value } : d)
                      )
                    }
                    placeholder="Name"
                    autoComplete="off"
                  />
                  <div className="input-wrapper deduction-amount-wrapper">
                    <span className="input-prefix">&pound;</span>
                    <input
                      className="input-field deduction-amount"
                      type="text"
                      inputMode="decimal"
                      value={deduction.isMonthly ? deduction.monthlyInput : deduction.amount}
                      onChange={(e) => {
                        if (deduction.isMonthly) {
                          setPostTaxDeductions((prev) =>
                            prev.map((d) => d.id === deduction.id
                              ? { ...d, monthlyInput: e.target.value, amount: (sanitizeNumber(e.target.value) * 12).toString() }
                              : d
                            )
                          );
                        } else {
                          setPostTaxDeductions((prev) =>
                            prev.map((d) => d.id === deduction.id ? { ...d, amount: e.target.value } : d)
                          );
                        }
                      }}
                      placeholder={deduction.isMonthly ? 'e.g. 200' : 'e.g. 2400'}
                      autoComplete="off"
                    />
                  </div>
                  <PeriodToggle
                    isMonthly={deduction.isMonthly}
                    onChange={(isMonthly) =>
                      setPostTaxDeductions((prev) =>
                        prev.map((d) => {
                          if (d.id !== deduction.id) return d;
                          const monthlyInput = isMonthly
                            ? (sanitizeNumber(d.amount) / 12).toFixed(2)
                            : d.monthlyInput;
                          return { ...d, isMonthly, monthlyInput };
                        })
                      )
                    }
                  />
                  <button
                    className="deduction-remove"
                    onClick={() =>
                      setPostTaxDeductions((prev) => prev.filter((d) => d.id !== deduction.id))
                    }
                    aria-label={`Remove ${deduction.name || 'deduction'}`}
                    title="Remove"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}

              <button
                className="add-deduction-btn"
                onClick={() => {
                  setPostTaxDeductions((prev) => [
                    ...prev,
                    { id: nextDeductionId, name: '', amount: '0', isMonthly: false, monthlyInput: '0' },
                  ]);
                  setNextDeductionId((id) => id + 1);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add deduction
              </button>
            </div>
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
                    <div className="stat-value">{formatCurrency(sanitizeNumber(pensionContribution))}</div>
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
                    Your contribution of {formatCurrency(sanitizeNumber(pensionContribution))}/year is via salary sacrifice (pre-tax), saving you{' '}
                    {formatCurrency(
                      sanitizeNumber(pensionContribution) * (result.effectiveTaxRate > 0
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

        <footer className="footer">
          <p>
            Tax Year 2025&ndash;26 rates. This calculator is for guidance only and does not constitute financial advice.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            Sources:{' '}
            <a href="https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/" target="_blank" rel="noopener noreferrer">
              Scottish Gov
            </a>
            {' '}&middot;{' '}
            <a href="https://www.gov.uk/income-tax-rates" target="_blank" rel="noopener noreferrer">
              HMRC
            </a>
            {' '}&middot;{' '}
            <a href="https://www.gov.uk/national-insurance-rates-letters" target="_blank" rel="noopener noreferrer">
              NI Rates
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}

function BarRow({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div
          className={`bar-fill ${className}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="bar-percent">{pct.toFixed(1)}%</span>
    </div>
  );
}

function PeriodToggle({
  isMonthly,
  onChange,
  ariaLabel = 'Input period',
}: {
  isMonthly: boolean;
  onChange: (isMonthly: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="period-toggle" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={`period-toggle-btn ${!isMonthly ? 'active' : ''}`}
        onClick={() => onChange(false)}
        aria-pressed={!isMonthly}
      >
        Annual
      </button>
      <button
        type="button"
        className={`period-toggle-btn ${isMonthly ? 'active' : ''}`}
        onClick={() => onChange(true)}
        aria-pressed={isMonthly}
      >
        Monthly
      </button>
    </div>
  );
}

// SliderSpinner is used in Tasks 7-8 (slider + numeric spinner compound)
function SliderSpinner({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const decrement = () => onChange(Math.max(min, Math.round((value - step) * 10) / 10));
  const increment = () => onChange(Math.min(max, Math.round((value + step) * 10) / 10));

  return (
    <div className="spinner-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={ariaLabel}
      />
      <div className="spinner-compound">
        <button
          type="button"
          className="spinner-btn"
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease"
        >
          &minus;
        </button>
        <input
          type="number"
          className="spinner-input"
          min={min}
          max={max}
          step={step}
          value={value.toFixed(1)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
          onBlur={(e) => {
            if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
              onChange(min);
            }
          }}
          aria-label={`${ariaLabel} value`}
        />
        <button
          type="button"
          className="spinner-btn"
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase"
        >
          &#43;
        </button>
      </div>
    </div>
  );
}

function ScenarioComparison({
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
        <span className="card-title-icon">&#9878;</span>
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
              &pound;
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
            <span className="input-prefix">&pound;</span>
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
