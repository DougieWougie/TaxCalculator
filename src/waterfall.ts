import type { CalculationResult } from './taxEngine';

export type WaterfallKey = 'tax' | 'ni' | 'pension' | 'sacrifice' | 'posttax' | 'net';

export interface WaterfallSegment {
  key: WaterfallKey;
  label: string;
  /** Annual amount, signed (can be negative if net income is negative). */
  amount: number;
  /** Non-negative share of total, 0–100. Based on |amount|/Σ|amount| to stay valid even when net < 0. */
  percentOfGross: number;
}

/** Total income before any deduction — salary plus military pension. */
export function totalGross(result: CalculationResult): number {
  return result.grossSalary + result.militaryPension;
}

/**
 * Split total gross into the components that consume it, ending with net.
 *
 * The engine guarantees:
 *   net = gross − totalSalarySacrifice − incomeTax − NI − totalPostTaxDeductions
 * so these segments sum exactly to gross. Zero-valued segments are dropped so
 * the rendered bar contains no invisible slivers. Percentages are derived from
 * absolute values to stay non-negative even when net < 0.
 */
export function buildWaterfall(result: CalculationResult): WaterfallSegment[] {
  const gross = totalGross(result);
  if (gross <= 0) return [];

  const parts: { key: WaterfallKey; label: string; amount: number }[] = [
    { key: 'tax', label: 'Income tax', amount: result.incomeTax },
    { key: 'ni', label: 'National Insurance', amount: result.nationalInsurance },
    { key: 'pension', label: 'Pension', amount: result.pensionContribution },
    { key: 'sacrifice', label: 'Salary sacrifice', amount: result.otherSalarySacrifice },
    { key: 'posttax', label: 'Post-tax deductions', amount: result.totalPostTaxDeductions },
    { key: 'net', label: 'Take-home', amount: result.netAnnualIncome },
  ];

  const filtered = parts.filter((part) => part.amount !== 0);
  const sumAbsolute = filtered.reduce((acc, part) => acc + Math.abs(part.amount), 0);

  if (sumAbsolute === 0) return [];

  return filtered.map((part) => ({
    ...part,
    percentOfGross: (Math.abs(part.amount) / sumAbsolute) * 100,
  }));
}
