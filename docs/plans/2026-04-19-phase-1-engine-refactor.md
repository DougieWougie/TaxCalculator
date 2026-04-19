# Phase 1 — Engine Refactor (Implementation Plan)

> **For Claude:** Implement this plan task-by-task. Each task ends with a build step and a single commit. Do not batch commits.

**Parent plan:** `docs/plans/2026-04-19-engine-and-ui-refactor.md`
**Goal:** Collapse the dual calculation paths in `taxEngine.ts`, remove the PA magic string, fix the `effectiveTaxRate` denominator and the military-pension breakdown, strip `monthly*` fields from `CalculationResult` in favour of a scaling helper, and document the K-code cap gap. One PR at end of phase.

**Guiding principle for Tasks 3–6:** existing `taxEngine.test.ts` must stay green throughout. It is the parity safety net. The only test that will be *changed* in this phase is the military-pension breakdown expectation (Task 6).

**Tech stack:** No new dependencies. React 19, TypeScript 5.7 strict, vitest 4.

---

## Task 1: Document K-code 50%-cap gap

Trivial warmup. One comment, no behaviour change.

**Files:**
- Modify: `src/taxEngine.ts`

**Step 1: Add comment in `calculateTaxWithCode`**

Find the `K code` branch in `calculateTaxWithCode` (around line 185):

```ts
  // K code: add kAdjustment to taxable income, no PA
  if (code.type === 'K') {
    const adjustedIncome = income + code.kAdjustment;
    return calculateIncomeTax(adjustedIncome, effectiveRegion, 0);
  }
```

Replace with:

```ts
  // K code: add kAdjustment to taxable income, no PA.
  // NOTE: HMRC caps K-code tax at 50% of pay in the relevant period (weekly/monthly).
  // This annual calculator does not implement the cap — accept it as a documented gap.
  if (code.type === 'K') {
    const adjustedIncome = income + code.kAdjustment;
    return calculateIncomeTax(adjustedIncome, effectiveRegion, 0);
  }
```

**Step 2: Build**

```bash
npm run build && npm run test
```

Expected: clean build, all tests pass.

**Step 3: Commit**

```bash
git add src/taxEngine.ts
git commit -m "docs: note unimplemented HMRC K-code 50% cap in calculateTaxWithCode"
```

---

## Task 2: Fix `effectiveTaxRate` denominator

Currently `(incomeTax + NI) / (annualSalary + militaryPension)` — ignores salary sacrifice. Change to `(incomeTax + NI) / totalTaxableIncome` so the rate reflects tax burden on income actually taxed.

**Files:**
- Modify: `src/taxEngine.ts`
- Modify: `src/taxEngine.test.ts`

**Step 1: Add failing test**

In `taxEngine.test.ts`, add a new describe block at the bottom:

```ts
describe('effectiveTaxRate', () => {
  it('computes rate against taxable income, not gross', () => {
    // £60k salary, £10k pension sacrifice → £50k taxable
    // English taxpayer: tax = (50000 - 12570) * 0.20 = 7486
    //                   NI  = (50000 - 12570) * 0.08 = 2994.40
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
```

Run:

```bash
npm run test
```

Expected: the new "computes rate against taxable income" test fails (current code uses gross in denominator).

**Step 2: Fix the calculation**

In `taxEngine.ts`, find (around line 502):

```ts
  const effectiveTaxRate =
    totalTaxableIncome > 0
      ? (incomeTax + nationalInsurance) / (annualSalary + militaryPension)
      : 0;
```

Replace with:

```ts
  // Effective tax rate: combined income tax + NI as a fraction of total taxable income
  // (income after salary sacrifice, before post-tax deductions). Measures the tax burden
  // on income actually subject to PAYE.
  const effectiveTaxRate =
    totalTaxableIncome > 0
      ? (incomeTax + nationalInsurance) / totalTaxableIncome
      : 0;
```

**Step 3: Build and test**

```bash
npm run build && npm run test
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add src/taxEngine.ts src/taxEngine.test.ts
git commit -m "fix: compute effectiveTaxRate against taxable income, not gross"
```

---

## Task 3: Replace PA band-magic with `buildTaxBands`

Remove the `band.name === 'Personal Allowance'` string match. PA is a threshold, not a band, and should not sit inside the tax-band array.

**Files:**
- Modify: `src/taxEngine.ts`

**Step 1: Redefine exported band constants without the PA pseudo-band**

Find `SCOTTISH_TAX_BANDS` and `ENGLISH_TAX_BANDS` (around line 269). Replace with:

