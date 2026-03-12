# Breakdown Table Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the monthly breakdown stat-cards grid with a two-section P&L table (Income / Deductions / Net Take-Home) showing both monthly and annual columns, keeping the bar chart below.

**Architecture:** Add `pensionContribution` and `otherSalarySacrifice` fields to `CalculationResult` so the UI can split salary sacrifice into two rows. Replace the `stats-grid` div in `App.tsx` with a `<table>` using new CSS classes. The bar chart remains unchanged below the table.

**Tech Stack:** React 19, TypeScript, CSS custom properties (no new dependencies)

---

### Task 1: Expose split sacrifice in CalculationResult

**Files:**
- Modify: `src/taxEngine.ts`

**Step 1: Add fields to the interface**

In `CalculationResult` (around line 216), add after `totalSalarySacrifice`:

```ts
pensionContribution: number;
otherSalarySacrifice: number;
monthlyPensionContribution: number;
monthlyOtherSalarySacrifice: number;
```

**Step 2: Populate in the return object**

In the `return { ... }` block (around line 504), add after `totalSalarySacrifice,`:

```ts
pensionContribution,
otherSalarySacrifice: salarySacrifice,
monthlyPensionContribution: pensionContribution / 12,
monthlyOtherSalarySacrifice: salarySacrifice / 12,
```

**Step 3: Build to confirm no type errors**

```bash
npm run build
```
Expected: clean build, no TS errors.

**Step 4: Commit**

```bash
git add src/taxEngine.ts
git commit -m "feat: expose split salary sacrifice in CalculationResult"
```

---

### Task 2: Add CSS for the P&L table

**Files:**
- Modify: `src/index.css`

**Step 1: Add table styles after the `.stat-value.positive` block**

Add these classes (after `.stat-sub`):

```css
/* P&L breakdown table */
.breakdown-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin-top: 0.75rem;
}

.breakdown-table th {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: right;
  padding: 0 0 0.5rem 0;
}

.breakdown-table th:first-child {
  text-align: left;
}

.breakdown-table td {
  padding: 0.35rem 0;
  color: var(--text-primary);
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.breakdown-table td:first-child {
  text-align: left;
  color: var(--text-secondary);
  padding-right: 1rem;
}

.breakdown-table .section-header td {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-top: 1rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color);
}

.breakdown-table .subtotal-row td {
  font-weight: 700;
  color: var(--text-primary);
  border-top: 1px solid var(--border-color);
  padding-top: 0.4rem;
  padding-bottom: 0.75rem;
}

.breakdown-table .net-row td {
  font-weight: 800;
  font-size: 1rem;
  color: var(--text-primary);
  border-top: 2px solid var(--accent);
  padding-top: 0.6rem;
}

.breakdown-table .negative {
  color: var(--danger);
}

.breakdown-table .positive {
  color: var(--success);
}
```

**Step 2: Build to confirm no errors**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add breakdown-table CSS"
```

---

### Task 3: Replace stat-cards grid with P&L table in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update the card title**

Find `Monthly Breakdown` (around line 655) and change to `Income & Deductions`.

**Step 2: Replace the `stats-grid` div with the table**

Remove the entire `<div className="stats-grid"> ... </div>` block (lines ~657–688) and replace with:

```tsx
<table className="breakdown-table">
  <thead>
    <tr>
      <th></th>
      <th>Monthly</th>
      <th>Annual</th>
    </tr>
  </thead>
  <tbody>
    {/* Income section */}
    <tr className="section-header">
      <td colSpan={3}>Income</td>
    </tr>
    <tr>
      <td>Gross Salary</td>
      <td>{formatCurrency(result.grossMonthlySalary)}</td>
      <td>{formatCurrency(result.grossSalary)}</td>
    </tr>
    {hasMilitaryPension && (
      <tr>
        <td>Military Pension</td>
        <td>{formatCurrency(result.monthlyMilitaryPension)}</td>
        <td>{formatCurrency(result.militaryPension)}</td>
      </tr>
    )}
    <tr className="subtotal-row">
      <td>Total Income</td>
      <td>{formatCurrency(result.grossMonthlySalary + (hasMilitaryPension ? result.monthlyMilitaryPension : 0))}</td>
      <td>{formatCurrency(result.grossSalary + (hasMilitaryPension ? result.militaryPension : 0))}</td>
    </tr>

    {/* Deductions section */}
    <tr className="section-header">
      <td colSpan={3}>Deductions</td>
    </tr>
    <tr>
      <td>Income Tax</td>
      <td className="negative">&minus;{formatCurrency(result.monthlyTax)}</td>
      <td className="negative">&minus;{formatCurrency(result.incomeTax)}</td>
    </tr>
    <tr>
      <td>National Insurance</td>
      <td className="negative">&minus;{formatCurrency(result.monthlyNI)}</td>
      <td className="negative">&minus;{formatCurrency(result.nationalInsurance)}</td>
    </tr>
    {result.otherSalarySacrifice > 0 && (
      <tr>
        <td>Pre-Tax Salary Sacrifice</td>
        <td className="negative">&minus;{formatCurrency(result.monthlyOtherSalarySacrifice)}</td>
        <td className="negative">&minus;{formatCurrency(result.otherSalarySacrifice)}</td>
      </tr>
    )}
    {result.pensionContribution > 0 && (
      <tr>
        <td>Pension Contribution</td>
        <td className="negative">&minus;{formatCurrency(result.monthlyPensionContribution)}</td>
        <td className="negative">&minus;{formatCurrency(result.pensionContribution)}</td>
      </tr>
    )}
    {result.totalPostTaxDeductions > 0 && (
      <tr>
        <td>Post-Tax Deductions</td>
        <td className="negative">&minus;{formatCurrency(result.monthlyPostTaxDeductions)}</td>
        <td className="negative">&minus;{formatCurrency(result.totalPostTaxDeductions)}</td>
      </tr>
    )}
    <tr className="subtotal-row">
      <td>Total Deductions</td>
      <td className="negative">&minus;{formatCurrency(result.monthlyTax + result.monthlyNI + result.monthlySalarySacrifice + result.monthlyPostTaxDeductions)}</td>
      <td className="negative">&minus;{formatCurrency(result.incomeTax + result.nationalInsurance + result.totalSalarySacrifice + result.totalPostTaxDeductions)}</td>
    </tr>

    {/* Net row */}
    <tr className="net-row">
      <td>Net Take-Home</td>
      <td>{formatCurrency(result.monthlyTakeHome)}</td>
      <td>{formatCurrency(result.netAnnualIncome)}</td>
    </tr>
  </tbody>
</table>
```

**Step 3: Build and verify**

```bash
npm run build
```
Expected: clean build.

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace breakdown stat-cards with P&L table"
```
