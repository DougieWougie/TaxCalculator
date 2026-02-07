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
  lowerBound: number;
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

  // K code: add kAdjustment to taxable income, no PA
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
const BASE_PERSONAL_ALLOWANCE = 12_570;
const PA_TAPER_THRESHOLD = 100_000;

// Scottish Income Tax Bands 2025-26
const SCOTTISH_TAX_BANDS: TaxBand[] = [
  { name: 'Personal Allowance', lowerBound: 0, upperBound: 12_570, rate: 0 },
  { name: 'Starter Rate', lowerBound: 12_571, upperBound: 15_397, rate: 0.19 },
  { name: 'Basic Rate', lowerBound: 15_398, upperBound: 27_491, rate: 0.20 },
  { name: 'Intermediate Rate', lowerBound: 27_492, upperBound: 43_662, rate: 0.21 },
  { name: 'Higher Rate', lowerBound: 43_663, upperBound: 75_000, rate: 0.42 },
  { name: 'Advanced Rate', lowerBound: 75_001, upperBound: 125_140, rate: 0.45 },
  { name: 'Top Rate', lowerBound: 125_141, upperBound: Infinity, rate: 0.48 },
];

// English/Welsh/NI Income Tax Bands 2025-26
const ENGLISH_TAX_BANDS: TaxBand[] = [
  { name: 'Personal Allowance', lowerBound: 0, upperBound: 12_570, rate: 0 },
  { name: 'Basic Rate', lowerBound: 12_571, upperBound: 50_270, rate: 0.20 },
  { name: 'Higher Rate', lowerBound: 50_271, upperBound: 125_140, rate: 0.40 },
  { name: 'Additional Rate', lowerBound: 125_141, upperBound: Infinity, rate: 0.45 },
];

// Employee National Insurance Bands 2025-26 (Class 1)
const NI_BANDS: { name: string; lowerBound: number; upperBound: number; rate: number }[] = [
  { name: 'Below Primary Threshold', lowerBound: 0, upperBound: 12_570, rate: 0 },
  { name: 'Main Rate', lowerBound: 12_570, upperBound: 50_270, rate: 0.08 },
  { name: 'Upper Rate', lowerBound: 50_270, upperBound: Infinity, rate: 0.02 },
];

function calculatePersonalAllowance(totalIncome: number): number {
  if (totalIncome <= PA_TAPER_THRESHOLD) {
    return BASE_PERSONAL_ALLOWANCE;
  }
  const excess = totalIncome - PA_TAPER_THRESHOLD;
  const reduction = Math.floor(excess / 2);
  return Math.max(0, BASE_PERSONAL_ALLOWANCE - reduction);
}

function adjustBandsForPersonalAllowance(
  bands: TaxBand[],
  personalAllowance: number
): TaxBand[] {
  return bands.map((band) => {
    if (band.name === 'Personal Allowance') {
      return { ...band, upperBound: personalAllowance };
    }
    if (band.lowerBound <= BASE_PERSONAL_ALLOWANCE) {
      return { ...band, lowerBound: personalAllowance + 1 };
    }
    return band;
  });
}