```ts
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
```

**Step 2: Replace `adjustBandsForPersonalAllowance` with `buildTaxBands`**

Delete the existing `adjustBandsForPersonalAllowance` function (around line 303). Replace with:

```ts
/**
 * Build the effective tax bands for a given region and personal allowance.
 * Shifts each band's threshold up by any PA above the statutory £12,570 base
 * (irrelevant currently since no PA > base exists), or down to reflect a tapered PA.
 *
 * Returns bands with thresholds adjusted so that the first band starts exactly at
 * the supplied personal allowance.
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
```

**Step 3: Update `calculateIncomeTax` to use the new helper**

Find `calculateIncomeTax` (around line 318). Replace its body:

```ts
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
```

**Step 4: Update `getMarginalTaxRate` similarly**

Find `getMarginalTaxRate` (around line 372). Replace:

```ts
function getMarginalTaxRate(totalIncome: number, region: TaxRegion): number {
  const personalAllowance = calculatePersonalAllowance(totalIncome);
  const bands = buildTaxBands(region, personalAllowance);

  let marginalRate = 0;
  for (const band of bands) {
    if (totalIncome > band.threshold && totalIncome <= band.upperBound) {
      marginalRate = band.rate;
    }
  }

  // PA taper zone (£100k-£125,140): earning £1 more loses £0.50 of PA, which is
  // then taxed at the marginal rate. Effective marginal = rate * 1.5.
  if (totalIncome >= PA_TAPER_THRESHOLD && totalIncome <= 125_140) {
    marginalRate = marginalRate * 1.5;
  }

  return marginalRate;
}
```

**Step 5: Build and test**

```bash
npm run build && npm run test
```

Expected: all existing tests pass. Band calculations are identical; only the code path changed.

**Step 6: Commit**

```bash
git add src/taxEngine.ts
git commit -m "refactor: extract buildTaxBands, remove PA pseudo-band from tax-band array"
```

---

## Task 4: Introduce internal `IncomeSource` model

Pure refactor. Model employment + military pension as a `sources` array inside `calculate()`. Does not change `CalculationInput` or `CalculationResult`.

**Files:**
- Modify: `src/taxEngine.ts`

**Step 1: Add internal type and builder above `calculate()`**

Insert before the `calculate` function (around line 394):

```ts
/**
 * Internal representation of a taxable income stream. Employment is NI-liable;
 * pension streams (military, occupational) are not. Salary sacrifice and pension
 * contributions reduce the first NI-liable source only (you cannot salary-sacrifice
 * a pension income stream).
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
```

**Step 2: Build and test**

```bash
npm run build && npm run test
```

The type is defined but unused yet — `noUnusedLocals` means we need to consume it in the next task. For now, delete the type temporarily OR silence with `// @ts-expect-error` — simpler to fold this task into Task 5.

**Decision:** merge Task 4 into Task 5 rather than commit unused code. Skip the commit here.

---

## Task 5: Unify the calc path via synthesized default codes

Collapse the `if (usingTaxCodes)` branch in `calculate()`. Every source gets a `TaxCodeInfo` — either its user-supplied code, or a synthesized cumulative code with the tapered PA.

**Files:**
- Modify: `src/taxEngine.ts`

**Step 1: Add `IncomeSource` + `buildSources` from Task 4**

Insert the type and builder from Task 4 above `calculate()`.

**Step 2: Add a default-code synthesizer**

Directly below `buildSources`:

```ts
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
```

**Step 3: Add a breakdown-splitter helper**

The military-pension band allocation fix (Task 6) builds on this. Define it now — it will be used by `calculate()`:

```ts
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
```

**Step 4: Rewrite `calculate()` body**

Replace the existing `calculate` function (from line 394 to the end of its return block, around line 553) with:

