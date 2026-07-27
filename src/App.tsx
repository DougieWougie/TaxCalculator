import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  calculate,
  parseTaxCode,
  getOptimisationTargets,
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
import { usePeriod } from './hooks/usePeriod';
import { CockpitShell } from './components/CockpitShell';
import { ControlPanel, type DeductionRow } from './components/ControlPanel';
import { Readout } from './components/Readout';
import { DetailSections } from './components/DetailSections';
import { ScenarioComparison } from './components/ScenarioComparison';
import { BaselineActions } from './components/BaselineActions';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const { isDark, toggle } = useTheme();
  const { period, setPeriod } = usePeriod();

  const [disclaimerDismissed, setDisclaimerDismissed] = useLocalStorage<boolean>(
    'disclaimer-dismissed',
    false
  );
  const dismissDisclaimer = useCallback(() => setDisclaimerDismissed(true), [setDisclaimerDismissed]);

  const initialUrlState = useMemo(() => decodeInput(window.location.search), []);

  const [annualSalary, setAnnualSalary] = useState(() => sanitizeNumber(initialUrlState.annualSalary));
  const salarySacrificeInput = useNumericInput(initialUrlState.salarySacrifice);
  const pensionContributionInput = useNumericInput(initialUrlState.pensionContribution);
  const [employerPension, setEmployerPension] = useState(() => sanitizeNumber(initialUrlState.employerPension));
  const [militaryPension, setMilitaryPension] = useState(() => sanitizeNumber(initialUrlState.militaryPension));
  const [hasMilitaryPension, setHasMilitaryPension] = useState(initialUrlState.hasMilitaryPension);
  const [taxRegion, setTaxRegion] = useState<TaxRegion>(initialUrlState.taxRegion);
  const [employmentTaxCode, setEmploymentTaxCode] = useState(initialUrlState.employmentTaxCode);
  const [militaryPensionTaxCode, setMilitaryPensionTaxCode] = useState(initialUrlState.militaryPensionTaxCode);

  // Post-tax deductions keep a small internal id purely for React keys and
  // row identity while editing; the id never leaves this component — the URL
  // payload and the calculation input both use the frozen { name, amount }
  // shape.
  const [postTaxDeductions, setPostTaxDeductions] = useState<DeductionRow[]>(() =>
    initialUrlState.postTaxDeductions.map((d, i) => ({ id: i + 1, name: d.name, amount: d.amount }))
  );
  const [nextDeductionId, setNextDeductionId] = useState(
    () => initialUrlState.postTaxDeductions.length + 1
  );

  const addDeduction = useCallback(() => {
    setPostTaxDeductions((prev) => [...prev, { id: nextDeductionId, name: '', amount: '0' }]);
    setNextDeductionId((id) => id + 1);
  }, [nextDeductionId]);

  const removeDeduction = useCallback((id: number) => {
    setPostTaxDeductions((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const changeDeductionName = useCallback((id: number, name: string) => {
    setPostTaxDeductions((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  }, []);

  const changeDeductionAmount = useCallback((id: number, amount: string) => {
    setPostTaxDeductions((prev) => prev.map((d) => (d.id === id ? { ...d, amount } : d)));
  }, []);

  const parsedPostTaxDeductions: PostTaxDeduction[] = useMemo(
    () => postTaxDeductions.map((d) => ({ name: d.name || 'Deduction', amount: sanitizeNumber(d.amount) })),
    [postTaxDeductions]
  );

  const empTaxCodeInfo = useMemo(
    () => (employmentTaxCode ? parseTaxCode(employmentTaxCode) : null),
    [employmentTaxCode]
  );
  const milTaxCodeInfo = useMemo(
    () => (militaryPensionTaxCode ? parseTaxCode(militaryPensionTaxCode) : null),
    [militaryPensionTaxCode]
  );

  const currentInput: CalculationInput = useMemo(
    () => ({
      annualSalary,
      salarySacrifice: salarySacrificeInput.annualValue,
      pensionContribution: pensionContributionInput.annualValue,
      employerPension,
      militaryPension: hasMilitaryPension ? militaryPension : 0,
      postTaxDeductions: parsedPostTaxDeductions,
      taxRegion,
      employmentTaxCode,
      militaryPensionTaxCode: hasMilitaryPension ? militaryPensionTaxCode : '',
    }),
    [annualSalary, salarySacrificeInput.annualValue, pensionContributionInput.annualValue, employerPension, militaryPension, hasMilitaryPension, parsedPostTaxDeductions, taxRegion, employmentTaxCode, militaryPensionTaxCode]
  );

  const result: CalculationResult = useMemo(() => calculate(currentInput), [currentInput]);

  const scenario = useScenario(currentInput, result);

  // Band thresholds the pension slider should snap onto.
  const pensionSnapPoints = useMemo(
    () => getOptimisationTargets(currentInput, result).map((target) => target.threshold),
    [currentInput, result]
  );

  const urlPayload: UrlStatePayload = useMemo(() => ({
    annualSalary: String(annualSalary),
    salarySacrifice: String(salarySacrificeInput.annualValue),
    pensionContribution: String(pensionContributionInput.annualValue),
    employerPension: String(employerPension),
    militaryPension: String(militaryPension),
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

  const controls = (
    <ControlPanel
      period={period}
      onPeriodChange={setPeriod}
      taxRegion={taxRegion}
      onTaxRegionChange={setTaxRegion}
      annualSalary={annualSalary}
      onAnnualSalaryChange={setAnnualSalary}
      pensionContribution={pensionContributionInput}
      pensionSnapPoints={pensionSnapPoints}
      employerPension={employerPension}
      onEmployerPensionChange={setEmployerPension}
      salarySacrifice={salarySacrificeInput}
      employmentTaxCode={employmentTaxCode}
      onEmploymentTaxCodeChange={setEmploymentTaxCode}
      empTaxCodeInfo={empTaxCodeInfo}
      hasMilitaryPension={hasMilitaryPension}
      onHasMilitaryPensionChange={setHasMilitaryPension}
      militaryPension={militaryPension}
      onMilitaryPensionChange={setMilitaryPension}
      militaryPensionTaxCode={militaryPensionTaxCode}
      onMilitaryPensionTaxCodeChange={setMilitaryPensionTaxCode}
      milTaxCodeInfo={milTaxCodeInfo}
      postTaxDeductions={postTaxDeductions}
      onDeductionNameChange={changeDeductionName}
      onDeductionAmountChange={changeDeductionAmount}
      onDeductionAdd={addDeduction}
      onDeductionRemove={removeDeduction}
    />
  );

  return (
    <>
      {!disclaimerDismissed && <DisclaimerBanner onDismiss={dismissDisclaimer} />}
      <ThemeToggle isDark={isDark} onToggle={toggle} />

      <Header />

      <CockpitShell controls={controls}>
        <Readout result={result} period={period} diff={scenario.scenarioDiff} />

        <BaselineActions
          hasBaseline={!!scenario.baseline}
          onSave={scenario.saveBaseline}
          onClear={scenario.clearBaseline}
        />

        <DetailSections result={result} period={period} />

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
      </CockpitShell>

      <Footer />
    </>
  );
}
