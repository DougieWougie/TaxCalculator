/**
 * UK Pension & Salary Tax Calculation Engine
 * Tax Year 2025-26
 *
 * Sources:
 * - Scottish rates: gov.scot/publications/scottish-income-tax-rates-and-bands
 * - English rates: gov.uk/income-tax-rates
 * - NI rates: gov.uk/national-insurance-rates-letters
 */

export type TaxRegion = 'scottish' | 'english';

export interface TaxBand {
  name: string;
  threshold: number;    // exclusive lower bound — last pound of the PREVIOUS band (or 0)
  upperBound: number;
  rate: number;
}

export interface TaxBreakdownBand {
  name: string;
  taxableInBand: number;
  rate: number;
  tax: number;
}

export interface NIBreakdownBand {
  name: string;
  earningsInBand: number;
  rate: number;
  contribution: number;
}

export interface PostTaxDeduction {
  name: string;
  amount: number;
}

// --- Tax Code Parsing ---

export type TaxCodeType =
  | 'cumulative'  // Standard code with PA (e.g. 1257L)
  | 'K'           // K code — adds to taxable income
  | 'BR'          // All at basic rate
  | 'D0'          // All at higher/intermediate rate
  | 'D1'          // All at additional/higher rate
  | 'D2'          // Scottish advanced rate
  | 'D3'          // Scottish top rate
  | 'NT'          // No tax
  | '0T';         // Zero personal allowance

export interface TaxCodeInfo {
  raw: string;
  type: TaxCodeType;
  personalAllowance: number;   // PA granted by this code
  kAdjustment: number;         // Extra income added for K codes
  isScottish: boolean;         // S prefix detected
  isValid: boolean;
}

/**
 * Parse a UK tax code string into structured info.
 *
 * Examples: 1257L, S1257L, BR, SBR, D0, SD1, K100, 0T, NT, S1100M
 */
export function parseTaxCode(code: string): TaxCodeInfo {
  const raw = code.trim().toUpperCase();
  const invalid: TaxCodeInfo = {
    raw, type: 'cumulative', personalAllowance: 0,
    kAdjustment: 0, isScottish: false, isValid: false,
  };

  if (!raw) return invalid;

  // Strip S (Scottish) or C (Welsh) prefix
  let stripped = raw;
  let isScottish = false;
  if (stripped.startsWith('S')) {
    isScottish = true;
    stripped = stripped.slice(1);
  } else if (stripped.startsWith('C')) {
    stripped = stripped.slice(1);
  }

  // Flat-rate codes
  if (stripped === 'NT') {
    return { raw, type: 'NT', personalAllowance: 0, kAdjustment: 0, isScottish, isValid: true };
  }
  if (stripped === 'BR') {
    return { raw, type: 'BR', personalAllowance: 0, kAdjustment: 0, isScottish, isValid: true };
  }
  if (stripped === 'D0') {
    return { raw, type: 'D0', personalAllowance: 0, kAdjustment: 0, isScottish, isValid: true };
  }
  if (stripped === 'D1') {
    return { raw, type: 'D1', personalAllowance: 0, kAdjustment: 0, isScottish, isValid: true };
  }
  if (stripped === 'D2') {
    return { raw, type: 'D2', personalAllowance: 0, kAdjustment: 0, isScottish, isValid: true };
  }
  if (stripped === 'D3') {
    return { raw, type: 'D3', personalAllowance: 0, kAdjustment: 0, isScottish, isValid: true };
  }
  if (stripped === '0T') {
    return { raw, type: '0T', personalAllowance: 0, kAdjustment: 0, isScottish, isValid: true };
  }

  // K code: K followed by digits
  const kMatch = stripped.match(/^K(\d+)$/);
  if (kMatch) {
    return {
      raw, type: 'K', personalAllowance: 0,
      kAdjustment: parseInt(kMatch[1], 10) * 10,
      isScottish, isValid: true,
    };
  }

  // Standard cumulative code: digits followed by a letter (L, M, N, T)
  const stdMatch = stripped.match(/^(\d+)[LMNT]$/);
  if (stdMatch) {
    return {
      raw, type: 'cumulative',
      personalAllowance: parseInt(stdMatch[1], 10) * 10,
      kAdjustment: 0, isScottish, isValid: true,
    };
  }

  return invalid;
}