```ts
export function calculate(input: CalculationInput): CalculationResult {
  const { annualSalary, salarySacrifice, pensionContribution, employerPension,
          militaryPension, postTaxDeductions, taxRegion } = input;

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

  const sourcesHaveAnyCode = sources.some((s) => s.code !== null);

  if (sourcesHaveAnyCode) {
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
    // Combined: one pass across all sources, split the breakdown (Task 6).
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
  const taxBreakdown: TaxBreakdownBand[] = [
    ...employmentTaxBreakdown.map((b) => ({ ...b, name: militaryPension > 0 ? `Employment: ${b.name}` : b.name })),
    ...militaryTaxBreakdown.map((b) => ({ ...b, name: `Military: ${b.name}` })),
  ];

  // --- NI: only on NI-liable sources ---
  const niIncome = sources.filter((s) => s.niLiable).reduce((sum, s) => sum + s.amount, 0);
  const { total: nationalInsurance, breakdown: niBreakdown } = calculateNI(niIncome);

  // --- Post-tax deductions ---
  const totalPostTaxDeductions = postTaxDeductions.reduce((sum, d) => sum + d.amount, 0);

  const totalDeductions = employmentIncomeTax + nationalInsurance + totalSalarySacrifice;
  const netFromEmployment = annualSalary - totalDeductions;
  const netFromMilitary = militaryPension - militaryPensionTax;
  const netAnnualIncome = netFromEmployment + netFromMilitary - totalPostTaxDeductions;

  const totalPensionPot = pensionContribution + employerPension;

  const effectiveTaxRate =
    totalTaxableIncome > 0
      ? (incomeTax + nationalInsurance) / totalTaxableIncome
      : 0;

  const marginalTaxRate = getMarginalTaxRate(totalTaxableIncome, taxRegion);

  const empSource = sources.find((s) => s.label === 'employment');
  const milSource = sources.find((s) => s.label === 'military');

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

    employmentTaxCodeInfo: empSource?.code ?? null,
    militaryTaxCodeInfo: milSource?.code ?? null,
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
```

Note: `monthly*` fields stay for now — Task 8 removes them in a single focused commit alongside the consumer updates.

**Step 5: Build and test**

```bash
npm run build && npm run test
```

Expected: all tests pass. The combined-mode total income tax is mathematically identical to before; only the per-band breakdown allocation for military pension changed (Task 6 validates this).

**Step 6: Commit**

```bash
git add src/taxEngine.ts
git commit -m "refactor: unify calculate() via IncomeSource model and synthesized default codes"
```

---

## Task 6: Replace the military "Marginal Rate" breakdown with band-level allocation

Task 5 already did the math (via `splitBreakdownAcrossSources`). This task updates the one test that asserted the old "Marginal Rate" behaviour and adds tests for the new allocation.

**Files:**
- Modify: `src/taxEngine.test.ts`

**Step 1: Add tests asserting band-level split**

Append to `taxEngine.test.ts`:

```ts
describe('military pension band-level breakdown (no tax codes)', () => {
  it('employment fills lower bands, military fills the remainder', () => {
    // Scottish taxpayer: £40k employment + £10k military = £50k total
    // PA: £12,570
    // Starter:      £2,827 @ 19% (all employment, since emp = £40k)
    // Basic:       £12,094 @ 20% (all employment)
    // Intermediate: £12,509 @ 21%
    //   → employment fills £40,000 - (12,570 + 2,827 + 12,094) = £12,509
    //   (exactly fills Intermediate band up to £40k mark — wait, need to recheck)
    //
    // Recomputation:
    //   employment = 40000, military = 10000, total = 50000
    //   PA: 12570 (no taper)
    //   Starter: 12570..15397 = 2827 @ 19%
    //   Basic:   15397..27491 = 12094 @ 20%
    //   Intermediate: 27491..40000 = 12509 @ 21% (employment) + 40000..43662 = 3662 @ 21% (military)
    //   Higher:  43662..50000 = 6338 @ 42% (military)
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

    // Employment breakdown: Starter + Basic + part of Intermediate
    expect(result.employmentTaxBreakdown.map((b) => b.name)).toEqual([
      'Starter Rate', 'Basic Rate', 'Intermediate Rate',
    ]);

    // Military breakdown: rest of Intermediate + part of Higher
    expect(result.militaryTaxBreakdown.map((b) => b.name)).toEqual([
      'Intermediate Rate', 'Higher Rate',
    ]);

    // Allocations
    const milInter = result.militaryTaxBreakdown.find((b) => b.name === 'Intermediate Rate')!;
    const milHigher = result.militaryTaxBreakdown.find((b) => b.name === 'Higher Rate')!;
    expect(milInter.taxableInBand).toBeCloseTo(3_662, 0);
    expect(milHigher.taxableInBand).toBeCloseTo(6_338, 0);

    // Total military tax = total - employment; parity check
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
```

**Step 2: Run tests**

```bash
npm run test
```

Expected: all tests pass (the splitter was added in Task 5).

**Step 3: Commit**

```bash
git add src/taxEngine.test.ts
git commit -m "test: assert band-level split of military pension breakdown"
```

---

