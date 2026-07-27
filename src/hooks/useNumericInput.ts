import { useState, useCallback } from 'react';
import { sanitizeNumber } from '../sanitize';

export interface NumericInput {
  /** Raw text as typed, so the field never fights the user mid-entry. */
  raw: string;
  /** Always the annual figure — the single source of truth. */
  annualValue: number;
  setRaw: (value: string) => void;
  setAnnualValue: (value: number) => void;
}

/**
 * Holds one annual money value plus its text draft.
 *
 * Period conversion deliberately lives outside this hook: the page has one
 * global Annual/Monthly setting and display scaling happens at render time via
 * formatForPeriod. Keeping a per-field period here is what made the old
 * inputs confusing.
 */
export function useNumericInput(initialAnnual: string = '0'): NumericInput {
  const [raw, setRawState] = useState(initialAnnual);

  const setRaw = useCallback((value: string) => {
    setRawState(value);
  }, []);

  const setAnnualValue = useCallback((value: number) => {
    setRawState(String(value));
  }, []);

  return {
    raw,
    annualValue: sanitizeNumber(raw),
    setRaw,
    setAnnualValue,
  };
}
