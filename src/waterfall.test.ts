import { describe, it, expect } from 'vitest';
import { calculate, type CalculationInput } from './taxEngine';
import { buildWaterfall, totalGross } from './waterfall';

const baseInput: CalculationInput = {
  annualSalary: 58000,
  salarySacrifice: 0,
  pensionContribution: 2840,
  employerPension: 0,
  militaryPension: 0,
  postTaxDeductions: [],
  taxRegion: 'scottish',
  employmentTaxCode: '',
  militaryPensionTaxCode: '',
};

describe('totalGross', () => {
  it('is salary alone when there is no military pension', () => {
    expect(totalGross(calculate(baseInput))).toBe(58000);
  });

  it('includes military pension', () => {
    const result = calculate({ ...baseInput, militaryPension: 12000 });
    expect(totalGross(result)).toBe(70000);
  });
});

describe('buildWaterfall', () => {
  it('segments sum to gross, preserving the engine identity', () => {
    const result = calculate({
      ...baseInput,
      militaryPension: 12000,
      salarySacrifice: 1000,
      postTaxDeductions: [{ name: 'Union', amount: 240 }],
    });
    const segments = buildWaterfall(result);
    const sum = segments.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBeCloseTo(totalGross(result), 6);
  });

  it('percentages sum to 100', () => {
    const segments = buildWaterfall(calculate(baseInput));
    const sum = segments.reduce((acc, s) => acc + s.percentOfGross, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it('ends with the net segment', () => {
    const segments = buildWaterfall(calculate(baseInput));
    expect(segments[segments.length - 1].key).toBe('net');
  });

  it('omits zero-valued segments so the bar has no invisible slivers', () => {
    const segments = buildWaterfall(calculate(baseInput));
    expect(segments.map((s) => s.key)).not.toContain('posttax');
    expect(segments.map((s) => s.key)).not.toContain('sacrifice');
  });

  it('includes post-tax deductions when present', () => {
    const result = calculate({
      ...baseInput,
      postTaxDeductions: [{ name: 'Union', amount: 240 }],
    });
    const posttax = buildWaterfall(result).find((s) => s.key === 'posttax');
    expect(posttax?.amount).toBe(240);
  });

  it('separates pension contribution from other salary sacrifice', () => {
    const result = calculate({ ...baseInput, salarySacrifice: 1000 });
    const segments = buildWaterfall(result);
    expect(segments.find((s) => s.key === 'pension')?.amount).toBe(2840);
    expect(segments.find((s) => s.key === 'sacrifice')?.amount).toBe(1000);
  });

  it('returns an empty array when gross is zero', () => {
    const result = calculate({ ...baseInput, annualSalary: 0, pensionContribution: 0 });
    expect(buildWaterfall(result)).toEqual([]);
  });

  it('handles deductions exceeding gross (net < 0) without negative percentages', () => {
    const result = calculate({
      ...baseInput,
      annualSalary: 58000,
      pensionContribution: 200000,
    });
    const segments = buildWaterfall(result);
    // All percentages must be non-negative
    segments.forEach((s) => {
      expect(s.percentOfGross).toBeGreaterThanOrEqual(0);
    });
    // Percentages sum to 100
    const percentSum = segments.reduce((acc, s) => acc + s.percentOfGross, 0);
    expect(percentSum).toBeCloseTo(100, 6);
    // Amounts sum to totalGross (preserving engine identity)
    const amountSum = segments.reduce((acc, s) => acc + s.amount, 0);
    expect(amountSum).toBeCloseTo(totalGross(result), 6);
  });

  it('net segment has negative amount when deductions exceed gross', () => {
    const result = calculate({
      ...baseInput,
      annualSalary: 58000,
      pensionContribution: 200000,
    });
    const segments = buildWaterfall(result);
    const netSegment = segments.find((s) => s.key === 'net');
    expect(netSegment?.amount).toBeLessThan(0);
  });

  it('preserves percentages in normal case (net >= 0)', () => {
    const result = calculate(baseInput);
    const segments = buildWaterfall(result);
    // In the normal case, the new formula (|amount|/Σ|amount|)*100 equals
    // (amount/gross)*100 when all amounts are positive
    const gross = totalGross(result);
    segments.forEach((s) => {
      const expectedPercent = (s.amount / gross) * 100;
      expect(s.percentOfGross).toBeCloseTo(expectedPercent, 6);
    });
  });
});
