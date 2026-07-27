import { formatCurrency, scalePeriod, type PayPeriod } from './taxEngine';

/**
 * The page-level period setting. Narrower than the engine's PayPeriod:
 * the UI only offers annual and monthly, but reuses the engine's scaling.
 */
export type DisplayPeriod = 'annual' | 'monthly';

export function formatForPeriod(annual: number, period: DisplayPeriod): string {
  return formatCurrency(scalePeriod(annual, period as PayPeriod));
}

export function periodSuffix(period: DisplayPeriod): string {
  return period === 'monthly' ? 'per month' : 'per year';
}

/** Convert a value the user typed in the current period back to annual. */
export function toAnnual(value: number, period: DisplayPeriod): number {
  return period === 'monthly' ? value * 12 : value;
}