/**
 * Get the flat rate for a flat-rate tax code.
 * Returns the single rate at which ALL income is taxed.
 */
function getFlatRate(type: TaxCodeType, region: TaxRegion): number {
  if (type === 'NT') return 0;

  if (region === 'scottish') {
    switch (type) {
      case 'BR': return 0.20;  // Scottish basic
      case 'D0': return 0.21;  // Scottish intermediate
      case 'D1': return 0.42;  // Scottish higher
      case 'D2': return 0.45;  // Scottish advanced
      case 'D3': return 0.48;  // Scottish top
      default: return 0;
    }
  }

  // English/Welsh/NI
  switch (type) {
    case 'BR': return 0.20;
    case 'D0': return 0.40;
    case 'D1': return 0.45;
    default: return 0;
  }
}

/**
 * Calculate income tax on a single income source using a parsed tax code.
 */
function calculateTaxWithCode(
  income: number,
  code: TaxCodeInfo,
  region: TaxRegion,
): { total: number; breakdown: TaxBreakdownBand[] } {
  if (income <= 0) return { total: 0, breakdown: [] };

  const effectiveRegion = code.isScottish ? 'scottish' : region;

  // NT = no tax
  if (code.type === 'NT') {
    return { total: 0, breakdown: [{ name: 'NT (No Tax)', taxableInBand: income, rate: 0, tax: 0 }] };
  }

  // Flat-rate codes (BR, D0, D1, D2, D3)
  if (code.type === 'BR' || code.type === 'D0' || code.type === 'D1' ||
      code.type === 'D2' || code.type === 'D3') {
    const rate = getFlatRate(code.type, effectiveRegion);
    const tax = income * rate;
    const label = `${code.type} Flat Rate`;
    return { total: tax, breakdown: [{ name: label, taxableInBand: income, rate, tax }] };
  }

  // K code: add kAdjustment to taxable income, no PA.
  // NOTE: HMRC caps K-code tax at 50% of pay in the relevant period (weekly/monthly).
  // This annual calculator does not implement the cap — accept it as a documented gap.
  if (code.type === 'K') {
    const adjustedIncome = income + code.kAdjustment;
    return calculateIncomeTax(adjustedIncome, effectiveRegion, 0);
  }

  // 0T: zero personal allowance
  if (code.type === '0T') {
    return calculateIncomeTax(income, effectiveRegion, 0);
  }

  // Cumulative (standard): use the PA from the code
  return calculateIncomeTax(income, effectiveRegion, code.personalAllowance);
}

// --- End Tax Code Parsing ---

export interface CalculationInput {
  annualSalary: number;
  salarySacrifice: number;
  pensionContribution: number;
  employerPension: number;
  militaryPension: number;
  postTaxDeductions: PostTaxDeduction[];
  taxRegion: TaxRegion;
  employmentTaxCode: string;
  militaryPensionTaxCode: string;
}

export interface CalculationResult {
  // Annual figures
  grossSalary: number;
  totalSalarySacrifice: number;
  pensionContribution: number;
  otherSalarySacrifice: number;
  monthlyPensionContribution: number;
  monthlyOtherSalarySacrifice: number;
  taxableEmploymentIncome: number;
  militaryPension: number;
  totalTaxableIncome: number;
  personalAllowance: number;
  incomeTax: number;
  nationalInsurance: number;
  employmentIncomeTax: number;
  militaryPensionTax: number;
  totalDeductions: number;
  netAnnualIncome: number;

  // Employer pension (informational — not deducted from employee pay)
  employerPension: number;
  totalPensionPot: number;

  // Post-tax deductions
  postTaxDeductions: PostTaxDeduction[];
  totalPostTaxDeductions: number;

  // Tax code info
  employmentTaxCodeInfo: TaxCodeInfo | null;
  militaryTaxCodeInfo: TaxCodeInfo | null;
  usingTaxCodes: boolean;

  // Monthly figures
  grossMonthlySalary: number;
  monthlyTakeHome: number;
  monthlyTax: number;
  monthlyNI: number;
  monthlySalarySacrifice: number;
  monthlyMilitaryPension: number;
  monthlyPostTaxDeductions: number;
  monthlyEmployerPension: number;