## Task 7: Add `scalePeriod` helper

Minimal helper that divides an annual value by the correct divisor for a given period. Intentionally scoped small — replaces the fleet of `monthly*` fields without needing a full `PeriodResult` type.

**Files:**
- Modify: `src/taxEngine.ts`
- Modify: `src/taxEngine.test.ts`

**Step 1: Add the helper at the bottom of `taxEngine.ts`**

Append after `formatPercent`:

```ts
/**
 * Scale an annual figure to another pay period. Used by the UI to render monthly
 * (or weekly / fortnightly) breakdowns without storing duplicate fields on the
 * CalculationResult.
 */
export type PayPeriod = 'annual' | 'monthly' | 'weekly' | 'fortnightly';

const PERIOD_DIVISOR: Record<PayPeriod, number> = {
  annual: 1,
  monthly: 12,
  fortnightly: 26,
  weekly: 52,
};

export function scalePeriod(annual: number, period: PayPeriod): number {
  return annual / PERIOD_DIVISOR[period];
}
```

**Step 2: Add tests**

Append to `taxEngine.test.ts`:

```ts
import { scalePeriod } from './taxEngine';

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
```

Add `scalePeriod` to the top-level import in the test file:

```ts
import {
  calculate,
  getOptimisationTargets,
  calculateOptimalPension,
  diffResults,
  scalePeriod,
  type CalculationInput,
} from './taxEngine';
```

(Remove the separate import line from Step 2 if you added the consolidated version.)

**Step 3: Build and test**

```bash
npm run build && npm run test
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add src/taxEngine.ts src/taxEngine.test.ts
git commit -m "feat: add scalePeriod helper for pay-period conversion"
```

---

## Task 8: Remove `monthly*` fields from `CalculationResult`; update consumers

One commit touches the engine, the test file, and `App.tsx` together — cannot be split without breaking the build.

**Files:**
- Modify: `src/taxEngine.ts`
- Modify: `src/taxEngine.test.ts`
- Modify: `src/App.tsx`

**Step 1: Remove `monthly*` fields from `CalculationResult` interface**

In `taxEngine.ts`, delete these lines from the `CalculationResult` interface (around line 219 and line 247):

```ts
  monthlyPensionContribution: number;
  monthlyOtherSalarySacrifice: number;
```
```ts
  grossMonthlySalary: number;
  monthlyTakeHome: number;
  monthlyTax: number;
  monthlyNI: number;
  monthlySalarySacrifice: number;
  monthlyMilitaryPension: number;
  monthlyPostTaxDeductions: number;
  monthlyEmployerPension: number;
```

**Step 2: Remove them from the `return` object in `calculate`**

Delete the corresponding lines from the return object:

```ts
    monthlyPensionContribution: pensionContribution / 12,
    monthlyOtherSalarySacrifice: salarySacrifice / 12,
```
```ts
    grossMonthlySalary: annualSalary / 12,
    monthlyTakeHome: netAnnualIncome / 12,
    monthlyTax: incomeTax / 12,
    monthlyNI: nationalInsurance / 12,
    monthlySalarySacrifice: totalSalarySacrifice / 12,
    monthlyMilitaryPension: militaryPension / 12,
    monthlyPostTaxDeductions: totalPostTaxDeductions / 12,
    monthlyEmployerPension: employerPension / 12,
```

**Step 3: Remove `monthlyTakeHome` from `ScenarioDiff` and `diffResults`**

In the `ScenarioDiff` interface (around line 562), delete:

```ts
  monthlyTakeHome: number;
```

In `diffResults` (around line 648), delete:

```ts
    monthlyTakeHome: b.monthlyTakeHome - a.monthlyTakeHome,
```

**Step 4: Update `App.tsx` consumers**

All consumer sites (confirmed via `rg 'result\.(monthly|grossMonthlySalary)' src/App.tsx`):

