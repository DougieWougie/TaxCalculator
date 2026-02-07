import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  calculate,
  formatCurrency,
  formatPercent,
  parseTaxCode,
  type TaxRegion,
  type CalculationResult,
  type PostTaxDeduction,
} from './taxEngine';

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

function sanitizeNumber(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 10_000_000); // cap at £10m
}

export default function App() {
  const { isDark, toggle } = useTheme();
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    return localStorage.getItem('disclaimer-dismissed') !== 'true';
  });

  const dismissDisclaimer = useCallback(() => {
    setShowDisclaimer(false);
    localStorage.setItem('disclaimer-dismissed', 'true');
  }, []);

  const [annualSalary, setAnnualSalary] = useState('45000');
  const [salarySacrifice, setSalarySacrifice] = useState('0');
  const [pensionContribution, setPensionContribution] = useState('0');
  const [employerPension, setEmployerPension] = useState('0');
  const [militaryPension, setMilitaryPension] = useState('0');
  const [hasMilitaryPension, setHasMilitaryPension] = useState(false);
  const [taxRegion, setTaxRegion] = useState<TaxRegion>('scottish');
  const [postTaxDeductions, setPostTaxDeductions] = useState<{ id: number; name: string; amount: string }[]>([]);
  const [nextDeductionId, setNextDeductionId] = useState(1);
  const [employmentTaxCode, setEmploymentTaxCode] = useState('');
  const [militaryPensionTaxCode, setMilitaryPensionTaxCode] = useState('');

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
      setPensionContribution(((salary * pct) / 100).toFixed(0));
    },
    [annualSalary]
  );

  // Recalc pension amount when salary changes (if using slider)
  useEffect(() => {
    if (pensionPct > 0) {
      const salary = sanitizeNumber(annualSalary);
      setPensionContribution(((salary * pensionPct) / 100).toFixed(0));
    }
  }, [annualSalary, pensionPct]);

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

  const totalGross = sanitizeNumber(annualSalary) + (hasMilitaryPension ? sanitizeNumber(militaryPension) : 0);

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
                  &#127988;&#65039; Scotland
                </button>
                <button
                  className={`region-btn english ${taxRegion === 'english' ? 'active' : ''}`}
                  onClick={() => setTaxRegion('english')}
                >
                  &#127988;&#65039;&#8205;&#9760;&#65039; England / Wales / NI
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
                <label className="input-label" htmlFor="sacrifice">
                  Pre-Tax Salary Sacrifice (excl. pension)
                </label>
                <div className="input-wrapper">
                  <span className="input-prefix">&pound;</span>
                  <input
                    id="sacrifice"
                    className="input-field"
                    type="text"
                    inputMode="decimal"
                    value={salarySacrifice}
                    onChange={(e) => setSalarySacrifice(e.target.value)}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <p className="input-hint">
                  E.g. cycle-to-work, childcare vouchers, other salary sacrifice benefits
                </p>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="pension">
                  Pension Contribution (salary sacrifice)
                </label>
                <div className="input-wrapper">
                  <span className="input-prefix">&pound;</span>
                  <input
                    id="pension"
                    className="input-field"
                    type="text"
                    inputMode="decimal"
                    value={pensionContribution}
                    onChange={(e) => {
                      setPensionContribution(e.target.value);
                      setPensionPct(0); // detach slider
                    }}
                    placeholder="0"
                    autoComplete="off"
                  />
                </div>
                <div className="slider-row" style={{ marginTop: '0.75rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="0.5"
                    value={pensionPct}
                    onChange={(e) => handlePensionPctChange(parseFloat(e.target.value))}
                    aria-label="Pension contribution percentage"
                  />
                  <span className="slider-value">{pensionPct.toFixed(1)}%</span>
                </div>
                <p className="input-hint">
                  Drag the slider to set pension as a % of gross salary
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
                <div className="slider-row" style={{ marginTop: '0.75rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={employerPensionPct}
                    onChange={(e) => handleEmployerPensionPctChange(parseFloat(e.target.value))}
                    aria-label="Employer pension contribution percentage"
                  />
                  <span className="slider-value">{employerPensionPct.toFixed(1)}%</span>
                </div>
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
                Deducted from your net pay after tax and NI. E.g. Share Save (SAYE), Give As You Earn, union dues, professional subscriptions.
              </p>

              {postTaxDeductions.map((deduction) => (
                <div key={deduction.id} className="deduction-row">
                  <input
                    className="input-field deduction-name"
                    type="text"
                    value={deduction.name}
                    onChange={(e) =>
                      setPostTaxDeductions((prev) =>
                        prev.map((d) =>
                          d.id === deduction.id ? { ...d, name: e.target.value } : d
                        )
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
                      value={deduction.amount}
                      onChange={(e) =>
                        setPostTaxDeductions((prev) =>
                          prev.map((d) =>
                            d.id === deduction.id ? { ...d, amount: e.target.value } : d
                          )
                        )
                      }
                      placeholder="0"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    className="deduction-remove"
                    onClick={() =>
                      setPostTaxDeductions((prev) =>
                        prev.filter((d) => d.id !== deduction.id)
                      )
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
                    { id: nextDeductionId, name: '', amount: '0' },
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
              <div className="summary-hero-value">{formatCurrency(result.monthlyTakeHome)}</div>
              <div className="summary-hero-sub">
                {formatCurrency(result.netAnnualIncome)} per year
              </div>
            </div>

            {/* Stats grid */}
            <div className="card" style={{ animationDelay: '0.15s' }}>
              <div className="card-title">
                <span className="card-title-icon">&#128202;</span>
                Monthly Breakdown
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Gross Salary</div>
                  <div className="stat-value">{formatCurrency(result.grossMonthlySalary)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Income Tax</div>
                  <div className="stat-value negative">&minus;{formatCurrency(result.monthlyTax)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">National Insurance</div>
                  <div className="stat-value negative">&minus;{formatCurrency(result.monthlyNI)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Salary Sacrifice</div>
                  <div className="stat-value negative">&minus;{formatCurrency(result.monthlySalarySacrifice)}</div>
                </div>
                {result.totalPostTaxDeductions > 0 && (
                  <div className="stat-card">
                    <div className="stat-label">Post-Tax Deductions</div>
                    <div className="stat-value negative">&minus;{formatCurrency(result.monthlyPostTaxDeductions)}</div>
                  </div>
                )}
                {hasMilitaryPension && (
                  <div className="stat-card">
                    <div className="stat-label">Military Pension (net)</div>
                    <div className="stat-value positive">
                      +{formatCurrency(result.monthlyMilitaryPension - result.militaryPensionTax / 12)}
                    </div>
                  </div>
                )}
              </div>

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
                </>
              )}

              {!result.usingTaxCodes && (
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
                      sanitizeNumber(pensionContribution) * (result.effectiveTaxRate > 0 ? result.marginalTaxRate : 0)
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
                      <td>{formatCurrency(result.monthlyPostTaxDeductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
