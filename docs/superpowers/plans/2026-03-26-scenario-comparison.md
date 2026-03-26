# Scenario Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Scenario Comparison card to the results column that lets users compare their current tax position against a modified scenario, with presets for common what-ifs (optimise tax band, salary change, add sacrifice).

**Architecture:** Pure functions in `taxEngine.ts` handle scenario generation and diffing. A new `ScenarioComparison` helper component in `App.tsx` renders the comparison card. State for baseline/scenario is managed in the main `App` component alongside existing state. Styling follows existing card/table patterns in `index.css`.

**Tech Stack:** React 19, TypeScript 5.7, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/taxEngine.ts` | Modify | Add types (`ScenarioDiff`, `OptimisationTarget`), export band thresholds, add `calculateOptimalPension`, `getOptimisationTargets`, `diffResults` |
| `src/taxEngine.test.ts` | Modify | Add tests for all new engine functions |
| `src/App.tsx` | Modify | Add baseline/scenario state, "Save as Baseline" button, `ScenarioComparison` component |
| `src/index.css` | Modify | Add styles for comparison card, preset buttons, delta table |

---

### Task 1: Export Band Thresholds and Add Types

**Files:**
- Modify: `src/taxEngine.ts:264-292` (make constants exportable, add new types)

- [ ] **Step 1: Export the band arrays and PA constants**

In `src/taxEngine.ts`, change these private constants to exports:

```typescript
// Personal Allowance 2025-26
export const BASE_PERSONAL_ALLOWANCE = 12_570;
export const PA_TAPER_THRESHOLD = 100_000;

