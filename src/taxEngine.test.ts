import { describe, it, expect } from 'vitest';
import {
  calculate,
  getOptimisationTargets,
  calculateOptimalPension,
  type CalculationInput,
} from './taxEngine';

// Helper: run a minimal calculation and return annual income tax
function calcTax(annualSalary: number, region: 'scottish' | 'english' = 'scottish'): number {
  return calculate({
    annualSalary,
    salarySacrifice: 0,
    pensionContribution: 0,
    employerPension: 0,
    militaryPension: 0,
    postTaxDeductions: [],
    taxRegion: region,
    employmentTaxCode: '',
    militaryPensionTaxCode: '',
  }).incomeTax;
}

describe('Scottish tax bands 2025-26', () => {
  it('taxes zero on income at or below personal allowance', () => {
    expect(calcTax(12_570)).toBe(0);
  });

  it('taxes £1 of starter rate income at 19p', () => {
    // Income of £12,571 — exactly £1 into the Starter Rate band
    expect(calcTax(12_571)).toBeCloseTo(0.19, 5);
  });

  it('correctly taxes full Starter Rate band (£2,827 @ 19%)', () => {
    // Income of £15,397 — top of Starter Rate
    // Starter band: £12,571–£15,397 = 2,827 pounds @ 19% = £537.13
    expect(calcTax(15_397)).toBeCloseTo(537.13, 1);
  });

  it('correctly taxes £1 into Basic Rate band at 20p', () => {
    // £15,398 income — £1 into Basic Rate
    // Starter: 2827 @ 19% = 537.13, Basic: 1 @ 20% = 0.20
    expect(calcTax(15_398)).toBeCloseTo(537.13 + 0.20, 1);
  });

  it('correctly taxes sample income of £86,800 (salary £82k + pension offset + military)', () => {
    // Scottish tax on £86,800:
    // PA:           £12,570 @ 0%  =    £0.00
    // Starter:       £2,827 @ 19% =  £537.13
    // Basic:        £12,094 @ 20% = £2,418.80
    // Intermediate: £16,171 @ 21% = £3,395.91
    // Higher:       £31,338 @ 42% = £13,161.96
    // Advanced:     £11,800 @ 45% =  £5,310.00
    // Total = £24,823.80
    expect(calcTax(86_800)).toBeCloseTo(24_823.80, 0);
  });
});

describe('English tax bands 2025-26', () => {
  it('taxes zero on income at or below personal allowance', () => {
    expect(calcTax(12_570, 'english')).toBe(0);
  });

  it('taxes £1 of basic rate income at 20p', () => {
    expect(calcTax(12_571, 'english')).toBeCloseTo(0.20, 5);
  });

  it('correctly taxes full Basic Rate band (£37,700 @ 20%)', () => {
    // £50,270 — top of Basic Rate
    // Basic: £37,700 @ 20% = £7,540
    expect(calcTax(50_270, 'english')).toBeCloseTo(7_540, 0);
  });
});

// Helper: build a standard CalculationInput
function makeInput(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    annualSalary: 45_000,
    salarySacrifice: 0,
    pensionContribution: 0,
    employerPension: 0,
    militaryPension: 0,
    postTaxDeductions: [],
    taxRegion: 'scottish',
    employmentTaxCode: '',
    militaryPensionTaxCode: '',
    ...overrides,
  };
}

describe('getOptimisationTargets', () => {
  it('returns relevant thresholds above which the user currently sits (Scottish)', () => {
    const input = makeInput({ annualSalary: 86_800 });
    const result = calculate(input);
    const targets = getOptimisationTargets(input, result);
    expect(targets).toEqual([
      { name: 'Higher Rate (£43,662)', threshold: 43_662 },
      { name: 'Advanced Rate (£75,000)', threshold: 75_000 },
    ]);
  });

  it('returns PA taper target when income is above £100k (Scottish)', () => {
    const input = makeInput({ annualSalary: 130_000 });
    const result = calculate(input);
    const targets = getOptimisationTargets(input, result);
    expect(targets).toContainEqual({ name: 'PA Taper (£100,000)', threshold: 100_000 });
  });

  it('returns relevant thresholds for English taxpayer', () => {
    const input = makeInput({ annualSalary: 60_000, taxRegion: 'english' });
    const result = calculate(input);
    const targets = getOptimisationTargets(input, result);
    expect(targets).toEqual([
      { name: 'Higher Rate (£50,270)', threshold: 50_270 },
    ]);
  });

  it('returns empty array when income is in Personal Allowance band', () => {
    const input = makeInput({ annualSalary: 12_000 });
    const result = calculate(input);
    const targets = getOptimisationTargets(input, result);
    expect(targets).toEqual([]);
  });

  it('accounts for existing salary sacrifice when determining taxable income', () => {
    const input = makeInput({ annualSalary: 50_000, salarySacrifice: 8_000 });
    const result = calculate(input);
    const targets = getOptimisationTargets(input, result);
    expect(targets).toEqual([
      { name: 'Intermediate Rate (£27,491)', threshold: 27_491 },
    ]);
  });
});

describe('calculateOptimalPension', () => {
  it('calculates pension needed to drop below Scottish Advanced Rate threshold', () => {
    const input = makeInput({ annualSalary: 86_800 });
    expect(calculateOptimalPension(input, 75_000)).toBe(11_800);
  });

  it('accounts for existing pension contribution', () => {
    const input = makeInput({ annualSalary: 86_800, pensionContribution: 5_000 });
    expect(calculateOptimalPension(input, 75_000)).toBe(11_800);
  });

  it('accounts for existing salary sacrifice', () => {
    const input = makeInput({ annualSalary: 86_800, salarySacrifice: 3_000 });
    expect(calculateOptimalPension(input, 75_000)).toBe(8_800);
  });

  it('returns null when already below the threshold', () => {
    const input = makeInput({ annualSalary: 40_000 });
    expect(calculateOptimalPension(input, 75_000)).toBeNull();
  });

  it('returns null when required contribution would exceed available salary', () => {
    const input = makeInput({ annualSalary: 20_000, salarySacrifice: 19_000 });
    expect(calculateOptimalPension(input, 0)).toBe(1_000);
  });

  it('returns null when pension needed exceeds remaining salary', () => {
    const input = makeInput({ annualSalary: 50_000, salarySacrifice: 50_000 });
    expect(calculateOptimalPension(input, 43_662)).toBeNull();
  });

  it('handles PA taper threshold correctly', () => {
    const input = makeInput({ annualSalary: 130_000 });
    expect(calculateOptimalPension(input, 100_000)).toBe(30_000);
  });
});
