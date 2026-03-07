# Tax Band Fix, Annual/Monthly Toggles, Pension Spinner — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the off-by-one tax band boundary bug, add Annual/Monthly input toggles to salary sacrifice and post-tax deduction fields, and replace static slider labels with an editable spinner compound.

**Architecture:** Pure function fix in `taxEngine.ts` (change band `lowerBound` to exclusive `threshold`); UI state additions in `App.tsx` for period toggles and spinner controls; CSS additions in `index.css` for the new UI components.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, vitest (to be added for taxEngine unit tests)

---

## Task 1: Add vitest and write failing unit tests for the tax band fix

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/taxEngine.test.ts`

**Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

**Step 2: Add test script to `package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest run"
```

**Step 3: Add vitest config to `vite.config.ts`**

Read the current file first. It should look roughly like:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
```

Add the `test` block as shown. TypeScript may need a reference — add `/// <reference types="vitest" />` at the top if the IDE complains, but it's not required for `vitest run`.

**Step 4: Create `src/taxEngine.test.ts` with failing tests**

These tests assert the CORRECT band amounts. They will FAIL until Task 2.

```typescript
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
```

**Step 5: Run tests — confirm they FAIL**

```bash
npm test
```

Expected: Several failures like `expect(received).toBeCloseTo(537.13)` — current code gives 536.94 for the Starter band test, and the £12,571 test gives 0 instead of 0.19.

**Step 6: Commit failing tests**

```bash
git add src/taxEngine.test.ts package.json vite.config.ts package-lock.json
git commit -m "test: add failing unit tests for tax band boundary fix"
```

---

## Task 2: Fix tax band boundaries in `taxEngine.ts`

**Files:**
- Modify: `src/taxEngine.ts`

**Step 1: Update the `TaxBand` interface**

Change the field name from `lowerBound` to `threshold`:

```typescript
export interface TaxBand {
  name: string;
  threshold: number;    // exclusive lower bound — last pound of the PREVIOUS band (or 0)
  upperBound: number;
  rate: number;
}
```

**Step 2: Update Scottish band data**

Replace `SCOTTISH_TAX_BANDS` with these values. `threshold` is the official HMRC/Scottish Government published threshold (the last pound of the previous band):

```typescript
const SCOTTISH_TAX_BANDS: TaxBand[] = [
  { name: 'Personal Allowance', threshold: 0,       upperBound: 12_570,   rate: 0    },
  { name: 'Starter Rate',       threshold: 12_570,  upperBound: 15_397,   rate: 0.19 },
  { name: 'Basic Rate',         threshold: 15_397,  upperBound: 27_491,   rate: 0.20 },
  { name: 'Intermediate Rate',  threshold: 27_491,  upperBound: 43_662,   rate: 0.21 },
  { name: 'Higher Rate',        threshold: 43_662,  upperBound: 75_000,   rate: 0.42 },
  { name: 'Advanced Rate',      threshold: 75_000,  upperBound: 125_140,  rate: 0.45 },
  { name: 'Top Rate',           threshold: 125_140, upperBound: Infinity, rate: 0.48 },
];
```

**Step 3: Update English band data**

```typescript
const ENGLISH_TAX_BANDS: TaxBand[] = [
  { name: 'Personal Allowance', threshold: 0,       upperBound: 12_570,   rate: 0    },
  { name: 'Basic Rate',         threshold: 12_570,  upperBound: 50_270,   rate: 0.20 },
  { name: 'Higher Rate',        threshold: 50_270,  upperBound: 125_140,  rate: 0.40 },
  { name: 'Additional Rate',    threshold: 125_140, upperBound: Infinity, rate: 0.45 },
];
```

**Step 4: Update NI bands**

NI uses the same pattern. The existing const has inline type — rename `lowerBound` to `threshold`:

```typescript
const NI_BANDS: { name: string; threshold: number; upperBound: number; rate: number }[] = [
  { name: 'Below Primary Threshold', threshold: 0,      upperBound: 12_570,   rate: 0    },
  { name: 'Main Rate',               threshold: 12_570, upperBound: 50_270,   rate: 0.08 },
  { name: 'Upper Rate',              threshold: 50_270, upperBound: Infinity, rate: 0.02 },
];
```

