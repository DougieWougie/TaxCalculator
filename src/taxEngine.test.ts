import { describe, it, expect } from 'vitest';
import { calculate } from './taxEngine';

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
