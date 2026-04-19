import { useCallback, useMemo, useState } from 'react';
import {
  calculate,
  calculateOptimalPension,
  diffResults,
  getOptimisationTargets,
  type CalculationInput,
  type CalculationResult,
  type ScenarioDiff,
} from '../taxEngine';

export function useScenario(currentInput: CalculationInput, currentResult: CalculationResult) {
  const [baseline, setBaseline] = useState<{
    input: CalculationInput;
    result: CalculationResult;
  } | null>(null);
  const [scenarioPreset, setScenarioPreset] = useState<string | null>(null);
  const [scenarioInput, setScenarioInput] = useState<CalculationInput | null>(null);

  const scenarioResult: CalculationResult | null = useMemo(
    () => (scenarioInput ? calculate(scenarioInput) : null),
    [scenarioInput]
  );

  const scenarioDiff: ScenarioDiff | null = useMemo(
    () => (baseline && scenarioResult ? diffResults(baseline.result, scenarioResult) : null),
    [baseline, scenarioResult]
  );

  const optimisationTargets = useMemo(
    () => (baseline ? getOptimisationTargets(baseline.input, baseline.result) : []),
    [baseline]
  );

  const saveBaseline = useCallback(() => {
    setBaseline({ input: currentInput, result: currentResult });
    setScenarioPreset(null);
    setScenarioInput(null);
  }, [currentInput, currentResult]);

  const clearBaseline = useCallback(() => {
    setBaseline(null);
    setScenarioPreset(null);
    setScenarioInput(null);
  }, []);

  const applyOptimise = useCallback(
    (threshold: number) => {
      if (!baseline) return;
      const pension = calculateOptimalPension(baseline.input, threshold);
      if (pension === null) return;
      setScenarioInput({ ...baseline.input, pensionContribution: pension });
    },
    [baseline]
  );

  const applySalaryChange = useCallback(
    (amount: number, isPercentage: boolean) => {
      if (!baseline) return;
      const newSalary = isPercentage
        ? baseline.input.annualSalary * (1 + amount / 100)
        : baseline.input.annualSalary + amount;
      setScenarioInput({ ...baseline.input, annualSalary: Math.max(0, newSalary) });
    },
    [baseline]
  );

  const applySacrifice = useCallback(
    (amount: number) => {
      if (!baseline) return;
      setScenarioInput({
        ...baseline.input,
        salarySacrifice: Math.min(
          baseline.input.salarySacrifice + amount,
          baseline.input.annualSalary
        ),
      });
    },
    [baseline]
  );

  return {
    baseline,
    scenarioPreset,
    scenarioResult,
    scenarioDiff,
    optimisationTargets,
    setScenarioPreset,
    saveBaseline,
    clearBaseline,
    applyOptimise,
    applySalaryChange,
    applySacrifice,
  };
}
