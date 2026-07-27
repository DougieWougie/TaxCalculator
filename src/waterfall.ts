import type { CalculationResult } from './taxEngine';

export type WaterfallKey = 'tax' | 'ni' | 'pension' | 'sacrifice' | 'posttax' | 'net';

export interface WaterfallSegment {
  key: WaterfallKey;
  label: string;
  /** Annual amount, always a positive magnitude. */
  amount: number;
  /** Share of total gross, 0–100. */
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
 * the rendered bar contains no invisible slivers.
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

  return parts
    .filter((part) => part.amount !== 0)
    .map((part) => ({ ...part, percentOfGross: (part.amount / gross) * 100 }));
}
