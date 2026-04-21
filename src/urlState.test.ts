import { describe, it, expect } from 'vitest';
import { DEFAULTS, decodeInput, encodeInput, type UrlStatePayload } from './urlState';

function payload(overrides: Partial<UrlStatePayload> = {}): UrlStatePayload {
  return { ...DEFAULTS, ...overrides };
}

describe('encodeInput — default pruning', () => {
  it('emits empty query for all defaults', () => {
    const params = encodeInput(DEFAULTS);
    expect(params.toString()).toBe('');
  });

  it('does not emit military keys when hasMilitaryPension is false', () => {
    const params = encodeInput(payload({ militaryPension: '5000', militaryPensionTaxCode: 'BR' }));
    expect(params.has('mp')).toBe(false);
    expect(params.has('mc')).toBe(false);
  });

  it('emits only non-default keys for a typical scenario', () => {
    const params = encodeInput(payload({
      annualSalary: '70000',
      pensionContribution: '3500',
      taxRegion: 'english',
    }));
    expect(params.get('s')).toBe('70000');
    expect(params.get('p')).toBe('3500');
    expect(params.get('r')).toBe('e');
    expect(params.has('ss')).toBe(false);
    expect(params.has('ep')).toBe(false);
    expect(params.has('mp')).toBe(false);
  });
});

describe('round-trip', () => {
  it('preserves a full employment + military payload', () => {
    const original = payload({
      annualSalary: '85000',
      salarySacrifice: '1000',
      pensionContribution: '4250',
      employerPension: '4250',
      militaryPension: '12000',
      hasMilitaryPension: true,
      taxRegion: 'english',
      employmentTaxCode: '1257L',
      militaryPensionTaxCode: 'BR',
      postTaxDeductions: [
        { name: 'Share Save', amount: '150' },
        { name: 'Give As You Earn', amount: '25' },
      ],
    });
    const decoded = decodeInput(encodeInput(original));
    expect(decoded).toEqual(original);
  });

  it('preserves deduction names containing delimiter characters', () => {
    const original = payload({
      postTaxDeductions: [
        { name: 'Union: dues; special', amount: '30' },
        { name: 'Name with = sign', amount: '40' },
      ],
    });
    const decoded = decodeInput(encodeInput(original));
    expect(decoded.postTaxDeductions).toEqual(original.postTaxDeductions);
  });

  it('drops military keys when military is disabled', () => {
    const original = payload({
      militaryPension: '12000',
      hasMilitaryPension: false,
      militaryPensionTaxCode: 'BR',
    });
    const decoded = decodeInput(encodeInput(original));
    expect(decoded.hasMilitaryPension).toBe(false);
    expect(decoded.militaryPension).toBe(DEFAULTS.militaryPension);
    expect(decoded.militaryPensionTaxCode).toBe('');
  });
});

describe('decodeInput — defensive parsing', () => {
  it('falls back to defaults for invalid numbers', () => {
    const decoded = decodeInput('s=abc&p=--42&ss=-100');
    expect(decoded.annualSalary).toBe('0');
    expect(decoded.pensionContribution).toBe('42');
    expect(decoded.salarySacrifice).toBe('100');
  });

  it('clamps outrageous salary to the sanitizer ceiling', () => {
    const decoded = decodeInput('s=99999999999');
    expect(Number(decoded.annualSalary)).toBe(10_000_000);
  });

  it('ignores unknown region values', () => {
    const decoded = decodeInput('r=xyz');
    expect(decoded.taxRegion).toBe('scottish');
  });

  it('accepts english region short code', () => {
    const decoded = decodeInput('r=e');
    expect(decoded.taxRegion).toBe('english');
  });

  it('strips unsafe characters from tax codes', () => {
    const decoded = decodeInput('ec=<script>1257L');
    expect(decoded.employmentTaxCode).toBe('SCRIPT1257');
  });

  it('ignores a malformed deduction row', () => {
    const decoded = decodeInput('d=no-colon-here;valid:100');
    expect(decoded.postTaxDeductions).toEqual([{ name: 'valid', amount: '100' }]);
  });

  it('caps deduction rows at MAX_DEDUCTIONS', () => {
    const many = Array.from({ length: 30 }, (_, i) => `row${i}:10`).join(';');
    const decoded = decodeInput(`d=${many}`);
    expect(decoded.postTaxDeductions.length).toBe(20);
  });

  it('ignores military tax code when military pension is absent', () => {
    const decoded = decodeInput('mc=BR');
    expect(decoded.militaryPensionTaxCode).toBe('');
    expect(decoded.hasMilitaryPension).toBe(false);
  });

  it('enables military flag when mp > 0', () => {
    const decoded = decodeInput('mp=8000&mc=BR');
    expect(decoded.hasMilitaryPension).toBe(true);
    expect(decoded.militaryPension).toBe('8000');
    expect(decoded.militaryPensionTaxCode).toBe('BR');
  });
});
