# Scenario Comparison Feature — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Overview

Add a dedicated Scenario Comparison card to the results column that lets users compare their current tax position (baseline) against a modified scenario. Presets handle common what-ifs; users can also tweak parameters manually.

## Requirements

- Compare exactly two scenarios: Baseline (A) vs. Scenario (B)
- Three preset scenario generators:
  1. **Optimise Tax Band** — auto-calculate pension contribution to drop below a tax threshold
  2. **Salary Change** — apply a percentage or absolute change to gross salary
  3. **Add Sacrifice** — add a salary sacrifice amount (e.g. cycle-to-work)
- Condensed comparison table showing key metrics with delta column
- Green/red highlighting for improvements/regressions
- Summary sentence below the table

## Scenario Engine (taxEngine.ts)

### New Types

```typescript
type PresetType = 'optimise-tax-band' | 'salary-change' | 'add-sacrifice';

interface ScenarioDiff {
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

### New Functions

**`calculateOptimalPension(input: CalculationInput, targetThreshold: number): number | null`**

Given current inputs and a target taxable income threshold, returns the exact annual pension contribution (as salary sacrifice) needed to bring taxable income to that threshold. Returns `null` if:
- Already below the threshold
- Required contribution would exceed salary minus existing sacrifice

Logic: `targetPension = taxableEmploymentIncome - targetThreshold + existingPensionContribution`, clamped to `[0, salary - otherSacrifice]`.

**Preset scenario logic** is implemented as inline callbacks in `App.tsx` (`handleApplyOptimise`, `handleApplySalaryChange`, `handleApplySacrifice`) rather than a standalone engine function — the logic is simple enough that a formal `generatePresetScenario` function would add indirection without benefit.

**`getOptimisationTargets(input: CalculationInput, result: CalculationResult): OptimisationTarget[]`**

Returns tax band thresholds the user could optimise down to by increasing pension contributions. Only returns thresholds above the user's current taxable employment income. Uses employment income only (military pension excluded — salary sacrifice cannot reduce military pension).

**`diffResults(a: CalculationResult, b: CalculationResult): ScenarioDiff`**

Returns `b[field] - a[field]` for each field in `ScenarioDiff`.

All functions are pure. The existing `calculate()` function is unchanged.

## State Management (App.tsx)

### New State

```typescript
baseline: { input: CalculationInput; result: CalculationResult } | null
scenarioB: { input: CalculationInput; result: CalculationResult } | null
activePreset: string | null
```

### Interactions

- **"Save as Baseline"** button near the top of the results column. Snapshots current inputs and result. Text changes to "Update Baseline" once saved, with a "Clear" link.
- Once a baseline exists, the Scenario Comparison card appears in the results column after the Pension Summary / Post-Tax Deductions cards.
- Preset buttons generate Scenario B by calling `generatePresetScenario` then `calculate()`.
- Salary change and add sacrifice presets show a small inline input for the amount/percentage before generating.
- "Optimise Tax Band" detects current band(s) and offers sub-options (e.g. "Drop below Advanced (£75k)", "Drop below PA taper (£100k)").

## Comparison Card UI

### Location

Results column, after the last existing card (Pension Summary or Post-Tax Deductions Summary).

### Layout

- **Preset buttons** — horizontal row, styled like region toggle buttons
- **Inline parameter input** — appears below presets when a preset needs user input (amount/percentage)
- **Comparison table** — three columns: Baseline, Scenario, Delta
  - Rows: Gross Salary, Pension Contribution, Salary Sacrifice, Income Tax, NI, Take-Home/mo, Take-Home/yr, Effective Rate, Marginal Rate, Pension Pot
  - Delta column: green for improvements (more take-home, lower tax), red for worse, "—" for zero
- **Summary sentence** — below table, e.g. "Scenario saves you £133/mo (+£1,600/yr) in take-home pay"

### Optimise Tax Band Sub-options

When clicked, detect which thresholds are relevant based on current taxable income and tax region:
- **Scottish:** Advanced rate (£75,000), Higher rate (£43,662), PA taper (£100,000)
- **English:** Higher rate (£50,270), PA taper (£100,000)

Only show thresholds the user is currently above. Each sub-option shows the threshold name and amount.

## Component Structure

### Files Modified

- **`taxEngine.ts`** — new pure functions and types
- **`taxEngine.test.ts`** — new unit tests for engine functions
- **`App.tsx`** — new `ScenarioComparison` component (helper, alongside `PeriodToggle`, `SliderSpinner`, `BarRow`), new state in `App`, "Save as Baseline" button
- **`index.css`** — styles for comparison card, preset buttons, delta highlighting

### No New Files

Consistent with existing single-file-per-concern pattern.

## Testing

New tests in `taxEngine.test.ts`:

- `calculateOptimalPension`:
  - Correct pension for Scottish advanced rate threshold (£75k)
  - Correct pension for PA taper threshold (£100k)
  - Returns `null` when already below threshold
  - Returns `null` when required contribution exceeds salary
  - Edge case: exact threshold boundary
- `generatePresetScenario`:
  - Each preset produces correct modified inputs
  - Salary change by percentage and absolute amount
  - Add sacrifice adds to existing sacrifice
- `diffResults`:
  - Correct deltas for all fields
  - Handles zero deltas

## Out of Scope

- More than two scenarios at once
- Persisting scenarios across page reloads
- Full duplicate input panel for Scenario B
- Region-switch preset (may add later)