function calculateIncomeTax(
  income: number,
  region: TaxRegion,
  personalAllowance: number
): { total: number; breakdown: TaxBreakdownBand[] } {
  const baseBands = region === 'scottish' ? SCOTTISH_TAX_BANDS : ENGLISH_TAX_BANDS;
  const bands = adjustBandsForPersonalAllowance(baseBands, personalAllowance);

  let totalTax = 0;
  const breakdown: TaxBreakdownBand[] = [];

  for (const band of bands) {
    if (income <= band.lowerBound) break;
    const taxableInBand = Math.min(income, band.upperBound) - band.lowerBound;
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
    if (employmentIncome <= band.lowerBound) break;
    const earningsInBand =
      Math.min(employmentIncome, band.upperBound) - band.lowerBound;
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
  const baseBands = region === 'scottish' ? SCOTTISH_TAX_BANDS : ENGLISH_TAX_BANDS;
  const personalAllowance = calculatePersonalAllowance(totalIncome);
  const bands = adjustBandsForPersonalAllowance(baseBands, personalAllowance);

  let marginalRate = 0;
  for (const band of bands) {
    if (totalIncome >= band.lowerBound && totalIncome <= band.upperBound) {
      marginalRate = band.rate;
    }
  }

  // PA taper zone (£100k-£125,140): for every £2 earned over £100k, £1 of
  // personal allowance is lost. Earning £1 more means paying the marginal rate
  // on that £1 plus the marginal rate on £0.50 of lost PA = rate * 1.5.
  if (totalIncome > PA_TAPER_THRESHOLD && totalIncome <= 125_140) {
    marginalRate = marginalRate * 1.5;
  }

  return marginalRate;
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
    employmentTaxCode,
    militaryPensionTaxCode,
  } = input;

  // Parse tax codes
  const empCode = employmentTaxCode ? parseTaxCode(employmentTaxCode) : null;
  const milCode = militaryPensionTaxCode ? parseTaxCode(militaryPensionTaxCode) : null;
  const useEmpCode = empCode !== null && empCode.isValid;
  const useMilCode = milCode !== null && milCode.isValid && militaryPension > 0;
  const usingTaxCodes = useEmpCode || useMilCode;

  // Salary sacrifice reduces gross pay before tax and NI
  const totalSalarySacrifice = salarySacrifice + pensionContribution;
  const taxableEmploymentIncome = Math.max(0, annualSalary - totalSalarySacrifice);

  // Total taxable income (for display)
  const totalTaxableIncome = taxableEmploymentIncome + militaryPension;

  let personalAllowance: number;
  let incomeTax: number;
  let taxBreakdown: TaxBreakdownBand[];
  let employmentIncomeTax: number;
  let militaryPensionTax: number;
  let employmentTaxBreakdown: TaxBreakdownBand[];
  let militaryTaxBreakdown: TaxBreakdownBand[];

  if (usingTaxCodes) {
    // --- Tax code mode: calculate each income source independently ---

    // Employment income
    if (useEmpCode) {
      const empResult = calculateTaxWithCode(taxableEmploymentIncome, empCode, taxRegion);
      employmentIncomeTax = empResult.total;
      employmentTaxBreakdown = empResult.breakdown;
      personalAllowance = empCode.type === 'cumulative' ? empCode.personalAllowance : 0;
    } else {
      // No employment tax code — use default with combined PA logic
      personalAllowance = calculatePersonalAllowance(totalTaxableIncome);
      const empResult = calculateIncomeTax(taxableEmploymentIncome, taxRegion, personalAllowance);
      employmentIncomeTax = empResult.total;
      employmentTaxBreakdown = empResult.breakdown;
    }

    // Military pension
    if (useMilCode) {
      const milResult = calculateTaxWithCode(militaryPension, milCode, taxRegion);
      militaryPensionTax = milResult.total;
      militaryTaxBreakdown = milResult.breakdown;
    } else if (militaryPension > 0) {
      // No military tax code but has pension — tax at marginal rates above employment
      const totalResult = calculateIncomeTax(totalTaxableIncome, taxRegion, personalAllowance);
      militaryPensionTax = totalResult.total - employmentIncomeTax;
      militaryTaxBreakdown = [{ name: 'Marginal Rate', taxableInBand: militaryPension, rate: militaryPensionTax / militaryPension, tax: militaryPensionTax }];
    } else {
      militaryPensionTax = 0;
      militaryTaxBreakdown = [];
    }

    incomeTax = employmentIncomeTax + militaryPensionTax;
    // Combined breakdown for the summary
    taxBreakdown = [
      ...employmentTaxBreakdown.map((b) => ({ ...b, name: `Employment: ${b.name}` })),
      ...militaryTaxBreakdown.map((b) => ({ ...b, name: `Military: ${b.name}` })),
    ];

  } else {
    // --- Default mode (no tax codes): combined calculation ---
    personalAllowance = calculatePersonalAllowance(totalTaxableIncome);

    const totalResult = calculateIncomeTax(totalTaxableIncome, taxRegion, personalAllowance);
    incomeTax = totalResult.total;
    taxBreakdown = totalResult.breakdown;

    const empResult = calculateIncomeTax(taxableEmploymentIncome, taxRegion, personalAllowance);
    employmentIncomeTax = empResult.total;
    employmentTaxBreakdown = empResult.breakdown;
    militaryPensionTax = incomeTax - employmentIncomeTax;
    militaryTaxBreakdown = militaryPension > 0
      ? [{ name: 'Marginal Rate', taxableInBand: militaryPension, rate: militaryPensionTax / militaryPension, tax: militaryPensionTax }]
      : [];
  }

  // NI only on employment income (NOT military pension, unaffected by tax codes)
  const { total: nationalInsurance, breakdown: niBreakdown } =
    calculateNI(taxableEmploymentIncome);

  // Post-tax deductions
  const totalPostTaxDeductions = postTaxDeductions.reduce(
    (sum, d) => sum + d.amount, 0
  );

  const totalDeductions = employmentIncomeTax + nationalInsurance + totalSalarySacrifice;
  const netFromEmployment = annualSalary - totalDeductions;
  const netFromMilitary = militaryPension - militaryPensionTax;
  const netAnnualIncome = netFromEmployment + netFromMilitary - totalPostTaxDeductions;

  const totalPensionPot = pensionContribution + employerPension;

  const effectiveTaxRate =
    totalTaxableIncome > 0
      ? (incomeTax + nationalInsurance) / (annualSalary + militaryPension)
      : 0;

  const marginalTaxRate = getMarginalTaxRate(totalTaxableIncome, taxRegion);

  return {
    grossSalary: annualSalary,
    totalSalarySacrifice,
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

    employmentTaxCodeInfo: useEmpCode ? empCode : null,
    militaryTaxCodeInfo: useMilCode ? milCode : null,
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