| Line (approx) | Old | New |
|---|---|---|
| 711 | `result.monthlyTakeHome` | `scalePeriod(result.netAnnualIncome, 'monthly')` |
| 749 | `result.monthlyTakeHome - (result.monthlyMilitaryPension - result.militaryPensionTax / 12)` | `scalePeriod(result.netAnnualIncome - (result.militaryPension - result.militaryPensionTax), 'monthly')` |
| 756 | `result.monthlyMilitaryPension - result.militaryPensionTax / 12` | `scalePeriod(result.militaryPension - result.militaryPensionTax, 'monthly')` |
| 791 | `result.grossMonthlySalary` | `scalePeriod(result.grossSalary, 'monthly')` |
| 797 | `result.monthlyMilitaryPension` | `scalePeriod(result.militaryPension, 'monthly')` |
| 803 | `result.grossMonthlySalary + (hasMilitaryPension ? result.monthlyMilitaryPension : 0)` | `scalePeriod(result.grossSalary + (hasMilitaryPension ? result.militaryPension : 0), 'monthly')` |
| 813 | `result.monthlyTax` | `scalePeriod(result.incomeTax, 'monthly')` |
| 818 | `result.monthlyNI` | `scalePeriod(result.nationalInsurance, 'monthly')` |
| 824 | `result.monthlyOtherSalarySacrifice` | `scalePeriod(result.otherSalarySacrifice, 'monthly')` |
| 831 | `result.monthlyPensionContribution` | `scalePeriod(result.pensionContribution, 'monthly')` |
| 838 | `result.monthlyPostTaxDeductions` | `scalePeriod(result.totalPostTaxDeductions, 'monthly')` |
| 844 | `result.monthlyTax + result.monthlyNI + result.monthlySalarySacrifice + result.monthlyPostTaxDeductions` | `scalePeriod(result.incomeTax + result.nationalInsurance + result.totalSalarySacrifice + result.totalPostTaxDeductions, 'monthly')` |
| 851 | `result.monthlyTakeHome` | `scalePeriod(result.netAnnualIncome, 'monthly')` |
| 1129 | `result.monthlyPostTaxDeductions` | `scalePeriod(result.totalPostTaxDeductions, 'monthly')` |
| 1358 | `baseline.result.monthlyTakeHome` / `scenarioResult.monthlyTakeHome` / `scenarioDiff.monthlyTakeHome` | `scalePeriod(baseline.result.netAnnualIncome, 'monthly')` / `scalePeriod(scenarioResult.netAnnualIncome, 'monthly')` / `scalePeriod(scenarioDiff.netAnnualIncome, 'monthly')` |

Also at the top of `App.tsx`, add `scalePeriod` to the import from `./taxEngine`:

```ts
import {
  calculate,
  formatCurrency,
  formatPercent,
  parseTaxCode,
  getOptimisationTargets,
  calculateOptimalPension,
  diffResults,
  scalePeriod,
  type TaxRegion,
  type CalculationInput,
  type CalculationResult,
  type PostTaxDeduction,
  type ScenarioDiff,
  type OptimisationTarget,
} from './taxEngine';
```

**Step 5: Grep for stragglers**

```bash
rg 'monthly[A-Z]' src/App.tsx | rg -v 'scalePeriod'
rg '(grossMonthlySalary|monthlyTakeHome|monthlyTax|monthlyNI|monthlySalarySacrifice|monthlyMilitaryPension|monthlyPostTaxDeductions|monthlyEmployerPension|monthlyPensionContribution|monthlyOtherSalarySacrifice)' src/
```

Expected: first command may match local `const isMonthly` booleans (fine); second command should return nothing except lines inside documentation or comments.

**Step 6: Build and test**

```bash
npm run build && npm run test
```

Expected: clean build, all tests pass.

**Step 7: Manual smoke test**

```bash
npm run dev
```

Open http://localhost:3000 and verify:
- Monthly column in the P&L table matches annual / 12.
- Take-home hero number is correct.
- Scenario comparison's "Take-Home / month" row still renders.

Stop the dev server (Ctrl-C).

**Step 8: Commit**

```bash
git add src/taxEngine.ts src/taxEngine.test.ts src/App.tsx
git commit -m "refactor: replace monthly* fields with scalePeriod helper"
```

---

## Phase 1 complete

**Verification checklist before opening the PR:**
- [ ] `npm run test` — all green
- [ ] `npm run build` — clean
- [ ] `npm run dev` — app renders identically for a representative calculation
- [ ] `git log --oneline` shows 7 commits (Tasks 1, 2, 3, 5, 6, 7, 8 — Task 4 folded into 5)
- [ ] CLAUDE.md architecture section still accurate; if not, update it in a final commit before opening the PR

**PR description must call out:**
- `effectiveTaxRate` denominator change (user-visible number shift for inputs with salary sacrifice).
- Military pension breakdown now shows real band names instead of "Marginal Rate" (cosmetic, but visible).
- `monthly*` fields removed from `CalculationResult` — breaking change for any downstream consumer (only `App.tsx` today).

**Rollback:** squash-merge the PR. Revert = `git revert <merge-commit>`.