  // Breakdowns
  taxBreakdown: TaxBreakdownBand[];
  niBreakdown: NIBreakdownBand[];
  employmentTaxBreakdown: TaxBreakdownBand[];
  militaryTaxBreakdown: TaxBreakdownBand[];
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

// Personal Allowance 2025-26
export const BASE_PERSONAL_ALLOWANCE = 12_570;
export const PA_TAPER_THRESHOLD = 100_000;

// Scottish Income Tax Bands 2025-26 (excludes Personal Allowance — that's a threshold, not a band)
export const SCOTTISH_TAX_BANDS: TaxBand[] = [
  { name: 'Starter Rate',       threshold: 12_570,  upperBound: 15_397,   rate: 0.19 },
  { name: 'Basic Rate',         threshold: 15_397,  upperBound: 27_491,   rate: 0.20 },
  { name: 'Intermediate Rate',  threshold: 27_491,  upperBound: 43_662,   rate: 0.21 },
  { name: 'Higher Rate',        threshold: 43_662,  upperBound: 75_000,   rate: 0.42 },
  { name: 'Advanced Rate',      threshold: 75_000,  upperBound: 125_140,  rate: 0.45 },
  { name: 'Top Rate',           threshold: 125_140, upperBound: Infinity, rate: 0.48 },
];

// English/Welsh/NI Income Tax Bands 2025-26 (excludes Personal Allowance)
export const ENGLISH_TAX_BANDS: TaxBand[] = [
  { name: 'Basic Rate',         threshold: 12_570,  upperBound: 50_270,   rate: 0.20 },
  { name: 'Higher Rate',        threshold: 50_270,  upperBound: 125_140,  rate: 0.40 },
  { name: 'Additional Rate',    threshold: 125_140, upperBound: Infinity, rate: 0.45 },
];

// Employee National Insurance Bands 2025-26 (Class 1)
const NI_BANDS: { name: string; threshold: number; upperBound: number; rate: number }[] = [
  { name: 'Below Primary Threshold', threshold: 0,      upperBound: 12_570,   rate: 0    },
  { name: 'Main Rate',               threshold: 12_570, upperBound: 50_270,   rate: 0.08 },
  { name: 'Upper Rate',              threshold: 50_270, upperBound: Infinity, rate: 0.02  },
];

function calculatePersonalAllowance(totalIncome: number): number {
  if (totalIncome <= PA_TAPER_THRESHOLD) {
    return BASE_PERSONAL_ALLOWANCE;
  }
  const excess = totalIncome - PA_TAPER_THRESHOLD;
  const reduction = Math.floor(excess / 2);
  return Math.max(0, BASE_PERSONAL_ALLOWANCE - reduction);
}

/**
 * Build the effective tax bands for a given region and personal allowance.
 * Shifts the first band's threshold to match the supplied PA (tapered or full).
 * Returns a new array; does not mutate the exported band constants.
 */
function buildTaxBands(region: TaxRegion, personalAllowance: number): TaxBand[] {
  const base = region === 'scottish' ? SCOTTISH_TAX_BANDS : ENGLISH_TAX_BANDS;
  return base.map((band) => {
    if (band.threshold <= BASE_PERSONAL_ALLOWANCE) {
      return { ...band, threshold: personalAllowance };
    }
    return band;
  });
}

function calculateIncomeTax(
  income: number,
  region: TaxRegion,
  personalAllowance: number
): { total: number; breakdown: TaxBreakdownBand[] } {
  if (income <= personalAllowance) return { total: 0, breakdown: [] };

  const bands = buildTaxBands(region, personalAllowance);

  let totalTax = 0;
  const breakdown: TaxBreakdownBand[] = [];

  for (const band of bands) {
    if (income <= band.threshold) break;
    const taxableInBand = Math.min(income, band.upperBound) - band.threshold;
    if (taxableInBand <= 0) continue;

    const tax = taxableInBand * band.rate;
    totalTax += tax;
    breakdown.push({
      name: band.name,
      taxableInBand,
      rate: band.rate,
      tax,
    });
  }

  return { total: totalTax, breakdown };
}

function calculateNI(
  employmentIncome: number
): { total: number; breakdown: NIBreakdownBand[] } {
  let totalNI = 0;
  const breakdown: NIBreakdownBand[] = [];

  for (const band of NI_BANDS) {
    if (employmentIncome <= band.threshold) break;
    const earningsInBand =
      Math.min(employmentIncome, band.upperBound) - band.threshold;
    if (earningsInBand <= 0) continue;

    const contribution = earningsInBand * band.rate;
    totalNI += contribution;
    breakdown.push({
      name: band.name,
      earningsInBand,
      rate: band.rate,
      contribution,
    });
  }

  return { total: totalNI, breakdown };
}

function getMarginalTaxRate(totalIncome: number, region: TaxRegion): number {
  const personalAllowance = calculatePersonalAllowance(totalIncome);
  const bands = buildTaxBands(region, personalAllowance);

  let marginalRate = 0;
  for (const band of bands) {
    if (totalIncome > band.threshold && totalIncome <= band.upperBound) {
      marginalRate = band.rate;
    }
  }

  // PA taper zone (£100k-£125,140): for every £2 earned over £100k, £1 of
  // personal allowance is lost. Earning £1 more means paying the marginal rate
  // on that £1 plus the marginal rate on £0.50 of lost PA = rate * 1.5.
  if (totalIncome >= PA_TAPER_THRESHOLD && totalIncome <= 125_140) {
    marginalRate = marginalRate * 1.5;
  }

  return marginalRate;
}

/**
 * Internal representation of a taxable income stream. Employment is NI-liable;
 * pension streams (military, occupational) are not. Salary sacrifice and pension
 * contributions reduce the first NI-liable source only — you cannot salary-sacrifice
 * a pension income stream.
 */
interface IncomeSource {
  label: 'employment' | 'military';
  amount: number;
  code: TaxCodeInfo | null;
  niLiable: boolean;
}

function buildSources(input: CalculationInput): IncomeSource[] {
  const empCode = input.employmentTaxCode ? parseTaxCode(input.employmentTaxCode) : null;
  const milCode = input.militaryPensionTaxCode ? parseTaxCode(input.militaryPensionTaxCode) : null;

  const employmentAmount = Math.max(
    0,
    input.annualSalary - input.salarySacrifice - input.pensionContribution,
  );

  const sources: IncomeSource[] = [
    {
      label: 'employment',
      amount: employmentAmount,
      code: empCode && empCode.isValid ? empCode : null,
      niLiable: true,
    },
  ];

  if (input.militaryPension > 0) {
    sources.push({
      label: 'military',
      amount: input.militaryPension,
      code: milCode && milCode.isValid ? milCode : null,
      niLiable: false,
    });
  }

  return sources;
}

function synthesizeDefaultCode(personalAllowance: number, region: TaxRegion): TaxCodeInfo {
  return {
    raw: '',
    type: 'cumulative',
    personalAllowance,
    kAdjustment: 0,
    isScottish: region === 'scottish',
    isValid: true,
  };
}

/**
 * Split a combined band-level breakdown across ordered income sources.
 * Earlier sources fill each band first; later sources fill the remainder.
 * Used when no per-source tax codes apply and we run a single combined calc.
 */
function splitBreakdownAcrossSources(
  combined: TaxBreakdownBand[],
  sourceAmounts: number[],
): TaxBreakdownBand[][] {
  const perSource: TaxBreakdownBand[][] = sourceAmounts.map(() => []);
  const remaining = [...sourceAmounts];

  for (const band of combined) {
    let bandLeft = band.taxableInBand;
    for (let i = 0; i < remaining.length && bandLeft > 0; i++) {
      const take = Math.min(bandLeft, remaining[i]);
      if (take > 0) {
        perSource[i].push({
          name: band.name,
          taxableInBand: take,
          rate: band.rate,
          tax: take * band.rate,
        });
        remaining[i] -= take;
        bandLeft -= take;
      }
    }
  }

  return perSource;
}

export function calculate(input: CalculationInput): CalculationResult {
  const {
    annualSalary,
    salarySacrifice,
    pensionContribution,
    employerPension,
    militaryPension,
    postTaxDeductions,
    taxRegion,
  } = input;

  const totalSalarySacrifice = salarySacrifice + pensionContribution;
  const taxableEmploymentIncome = Math.max(0, annualSalary - totalSalarySacrifice);
  const totalTaxableIncome = taxableEmploymentIncome + militaryPension;

  const sources = buildSources(input);
  const usingTaxCodes = sources.some((s) => s.code !== null);

  // Personal allowance is tapered against total taxable income.
  const personalAllowance = calculatePersonalAllowance(totalTaxableIncome);

  // --- Income tax: per-source calculation ---
  let employmentIncomeTax = 0;
  let militaryPensionTax = 0;
  let employmentTaxBreakdown: TaxBreakdownBand[] = [];
  let militaryTaxBreakdown: TaxBreakdownBand[] = [];

  if (usingTaxCodes) {
    // Per-source: each source uses its own code (or a default if none supplied).
    for (const src of sources) {
      const code = src.code ?? synthesizeDefaultCode(personalAllowance, taxRegion);
      const { total, breakdown } = calculateTaxWithCode(src.amount, code, taxRegion);
      if (src.label === 'employment') {
        employmentIncomeTax = total;
        employmentTaxBreakdown = breakdown;
      } else {
        militaryPensionTax = total;
        militaryTaxBreakdown = breakdown;
      }
    }
  } else {
    // Combined: one pass across all sources, split the breakdown band-by-band.
    const combined = calculateIncomeTax(totalTaxableIncome, taxRegion, personalAllowance);
    const sourceAmounts = sources.map((s) => s.amount);
    const perSource = splitBreakdownAcrossSources(combined.breakdown, sourceAmounts);

    const empIdx = sources.findIndex((s) => s.label === 'employment');
    const milIdx = sources.findIndex((s) => s.label === 'military');
    employmentTaxBreakdown = empIdx >= 0 ? perSource[empIdx] : [];
    militaryTaxBreakdown = milIdx >= 0 ? perSource[milIdx] : [];
    employmentIncomeTax = employmentTaxBreakdown.reduce((s, b) => s + b.tax, 0);
    militaryPensionTax = militaryTaxBreakdown.reduce((s, b) => s + b.tax, 0);
  }

  const incomeTax = employmentIncomeTax + militaryPensionTax;
  const taxBreakdown: TaxBreakdownBand[] = militaryPension > 0
    ? [
        ...employmentTaxBreakdown.map((b) => ({ ...b, name: `Employment: ${b.name}` })),
        ...militaryTaxBreakdown.map((b) => ({ ...b, name: `Military: ${b.name}` })),
      ]
    : [...employmentTaxBreakdown];

  // NI on NI-liable sources only.
  const niIncome = sources.filter((s) => s.niLiable).reduce((sum, s) => sum + s.amount, 0);
  const { total: nationalInsurance, breakdown: niBreakdown } = calculateNI(niIncome);

  // Post-tax deductions
  const totalPostTaxDeductions = postTaxDeductions.reduce(
    (sum, d) => sum + d.amount, 0
  );

  const totalDeductions = employmentIncomeTax + nationalInsurance + totalSalarySacrifice;
  const netFromEmployment = annualSalary - totalDeductions;
  const netFromMilitary = militaryPension - militaryPensionTax;
  const netAnnualIncome = netFromEmployment + netFromMilitary - totalPostTaxDeductions;

  const totalPensionPot = pensionContribution + employerPension;

  // Effective tax rate: combined income tax + NI as a fraction of total taxable income
  // (income after salary sacrifice, before post-tax deductions). Measures the tax burden
  // on income actually subject to PAYE.
  const effectiveTaxRate =
    totalTaxableIncome > 0
      ? (incomeTax + nationalInsurance) / totalTaxableIncome
      : 0;

  const marginalTaxRate = getMarginalTaxRate(totalTaxableIncome, taxRegion);

  return {
    grossSalary: annualSalary,
    totalSalarySacrifice,
    pensionContribution,
    otherSalarySacrifice: salarySacrifice,
    monthlyPensionContribution: pensionContribution / 12,
    monthlyOtherSalarySacrifice: salarySacrifice / 12,
    taxableEmploymentIncome,
    militaryPension,
    totalTaxableIncome,
    personalAllowance,
    incomeTax,
    nationalInsurance,
    employmentIncomeTax,
    militaryPensionTax,
    totalDeductions,
    netAnnualIncome,

    employerPension,
    totalPensionPot,

    postTaxDeductions,
    totalPostTaxDeductions,

    employmentTaxCodeInfo: sources.find((s) => s.label === 'employment')?.code ?? null,
    militaryTaxCodeInfo: sources.find((s) => s.label === 'military')?.code ?? null,
    usingTaxCodes,

    grossMonthlySalary: annualSalary / 12,
    monthlyTakeHome: netAnnualIncome / 12,
    monthlyTax: incomeTax / 12,
    monthlyNI: nationalInsurance / 12,
    monthlySalarySacrifice: totalSalarySacrifice / 12,
    monthlyMilitaryPension: militaryPension / 12,
    monthlyPostTaxDeductions: totalPostTaxDeductions / 12,
    monthlyEmployerPension: employerPension / 12,

    taxBreakdown,
    niBreakdown,
    employmentTaxBreakdown,
    militaryTaxBreakdown,
    effectiveTaxRate,
    marginalTaxRate,
  };
}

// --- Scenario Comparison ---

export interface OptimisationTarget {
  name: string;
  threshold: number;
}

export interface ScenarioDiff {
  grossSalary: number;
  pensionContribution: number;
  salarySacrifice: number;
  incomeTax: number;
  nationalInsurance: number;
  monthlyTakeHome: number;
  netAnnualIncome: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  totalPensionPot: number;
}

/**
 * Get the tax band thresholds the user could optimise down to
 * by increasing pension contributions. Only returns thresholds
 * that the user's taxable employment income currently exceeds.
 *
 * Note: uses employment income only. Military pension income is excluded
 * because salary sacrifice cannot reduce military pension.
 */
export function getOptimisationTargets(
  input: CalculationInput,
  result: CalculationResult,
): OptimisationTarget[] {
  const taxableIncome = result.taxableEmploymentIncome;
  const bands = input.taxRegion === 'scottish' ? SCOTTISH_TAX_BANDS : ENGLISH_TAX_BANDS;

  const candidates: OptimisationTarget[] = [];

  for (const band of bands) {
    // Skip PA (0%), Starter (19%), Basic (20%) — no meaningful tax saving from these thresholds
    if (band.rate < 0.21) continue;
    if (band.upperBound === Infinity) continue;
    if (taxableIncome > band.threshold) {
      const label = `${band.name} (${formatCurrency(band.threshold).replace('.00', '')})`;
      candidates.push({ name: label, threshold: band.threshold });
    }
  }

  // Return at most the two highest thresholds (nearest meaningful optimisation targets)
  const targets = candidates.slice(-2);

  // PA taper target
  if (taxableIncome > PA_TAPER_THRESHOLD) {
    targets.push({
      name: `PA Taper (${formatCurrency(PA_TAPER_THRESHOLD).replace('.00', '')})`,
      threshold: PA_TAPER_THRESHOLD,
    });
  }

  return targets;
}

/**
 * Calculate the exact annual pension contribution (salary sacrifice)
 * needed to bring taxable employment income to the target threshold.
 *
 * Returns the TOTAL pension contribution needed (not additional on top of existing).
 * Returns null if already below the threshold or if the contribution would exceed
 * available salary.
 */
export function calculateOptimalPension(
  input: CalculationInput,
  targetThreshold: number,
): number | null {
  const { annualSalary, salarySacrifice, pensionContribution } = input;
  const currentTaxable = Math.max(0, annualSalary - salarySacrifice - pensionContribution);

  if (currentTaxable <= targetThreshold) return null;

  const pensionNeeded = annualSalary - salarySacrifice - targetThreshold;
  const maxPension = annualSalary - salarySacrifice;

  if (pensionNeeded > maxPension || pensionNeeded < 0) return null;

  return pensionNeeded;
}

/**
 * Calculate the difference between two calculation results.
 * Returns b - a for each field (positive = b is higher).
 */
export function diffResults(
  a: CalculationResult,
  b: CalculationResult,
): ScenarioDiff {
  return {
    grossSalary: b.grossSalary - a.grossSalary,
    pensionContribution: b.pensionContribution - a.pensionContribution,
    // Uses otherSalarySacrifice (non-pension sacrifice only) since pensionContribution is diffed separately
    salarySacrifice: b.otherSalarySacrifice - a.otherSalarySacrifice,
    incomeTax: b.incomeTax - a.incomeTax,
    nationalInsurance: b.nationalInsurance - a.nationalInsurance,
    monthlyTakeHome: b.monthlyTakeHome - a.monthlyTakeHome,
    netAnnualIncome: b.netAnnualIncome - a.netAnnualIncome,
    effectiveTaxRate: b.effectiveTaxRate - a.effectiveTaxRate,
    marginalTaxRate: b.marginalTaxRate - a.marginalTaxRate,
    totalPensionPot: b.totalPensionPot - a.totalPensionPot,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