**Step 5: Update `adjustBandsForPersonalAllowance`**

This function shifts band thresholds when the Personal Allowance changes (e.g. taper above £100k). Update field references:

```typescript
function adjustBandsForPersonalAllowance(
  bands: TaxBand[],
  personalAllowance: number
): TaxBand[] {
  return bands.map((band) => {
    if (band.name === 'Personal Allowance') {
      return { ...band, upperBound: personalAllowance };
    }
    if (band.threshold < BASE_PERSONAL_ALLOWANCE) {
      // This band's threshold was inside the old PA range — shift it to the new PA boundary
      return { ...band, threshold: personalAllowance };
    }
    return band;
  });
}
```

**Step 6: Update `calculateIncomeTax`**

Change `lowerBound` → `threshold` in the loop:

```typescript
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
    if (income <= band.threshold) break;
    const taxableInBand = Math.min(income, band.upperBound) - band.threshold;
    if (taxableInBand <= 0) continue;

    const tax = taxableInBand * band.rate;
    totalTax += tax;
    breakdown.push({ name: band.name, taxableInBand, rate: band.rate, tax });
  }

  return { total: totalTax, breakdown };
}
```

**Step 7: Update `calculateNI`**

Same change — `lowerBound` → `threshold`:

```typescript
function calculateNI(employmentIncome: number): { total: number; breakdown: NIBreakdownBand[] } {
  let totalNI = 0;
  const breakdown: NIBreakdownBand[] = [];

  for (const band of NI_BANDS) {
    if (employmentIncome <= band.threshold) break;
    const earningsInBand = Math.min(employmentIncome, band.upperBound) - band.threshold;
    if (earningsInBand <= 0) continue;

    const contribution = earningsInBand * band.rate;
    totalNI += contribution;
    breakdown.push({ name: band.name, earningsInBand, rate: band.rate, contribution });
  }

  return { total: totalNI, breakdown };
}
```

**Step 8: Update `getMarginalTaxRate`**

```typescript
function getMarginalTaxRate(totalIncome: number, region: TaxRegion): number {
  const baseBands = region === 'scottish' ? SCOTTISH_TAX_BANDS : ENGLISH_TAX_BANDS;
  const personalAllowance = calculatePersonalAllowance(totalIncome);
  const bands = adjustBandsForPersonalAllowance(baseBands, personalAllowance);

  let marginalRate = 0;
  for (const band of bands) {
    if (totalIncome > band.threshold && totalIncome <= band.upperBound) {
      marginalRate = band.rate;
    }
  }

  if (totalIncome > PA_TAPER_THRESHOLD && totalIncome <= 125_140) {
    marginalRate = marginalRate * 1.5;
  }

  return marginalRate;
}
```

**Step 9: Run tests — confirm they PASS**

```bash
npm test
```

Expected: All tests PASS.

**Step 10: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 11: Commit**

```bash
git add src/taxEngine.ts
git commit -m "fix: correct tax band boundary off-by-one using exclusive thresholds"
```

---

## Task 3: Add CSS for period-toggle pill and spinner controls

**Files:**
- Modify: `src/index.css`

**Step 1: Add period-toggle styles**

Append to `index.css` (before the `@media print` block at the bottom):

```css
/* Period toggle (Annual / Monthly) */
.period-toggle {
  display: inline-flex;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  font-size: 0.7rem;
  background: var(--bg-input);
}

.period-toggle-btn {
  padding: 2px 8px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.period-toggle-btn.active {
  background: var(--accent);
  color: #fff;
}

.period-toggle-btn:not(.active):hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.input-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.input-label-row .input-label {
  margin-bottom: 0;
}
```

**Step 2: Add spinner styles**

```css
/* Pension slider spinner */
.spinner-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.spinner-row input[type="range"] {
  flex: 1;
}

.spinner-compound {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-input);
  flex-shrink: 0;
}

.spinner-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
  padding: 0;
}

.spinner-btn:hover {
  background: var(--accent-glow);
  color: var(--accent);
}

.spinner-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.spinner-input {
  width: 52px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0 2px;
  /* Remove number input arrows */
  -moz-appearance: textfield;
}

.spinner-input::-webkit-outer-spin-button,
.spinner-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

.spinner-input:focus {
  outline: none;
  color: var(--accent);
}
```

