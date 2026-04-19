import { useState, useCallback } from 'react';
import { sanitizeNumber } from '../sanitize';

export interface NumericInput {
  annual: string;
  monthly: string;
  isMonthly: boolean;
  displayValue: string;
  annualValue: number;
  setDisplay: (value: string) => void;
  setIsMonthly: (isMonthly: boolean) => void;
  setAnnualValue: (value: number) => void;
}

export function useNumericInput(initialAnnual: string = '0'): NumericInput {
  const [annual, setAnnualState] = useState(initialAnnual);
  const [monthly, setMonthlyState] = useState(
    () => (sanitizeNumber(initialAnnual) / 12).toFixed(2)
  );
  const [isMonthly, setIsMonthlyState] = useState(false);

  const setDisplay = useCallback(
    (value: string) => {
      if (isMonthly) {
        setMonthlyState(value);
        setAnnualState((sanitizeNumber(value) * 12).toString());
      } else {
        setAnnualState(value);
      }
    },
    [isMonthly]
  );

  const setIsMonthly = useCallback(
    (newIsMonthly: boolean) => {
      setIsMonthlyState(newIsMonthly);
      if (newIsMonthly) {
        setMonthlyState((sanitizeNumber(annual) / 12).toFixed(2));
      }
    },
    [annual]
  );

  const setAnnualValue = useCallback((value: number) => {
    setAnnualState(value.toString());
    setMonthlyState((value / 12).toFixed(2));
  }, []);

  return {
    annual,
    monthly,
    isMonthly,
    displayValue: isMonthly ? monthly : annual,
    annualValue: sanitizeNumber(annual),
    setDisplay,
    setIsMonthly,
    setAnnualValue,
  };
}
