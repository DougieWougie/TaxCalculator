# Design: Tax Band Fix, Annual/Monthly Toggles, Pension Spinner

**Date:** 2026-03-07
**Status:** Approved

---

## Problem Statement

Three issues identified in the PensionTaxApp:

1. **Tax band off-by-one**: The formula `Math.min(income, upperBound) - lowerBound` misses £1 of taxable income at each band boundary, producing ~£2/year error. Technically incorrect even if negligible in magnitude.
2. **Ambiguous input periods**: Salary sacrifice and post-tax deduction fields do not indicate whether amounts should be entered annually or monthly.
3. **Pension slider UX**: Sliders are difficult to fine-tune on responsive/touch devices.

---

## Design

### 1. Tax Band Boundary Fix (`taxEngine.ts`)

**Approach:** Redefine `TaxBand` to use `threshold` (exclusive lower bound — the last pound of the previous band) instead of `lowerBound` (inclusive first pound of current band).

Official HMRC/Scottish Government thresholds for 2025-26:

| Band         | Threshold | Upper    | Rate |
|--------------|-----------|----------|------|
| PA           | 0         | 12,570   | 0%   |
| Starter      | 12,570    | 15,397   | 19%  |
| Basic        | 15,397    | 27,491   | 20%  |
| Intermediate | 27,491    | 43,662   | 21%  |
| Higher       | 43,662    | 75,000   | 42%  |
| Advanced     | 75,000    | 125,140  | 45%  |
| Top          | 125,140   | Infinity | 48%  |

English bands and NI bands receive the same treatment.

**Formula changes:**
- `taxableInBand = Math.min(income, band.upperBound) - band.threshold`
- Break condition: `if (income <= band.threshold) break`
- `adjustBandsForPersonalAllowance` updates `threshold` instead of `lowerBound`

---

### 2. Annual/Monthly Toggles (`App.tsx`)

An `Annual | Monthly` segmented pill toggle is added to three input areas. Internal state always stores **annual** values. Monthly display = annual ÷ 12; monthly input is multiplied by 12 before storing.

**Fields affected:**

| Field | New state | Behaviour |
|---|---|---|
| Salary Sacrifice | `salarySacrificeIsMonthly: boolean` | Toggle above/beside field label |
| Pension Contribution text field | `pensionContributionIsMonthly: boolean` | Toggle beside label; slider always works in % of annual salary |
| Each Post-Tax Deduction row | `isMonthly: boolean` per deduction | Toggle inline in each row |

The pension slider is unaffected by the pension toggle — it always represents % of annual salary and updates the stored annual value. Only the text input reflects the selected period.

---

### 3. Pension Slider Spinner (`App.tsx`)

Replace the static `<span className="slider-value">` with an interactive spinner compound:

```
[−]  [ 10.0% ]  [+]
```

- `−` / `+` buttons: step 0.5%, clamped to slider min/max (0–40% personal, 0–30% employer)
- Centre: `<input type="number" step="0.5">` — directly editable, syncs slider and calculated £ amount
- Applied to both personal pension slider and employer pension slider

---

## Files Changed

- `src/taxEngine.ts` — band data + `calculateIncomeTax` formula + `adjustBandsForPersonalAllowance`
- `src/App.tsx` — annual/monthly toggle state + spinner compound control
- `src/index.css` — styles for toggle pill and spinner buttons

---

## Out of Scope

- Military pension field (already labelled "Annual Military Pension")
- Salary field (already labelled "Annual Gross Salary")
- Changing the tax engine's public API surface