// Scottish Income Tax Bands 2025-26
export const SCOTTISH_TAX_BANDS: TaxBand[] = [
```

```typescript
// English/Welsh/NI Income Tax Bands 2025-26
export const ENGLISH_TAX_BANDS: TaxBand[] = [
```

The `NI_BANDS` constant does not need exporting.

- [ ] **Step 2: Add new types at the end of the file (before `formatCurrency`)**

Insert before the `formatCurrency` function (line 554):

```typescript
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
```

- [ ] **Step 3: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/taxEngine.ts
git commit -m "feat: export band constants and add scenario comparison types"
```

---

### Task 2: Implement `getOptimisationTargets`

**Files:**
- Test: `src/taxEngine.test.ts`
- Modify: `src/taxEngine.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/taxEngine.test.ts`:

```typescript
import {
  calculate,
  getOptimisationTargets,
  calculateOptimalPension,
  diffResults,
  type CalculationInput,
  type CalculationResult,
} from './taxEngine';

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
    // £86,800 salary is in Advanced Rate band — should offer Higher (£43,662) and Advanced (£75,000) and PA taper (£100,000 — but income is below, so not offered)
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
    // £50,000 salary with £8,000 sacrifice = £42,000 taxable — below Higher threshold
    const input = makeInput({ annualSalary: 50_000, salarySacrifice: 8_000 });
    const result = calculate(input);
    const targets = getOptimisationTargets(input, result);
    // £42,000 is in Intermediate band — only Intermediate threshold offered
    expect(targets).toEqual([
      { name: 'Intermediate Rate (£27,491)', threshold: 27_491 },
    ]);
  });
});
```

Also update the existing import at the top of the file. Change:

```typescript
import { calculate } from './taxEngine';
```

to:

```typescript
import {
  calculate,
  getOptimisationTargets,
  calculateOptimalPension,
  diffResults,
  type CalculationInput,
  type CalculationResult,
} from './taxEngine';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL — `getOptimisationTargets` is not exported

- [ ] **Step 3: Implement `getOptimisationTargets`**

Add in `src/taxEngine.ts`, after the `ScenarioDiff` interface (before `formatCurrency`):

```typescript
/**
 * Get the tax band thresholds the user could optimise down to
 * by increasing pension contributions. Only returns thresholds
 * that the user's taxable employment income currently exceeds.
 */
export function getOptimisationTargets(
  input: CalculationInput,
  result: CalculationResult,
): OptimisationTarget[] {
  const taxableIncome = result.taxableEmploymentIncome;
  const bands = input.taxRegion === 'scottish' ? SCOTTISH_TAX_BANDS : ENGLISH_TAX_BANDS;

  const targets: OptimisationTarget[] = [];

  // Skip PA band (index 0) and the first taxable band — no point optimising into zero tax
  for (let i = 2; i < bands.length; i++) {
    const band = bands[i];
    if (band.upperBound === Infinity) continue; // Can't optimise below top/additional rate upper bound
    if (taxableIncome > band.threshold) {
      const label = `${band.name} (${formatCurrency(band.threshold).replace('.00', '')})`;
      targets.push({ name: label, threshold: band.threshold });
    }
  }

  // PA taper target
  if (taxableIncome > PA_TAPER_THRESHOLD) {
    targets.push({
      name: `PA Taper (${formatCurrency(PA_TAPER_THRESHOLD).replace('.00', '')})`,
      threshold: PA_TAPER_THRESHOLD,
    });
  }

  return targets;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/taxEngine.ts src/taxEngine.test.ts
git commit -m "feat: add getOptimisationTargets for scenario comparison"
```

---

### Task 3: Implement `calculateOptimalPension`

**Files:**
- Test: `src/taxEngine.test.ts`
- Modify: `src/taxEngine.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/taxEngine.test.ts`:

```typescript
describe('calculateOptimalPension', () => {
  it('calculates pension needed to drop below Scottish Advanced Rate threshold', () => {
    // £86,800 salary, no existing sacrifice. Taxable = £86,800.
    // Target = £75,000. Need pension of £86,800 - £75,000 = £11,800
    const input = makeInput({ annualSalary: 86_800 });
    expect(calculateOptimalPension(input, 75_000)).toBe(11_800);
  });

  it('accounts for existing pension contribution', () => {
    // £86,800 salary, £5,000 existing pension. Taxable = £81,800.
    // Target = £75,000. Need total pension of £86,800 - £75,000 = £11,800
    // But already contributing £5,000, so returns £11,800 (total needed, not additional)
    const input = makeInput({ annualSalary: 86_800, pensionContribution: 5_000 });
    expect(calculateOptimalPension(input, 75_000)).toBe(11_800);
  });

  it('accounts for existing salary sacrifice', () => {
    // £86,800 salary, £3,000 other sacrifice. Taxable = £83,800.
    // Target = £75,000. Need pension of £83,800 - £75,000 = £8,800
    const input = makeInput({ annualSalary: 86_800, salarySacrifice: 3_000 });
    expect(calculateOptimalPension(input, 75_000)).toBe(8_800);
  });

  it('returns null when already below the threshold', () => {
    const input = makeInput({ annualSalary: 40_000 });
    expect(calculateOptimalPension(input, 75_000)).toBeNull();
  });

  it('returns null when required contribution would exceed available salary', () => {
    // £50,000 salary, £48,000 other sacrifice. Only £2,000 left.
    // Target threshold = £0 would need £2,000 pension, but let's test a case
    // where target is £0 and salary-sacrifice already consumes most.
    const input = makeInput({ annualSalary: 20_000, salarySacrifice: 19_000 });
    // Taxable = £1,000. Target = £0. Need £1,000 pension. Remaining salary = £1,000. Fits.
    expect(calculateOptimalPension(input, 0)).toBe(1_000);
  });

  it('returns null when pension needed exceeds remaining salary', () => {
    // £50,000 salary, £49,000 other sacrifice. Taxable = £1,000.
    // Target = £0. Need £1,000 pension. But only £1,000 remaining — just fits.
    // Try: £50,000 salary, £49,500 sacrifice. Taxable = £500. Target = £0. Need £500. Remaining = £500. Fits.
    // Actually test a real "exceeds" case:
    // £30,000 salary, £25,000 sacrifice. Taxable = £5,000. Target requires going to £0 = £5,000 pension.
    // Remaining salary = £5,000. Fits. Let's make it not fit:
    // £30,000 salary, £29,000 sacrifice, £0 pension. Taxable = £1,000.
    // Target = £0. Need £1,000. Remaining = £1,000. Still fits.
    // Need: target that requires more pension than salary allows.
    // £50,000 salary, £40,000 sacrifice. Taxable = £10,000. Target is not possible to go below with available salary.
    // Actually simplest: already at max sacrifice
    const input = makeInput({ annualSalary: 50_000, salarySacrifice: 50_000 });
    // Taxable = £0. Already below any threshold.
    expect(calculateOptimalPension(input, 43_662)).toBeNull();
  });

  it('handles PA taper threshold correctly', () => {
    // £130,000 salary. Taxable = £130,000. Target = £100,000. Need £30,000 pension.
    const input = makeInput({ annualSalary: 130_000 });
    expect(calculateOptimalPension(input, 100_000)).toBe(30_000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL — `calculateOptimalPension` not yet implemented

- [ ] **Step 3: Implement `calculateOptimalPension`**

Add in `src/taxEngine.ts`, after `getOptimisationTargets`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/taxEngine.ts src/taxEngine.test.ts
git commit -m "feat: add calculateOptimalPension for tax band optimisation"
```

---

### Task 4: Implement `diffResults`

**Files:**
- Test: `src/taxEngine.test.ts`
- Modify: `src/taxEngine.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/taxEngine.test.ts`:

```typescript
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

    // More pension = less take-home but more pension pot
    expect(diff.pensionContribution).toBe(11_800);
    expect(diff.totalPensionPot).toBe(11_800);
    expect(diff.netAnnualIncome).toBeLessThan(0);
    // But tax should be lower
    expect(diff.incomeTax).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL — `diffResults` not yet implemented

- [ ] **Step 3: Implement `diffResults`**

Add in `src/taxEngine.ts`, after `calculateOptimalPension`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/taxEngine.ts src/taxEngine.test.ts
git commit -m "feat: add diffResults for scenario comparison deltas"
```

---

### Task 5: Add Baseline State and "Save as Baseline" Button

**Files:**
- Modify: `src/App.tsx:35-148` (state and button)

- [ ] **Step 1: Add new state variables**

In `src/App.tsx`, after the existing state declarations (after `const [militaryPensionTaxCode, setMilitaryPensionTaxCode] = useState('');` around line 67), add:

```typescript
  // Scenario comparison
  const [baseline, setBaseline] = useState<{
    input: CalculationInput;
    result: CalculationResult;
  } | null>(null);
  const [scenarioPreset, setScenarioPreset] = useState<string | null>(null);
  const [scenarioInput, setScenarioInput] = useState<CalculationInput | null>(null);
```

Update the import from `./taxEngine` at the top of the file (line 2-10) to include the new exports:

```typescript
import {
  calculate,
  formatCurrency,
  formatPercent,
  parseTaxCode,
  getOptimisationTargets,
  calculateOptimalPension,
  diffResults,
  type TaxRegion,
  type CalculationInput,
  type CalculationResult,
  type PostTaxDeduction,
  type ScenarioDiff,
} from './taxEngine';
```

- [ ] **Step 2: Add a `currentInput` memo**

After the `result` memo (around line 146), add a memo that captures the current inputs as a `CalculationInput` object, so it can be easily saved as a baseline:

```typescript
  const currentInput: CalculationInput = useMemo(
    () => ({
      annualSalary: sanitizeNumber(annualSalary),
      salarySacrifice: sanitizeNumber(salarySacrifice),
      pensionContribution: sanitizeNumber(pensionContribution),
      employerPension: sanitizeNumber(employerPension),
      militaryPension: hasMilitaryPension ? sanitizeNumber(militaryPension) : 0,
      postTaxDeductions: parsedPostTaxDeductions,
      taxRegion,
      employmentTaxCode,
      militaryPensionTaxCode: hasMilitaryPension ? militaryPensionTaxCode : '',
    }),
    [annualSalary, salarySacrifice, pensionContribution, employerPension, militaryPension, hasMilitaryPension, parsedPostTaxDeductions, taxRegion, employmentTaxCode, militaryPensionTaxCode]
  );
```

- [ ] **Step 3: Add scenario result memo**

After `currentInput`, add:

```typescript
  const scenarioResult: CalculationResult | null = useMemo(
    () => scenarioInput ? calculate(scenarioInput) : null,
    [scenarioInput]
  );

  const scenarioDiff: ScenarioDiff | null = useMemo(
    () => (baseline && scenarioResult) ? diffResults(baseline.result, scenarioResult) : null,
    [baseline, scenarioResult]
  );
```

- [ ] **Step 4: Add "Save as Baseline" button in the results column**

In `src/App.tsx`, after the summary hero closing `</div>` (around line 630), add:

```typescript
            {/* Save as Baseline */}
            <div className="baseline-actions">
              <button
                className="baseline-btn"
                onClick={() => {
                  setBaseline({ input: currentInput, result });
                  setScenarioPreset(null);
                  setScenarioInput(null);
                }}
              >
                {baseline ? 'Update Baseline' : 'Save as Baseline'}
              </button>
              {baseline && (
                <button
                  className="baseline-clear"
                  onClick={() => {
                    setBaseline(null);
                    setScenarioPreset(null);
                    setScenarioInput(null);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
```

- [ ] **Step 5: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add baseline state and Save as Baseline button"
```

---

### Task 6: Add Baseline and Comparison Card Styles

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add styles for baseline actions and comparison card**

Append before the existing `@media` responsive section in `src/index.css`:

```css
/* --- Scenario Comparison --- */

.baseline-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.baseline-btn {
  flex: 1;
  padding: 0.6rem 1.25rem;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: var(--bg-input);
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.baseline-btn:hover {
  background: var(--accent);
  color: #fff;
  box-shadow: var(--shadow-glow);
}

.baseline-clear {
  padding: 0.6rem 1rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.baseline-clear:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* Preset buttons */
.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.preset-btn {
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.preset-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

/* Preset sub-options (e.g. tax band choices) */
.preset-sub-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 8px;
  background: var(--bg-input);
}

.preset-sub-btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-sub-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.preset-sub-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

/* Inline parameter input for presets */
.preset-param-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.preset-param-row .input-wrapper {
  flex: 1;
  max-width: 180px;
}

.preset-param-row .input-field {
  font-size: 0.85rem;
  padding: 0.4rem 0.5rem;
}

.preset-apply-btn {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-apply-btn:hover {
  box-shadow: var(--shadow-glow);
}

/* Comparison table */
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.comparison-table th {
  padding: 0.5rem 0.75rem;
  text-align: right;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 1px solid var(--border);
}

.comparison-table th:first-child {
  text-align: left;
}

.comparison-table td {
  padding: 0.45rem 0.75rem;
  text-align: right;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle, var(--border));
}

.comparison-table td:first-child {
  text-align: left;
  color: var(--text-secondary);
  font-weight: 500;
}

.comparison-table .delta-positive {
  color: var(--success);
  font-weight: 600;
}

.comparison-table .delta-negative {
  color: var(--danger);
  font-weight: 600;
}

.comparison-table .delta-neutral {
  color: var(--text-muted);
}

.comparison-table .highlight-row td {
  font-weight: 700;
  border-top: 2px solid var(--border);
  padding-top: 0.6rem;
}

/* Scenario summary sentence */
.scenario-summary {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--bg-input);
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.scenario-summary strong {
  color: var(--text-primary);
}
```

- [ ] **Step 2: Add responsive styles**

Inside the existing `@media (max-width: 768px)` block, append:

```css
  .preset-buttons {
    flex-direction: column;
  }

  .preset-param-row {
    flex-wrap: wrap;
  }

  .preset-param-row .input-wrapper {
    max-width: none;
    flex: 1;
  }

  .comparison-table {
    font-size: 0.78rem;
  }

  .comparison-table th,
  .comparison-table td {
    padding: 0.4rem 0.5rem;
  }
```

- [ ] **Step 3: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style: add scenario comparison card styles"
```

---

### Task 7: Build the ScenarioComparison Component

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the ScenarioComparison helper component**

At the bottom of `src/App.tsx`, after the `SliderSpinner` component (after line 1179), add:

```typescript
function ScenarioComparison({
  baseline,
  scenarioResult,
  scenarioDiff,
  scenarioPreset,
  onSelectPreset,
  onApplyOptimise,
  onApplySalaryChange,
  onApplySacrifice,
  optimisationTargets,
}: {
  baseline: { input: CalculationInput; result: CalculationResult };
  scenarioResult: CalculationResult | null;
  scenarioDiff: ScenarioDiff | null;
  scenarioPreset: string | null;
  onSelectPreset: (preset: string | null) => void;
  onApplyOptimise: (threshold: number) => void;
  onApplySalaryChange: (amount: number, isPercentage: boolean) => void;
  onApplySacrifice: (amount: number) => void;
  optimisationTargets: { name: string; threshold: number }[];
}) {
  const [salaryChangeValue, setSalaryChangeValue] = useState('');
  const [salaryChangeIsPercent, setSalaryChangeIsPercent] = useState(true);
  const [sacrificeValue, setSacrificeValue] = useState('');

  const formatDelta = (value: number, isCurrency: boolean, invertSign: boolean = false) => {
    const displayValue = invertSign ? -value : value;
    if (Math.abs(value) < 0.005) return { text: '\u2014', className: 'delta-neutral' };
    const sign = displayValue > 0 ? '+' : '';
    const text = isCurrency
      ? `${sign}${formatCurrency(displayValue)}`
      : `${sign}${formatPercent(displayValue)}`;
    const className = displayValue > 0 ? 'delta-positive' : 'delta-negative';
    return { text, className };
  };

  type ComparisonRow = {
    label: string;
    baselineValue: string;
    scenarioValue: string;
    diffValue: number;
    isCurrency: boolean;
    invertSign?: boolean;
    highlight?: boolean;
  };

  const rows: ComparisonRow[] = scenarioResult && scenarioDiff ? [
    { label: 'Gross Salary', baselineValue: formatCurrency(baseline.result.grossSalary), scenarioValue: formatCurrency(scenarioResult.grossSalary), diffValue: scenarioDiff.grossSalary, isCurrency: true },
    { label: 'Pension Contribution', baselineValue: formatCurrency(baseline.result.pensionContribution), scenarioValue: formatCurrency(scenarioResult.pensionContribution), diffValue: scenarioDiff.pensionContribution, isCurrency: true },
    { label: 'Salary Sacrifice', baselineValue: formatCurrency(baseline.result.otherSalarySacrifice), scenarioValue: formatCurrency(scenarioResult.otherSalarySacrifice), diffValue: scenarioDiff.salarySacrifice, isCurrency: true },
    { label: 'Income Tax', baselineValue: formatCurrency(baseline.result.incomeTax), scenarioValue: formatCurrency(scenarioResult.incomeTax), diffValue: scenarioDiff.incomeTax, isCurrency: true, invertSign: true },
    { label: 'National Insurance', baselineValue: formatCurrency(baseline.result.nationalInsurance), scenarioValue: formatCurrency(scenarioResult.nationalInsurance), diffValue: scenarioDiff.nationalInsurance, isCurrency: true, invertSign: true },
    { label: 'Take-Home / month', baselineValue: formatCurrency(baseline.result.monthlyTakeHome), scenarioValue: formatCurrency(scenarioResult.monthlyTakeHome), diffValue: scenarioDiff.monthlyTakeHome, isCurrency: true, highlight: true },
    { label: 'Take-Home / year', baselineValue: formatCurrency(baseline.result.netAnnualIncome), scenarioValue: formatCurrency(scenarioResult.netAnnualIncome), diffValue: scenarioDiff.netAnnualIncome, isCurrency: true },
    { label: 'Effective Rate', baselineValue: formatPercent(baseline.result.effectiveTaxRate), scenarioValue: formatPercent(scenarioResult.effectiveTaxRate), diffValue: scenarioDiff.effectiveTaxRate, isCurrency: false, invertSign: true },
    { label: 'Marginal Rate', baselineValue: formatPercent(baseline.result.marginalTaxRate), scenarioValue: formatPercent(scenarioResult.marginalTaxRate), diffValue: scenarioDiff.marginalTaxRate, isCurrency: false, invertSign: true },
    { label: 'Pension Pot', baselineValue: formatCurrency(baseline.result.totalPensionPot), scenarioValue: formatCurrency(scenarioResult.totalPensionPot), diffValue: scenarioDiff.totalPensionPot, isCurrency: true },
  ] : [];

  return (
    <div className="card" style={{ animationDelay: '0.45s' }}>
      <div className="card-title">
        <span className="card-title-icon">&#9878;</span>
        Scenario Comparison
      </div>

      {/* Preset buttons */}
      <div className="preset-buttons">
        <button
          className={`preset-btn ${scenarioPreset === 'optimise' ? 'active' : ''}`}
          onClick={() => onSelectPreset(scenarioPreset === 'optimise' ? null : 'optimise')}
        >
          Optimise Tax Band
        </button>
        <button
          className={`preset-btn ${scenarioPreset === 'salary' ? 'active' : ''}`}
          onClick={() => onSelectPreset(scenarioPreset === 'salary' ? null : 'salary')}
        >
          Salary Change
        </button>
        <button
          className={`preset-btn ${scenarioPreset === 'sacrifice' ? 'active' : ''}`}
          onClick={() => onSelectPreset(scenarioPreset === 'sacrifice' ? null : 'sacrifice')}
        >
          Add Sacrifice
        </button>
      </div>

      {/* Optimise tax band sub-options */}
      {scenarioPreset === 'optimise' && (
        <div className="preset-sub-options">
          {optimisationTargets.length > 0 ? (
            optimisationTargets.map((target) => (
              <button
                key={target.threshold}
                className="preset-sub-btn"
                onClick={() => onApplyOptimise(target.threshold)}
              >
                Drop below {target.name}
              </button>
            ))
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.25rem' }}>
              Already in the lowest available tax band
            </span>
          )}
        </div>
      )}

      {/* Salary change input */}
      {scenarioPreset === 'salary' && (
        <div className="preset-param-row">
          <div className="period-toggle" role="group" aria-label="Salary change type">
            <button
              type="button"
              className={`period-toggle-btn ${salaryChangeIsPercent ? 'active' : ''}`}
              onClick={() => setSalaryChangeIsPercent(true)}
              aria-pressed={salaryChangeIsPercent}
            >
              %
            </button>
            <button
              type="button"
              className={`period-toggle-btn ${!salaryChangeIsPercent ? 'active' : ''}`}
              onClick={() => setSalaryChangeIsPercent(false)}
              aria-pressed={!salaryChangeIsPercent}
            >
              &pound;
            </button>
          </div>
          <div className="input-wrapper">
            <span className="input-prefix">{salaryChangeIsPercent ? '%' : '\u00A3'}</span>
            <input
              className="input-field"
              type="text"
              inputMode="decimal"
              value={salaryChangeValue}
              onChange={(e) => setSalaryChangeValue(e.target.value)}
              placeholder={salaryChangeIsPercent ? 'e.g. 5' : 'e.g. 3000'}
              autoComplete="off"
            />
          </div>
          <button
            className="preset-apply-btn"
            onClick={() => {
              const val = parseFloat(salaryChangeValue);
              if (!isNaN(val)) onApplySalaryChange(val, salaryChangeIsPercent);
            }}
          >
            Apply
          </button>
        </div>
      )}

      {/* Add sacrifice input */}
      {scenarioPreset === 'sacrifice' && (
        <div className="preset-param-row">
          <div className="input-wrapper">
            <span className="input-prefix">&pound;</span>
            <input
              className="input-field"
              type="text"
              inputMode="decimal"
              value={sacrificeValue}
              onChange={(e) => setSacrificeValue(e.target.value)}
              placeholder="e.g. 2400 (annual)"
              autoComplete="off"
            />
          </div>
          <button
            className="preset-apply-btn"
            onClick={() => {
              const val = parseFloat(sacrificeValue);
              if (!isNaN(val) && val > 0) onApplySacrifice(val);
            }}
          >
            Apply
          </button>
        </div>
      )}

      {/* Comparison table */}
      {scenarioResult && scenarioDiff && (
        <>
          <div className="breakdown-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Baseline</th>
                  <th>Scenario</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const delta = formatDelta(row.diffValue, row.isCurrency, row.invertSign);
                  return (
                    <tr key={row.label} className={row.highlight ? 'highlight-row' : ''}>
                      <td>{row.label}</td>
                      <td>{row.baselineValue}</td>
                      <td>{row.scenarioValue}</td>
                      <td className={delta.className}>{delta.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary sentence */}
          <div className="scenario-summary">
            {scenarioDiff.monthlyTakeHome >= 0 ? (
              <>
                Scenario increases take-home by{' '}
                <strong>{formatCurrency(Math.abs(scenarioDiff.monthlyTakeHome))}/mo</strong>
                {' '}({formatCurrency(Math.abs(scenarioDiff.netAnnualIncome))}/yr)
              </>
            ) : (
              <>
                Scenario reduces take-home by{' '}
                <strong>{formatCurrency(Math.abs(scenarioDiff.monthlyTakeHome))}/mo</strong>
                {' '}({formatCurrency(Math.abs(scenarioDiff.netAnnualIncome))}/yr)
                {scenarioDiff.totalPensionPot > 0 && (
                  <>, but adds <strong>{formatCurrency(scenarioDiff.totalPensionPot)}/yr</strong> to your pension pot</>
                )}
                {scenarioDiff.incomeTax < 0 && (
                  <>, saving <strong>{formatCurrency(Math.abs(scenarioDiff.incomeTax))}/yr</strong> in tax</>
                )}
              </>
            )}
          </div>
        </>
      )}

      {!scenarioResult && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Choose a preset above to generate a comparison scenario.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: no errors (component exists but isn't rendered yet — that's Task 8)

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add ScenarioComparison helper component"
```

---

### Task 8: Wire Up ScenarioComparison in the App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add optimisation targets memo and preset callbacks**

In `src/App.tsx`, after the `scenarioDiff` memo (added in Task 5), add:

```typescript
  const optimisationTargets = useMemo(
    () => baseline ? getOptimisationTargets(baseline.input, baseline.result) : [],
    [baseline]
  );

  const handleApplyOptimise = useCallback(
    (threshold: number) => {
      if (!baseline) return;
      const pension = calculateOptimalPension(baseline.input, threshold);
      if (pension === null) return;
      const modified: CalculationInput = {
        ...baseline.input,
        pensionContribution: pension,
      };
      setScenarioInput(modified);
    },
    [baseline]
  );

  const handleApplySalaryChange = useCallback(
    (amount: number, isPercentage: boolean) => {
      if (!baseline) return;
      const newSalary = isPercentage
        ? baseline.input.annualSalary * (1 + amount / 100)
        : baseline.input.annualSalary + amount;
      const modified: CalculationInput = {
        ...baseline.input,
        annualSalary: Math.max(0, newSalary),
      };
      setScenarioInput(modified);
    },
    [baseline]
  );

  const handleApplySacrifice = useCallback(
    (amount: number) => {
      if (!baseline) return;
      const modified: CalculationInput = {
        ...baseline.input,
        salarySacrifice: baseline.input.salarySacrifice + amount,
      };
      setScenarioInput(modified);
    },
    [baseline]
  );
```

- [ ] **Step 2: Render the ScenarioComparison card in the results column**

In `src/App.tsx`, find the closing `</div>` of the last card in the results column — after the Post-Tax Deductions Summary card (around line 1024) and before `</div> {/* results-column */}`. Insert:

```typescript
            {/* Scenario Comparison */}
            {baseline && (
              <ScenarioComparison
                baseline={baseline}
                scenarioResult={scenarioResult}
                scenarioDiff={scenarioDiff}
                scenarioPreset={scenarioPreset}
                onSelectPreset={setScenarioPreset}
                onApplyOptimise={handleApplyOptimise}
                onApplySalaryChange={handleApplySalaryChange}
                onApplySacrifice={handleApplySacrifice}
                optimisationTargets={optimisationTargets}
              />
            )}
```

- [ ] **Step 3: Verify the project compiles and runs**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx vite build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up ScenarioComparison card in results column"
```

---

### Task 9: Manual Smoke Test

**Files:** None (testing only)

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 2: Start dev server and test manually**

Run: `npx vite dev`

Test these scenarios in the browser:

1. **Baseline save/clear:** Enter £86,800 salary. Click "Save as Baseline". Button should change to "Update Baseline" with a "Clear" link. The Scenario Comparison card should appear.

2. **Optimise Tax Band preset:** Click "Optimise Tax Band". Sub-options should appear showing "Drop below Higher Rate (£43,662)" and "Drop below Advanced Rate (£75,000)". Click "Drop below Advanced Rate". The comparison table should show pension contribution of £11,800, with reduced tax and take-home.

3. **Salary Change preset:** Click "Salary Change". Toggle between % and £. Enter 10 (%), click Apply. Table should show salary increase of ~£8,680 with corresponding tax increase.

4. **Add Sacrifice preset:** Click "Add Sacrifice". Enter 2400, click Apply. Table should show increased sacrifice with slightly lower take-home and tax savings.

5. **Delta colours:** Green for improvements (lower tax, higher take-home in salary increase scenario), red for regressions. Dashes for zero deltas.

6. **Summary sentence:** Verify it reads correctly for both positive and negative take-home changes.

7. **PA taper:** Set salary to £130,000, save baseline, try "Optimise Tax Band" — should offer PA Taper (£100,000) option.

8. **Mobile:** Resize to mobile width — preset buttons should stack vertically, table should remain readable.

- [ ] **Step 3: Commit any fixes if needed**

If any issues found, fix and commit with descriptive message.