**Step 3: Verify the app still builds**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Commit CSS**

```bash
git add src/index.css
git commit -m "style: add period-toggle and spinner compound CSS"
```

---

## Task 4: Add period-toggle to Salary Sacrifice field

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add state**

In the `App` component, alongside the other `useState` declarations near line 54, add:

```typescript
const [salarySacrificeIsMonthly, setSalarySacrificeIsMonthly] = useState(false);
```

**Step 2: Add a helper component**

Add this small component at the bottom of `App.tsx` (alongside `BarRow`):

```typescript
function PeriodToggle({
  isMonthly,
  onChange,
}: {
  isMonthly: boolean;
  onChange: (isMonthly: boolean) => void;
}) {
  return (
    <div className="period-toggle" role="group" aria-label="Input period">
      <button
        type="button"
        className={`period-toggle-btn ${!isMonthly ? 'active' : ''}`}
        onClick={() => onChange(false)}
        aria-pressed={!isMonthly}
      >
        Annual
      </button>
      <button
        type="button"
        className={`period-toggle-btn ${isMonthly ? 'active' : ''}`}
        onClick={() => onChange(true)}
        aria-pressed={isMonthly}
      >
        Monthly
      </button>
    </div>
  );
}
```

**Step 3: Update the salary sacrifice input group**

Find the `<div className="input-group">` that contains the label "Pre-Tax Salary Sacrifice (excl. pension)". Replace the `<label>` with a label-row that includes the toggle, and update the `value`/`onChange` to handle the monthly conversion.

Replace this block (around line 233):
```tsx
<div className="input-group">
  <label className="input-label" htmlFor="sacrifice">
    Pre-Tax Salary Sacrifice (excl. pension)
  </label>
```

With:
```tsx
<div className="input-group">
  <div className="input-label-row">
    <label className="input-label" htmlFor="sacrifice">
      Pre-Tax Salary Sacrifice (excl. pension)
    </label>
    <PeriodToggle
      isMonthly={salarySacrificeIsMonthly}
      onChange={setSalarySacrificeIsMonthly}
    />
  </div>
```

Then update the input's `value` and `onChange`. The stored `salarySacrifice` state is always the **annual** string. In monthly mode we display `(annualValue / 12)` and on input multiply by 12.

Replace the input element in that group:
```tsx
<input
  id="sacrifice"
  className="input-field"
  type="text"
  inputMode="decimal"
  value={
    salarySacrificeIsMonthly
      ? (sanitizeNumber(salarySacrifice) / 12).toFixed(2)
      : salarySacrifice
  }
  onChange={(e) => {
    const raw = sanitizeNumber(e.target.value);
    setSalarySacrifice(
      salarySacrificeIsMonthly ? (raw * 12).toFixed(0) : e.target.value
    );
  }}
  placeholder={salarySacrificeIsMonthly ? 'e.g. 200' : 'e.g. 2400'}
  autoComplete="off"
/>
```

Update the hint below to reflect the period:
```tsx
<p className="input-hint">
  E.g. cycle-to-work, childcare vouchers — enter{' '}
  {salarySacrificeIsMonthly ? 'monthly' : 'annual'} amount
</p>
```

**Step 4: Manual test**

Run `npm run dev`. Enter a salary sacrifice of £2,400/year. Switch to Monthly — it should display £200.00. Change to £250 monthly — switching back to Annual should show £3,000.

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add annual/monthly toggle to salary sacrifice input"
```

---

## Task 5: Add period-toggle to Pension Contribution field

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add state**

```typescript
const [pensionContributionIsMonthly, setPensionContributionIsMonthly] = useState(false);
```

**Step 2: Update the pension contribution input group**

Find the `<div className="input-group">` containing label "Pension Contribution (salary sacrifice)" (around line 255). Apply the same label-row pattern as Task 4.

Replace the label:
```tsx
<div className="input-label-row">
  <label className="input-label" htmlFor="pension">
    Pension Contribution (salary sacrifice)
  </label>
  <PeriodToggle
    isMonthly={pensionContributionIsMonthly}
    onChange={setPensionContributionIsMonthly}
  />
