import { describe, it, expect } from 'vitest';
import {
  calculate,
  getOptimisationTargets,
  calculateOptimalPension,
  diffResults,
  scalePeriod,
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

  it('calculates pension when available salary is constrained', () => {
    const input = makeInput({ annualSalary: 20_000, salarySacrifice: 19_000 });
    expect(calculateOptimalPension(input, 0)).toBe(1_000);
  });

  it('returns null when already below threshold due to full sacrifice', () => {
    const input = makeInput({ annualSalary: 50_000, salarySacrifice: 50_000 });
    expect(calculateOptimalPension(input, 43_662)).toBeNull();
  });

  it('handles PA taper threshold correctly', () => {
    const input = makeInput({ annualSalary: 130_000 });
    expect(calculateOptimalPension(input, 100_000)).toBe(30_000);
  });
});

describe('effectiveTaxRate', () => {
  it('computes rate against taxable income, not gross', () => {
    // £60k salary, £10k pension sacrifice → £50k taxable
    // English taxpayer: tax = (50000 - 12570) * 0.20 = 7486
    //                   NI  = (50270 - 12570) * 0.08 + (50000 - 50270) * 0.02 = 3016 - (0 since 50000 < 50270)
    //                       = (50000 - 12570) * 0.08 = 2994.40
    // Effective rate = (7486 + 2994.40) / 50000 = 0.2096 (~20.96%)
    const result = calculate({
      annualSalary: 60_000,
      salarySacrifice: 0,
      pensionContribution: 10_000,
      employerPension: 0,
      militaryPension: 0,
      postTaxDeductions: [],
      taxRegion: 'english',
      employmentTaxCode: '',
      militaryPensionTaxCode: '',
    });
    expect(result.effectiveTaxRate).toBeCloseTo(0.2096, 3);
  });

  it('is zero when taxable income is zero', () => {
    const result = calculate({
      annualSalary: 10_000,
      salarySacrifice: 0,
      pensionContribution: 0,
      employerPension: 0,
      militaryPension: 0,
      postTaxDeductions: [],
      taxRegion: 'english',
      employmentTaxCode: '',
      militaryPensionTaxCode: '',
    });
    expect(result.effectiveTaxRate).toBe(0);
  });
});

describe('military pension band-level breakdown (no tax codes)', () => {
  it('employment fills lower bands, military fills the remainder', () => {
    // Scottish taxpayer: £40k employment + £10k military = £50k total
    // PA: 12570 (no taper)
    // Bands:
    //   Starter:      12570..15397 = 2827  @ 19%  (all employment)
    //   Basic:        15397..27491 = 12094 @ 20%  (all employment)
    //   Intermediate: 27491..43662 = 16171 @ 21%
    //     employment fills 27491..40000 = 12509
    //     military    fills 40000..43662 = 3662
    //   Higher:       43662..50000 = 6338  @ 42%  (all military)
    const result = calculate({
      annualSalary: 40_000,
      salarySacrifice: 0,
      pensionContribution: 0,
      employerPension: 0,
      militaryPension: 10_000,
      postTaxDeductions: [],
      taxRegion: 'scottish',
      employmentTaxCode: '',
      militaryPensionTaxCode: '',
    });

    expect(result.employmentTaxBreakdown.map((b) => b.name)).toEqual([
      'Starter Rate', 'Basic Rate', 'Intermediate Rate',
    ]);

    expect(result.militaryTaxBreakdown.map((b) => b.name)).toEqual([
      'Intermediate Rate', 'Higher Rate',
    ]);

    const milInter = result.militaryTaxBreakdown.find((b) => b.name === 'Intermediate Rate')!;
    const milHigher = result.militaryTaxBreakdown.find((b) => b.name === 'Higher Rate')!;
    expect(milInter.taxableInBand).toBeCloseTo(3_662, 0);
    expect(milHigher.taxableInBand).toBeCloseTo(6_338, 0);

    expect(result.militaryPensionTax).toBeCloseTo(
      milInter.taxableInBand * 0.21 + milHigher.taxableInBand * 0.42,
      1,
    );
  });

  it('military breakdown is empty when no military pension', () => {
    const result = calculate({
      annualSalary: 40_000,
      salarySacrifice: 0,
      pensionContribution: 0,
      employerPension: 0,
      militaryPension: 0,
      postTaxDeductions: [],
      taxRegion: 'scottish',
      employmentTaxCode: '',
      militaryPensionTaxCode: '',
    });
    expect(result.militaryTaxBreakdown).toEqual([]);
    expect(result.militaryPensionTax).toBe(0);
  });
});

