import { describe, it, expect } from 'vitest';
import { formatForPeriod, periodSuffix, toAnnual } from './display';

describe('formatForPeriod', () => {
  it('formats an annual figure unchanged when period is annual', () => {
    expect(formatForPeriod(40944, 'annual')).toBe('£40,944.00');
  });

  it('divides by twelve when period is monthly', () => {
    expect(formatForPeriod(40944, 'monthly')).toBe('£3,412.00');
  });

  it('handles zero', () => {
    expect(formatForPeriod(0, 'monthly')).toBe('£0.00');
  });

  it('handles negative figures', () => {
    expect(formatForPeriod(-1200, 'monthly')).toBe('-£100.00');
  });
});

describe('periodSuffix', () => {
  it('returns per-year for annual', () => {
    expect(periodSuffix('annual')).toBe('per year');
  });

  it('returns per-month for monthly', () => {
    expect(periodSuffix('monthly')).toBe('per month');
  });
});

describe('toAnnual', () => {
  it('returns the value unchanged for annual', () => {
    expect(toAnnual(40944, 'annual')).toBe(40944);
  });

  it('multiplies by twelve for monthly', () => {
    expect(toAnnual(3412, 'monthly')).toBe(40944);
  });

  it('round-trips with formatForPeriod', () => {
    expect(toAnnual(3412, 'monthly')).toBe(40944);
    expect(formatForPeriod(40944, 'monthly')).toBe('£3,412.00');
  });
});