</div>
```

Replace the input:
```tsx
<input
  id="pension"
  className="input-field"
  type="text"
  inputMode="decimal"
  value={
    pensionContributionIsMonthly
      ? (sanitizeNumber(pensionContribution) / 12).toFixed(2)
      : pensionContribution
  }
  onChange={(e) => {
    const raw = sanitizeNumber(e.target.value);
    const annual = pensionContributionIsMonthly ? (raw * 12).toFixed(0) : e.target.value;
    setPensionContribution(annual);
    setPensionPct(0); // detach slider when typing
  }}
  placeholder={pensionContributionIsMonthly ? 'e.g. 683' : 'e.g. 8200'}
  autoComplete="off"
/>
```

The slider below remains unchanged — it always operates in % of annual salary.

Update the hint:
```tsx
<p className="input-hint">
  Drag the slider to set as % of gross salary, or enter{' '}
  {pensionContributionIsMonthly ? 'monthly' : 'annual'} amount above
</p>
```

**Step 3: Manual test**

Enter a pension contribution of £8,200/year (10% of £82,000). Switch to Monthly — it should show £683.33. Move the slider to 5% — value should update to annual £4,100. Toggle monthly — shows £341.67.

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add annual/monthly toggle to pension contribution input"
```

---

## Task 6: Add period-toggle per Post-Tax Deduction row

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update deduction state type**

The deduction objects currently have `{ id, name, amount }`. Add `isMonthly`:

```typescript
const [postTaxDeductions, setPostTaxDeductions] = useState<{
  id: number;
  name: string;
  amount: string;
  isMonthly: boolean;
}[]>([]);
```

**Step 2: Update the "Add deduction" button handler**

Add `isMonthly: false` to the new object:
```typescript
{ id: nextDeductionId, name: '', amount: '0', isMonthly: false }
```

**Step 3: Update the deduction row rendering**

In the `parsedPostTaxDeductions` memo, the stored `amount` is always annual. No change needed there.

In the deduction row JSX (the `.map` block), update the amount input and add the toggle. The deduction row currently wraps in `.deduction-row`. Replace the amount `<input>` and surrounding wrapper to include:

```tsx
{postTaxDeductions.map((deduction) => (
  <div key={deduction.id} className="deduction-row">
    <input
      className="input-field deduction-name"
      type="text"
      value={deduction.name}
      onChange={(e) =>
        setPostTaxDeductions((prev) =>
          prev.map((d) => d.id === deduction.id ? { ...d, name: e.target.value } : d)
        )
      }
      placeholder="Name"
      autoComplete="off"
    />
    <div className="input-wrapper deduction-amount-wrapper">
      <span className="input-prefix">&pound;</span>
      <input
        className="input-field deduction-amount"
        type="text"
        inputMode="decimal"
        value={
          deduction.isMonthly
            ? (sanitizeNumber(deduction.amount) / 12).toFixed(2)
            : deduction.amount
        }
        onChange={(e) => {
          const raw = sanitizeNumber(e.target.value);
          const annual = deduction.isMonthly ? (raw * 12).toFixed(0) : e.target.value;
          setPostTaxDeductions((prev) =>
            prev.map((d) => d.id === deduction.id ? { ...d, amount: annual } : d)
          );
        }}
        placeholder={deduction.isMonthly ? '200' : '2400'}
        autoComplete="off"
      />
    </div>
    <PeriodToggle
      isMonthly={deduction.isMonthly}
      onChange={(isMonthly) =>
        setPostTaxDeductions((prev) =>
          prev.map((d) => d.id === deduction.id ? { ...d, isMonthly } : d)
        )
      }
    />
    <button
      className="deduction-remove"
      onClick={() =>
        setPostTaxDeductions((prev) => prev.filter((d) => d.id !== deduction.id))
      }
      aria-label={`Remove ${deduction.name || 'deduction'}`}
      title="Remove"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
))}
```

**Step 4: Update section hint text**