describe('scalePeriod', () => {
  it('returns the input for annual', () => {
    expect(scalePeriod(12_000, 'annual')).toBe(12_000);
  });
  it('divides by 12 for monthly', () => {
    expect(scalePeriod(12_000, 'monthly')).toBe(1_000);
  });
  it('divides by 26 for fortnightly', () => {
    expect(scalePeriod(26_000, 'fortnightly')).toBe(1_000);
  });
  it('divides by 52 for weekly', () => {
    expect(scalePeriod(52_000, 'weekly')).toBe(1_000);
  });
});

describe('diffResults', () => {
  it('calculates correct deltas between two results', () => {
    const inputA = makeInput({ annualSalary: 55_000 });
    const inputB = makeInput({ annualSalary: 60_000 });
    const resultA = calculate(inputA);
    const resultB = calculate(inputB);
    const diff = diffResults(resultA, resultB);

    expect(diff.grossSalary).toBe(resultB.grossSalary - resultA.grossSalary);
    expect(diff.grossSalary).toBe(5_000);
    expect(diff.incomeTax).toBe(resultB.incomeTax - resultA.incomeTax);
    expect(diff.nationalInsurance).toBe(resultB.nationalInsurance - resultA.nationalInsurance);
    expect(diff.monthlyTakeHome).toBe(resultB.monthlyTakeHome - resultA.monthlyTakeHome);
    expect(diff.netAnnualIncome).toBe(resultB.netAnnualIncome - resultA.netAnnualIncome);
  });

  it('returns zero deltas for identical results', () => {
    const input = makeInput({ annualSalary: 55_000 });
    const result = calculate(input);
    const diff = diffResults(result, result);

    expect(diff.grossSalary).toBe(0);
    expect(diff.incomeTax).toBe(0);
    expect(diff.nationalInsurance).toBe(0);
    expect(diff.monthlyTakeHome).toBe(0);
    expect(diff.netAnnualIncome).toBe(0);
    expect(diff.effectiveTaxRate).toBe(0);
    expect(diff.totalPensionPot).toBe(0);
  });

  it('shows negative deltas when scenario B has lower take-home', () => {
    const inputA = makeInput({ annualSalary: 60_000 });
    const inputB = makeInput({ annualSalary: 50_000 });
    const resultA = calculate(inputA);
    const resultB = calculate(inputB);
    const diff = diffResults(resultA, resultB);

    expect(diff.grossSalary).toBeLessThan(0);
    expect(diff.netAnnualIncome).toBeLessThan(0);
    expect(diff.monthlyTakeHome).toBeLessThan(0);
  });

  it('handles pension optimisation scenario', () => {
    const inputA = makeInput({ annualSalary: 86_800 });
    const inputB = makeInput({ annualSalary: 86_800, pensionContribution: 11_800 });
    const resultA = calculate(inputA);
    const resultB = calculate(inputB);
    const diff = diffResults(resultA, resultB);

    expect(diff.pensionContribution).toBe(11_800);
    expect(diff.totalPensionPot).toBe(11_800);
    expect(diff.netAnnualIncome).toBeLessThan(0);
    expect(diff.incomeTax).toBeLessThan(0);
  });
});
