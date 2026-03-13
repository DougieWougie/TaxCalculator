# Income & Deductions Period Toggle (Mobile Only)

**Date:** 2026-03-13
**Status:** Approved

## Problem

The Income & Deductions table has three columns (Label, Monthly, Annual). On narrow mobile screens both value columns are cramped and hard to read.

## Solution

Add a `PeriodToggle` to the card header that lets the user choose which value column to view. The toggle is only visible on mobile; desktop always shows both columns unchanged.

## State

One new boolean in `App`: `plTableShowMonthly` (default `true`).

## Component Changes (`src/App.tsx`)

1. Add `const [plTableShowMonthly, setPlTableShowMonthly] = useState(true);` near the other toggle states.
2. In the Income & Deductions card-title `<div>`, add a `<span className="pl-table-period-toggle">` containing `<PeriodToggle isMonthly={plTableShowMonthly} onChange={setPlTableShowMonthly} />`.
3. Apply classes `pl-col-monthly` and `pl-col-annual` to the respective `<th>` and `<td>` elements for the Monthly and Annual columns.
4. Add a conditional class on the `<table>`: `hide-monthly` when `!plTableShowMonthly`, `hide-annual` when `plTableShowMonthly`.

## CSS Changes (`src/index.css`)

```css
/* Mobile-only: hide inactive column in P&L table */
@media (max-width: 600px) {
  .pl-table.hide-monthly .pl-col-monthly { display: none; }
  .pl-table.hide-annual  .pl-col-annual  { display: none; }
}

/* Hide the period toggle wrapper on desktop */
.pl-table-period-toggle {
  display: none;
}
@media (max-width: 600px) {
  .pl-table-period-toggle {
    display: inline-flex;
  }
}
```

## Behaviour

- Default: Monthly shown on mobile.
- Toggle is absent from the DOM visually on desktop (CSS `display: none`); both columns always visible on desktop regardless of state.
- `section-header` rows use `colSpan={3}` — this is unaffected; hidden columns do not change visual colspan rendering.
- No localStorage persistence needed.

## Out of Scope

- Syncing toggle state with other period toggles in the app.
- Showing the toggle on desktop.