Replace the existing hint above the deduction list to remove ambiguity:
```tsx
<p className="input-hint" style={{ marginBottom: '0.75rem' }}>
  Deducted from net pay after tax and NI. Enter annual or monthly — use the toggle per row. E.g. Share Save (SAYE), Give As You Earn, union dues.
</p>
```

**Step 5: Manual test**

Add a deduction named "Union Dues". Enter 200 in Annual mode → shows £200/year in results table. Switch toggle to Monthly, enter 200 → results show £2,400/year (£200/month). Switch back to Annual — value updates to show £2,400.

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add per-row annual/monthly toggle to post-tax deductions"
```

---

## Task 7: Replace static slider label with spinner compound — Personal Pension

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add a SpinnerCompound helper component**

Add alongside `PeriodToggle` and `BarRow` at the bottom of `App.tsx`:

```typescript
function SliderSpinner({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const decrement = () => onChange(Math.max(min, parseFloat((value - step).toFixed(1))));
  const increment = () => onChange(Math.min(max, parseFloat((value + step).toFixed(1))));

  return (
    <div className="spinner-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={ariaLabel}
      />
      <div className="spinner-compound">
        <button
          type="button"
          className="spinner-btn"
          onClick={decrement}
          disabled={value <= min}
          aria-label="Decrease"
        >
          &minus;
        </button>
        <input
          type="number"
          className="spinner-input"
          min={min}
          max={max}
          step={step}
          value={value.toFixed(1)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
          aria-label={`${ariaLabel} value`}
        />
        <button
          type="button"
          className="spinner-btn"
          onClick={increment}
          disabled={value >= max}
          aria-label="Increase"
        >
          &#43;
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Replace personal pension slider row**

Find the `<div className="slider-row">` inside the pension contribution input group (around line 275). It currently contains `<input type="range" ...>` and `<span className="slider-value">`.

Replace the entire `<div className="slider-row">`:

```tsx
<SliderSpinner
  value={pensionPct}
  min={0}
  max={40}
  step={0.5}
  onChange={handlePensionPctChange}
  ariaLabel="Pension contribution percentage"
/>
```

**Step 3: Manual test**

Run `npm run dev`. The pension contribution slider now has `−` / `+` buttons and an editable number field. Clicking `+` steps by 0.5%. Typing `10` in the number field and tabbing out sets pension to 10% of salary. Slider thumb also moves.

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace pension contribution slider label with spinner compound"
```

---

## Task 8: Apply spinner compound to Employer Pension slider

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace employer pension slider row**

Find the `<div className="slider-row">` inside the employer pension input group (around line 312). Replace:

```tsx
<SliderSpinner
  value={employerPensionPct}
  min={0}
  max={30}
  step={0.5}
  onChange={handleEmployerPensionPctChange}
  ariaLabel="Employer pension contribution percentage"
/>
```

**Step 2: Manual test**

Employer pension slider now has the same spinner compound. `+`/`−` buttons step by 0.5%, clamped at 30%.

**Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 4: Run tests**

```bash
npm test
```

Expected: All tests PASS.

**Step 5: Build for production**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 6: Final commit**

```bash
git add src/App.tsx
git commit -m "feat: replace employer pension slider label with spinner compound"
```

---

## Verification Checklist

After all tasks complete, manually verify in the browser (`npm run dev`):

- [ ] Enter salary £82,000, personal pension 10%, employer pension 10%, military pension £13,000 (Scottish). Monthly tax shows approximately £2,069.
- [ ] Salary sacrifice: switch to Monthly → divides by 12. Enter monthly value → multiplies by 12 in results.
- [ ] Pension contribution: slider works independently of period toggle. Monthly mode shows monthly equivalent.
- [ ] Post-tax deduction: add one row, switch its toggle to Monthly, enter £200 → results show £200/month (£2,400/year).
- [ ] Personal pension spinner: `+`/`−` buttons step by 0.5%. Number field accepts direct entry. Slider moves in sync.
- [ ] Employer pension spinner: same behaviour, clamped at 30%.
- [ ] Dark mode and light mode: all new controls styled correctly.
- [ ] No TypeScript errors (`npx tsc --noEmit`).
- [ ] All unit tests pass (`npm test`).
