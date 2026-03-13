# Income & Deductions Period Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-only Monthly/Annual toggle to the Income & Deductions card so users can switch which column is shown on narrow screens.

**Architecture:** One new boolean state variable (`plTableShowMonthly`) in `App`. A `PeriodToggle` in the card header, hidden on desktop via CSS. Column `<th>`/`<td>` elements get CSS classes; a conditional class on the table drives which column is hidden via a mobile-only media query.

**Tech Stack:** React 19, TypeScript 5.7, CSS custom properties (no external libraries)

---

## Chunk 1: All changes (CSS + component)

**Files:**
- Modify: `src/index.css` — add mobile-only column-hide rules + toggle-wrapper visibility rules
- Modify: `src/App.tsx` — add state, update `PeriodToggle` props, update Income & Deductions JSX

---

### Task 1: Add CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add column-hide and toggle-wrapper rules**

Append the following after the existing `.pl-table .positive` rule (around line 765 in `src/index.css`):

```css
/* Mobile-only: hide inactive column in P&L table */
@media (max-width: 600px) {
  .pl-table.hide-monthly .pl-col-monthly { display: none; }
  .pl-table.hide-annual  .pl-col-annual  { display: none; }
}

/* Period toggle in P&L card header — hidden on desktop, visible on mobile */
.pl-table-period-toggle {
  display: none;
}
@media (max-width: 600px) {
  .pl-table-period-toggle {
    display: inline-flex;
  }
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npm run build`
Expected: exits 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: add mobile column-hide rules for P&L table period toggle"
```

---

### Task 2: Update `PeriodToggle` to accept optional `ariaLabel` prop

**Files:**
- Modify: `src/App.tsx:1070-1097`

- [ ] **Step 1: Add `ariaLabel` prop**

Find the `PeriodToggle` function at line ~1070 and update its props type and usage:

```tsx
function PeriodToggle({
  isMonthly,
  onChange,
  ariaLabel = 'Input period',
}: {
  isMonthly: boolean;
  onChange: (isMonthly: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="period-toggle" role="group" aria-label={ariaLabel}>
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: exits 0. All existing `PeriodToggle` call sites (salary sacrifice, pension, post-tax deductions) continue to work because `ariaLabel` is optional with a default.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add optional ariaLabel prop to PeriodToggle"
```

---

### Task 3: Add state and wire up the Income & Deductions card

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add state variable**

Near the other boolean toggle states (around line 48, near `salarySacrificeIsMonthly`), add:

```tsx
const [plTableShowMonthly, setPlTableShowMonthly] = useState(true);
```

- [ ] **Step 2: Update the card-title div**

Find the Income & Deductions card-title (around line 652–656):

```tsx
<div className="card-title">
  <span className="card-title-icon">&#128202;</span>
  Income &amp; Deductions
</div>
```

Replace with:

```tsx
<div className="card-title">
  <span className="card-title-icon">&#128202;</span>
  Income &amp; Deductions
  <span className="pl-table-period-toggle">
    <PeriodToggle
      isMonthly={plTableShowMonthly}
      onChange={setPlTableShowMonthly}
      ariaLabel="Display period"
    />
  </span>
</div>
```

- [ ] **Step 3: Add conditional class and column classes to the table**

Find the `<table className="pl-table">` (around line 657). Replace it with:

```tsx
<table className={`pl-table ${plTableShowMonthly ? 'hide-annual' : 'hide-monthly'}`}>
```

- [ ] **Step 4: Add `pl-col-monthly` and `pl-col-annual` classes to column headers**

Find the `<thead>` block (around line 658–663):

```tsx
<thead>
  <tr>
    <th></th>
    <th>Monthly</th>
    <th>Annual</th>
  </tr>
</thead>
```

Replace with:

```tsx
<thead>
  <tr>
    <th></th>
    <th className="pl-col-monthly">Monthly</th>
    <th className="pl-col-annual">Annual</th>
  </tr>
</thead>
```

- [ ] **Step 5: Add column classes to every Monthly `<td>` and Annual `<td>` in the table body**

Each data row in `<tbody>` has two value cells. Add `className="pl-col-monthly"` to the Monthly cell and `className="pl-col-annual"` to the Annual cell. Work through all rows:

**Gross Salary row (~line 670–674):**
```tsx
<tr>
  <td>Gross Salary</td>
  <td className="pl-col-monthly">{formatCurrency(result.grossMonthlySalary)}</td>
  <td className="pl-col-annual">{formatCurrency(result.grossSalary)}</td>
</tr>
```

**Military Pension row (~line 675–681):** *(conditionally rendered — preserve the `{hasMilitaryPension && (...)}` wrapper; only the `<td>` classes change)*
```tsx
{hasMilitaryPension && (
  <tr>
    <td>Military Pension</td>
    <td className="pl-col-monthly">{formatCurrency(result.monthlyMilitaryPension)}</td>
    <td className="pl-col-annual">{formatCurrency(result.militaryPension)}</td>
  </tr>
)}
```

**Total Income subtotal row (~line 682–686):**
```tsx
<tr className="subtotal-row">
  <td>Total Income</td>
  <td className="pl-col-monthly">{formatCurrency(result.grossMonthlySalary + (hasMilitaryPension ? result.monthlyMilitaryPension : 0))}</td>
  <td className="pl-col-annual">{formatCurrency(result.grossSalary + (hasMilitaryPension ? result.militaryPension : 0))}</td>
</tr>
```

**Income Tax row (~line 692–696):**
```tsx
<tr>
  <td>Income Tax</td>
  <td className="pl-col-monthly negative">&minus;{formatCurrency(result.monthlyTax)}</td>
  <td className="pl-col-annual negative">&minus;{formatCurrency(result.incomeTax)}</td>
</tr>
```

**National Insurance row (~line 697–701):**
```tsx
<tr>
  <td>National Insurance</td>
  <td className="pl-col-monthly negative">&minus;{formatCurrency(result.monthlyNI)}</td>
  <td className="pl-col-annual negative">&minus;{formatCurrency(result.nationalInsurance)}</td>
</tr>
```

**Pre-Tax Salary Sacrifice row (~line 702–708):** *(conditionally rendered — preserve the `{result.otherSalarySacrifice > 0 && (...)}` wrapper)*
```tsx
{result.otherSalarySacrifice > 0 && (
  <tr>
    <td>Pre-Tax Salary Sacrifice</td>
    <td className="pl-col-monthly negative">&minus;{formatCurrency(result.monthlyOtherSalarySacrifice)}</td>
    <td className="pl-col-annual negative">&minus;{formatCurrency(result.otherSalarySacrifice)}</td>
  </tr>
)}
```

**Pension Contribution row (~line 709–715):** *(conditionally rendered — preserve the `{result.pensionContribution > 0 && (...)}` wrapper)*
```tsx
{result.pensionContribution > 0 && (
  <tr>
    <td>Pension Contribution</td>
    <td className="pl-col-monthly negative">&minus;{formatCurrency(result.monthlyPensionContribution)}</td>
    <td className="pl-col-annual negative">&minus;{formatCurrency(result.pensionContribution)}</td>
  </tr>
)}
```

**Post-Tax Deductions row (~line 716–722):** *(conditionally rendered — preserve the `{result.totalPostTaxDeductions > 0 && (...)}` wrapper)*
```tsx
{result.totalPostTaxDeductions > 0 && (
  <tr>
    <td>Post-Tax Deductions</td>
    <td className="pl-col-monthly negative">&minus;{formatCurrency(result.monthlyPostTaxDeductions)}</td>
    <td className="pl-col-annual negative">&minus;{formatCurrency(result.totalPostTaxDeductions)}</td>
  </tr>
)}
```

**Total Deductions subtotal row (~line 723–727):**
```tsx
<tr className="subtotal-row">
  <td>Total Deductions</td>
  <td className="pl-col-monthly negative">&minus;{formatCurrency(result.monthlyTax + result.monthlyNI + result.monthlySalarySacrifice + result.monthlyPostTaxDeductions)}</td>
  <td className="pl-col-annual negative">&minus;{formatCurrency(result.incomeTax + result.nationalInsurance + result.totalSalarySacrifice + result.totalPostTaxDeductions)}</td>
</tr>
```

**Net Take-Home row (~line 730–734):**
```tsx
<tr className="net-row">
  <td>Net Take-Home</td>
  <td className="pl-col-monthly">{formatCurrency(result.monthlyTakeHome)}</td>
  <td className="pl-col-annual">{formatCurrency(result.netAnnualIncome)}</td>
</tr>
```

> Note: `section-header` rows use `colSpan={3}` and have no value cells — leave them unchanged. The hidden column slot still counts toward the span, keeping section headers full-width, which is the desired behaviour.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 7: Verify tests pass**

Run: `npm test`
Expected: all 8 existing tests pass (no tests cover this UI-only change).

- [ ] **Step 8: Manual smoke test**

1. Run `npm run dev` and open the app in a browser.
2. Open DevTools, set viewport to 375px wide (mobile).
3. Confirm the Income & Deductions card shows a Monthly/Annual toggle in the header.
4. Confirm default shows only the Monthly column.
5. Click Annual — confirm Monthly column disappears and Annual column appears.
6. Widen viewport to >600px — confirm toggle disappears and both columns are visible.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add mobile-only period toggle to Income & Deductions table"
```
