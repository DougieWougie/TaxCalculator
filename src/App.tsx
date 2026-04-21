import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  calculate,
  parseTaxCode,
  type TaxRegion,
  type CalculationInput,
  type CalculationResult,
  type PostTaxDeduction,
} from './taxEngine';
import { sanitizeNumber } from './sanitize';
import { decodeInput, encodeInput, type UrlStatePayload } from './urlState';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { useNumericInput } from './hooks/useNumericInput';
import { useScenario } from './hooks/useScenario';
import { ScenarioComparison } from './components/ScenarioComparison';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { ThemeToggle } from './components/ThemeToggle';
import { RegionCard } from './components/RegionCard';
import { IncomeCard } from './components/IncomeCard';
import { MilitaryPensionCard } from './components/MilitaryPensionCard';
import { PostTaxDeductionsCard } from './components/PostTaxDeductionsCard';
import { SummaryHero } from './components/SummaryHero';
import { BaselineActions } from './components/BaselineActions';
import { MilitarySplitStats } from './components/MilitarySplitStats';
import { IncomeDeductionsCard } from './components/IncomeDeductionsCard';
import { EffectiveRatesCard } from './components/EffectiveRatesCard';
import { TaxBreakdownCard } from './components/TaxBreakdownCard';
import { NiBreakdownCard } from './components/NiBreakdownCard';
import { PensionSummaryCard } from './components/PensionSummaryCard';
import { PostTaxDeductionsSummaryCard } from './components/PostTaxDeductionsSummaryCard';

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

  const initialUrlState = useMemo(() => decodeInput(window.location.search), []);

  const [annualSalary, setAnnualSalary] = useState(initialUrlState.annualSalary);
  const salarySacrificeInput = useNumericInput(initialUrlState.salarySacrifice);
  const pensionContributionInput = useNumericInput(initialUrlState.pensionContribution);
  const [plTableShowMonthly, setPlTableShowMonthly] = useState(true);
  const [employerPension, setEmployerPension] = useState(initialUrlState.employerPension);
  const [militaryPension, setMilitaryPension] = useState(initialUrlState.militaryPension);
  const [hasMilitaryPension, setHasMilitaryPension] = useState(initialUrlState.hasMilitaryPension);
  const [taxRegion, setTaxRegion] = useState<TaxRegion>(initialUrlState.taxRegion);
  const [postTaxDeductions, setPostTaxDeductions] = useState<{
    id: number;
    name: string;
    amount: string;
    isMonthly: boolean;
    monthlyInput: string;
  }[]>(() => initialUrlState.postTaxDeductions.map((d, i) => ({
    id: i + 1,
    name: d.name,
    amount: d.amount,
    isMonthly: false,
    monthlyInput: '',
  })));
  const [nextDeductionId, setNextDeductionId] = useState(() => initialUrlState.postTaxDeductions.length + 1);
  const [employmentTaxCode, setEmploymentTaxCode] = useState(initialUrlState.employmentTaxCode);
  const [militaryPensionTaxCode, setMilitaryPensionTaxCode] = useState(initialUrlState.militaryPensionTaxCode);

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

  const scenario = useScenario(currentInput, result);

  const urlPayload: UrlStatePayload = useMemo(() => ({
    annualSalary,
    salarySacrifice: String(salarySacrificeInput.annualValue),
    pensionContribution: String(pensionContributionInput.annualValue),
    employerPension,
    militaryPension,
    hasMilitaryPension,
    taxRegion,
    employmentTaxCode,
    militaryPensionTaxCode,
    postTaxDeductions: postTaxDeductions.map((d) => ({ name: d.name, amount: d.amount })),
  }), [annualSalary, salarySacrificeInput.annualValue, pensionContributionInput.annualValue, employerPension, militaryPension, hasMilitaryPension, taxRegion, employmentTaxCode, militaryPensionTaxCode, postTaxDeductions]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const query = encodeInput(urlPayload).toString();
      const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    }, 200);
    return () => clearTimeout(timeout);
  }, [urlPayload]);

  const totalGross = sanitizeNumber(annualSalary) + (hasMilitaryPension ? sanitizeNumber(militaryPension) : 0);

  return (
    <>
      <div className="bg-pattern" />

      {showDisclaimer && <DisclaimerBanner onDismiss={dismissDisclaimer} />}

      <ThemeToggle isDark={isDark} onToggle={toggle} />

      <div className="app-container" data-region={taxRegion}>
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
            <SummaryHero netAnnualIncome={result.netAnnualIncome} />

            <BaselineActions
              hasBaseline={!!scenario.baseline}
              onSave={scenario.saveBaseline}
              onClear={scenario.clearBaseline}
            />

            {hasMilitaryPension && (
              <MilitarySplitStats
                netAnnualIncome={result.netAnnualIncome}
                militaryPension={result.militaryPension}
                militaryPensionTax={result.militaryPensionTax}
              />
            )}

            <IncomeDeductionsCard
              result={result}
              hasMilitaryPension={hasMilitaryPension}
              showMonthly={plTableShowMonthly}
              onShowMonthlyChange={setPlTableShowMonthly}
              totalGross={totalGross}
            />

            <EffectiveRatesCard result={result} />

            <TaxBreakdownCard result={result} />

            <NiBreakdownCard result={result} hasMilitaryPension={hasMilitaryPension} />

            <PensionSummaryCard
              result={result}
              pensionContributionAnnual={pensionContributionInput.annualValue}
            />

            <PostTaxDeductionsSummaryCard result={result} />

            {scenario.baseline && (
              <ScenarioComparison
                baseline={scenario.baseline}
                scenarioResult={scenario.scenarioResult}
                scenarioDiff={scenario.scenarioDiff}
                scenarioPreset={scenario.scenarioPreset}
                onSelectPreset={scenario.setScenarioPreset}
                onApplyOptimise={scenario.applyOptimise}
                onApplySalaryChange={scenario.applySalaryChange}
                onApplySacrifice={scenario.applySacrifice}
                optimisationTargets={scenario.optimisationTargets}
              />
            )}
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
