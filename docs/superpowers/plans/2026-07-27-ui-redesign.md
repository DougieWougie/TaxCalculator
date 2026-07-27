# Cockpit UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current card-stack UI with a "cockpit" — a fixed control rail beside a live readout — rendered in a dark-first "Instrument" visual language, with reworked inputs and a drag-up control sheet on mobile.

**Architecture:** New pure helper modules (`display.ts`, `snapping.ts`, `waterfall.ts`) are built and unit-tested first, since they hold the only logic that is testable without a DOM. New components are added **alongside** the existing ones so the app keeps building and running at every commit; the old UI is swapped out and deleted in a single final task. `taxEngine.ts` is not touched.

**Tech Stack:** React 19, TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`), Vite 6, Vitest 4 (`environment: 'node'` — no DOM testing library), plain global CSS, lucide-react icons.

## Global Constraints

- **Branch:** all work lands on `feat/ui-redesign`. Do not commit to `main`.
- **Do not modify:** `src/taxEngine.ts`, `src/taxEngine.test.ts`, `src/urlState.ts`, `src/urlState.test.ts`, `src/sanitize.ts`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy.yaml`.
- **URL payload schema is frozen.** `UrlStatePayload` keeps its exact current shape so existing shared links still decode. Period preference goes to `localStorage`, never the URL.
- **The build must pass at every commit.** `npm run build` runs `tsc -b` with `noUnusedLocals` and `noUnusedParameters`; an unused import or parameter is a build failure, not a warning. New components are additive until Task 10.
- **Test environment is `node`.** There is no jsdom and no testing-library. Only write tests for pure functions. Do not add a DOM testing dependency.
- **Dark is the base theme; light is the override.** This inverts the current arrangement in `index.css`.
- **All fonts self-hosted.** No new external origins — the CSP in `nginx.conf` allows `font-src 'self'` and must not need editing.
- **Currency/percent formatting** always goes through `formatCurrency` / `formatPercent` from `taxEngine.ts`. Never hand-roll `toFixed` for displayed money.
- **Respect `prefers-reduced-motion`.** The existing block in the reset must be carried into `base.css` unchanged.

---

### Task 1: Design tokens, base styles, self-hosted font

Adds the new style layer alongside the old `index.css`. Nothing consumes it yet, so the running app is unchanged — this task is verified by build success and by the token file being importable.

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Modify: `package.json` (add `@fontsource-variable/jetbrains-mono`)
- Modify: `index.html` (remove Google Fonts `<link>` and `preconnect` tags)
- Modify: `src/main.tsx` (import the font + new base styles)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties consumed by every later task —
  `--surface`, `--surface-raised`, `--rule`, `--figure`, `--text`, `--text-dim`,
  `--tax`, `--ni`, `--pension`, `--sacrifice`, `--posttax`, `--net`, `--glow`,
  `--font-mono`, `--radius`, `--gap`.

- [ ] **Step 1: Install the self-hosted font**

```bash
npm install @fontsource-variable/jetbrains-mono
```

- [ ] **Step 2: Remove the Google Fonts origin from `index.html`**

Delete these three lines from `<head>`:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

Leave the rest of `<head>` exactly as it is.

- [ ] **Step 3: Write `src/styles/tokens.css`**

```css
/* Instrument palette. Dark is the base; light is the override. */
:root {
  --font-mono: 'JetBrains Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;

  --surface: #0a0c10;
  --surface-raised: #0d1017;
  --surface-sheet: #11151d;
  --rule: #1b2230;
  --rule-strong: #232b3a;

  --figure: #ffffff;
  --text: #d7dee8;
  --text-dim: #5a6675;

  --tax: #f43f5e;
  --ni: #f59e0b;
  --pension: #6366f1;
  --sacrifice: #8b5cf6;
  --posttax: #64748b;
  --net: #34d399;

  --glow: 0 0 14px rgba(52, 211, 153, 0.5);
  --positive: #34d399;
  --negative: #f43f5e;

  --radius: 5px;
  --radius-lg: 15px;
  --gap: 0.75rem;
}

[data-theme='light'] {
  --surface: #f4f6f9;
  --surface-raised: #ffffff;
  --surface-sheet: #ffffff;
  --rule: #dde3ec;
  --rule-strong: #c3ccda;

  --figure: #0b1220;
  --text: #26313f;
  --text-dim: #6b7789;

  --tax: #be123c;
  --ni: #b45309;
  --pension: #4338ca;
  --sacrifice: #6d28d9;
  --posttax: #475569;
  --net: #047857;

  /* Light mode has no glow — a shadow would read as blur, not emphasis.
     Emphasis on the live figure comes from weight and colour instead. */
  --glow: none;
  --positive: #047857;
  --negative: #be123c;
}
```

- [ ] **Step 4: Write `src/styles/base.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
  }
}

body {
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}

/* Every figure in the app is tabular so digits do not shift
   sideways while a slider is being dragged. */
.figure {
  color: var(--figure);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.label {
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
}

:where(button, input, [tabindex]):focus-visible {
  outline: 2px solid var(--net);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Import the new layer in `src/main.tsx`**

Add these three imports **above** the existing `import './index.css'` line, keeping that line in place for now:

```ts
import '@fontsource-variable/jetbrains-mono';
import './styles/tokens.css';
import './styles/base.css';
```

- [ ] **Step 6: Verify the build passes and no external font origin remains**

```bash
npm run build
grep -r 'fonts.googleapis\|fonts.gstatic' index.html src/ ; echo "exit=$?"
```

Expected: build succeeds. The grep prints nothing and reports `exit=1` (no matches), confirming the CSP needs no change.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json index.html src/main.tsx src/styles/
git commit -m "feat: add Instrument design tokens and self-hosted JetBrains Mono"
```

---

### Task 2: Period display helper

The page-level Annual/Monthly setting needs one place that converts an annual figure into a displayed string. Pure and fully testable.

**Files:**
- Create: `src/display.ts`
- Test: `src/display.test.ts`

**Interfaces:**
- Consumes: `scalePeriod`, `formatCurrency`, `type PayPeriod` from `./taxEngine`.
- Produces:
  - `type DisplayPeriod = 'annual' | 'monthly'`
  - `formatForPeriod(annual: number, period: DisplayPeriod): string`
  - `periodSuffix(period: DisplayPeriod): string`
  - `toAnnual(value: number, period: DisplayPeriod): number`

- [ ] **Step 1: Write the failing test**

Create `src/display.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatForPeriod, periodSuffix, toAnnual } from './display';

describe('formatForPeriod', () => {
  it('formats an annual figure unchanged when period is annual', () => {
    expect(formatForPeriod(40944, 'annual')).toBe('£40,944.00');
  });

  it('divides by twelve when period is monthly', () => {
    expect(formatForPeriod(40944, 'monthly')).toBe('£3,412.00');
  });

  it('handles zero', () => {
    expect(formatForPeriod(0, 'monthly')).toBe('£0.00');
  });

  it('handles negative figures', () => {
    expect(formatForPeriod(-1200, 'monthly')).toBe('-£100.00');
  });
});

describe('periodSuffix', () => {
  it('returns per-year for annual', () => {
    expect(periodSuffix('annual')).toBe('per year');
  });

  it('returns per-month for monthly', () => {
    expect(periodSuffix('monthly')).toBe('per month');
  });
});

describe('toAnnual', () => {
  it('returns the value unchanged for annual', () => {
    expect(toAnnual(40944, 'annual')).toBe(40944);
  });

  it('multiplies by twelve for monthly', () => {
    expect(toAnnual(3412, 'monthly')).toBe(40944);
  });

  it('round-trips with formatForPeriod', () => {
    expect(toAnnual(3412, 'monthly')).toBe(40944);
    expect(formatForPeriod(40944, 'monthly')).toBe('£3,412.00');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/display.test.ts`
Expected: FAIL — cannot resolve `./display`.

- [ ] **Step 3: Write the implementation**

Create `src/display.ts`:

```ts
import { formatCurrency, scalePeriod, type PayPeriod } from './taxEngine';

/**
 * The page-level period setting. Narrower than the engine's PayPeriod:
 * the UI only offers annual and monthly, but reuses the engine's scaling.
 */
export type DisplayPeriod = 'annual' | 'monthly';

export function formatForPeriod(annual: number, period: DisplayPeriod): string {
  return formatCurrency(scalePeriod(annual, period as PayPeriod));
}

export function periodSuffix(period: DisplayPeriod): string {
  return period === 'monthly' ? 'per month' : 'per year';
}

/** Convert a value the user typed in the current period back to annual. */
export function toAnnual(value: number, period: DisplayPeriod): number {
  return period === 'monthly' ? value * 12 : value;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/display.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/display.ts src/display.test.ts
git commit -m "feat: add period display helper"
```

---

### Task 3: Slider snapping helper

Addresses "sliders are imprecise". Snapping pulls a dragged value onto meaningful points (whole percents, band thresholds) when it lands close to one; nudging handles keyboard arrows.

**Files:**
- Create: `src/snapping.ts`
- Test: `src/snapping.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface SnapOptions { min: number; max: number; step: number; snapPoints?: number[]; tolerance?: number }`
  - `snapValue(value: number, options: SnapOptions): number`
  - `nudge(value: number, direction: -1 | 1, options: SnapOptions, coarse?: boolean): number`

- [ ] **Step 1: Write the failing test**

Create `src/snapping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { snapValue, nudge, type SnapOptions } from './snapping';

const pct: SnapOptions = { min: 0, max: 100, step: 0.5 };

describe('snapValue', () => {
  it('rounds to the nearest step', () => {
    expect(snapValue(6.3, pct)).toBe(6.5);
    expect(snapValue(6.1, pct)).toBe(6);
  });

  it('clamps below min', () => {
    expect(snapValue(-5, pct)).toBe(0);
  });

  it('clamps above max', () => {
    expect(snapValue(120, pct)).toBe(100);
  });

  it('pulls onto a snap point inside the tolerance', () => {
    const opts: SnapOptions = { min: 0, max: 60000, step: 100, snapPoints: [43662], tolerance: 500 };
    expect(snapValue(43700, opts)).toBe(43662);
  });

  it('ignores a snap point outside the tolerance', () => {
    const opts: SnapOptions = { min: 0, max: 60000, step: 100, snapPoints: [43662], tolerance: 500 };
    expect(snapValue(45000, opts)).toBe(45000);
  });

  it('picks the nearest snap point when two are in range', () => {
    const opts: SnapOptions = { min: 0, max: 100, step: 1, snapPoints: [40, 44], tolerance: 5 };
    expect(snapValue(43, opts)).toBe(44);
  });

  it('does not produce floating point noise', () => {
    expect(snapValue(0.1 + 0.2, { min: 0, max: 10, step: 0.1 })).toBe(0.3);
  });
});

describe('nudge', () => {
  it('moves up by one step', () => {
    expect(nudge(6, 1, pct)).toBe(6.5);
  });

  it('moves down by one step', () => {
    expect(nudge(6, -1, pct)).toBe(5.5);
  });

  it('moves by ten steps when coarse', () => {
    expect(nudge(6, 1, pct, true)).toBe(11);
  });

  it('clamps at max', () => {
    expect(nudge(100, 1, pct)).toBe(100);
  });

  it('clamps at min', () => {
    expect(nudge(0, -1, pct)).toBe(0);
  });

  it('ignores snap points so keyboard stepping stays predictable', () => {
    const opts: SnapOptions = { min: 0, max: 100, step: 1, snapPoints: [50], tolerance: 5 };
    expect(nudge(47, 1, opts)).toBe(48);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/snapping.test.ts`
Expected: FAIL — cannot resolve `./snapping`.

- [ ] **Step 3: Write the implementation**

Create `src/snapping.ts`:

```ts
export interface SnapOptions {
  min: number;
  max: number;
  step: number;
  /** Meaningful values (band thresholds, whole percents) to attract the value. */
  snapPoints?: number[];
  /** How close the value must be to a snap point to be pulled onto it. */
  tolerance?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to the step grid without accumulating binary floating point error. */
function toStep(value: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

/**
 * Snap a freely-dragged value: clamp, pull onto the nearest snap point if one
 * is within tolerance, otherwise round to the step grid.
 */
export function snapValue(value: number, options: SnapOptions): number {
  const { min, max, step, snapPoints, tolerance = 0 } = options;
  const clamped = clamp(value, min, max);

  if (snapPoints?.length && tolerance > 0) {
    let best: number | null = null;
    let bestDistance = Infinity;
    for (const point of snapPoints) {
      const distance = Math.abs(clamped - point);
      if (distance <= tolerance && distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
    if (best !== null) return clamp(best, min, max);
  }

  return clamp(toStep(clamped, step), min, max);
}

/**
 * Keyboard stepping. Deliberately ignores snap points — arrow keys should move
 * by a predictable amount rather than jumping to a nearby threshold.
 */
export function nudge(
  value: number,
  direction: -1 | 1,
  options: SnapOptions,
  coarse = false,
): number {
  const { min, max, step } = options;
  const delta = step * (coarse ? 10 : 1) * direction;
  return clamp(toStep(value + delta, step), min, max);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/snapping.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/snapping.ts src/snapping.test.ts
git commit -m "feat: add slider snapping and keyboard nudge helpers"
```

---

### Task 4: Waterfall geometry

Turns a `CalculationResult` into the gross→net bar segments. The engine guarantees an exact identity, which this task asserts:

```
net = (grossSalary + militaryPension) − totalSalarySacrifice − incomeTax − nationalInsurance − totalPostTaxDeductions
```

**Files:**
- Create: `src/waterfall.ts`
- Test: `src/waterfall.test.ts`

**Interfaces:**
- Consumes: `type CalculationResult`, `calculate`, `type CalculationInput` from `./taxEngine`.
- Produces:
  - `type WaterfallKey = 'tax' | 'ni' | 'pension' | 'sacrifice' | 'posttax' | 'net'`
  - `interface WaterfallSegment { key: WaterfallKey; label: string; amount: number; percentOfGross: number }`
  - `totalGross(result: CalculationResult): number`
  - `buildWaterfall(result: CalculationResult): WaterfallSegment[]`

- [ ] **Step 1: Write the failing test**

Create `src/waterfall.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculate, type CalculationInput } from './taxEngine';
import { buildWaterfall, totalGross } from './waterfall';

const baseInput: CalculationInput = {
  annualSalary: 58000,
  salarySacrifice: 0,
  pensionContribution: 2840,
  employerPension: 0,
  militaryPension: 0,
  postTaxDeductions: [],
  taxRegion: 'scottish',
  employmentTaxCode: '',
  militaryPensionTaxCode: '',
};

describe('totalGross', () => {
  it('is salary alone when there is no military pension', () => {
    expect(totalGross(calculate(baseInput))).toBe(58000);
  });

  it('includes military pension', () => {
    const result = calculate({ ...baseInput, militaryPension: 12000 });
    expect(totalGross(result)).toBe(70000);
  });
});

describe('buildWaterfall', () => {
  it('segments sum to gross, preserving the engine identity', () => {
    const result = calculate({
      ...baseInput,
      militaryPension: 12000,
      salarySacrifice: 1000,
      postTaxDeductions: [{ name: 'Union', amount: 240 }],
    });
    const segments = buildWaterfall(result);
    const sum = segments.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBeCloseTo(totalGross(result), 6);
  });

  it('percentages sum to 100', () => {
    const segments = buildWaterfall(calculate(baseInput));
    const sum = segments.reduce((acc, s) => acc + s.percentOfGross, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it('ends with the net segment', () => {
    const segments = buildWaterfall(calculate(baseInput));
    expect(segments[segments.length - 1].key).toBe('net');
  });

  it('omits zero-valued segments so the bar has no invisible slivers', () => {
    const segments = buildWaterfall(calculate(baseInput));
    expect(segments.map((s) => s.key)).not.toContain('posttax');
    expect(segments.map((s) => s.key)).not.toContain('sacrifice');
  });

  it('includes post-tax deductions when present', () => {
    const result = calculate({
      ...baseInput,
      postTaxDeductions: [{ name: 'Union', amount: 240 }],
    });
    const posttax = buildWaterfall(result).find((s) => s.key === 'posttax');
    expect(posttax?.amount).toBe(240);
  });

  it('separates pension contribution from other salary sacrifice', () => {
    const result = calculate({ ...baseInput, salarySacrifice: 1000 });
    const segments = buildWaterfall(result);
    expect(segments.find((s) => s.key === 'pension')?.amount).toBe(2840);
    expect(segments.find((s) => s.key === 'sacrifice')?.amount).toBe(1000);
  });

  it('returns an empty array when gross is zero', () => {
    const result = calculate({ ...baseInput, annualSalary: 0, pensionContribution: 0 });
    expect(buildWaterfall(result)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/waterfall.test.ts`
Expected: FAIL — cannot resolve `./waterfall`.

- [ ] **Step 3: Write the implementation**

Create `src/waterfall.ts`:

```ts
import type { CalculationResult } from './taxEngine';

export type WaterfallKey = 'tax' | 'ni' | 'pension' | 'sacrifice' | 'posttax' | 'net';

export interface WaterfallSegment {
  key: WaterfallKey;
  label: string;
  /** Annual amount, always a positive magnitude. */
  amount: number;
  /** Share of total gross, 0–100. */
  percentOfGross: number;
}

/** Total income before any deduction — salary plus military pension. */
export function totalGross(result: CalculationResult): number {
  return result.grossSalary + result.militaryPension;
}

/**
 * Split total gross into the components that consume it, ending with net.
 *
 * The engine guarantees:
 *   net = gross − totalSalarySacrifice − incomeTax − NI − totalPostTaxDeductions
 * so these segments sum exactly to gross. Zero-valued segments are dropped so
 * the rendered bar contains no invisible slivers.
 */
export function buildWaterfall(result: CalculationResult): WaterfallSegment[] {
  const gross = totalGross(result);
  if (gross <= 0) return [];

  const parts: { key: WaterfallKey; label: string; amount: number }[] = [
    { key: 'tax', label: 'Income tax', amount: result.incomeTax },
    { key: 'ni', label: 'National Insurance', amount: result.nationalInsurance },
    { key: 'pension', label: 'Pension', amount: result.pensionContribution },
    { key: 'sacrifice', label: 'Salary sacrifice', amount: result.otherSalarySacrifice },
    { key: 'posttax', label: 'Post-tax deductions', amount: result.totalPostTaxDeductions },
    { key: 'net', label: 'Take-home', amount: result.netAnnualIncome },
  ];

  return parts
    .filter((part) => part.amount !== 0)
    .map((part) => ({ ...part, percentOfGross: (part.amount / gross) * 100 }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/waterfall.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite to confirm nothing regressed**

Run: `npm run test`
Expected: PASS — the pre-existing `taxEngine` and `urlState` tests still pass alongside the three new files.

- [ ] **Step 6: Commit**

```bash
git add src/waterfall.ts src/waterfall.test.ts
git commit -m "feat: add gross-to-net waterfall geometry"
```

---

### Task 5: ValueControl component

Replaces `SliderSpinner`. One primary control per value: a slider plus a directly-editable number. The `−`/`+` buttons are gone. Additive — nothing renders it yet.

**Files:**
- Create: `src/components/ValueControl.tsx`
- Create: `src/styles/controls.css`
- Modify: `src/main.tsx` (import `controls.css`)

**Interfaces:**
- Consumes: `snapValue`, `nudge`, `type SnapOptions` from `../snapping`.
- Produces: `ValueControl` with props
  `{ id: string; label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; snapPoints?: number[]; tolerance?: number; prefix?: string; suffix?: string; hint?: string }`

- [ ] **Step 1: Write the component**

Create `src/components/ValueControl.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { nudge, snapValue, type SnapOptions } from '../snapping';

export function ValueControl({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  snapPoints,
  tolerance,
  prefix,
  suffix,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  snapPoints?: number[];
  tolerance?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  const options: SnapOptions = { min, max, step, snapPoints, tolerance };

  // Local draft so the field does not fight the user mid-type (leading zeros,
  // a lone minus sign, an empty field). Committed on blur or Enter.
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = Number(draft.replace(/,/g, ''));
    if (Number.isFinite(parsed)) {
      onChange(snapValue(parsed, options));
    } else {
      setDraft(String(value));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      commit();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? 1 : -1;
      onChange(nudge(value, direction, options, event.shiftKey));
    }
  };

  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="value-control">
      <div className="value-control-head">
        <label className="label" htmlFor={id}>{label}</label>
        <div className="value-control-entry">
          {prefix && <span className="value-control-affix">{prefix}</span>}
          <input
            id={id}
            className="value-control-input figure"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft}
            onFocus={() => setEditing(true)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
          {suffix && <span className="value-control-affix">{suffix}</span>}
        </div>
      </div>

      <input
        className="value-control-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ ['--fill' as string]: `${percent}%` }}
        onChange={(e) => onChange(snapValue(Number(e.target.value), options))}
      />

      {hint && <p className="value-control-hint">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/styles/controls.css`**

```css
.value-control {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.value-control-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap);
}

.value-control-entry {
  display: flex;
  align-items: baseline;
  gap: 0.15rem;
}

.value-control-affix {
  color: var(--text-dim);
  font-size: 0.8rem;
}

.value-control-input {
  width: 7ch;
  padding: 0.15rem 0.3rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  color: var(--figure);
  font: inherit;
  font-size: 0.95rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.value-control-input:hover {
  border-color: var(--rule);
}

.value-control-input:focus {
  border-color: var(--rule-strong);
  background: var(--surface);
  outline: none;
}

.value-control-slider {
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    var(--pension) 0 var(--fill, 0%),
    var(--rule) var(--fill, 0%) 100%
  );
  cursor: pointer;
}

.value-control-slider::-webkit-slider-thumb {
  appearance: none;
  width: 13px;
  height: 13px;
  border: 0;
  border-radius: 50%;
  background: var(--figure);
}

.value-control-slider::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border: 0;
  border-radius: 50%;
  background: var(--figure);
}

.value-control-hint {
  color: var(--text-dim);
  font-size: 0.7rem;
}
```

- [ ] **Step 3: Import the stylesheet**

In `src/main.tsx`, add below the `base.css` import:

```ts
import './styles/controls.css';
```

- [ ] **Step 4: Verify the build passes**

Run: `npm run build`
Expected: PASS. If it fails with an unused-variable error, the component is not yet imported anywhere — that is fine for a component file, but any unused *local* inside it must be removed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ValueControl.tsx src/styles/controls.css src/main.tsx
git commit -m "feat: add ValueControl replacing slider+spinner pair"
```

---

### Task 6: Readout component

The headline figure, the waterfall bar, and the delta chip. Additive.

**Files:**
- Create: `src/components/Readout.tsx`
- Create: `src/styles/readout.css`
- Modify: `src/main.tsx` (import `readout.css`)

**Interfaces:**
- Consumes: `buildWaterfall`, `totalGross` from `../waterfall`; `formatForPeriod`, `periodSuffix`, `type DisplayPeriod` from `../display`; `formatPercent`, `type CalculationResult`, `type ScenarioDiff` from `../taxEngine`.
- Produces: `Readout` with props
  `{ result: CalculationResult; period: DisplayPeriod; diff: ScenarioDiff | null }`

- [ ] **Step 1: Write the component**

Create `src/components/Readout.tsx`:

```tsx
import { formatPercent, type CalculationResult, type ScenarioDiff } from '../taxEngine';
import { formatForPeriod, periodSuffix, type DisplayPeriod } from '../display';
import { buildWaterfall, totalGross } from '../waterfall';

export function Readout({
  result,
  period,
  diff,
}: {
  result: CalculationResult;
  period: DisplayPeriod;
  diff: ScenarioDiff | null;
}) {
  const segments = buildWaterfall(result);
  const gross = totalGross(result);
  const otherPeriod: DisplayPeriod = period === 'monthly' ? 'annual' : 'monthly';

  return (
    <section className="readout" aria-label="Take-home summary">
      <div className="readout-head">
        <span className="label">Take-home · {period}</span>
        {diff && (
          <span
            className={`readout-delta ${diff.netAnnualIncome >= 0 ? 'up' : 'down'}`}
            aria-label={`Change versus baseline: ${formatForPeriod(diff.netAnnualIncome, period)}`}
          >
            {diff.netAnnualIncome >= 0 ? '▲' : '▼'} {formatForPeriod(Math.abs(diff.netAnnualIncome), period)}
          </span>
        )}
      </div>

      <div className="readout-figure figure">
        {formatForPeriod(result.netAnnualIncome, period)}
      </div>

      <div className="readout-sub">
        {formatForPeriod(result.netAnnualIncome, otherPeriod)} {periodSuffix(otherPeriod)}
        {' · '}eff {formatPercent(result.effectiveTaxRate)}
        {' · '}marg {formatPercent(result.marginalTaxRate)}
      </div>

      {segments.length > 0 && (
        <>
          <div
            className="readout-bar"
            role="img"
            aria-label={`Breakdown of ${formatForPeriod(gross, period)} gross income`}
          >
            {segments.map((segment) => (
              <i
                key={segment.key}
                className={`readout-bar-seg seg-${segment.key}`}
                style={{ width: `${segment.percentOfGross}%` }}
              />
            ))}
          </div>

          <dl className="readout-legend">
            {segments.map((segment) => (
              <div key={segment.key} className="readout-legend-row">
                <dt>
                  <i className={`readout-swatch seg-${segment.key}`} aria-hidden="true" />
                  {segment.label}
                </dt>
                <dd className="figure">{formatForPeriod(segment.amount, period)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Write `src/styles/readout.css`**

```css
.readout {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--surface-raised);
}

.readout-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap);
}

.readout-delta {
  font-size: 0.8rem;
  font-weight: 500;
}

.readout-delta.up {
  color: var(--positive);
  text-shadow: var(--glow);
}

.readout-delta.down {
  color: var(--negative);
}

.readout-figure {
  font-size: clamp(2rem, 7vw, 3rem);
  line-height: 1;
  text-shadow: var(--glow);
}

.readout-sub {
  color: var(--text-dim);
  font-size: 0.72rem;
}

.readout-bar {
  display: flex;
  gap: 1.5px;
  height: 6px;
  margin-top: 0.4rem;
}

.readout-bar-seg {
  display: block;
  height: 100%;
  border-radius: 1px;
  transition: width 180ms ease-out;
}

.readout-legend {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin-top: 0.3rem;
}

.readout-legend-row {
  display: flex;
  justify-content: space-between;
  gap: var(--gap);
  font-size: 0.76rem;
  padding: 0.12rem 0;
}

.readout-legend-row dt {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-dim);
}

.readout-swatch {
  width: 7px;
  height: 7px;
  border-radius: 2px;
}

.seg-tax { background: var(--tax); }
.seg-ni { background: var(--ni); }
.seg-pension { background: var(--pension); }
.seg-sacrifice { background: var(--sacrifice); }
.seg-posttax { background: var(--posttax); }
.seg-net { background: var(--net); }

.readout-legend-row dd.figure {
  color: var(--text);
}
```

- [ ] **Step 3: Import the stylesheet**

In `src/main.tsx`, below the `controls.css` import:

```ts
import './styles/readout.css';
```

- [ ] **Step 4: Verify the build passes**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Readout.tsx src/styles/readout.css src/main.tsx
git commit -m "feat: add Readout with waterfall and delta chip"
```

---

### Task 7: DetailSections

Consolidates the tax, NI, pension and post-tax cards onto one surface with progressive disclosure. Uses native `<details>` so keyboard and screen-reader behaviour is free.

**Files:**
- Create: `src/components/DetailSections.tsx`
- Create: `src/styles/details.css`
- Modify: `src/main.tsx` (import `details.css`)

**Interfaces:**
- Consumes: `formatPercent`, `type CalculationResult` from `../taxEngine`; `formatForPeriod`, `type DisplayPeriod` from `../display`.
- Produces: `DetailSections` with props `{ result: CalculationResult; period: DisplayPeriod }`

- [ ] **Step 1: Write the component**

Create `src/components/DetailSections.tsx`:

```tsx
import { formatPercent, type CalculationResult, type TaxBreakdownBand } from '../taxEngine';
import { formatForPeriod, type DisplayPeriod } from '../display';

function BandTable({
  bands,
  totalLabel,
  total,
  period,
}: {
  bands: TaxBreakdownBand[];
  totalLabel: string;
  total: number;
  period: DisplayPeriod;
}) {
  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            <th scope="col">Band</th>
            <th scope="col">Rate</th>
            <th scope="col">Taxable</th>
            <th scope="col">Tax</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band) => (
            <tr key={band.name}>
              <td>{band.name}</td>
              <td>{formatPercent(band.rate)}</td>
              <td className="figure">{formatForPeriod(band.taxableInBand, period)}</td>
              <td className="figure">{formatForPeriod(band.tax, period)}</td>
            </tr>
          ))}
          <tr className="detail-total">
            <td colSpan={3}>{totalLabel}</td>
            <td className="figure">{formatForPeriod(total, period)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="detail-section">
      <summary>
        <span className="detail-title">{title}</span>
        <span className="detail-summary figure">{summary}</span>
      </summary>
      <div className="detail-body">{children}</div>
    </details>
  );
}

export function DetailSections({
  result,
  period,
}: {
  result: CalculationResult;
  period: DisplayPeriod;
}) {
  return (
    <div className="detail-sections">
      <Section title="Income tax" summary={formatForPeriod(result.incomeTax, period)}>
        {result.usingTaxCodes ? (
          <>
            {result.employmentTaxBreakdown.length > 0 && (
              <>
                <p className="detail-label">
                  Employment
                  {result.employmentTaxCodeInfo && ` · ${result.employmentTaxCodeInfo.raw}`}
                </p>
                <BandTable
                  bands={result.employmentTaxBreakdown}
                  totalLabel="Employment tax"
                  total={result.employmentIncomeTax}
                  period={period}
                />
              </>
            )}
            {result.militaryTaxBreakdown.length > 0 && (
              <>
                <p className="detail-label">
                  Military pension
                  {result.militaryTaxCodeInfo && ` · ${result.militaryTaxCodeInfo.raw}`}
                </p>
                <BandTable
                  bands={result.militaryTaxBreakdown}
                  totalLabel="Military pension tax"
                  total={result.militaryPensionTax}
                  period={period}
                />
              </>
            )}
          </>
        ) : (
          <BandTable
            bands={result.taxBreakdown}
            totalLabel="Total income tax"
            total={result.incomeTax}
            period={period}
          />
        )}
      </Section>

      <Section
        title="National Insurance"
        summary={formatForPeriod(result.nationalInsurance, period)}
      >
        <p className="detail-label">Charged on employment income only</p>
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th scope="col">Band</th>
                <th scope="col">Rate</th>
                <th scope="col">Earnings</th>
                <th scope="col">NI</th>
              </tr>
            </thead>
            <tbody>
              {result.niBreakdown.map((band) => (
                <tr key={band.name}>
                  <td>{band.name}</td>
                  <td>{formatPercent(band.rate)}</td>
                  <td className="figure">{formatForPeriod(band.earningsInBand, period)}</td>
                  <td className="figure">{formatForPeriod(band.contribution, period)}</td>
                </tr>
              ))}
              <tr className="detail-total">
                <td colSpan={3}>Total NI</td>
                <td className="figure">{formatForPeriod(result.nationalInsurance, period)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Pension" summary={formatForPeriod(result.totalPensionPot, period)}>
        <dl className="detail-rows">
          <div><dt>Your contribution</dt><dd className="figure">{formatForPeriod(result.pensionContribution, period)}</dd></div>
          <div><dt>Employer contribution</dt><dd className="figure">{formatForPeriod(result.employerPension, period)}</dd></div>
          <div className="detail-total-row"><dt>Total into pot</dt><dd className="figure">{formatForPeriod(result.totalPensionPot, period)}</dd></div>
        </dl>
      </Section>

      {result.postTaxDeductions.length > 0 && (
        <Section
          title="Post-tax deductions"
          summary={formatForPeriod(result.totalPostTaxDeductions, period)}
        >
          <dl className="detail-rows">
            {result.postTaxDeductions.map((deduction, index) => (
              <div key={`${deduction.name}-${index}`}>
                <dt>{deduction.name}</dt>
                <dd className="figure">{formatForPeriod(deduction.amount, period)}</dd>
              </div>
            ))}
            <div className="detail-total-row">
              <dt>Total</dt>
              <dd className="figure">{formatForPeriod(result.totalPostTaxDeductions, period)}</dd>
            </div>
          </dl>
        </Section>
      )}

      <Section
        title="Allowances"
        summary={formatForPeriod(result.personalAllowance, period)}
      >
        <dl className="detail-rows">
          <div><dt>Personal allowance</dt><dd className="figure">{formatForPeriod(result.personalAllowance, period)}</dd></div>
          <div><dt>Taxable income</dt><dd className="figure">{formatForPeriod(result.totalTaxableIncome, period)}</dd></div>
          <div><dt>Effective rate</dt><dd className="figure">{formatPercent(result.effectiveTaxRate)}</dd></div>
          <div><dt>Marginal rate</dt><dd className="figure">{formatPercent(result.marginalTaxRate)}</dd></div>
        </dl>
      </Section>
    </div>
  );
}
```

> **`NIBreakdownBand` field names**, verified against `src/taxEngine.ts:27`:
> `{ name: string; earningsInBand: number; rate: number; contribution: number }`.
> Note it is `contribution`, **not** `ni` — the code above uses the correct name.
> `TaxBreakdownBand` is `{ name, taxableInBand, rate, tax }`.

- [ ] **Step 2: Write `src/styles/details.css`**

```css
.detail-sections {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--surface-raised);
}

.detail-section + .detail-section {
  border-top: 1px solid var(--rule);
}

.detail-section > summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap);
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  list-style: none;
  font-size: 0.8rem;
}

.detail-section > summary::-webkit-details-marker {
  display: none;
}

.detail-section > summary::before {
  content: '▸';
  margin-right: 0.5rem;
  color: var(--text-dim);
  transition: transform 120ms ease-out;
  display: inline-block;
}

.detail-section[open] > summary::before {
  transform: rotate(90deg);
}

.detail-title {
  flex: 1;
  color: var(--text);
}

.detail-summary {
  color: var(--figure);
}

.detail-body {
  padding: 0 0.9rem 0.9rem;
}

.detail-label {
  color: var(--text-dim);
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin: 0.6rem 0 0.35rem;
}

/* Wide tables scroll inside their own container rather than
   forcing the page to scroll sideways. */
.detail-table-wrap {
  overflow-x: auto;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.74rem;
  white-space: nowrap;
}

.detail-table th {
  text-align: left;
  padding: 0.3rem 0.5rem 0.3rem 0;
  color: var(--text-dim);
  font-weight: 400;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--rule);
}

.detail-table td {
  padding: 0.28rem 0.5rem 0.28rem 0;
}

.detail-table td:last-child,
.detail-table th:last-child {
  text-align: right;
  padding-right: 0;
}

.detail-table td:nth-child(3) {
  text-align: right;
}

.detail-total td {
  border-top: 1px solid var(--rule);
  color: var(--figure);
}

.detail-rows {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: 0.76rem;
  margin-top: 0.5rem;
}

.detail-rows > div {
  display: flex;
  justify-content: space-between;
  gap: var(--gap);
  padding: 0.16rem 0;
}

.detail-rows dt {
  color: var(--text-dim);
}

.detail-total-row {
  border-top: 1px solid var(--rule);
  margin-top: 0.25rem;
  padding-top: 0.4rem !important;
}

.detail-total-row dt {
  color: var(--text) !important;
}
```

- [ ] **Step 3: Import the stylesheet**

In `src/main.tsx`, below the `readout.css` import:

```ts
import './styles/details.css';
```

- [ ] **Step 4: Verify the build passes**

Run: `npm run build`
Expected: PASS. If `earningsInBand` or `ni` are wrong, `tsc` fails here with the correct field names in the error — fix the component to match.

- [ ] **Step 5: Commit**

```bash
git add src/components/DetailSections.tsx src/styles/details.css src/main.tsx
git commit -m "feat: consolidate result cards into DetailSections"
```

---

### Task 8: Page-level period setting

Removes per-field `isMonthly` from `useNumericInput` and lifts the period to one page-level setting persisted in `localStorage`. This is the fiddliest refactor in the plan.

`useNumericInput` currently owns an annual/monthly pair plus its own toggle. After this task it owns only the annual value and its raw text draft; display scaling is a render concern handled by `formatForPeriod`.

**Files:**
- Modify: `src/hooks/useNumericInput.ts` (rewrite)
- Create: `src/hooks/usePeriod.ts`
- Create: `src/components/PeriodSwitch.tsx`

**Interfaces:**
- Consumes: `useLocalStorage` from `./useLocalStorage`; `type DisplayPeriod`, `toAnnual` from `../display`; `sanitizeNumber` from `../sanitize`.
- Produces:
  - `usePeriod(): { period: DisplayPeriod; setPeriod: (p: DisplayPeriod) => void }`
  - `PeriodSwitch` with props `{ period: DisplayPeriod; onChange: (p: DisplayPeriod) => void }`
  - `NumericInput` reduced to `{ raw: string; annualValue: number; setRaw: (v: string) => void; setAnnualValue: (v: number) => void }`

- [ ] **Step 1: Rewrite `src/hooks/useNumericInput.ts`**

```ts
import { useState, useCallback } from 'react';
import { sanitizeNumber } from '../sanitize';

export interface NumericInput {
  /** Raw text as typed, so the field never fights the user mid-entry. */
  raw: string;
  /** Always the annual figure — the single source of truth. */
  annualValue: number;
  setRaw: (value: string) => void;
  setAnnualValue: (value: number) => void;
}

/**
 * Holds one annual money value plus its text draft.
 *
 * Period conversion deliberately lives outside this hook: the page has one
 * global Annual/Monthly setting and display scaling happens at render time via
 * formatForPeriod. Keeping a per-field period here is what made the old
 * inputs confusing.
 */
export function useNumericInput(initialAnnual: string = '0'): NumericInput {
  const [raw, setRawState] = useState(initialAnnual);

  const setRaw = useCallback((value: string) => {
    setRawState(value);
  }, []);

  const setAnnualValue = useCallback((value: number) => {
    setRawState(String(value));
  }, []);

  return {
    raw,
    annualValue: sanitizeNumber(raw),
    setRaw,
    setAnnualValue,
  };
}
```

- [ ] **Step 2: Create `src/hooks/usePeriod.ts`**

```ts
import { useLocalStorage } from './useLocalStorage';
import type { DisplayPeriod } from '../display';

/**
 * The page-wide Annual/Monthly setting. Display state only — deliberately
 * persisted to localStorage rather than the URL, so the shared-link payload
 * keeps its existing schema.
 */
export function usePeriod() {
  const [period, setPeriod] = useLocalStorage<DisplayPeriod>('display-period', 'monthly');
  return { period, setPeriod };
}
```

- [ ] **Step 3: Create `src/components/PeriodSwitch.tsx`**

```tsx
import type { DisplayPeriod } from '../display';

export function PeriodSwitch({
  period,
  onChange,
}: {
  period: DisplayPeriod;
  onChange: (period: DisplayPeriod) => void;
}) {
  return (
    <div className="period-switch" role="group" aria-label="Display period">
      <button
        type="button"
        className={period === 'annual' ? 'active' : ''}
        aria-pressed={period === 'annual'}
        onClick={() => onChange('annual')}
      >
        Annual
      </button>
      <button
        type="button"
        className={period === 'monthly' ? 'active' : ''}
        aria-pressed={period === 'monthly'}
        onClick={() => onChange('monthly')}
      >
        Monthly
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Add the switch styles to `src/styles/controls.css`**

Append:

```css
.period-switch {
  display: inline-flex;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  overflow: hidden;
}

.period-switch button {
  padding: 0.25rem 0.7rem;
  border: 0;
  background: transparent;
  color: var(--text-dim);
  font: inherit;
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.period-switch button.active {
  background: var(--rule);
  color: var(--figure);
}
```

- [ ] **Step 5: Verify the expected breakage**

Run: `npm run build`
Expected: **FAIL**, with errors in `src/App.tsx`, `src/components/IncomeCard.tsx`, `src/components/IncomeDeductionsCard.tsx` and `src/components/MilitaryPensionCard.tsx` about missing `annual`, `monthly`, `isMonthly`, `displayValue`, `setDisplay` and `setIsMonthly` on `NumericInput`.

This is the one point in the plan where the build is knowingly red. It is repaired in Task 10, which is the next task that touches `App.tsx`. **Do not** patch the old components to compile — they are being deleted.

- [ ] **Step 6: Confirm the test suite still passes**

Run: `npm run test`
Expected: PASS. The suite covers pure modules only, so it is unaffected by the component breakage.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useNumericInput.ts src/hooks/usePeriod.ts src/components/PeriodSwitch.tsx src/styles/controls.css
git commit -m "refactor: lift period setting from per-field to page level

Build is intentionally red at this commit; the old cards that consume the
removed NumericInput fields are deleted in the cockpit swap."
```

---

### Task 9: CockpitShell and ControlSheet

The responsive frame. Above 900px a fixed rail sits beside the readout; below, the rail's contents move into a bottom sheet. Tap-to-expand is the primary interaction; drag is a progressive enhancement, so the sheet is fully usable if drag fails.

**Files:**
- Create: `src/components/CockpitShell.tsx`
- Create: `src/components/ControlSheet.tsx`
- Create: `src/styles/cockpit.css`
- Create: `src/styles/sheet.css`
- Modify: `src/main.tsx` (import both stylesheets)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `CockpitShell` with props `{ controls: React.ReactNode; children: React.ReactNode }`
  - `ControlSheet` with props `{ children: React.ReactNode; peek: React.ReactNode }`

- [ ] **Step 1: Write `src/components/ControlSheet.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';

/**
 * Bottom sheet for narrow screens.
 *
 * Tap the handle to expand or collapse — that is the primary, always-available
 * path. Dragging is layered on top for pointer devices; if a pointer event
 * never arrives the sheet still works entirely by tap and keyboard.
 */
export function ControlSheet({
  children,
  peek,
}: {
  children: React.ReactNode;
  peek: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handlePointerDown = (event: React.PointerEvent) => {
    dragStartY.current = event.clientY;
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const start = dragStartY.current;
    dragStartY.current = null;
    if (start === null) return;
    const travel = start - event.clientY;
    // Below the threshold this was a tap, not a drag — let onClick handle it.
    if (Math.abs(travel) < 24) return;
    setOpen(travel > 0);
  };

  return (
    <div
      className={`control-sheet ${open ? 'open' : ''}`}
      ref={panelRef}
      role="dialog"
      aria-label="Controls"
      aria-expanded={open}
    >
      <button
        type="button"
        className="control-sheet-handle"
        onClick={() => setOpen((value) => !value)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        aria-expanded={open}
      >
        <span className="control-sheet-grab" aria-hidden="true" />
        <span className="control-sheet-peek">{open ? 'Close controls' : peek}</span>
      </button>

      <div className="control-sheet-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/CockpitShell.tsx`**

```tsx
import { ControlSheet } from './ControlSheet';

/**
 * The responsive frame. A single CSS breakpoint decides between the fixed rail
 * and the sheet — no JavaScript viewport measuring. Both containers are always
 * rendered; CSS hides the one that does not apply.
 */
export function CockpitShell({
  controls,
  children,
}: {
  controls: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="cockpit">
      <aside className="cockpit-rail" aria-label="Controls">
        {controls}
      </aside>

      <main className="cockpit-canvas">{children}</main>

      <div className="cockpit-sheet-slot">
        <ControlSheet peek="Adjust">{controls}</ControlSheet>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/styles/cockpit.css`**

```css
.cockpit {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--gap);
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.cockpit-rail {
  display: none;
}

.cockpit-canvas {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  /* Room for the collapsed sheet so the last section is never trapped
     underneath it. */
  padding-bottom: 5rem;
}

@media (min-width: 900px) {
  .cockpit {
    grid-template-columns: 340px 1fr;
    align-items: start;
  }

  .cockpit-rail {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    padding: 1rem;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: var(--surface-raised);
  }

  .cockpit-canvas {
    padding-bottom: 0;
  }

  .cockpit-sheet-slot {
    display: none;
  }
}
```

- [ ] **Step 4: Write `src/styles/sheet.css`**

```css
.control-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: var(--surface-sheet);
  border-top: 1px solid var(--rule-strong);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: 0 -14px 34px rgba(0, 0, 0, 0.45);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.control-sheet-handle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.5rem 1rem 0.7rem;
  border: 0;
  background: transparent;
  color: var(--text-dim);
  font: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  touch-action: none;
}

.control-sheet-grab {
  width: 30px;
  height: 3px;
  border-radius: 3px;
  background: var(--rule-strong);
}

.control-sheet-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0 1rem 1.25rem;
  overflow-y: auto;
}
```

- [ ] **Step 5: Import both stylesheets**

In `src/main.tsx`, below the `details.css` import:

```ts
import './styles/cockpit.css';
import './styles/sheet.css';
```

- [ ] **Step 6: Verify the build still fails only for the Task 8 reason**

Run: `npm run build`
Expected: FAIL, but **only** with the `NumericInput` errors from Task 8 in `App.tsx` and the three old cards. No new errors from `CockpitShell.tsx` or `ControlSheet.tsx`. If either new file reports an error, fix it before committing.

- [ ] **Step 7: Commit**

```bash
git add src/components/CockpitShell.tsx src/components/ControlSheet.tsx src/styles/cockpit.css src/styles/sheet.css src/main.tsx
git commit -m "feat: add cockpit shell and mobile control sheet"
```

---

### Task 10: Wire the cockpit into App and remove the old UI

Swaps the new components in, deletes the superseded ones, and returns the build to green.

**Files:**
- Modify: `src/App.tsx` (rewrite the render tree and the pension-percent state)
- Modify: `src/main.tsx` (drop the `index.css` import)
- Create: `src/components/ControlPanel.tsx`
- Delete: `src/index.css`, `src/components/SliderSpinner.tsx`, `src/components/PeriodToggle.tsx`, `src/components/SummaryHero.tsx`, `src/components/IncomeCard.tsx`, `src/components/MilitaryPensionCard.tsx`, `src/components/PostTaxDeductionsCard.tsx`, `src/components/IncomeDeductionsCard.tsx`, `src/components/EffectiveRatesCard.tsx`, `src/components/TaxBreakdownCard.tsx`, `src/components/NiBreakdownCard.tsx`, `src/components/PensionSummaryCard.tsx`, `src/components/PostTaxDeductionsSummaryCard.tsx`, `src/components/MilitarySplitStats.tsx`, `src/components/BarRow.tsx`, `src/components/RegionCard.tsx`

**Interfaces:**
- Consumes: everything produced by Tasks 1–9.
- Produces: the finished UI. No new exported types.

**Kept as-is:** `Header.tsx`, `Footer.tsx`, `DisclaimerBanner.tsx`, `ThemeToggle.tsx`, `CopyLinkButton.tsx`, `TaxCodeInput.tsx`, `ScenarioComparison.tsx`, `BaselineActions.tsx`.

- [ ] **Step 1: Create `src/components/ControlPanel.tsx`**

This is the rail's contents, shared by rail and sheet. It replaces `RegionCard`, `IncomeCard`, `MilitaryPensionCard` and `PostTaxDeductionsCard`.

```tsx
import type { TaxCodeInfo, TaxRegion } from '../taxEngine';
import type { NumericInput } from '../hooks/useNumericInput';
import type { DisplayPeriod } from '../display';
import { ValueControl } from './ValueControl';
import { PeriodSwitch } from './PeriodSwitch';
import { TaxCodeInput } from './TaxCodeInput';

export function ControlPanel({
  period,
  onPeriodChange,
  taxRegion,
  onTaxRegionChange,
  annualSalary,
  onAnnualSalaryChange,
  pensionContribution,
  pensionSnapPoints,
  employerPension,
  onEmployerPensionChange,
  salarySacrifice,
  employmentTaxCode,
  onEmploymentTaxCodeChange,
  empTaxCodeInfo,
  hasMilitaryPension,
  onHasMilitaryPensionChange,
  militaryPension,
  onMilitaryPensionChange,
  militaryPensionTaxCode,
  onMilitaryPensionTaxCodeChange,
  milTaxCodeInfo,
}: {
  period: DisplayPeriod;
  onPeriodChange: (period: DisplayPeriod) => void;
  taxRegion: TaxRegion;
  onTaxRegionChange: (region: TaxRegion) => void;
  annualSalary: number;
  onAnnualSalaryChange: (value: number) => void;
  pensionContribution: NumericInput;
  pensionSnapPoints: number[];
  employerPension: number;
  onEmployerPensionChange: (value: number) => void;
  salarySacrifice: NumericInput;
  employmentTaxCode: string;
  onEmploymentTaxCodeChange: (value: string) => void;
  empTaxCodeInfo: TaxCodeInfo | null;
  hasMilitaryPension: boolean;
  onHasMilitaryPensionChange: (value: boolean) => void;
  militaryPension: number;
  onMilitaryPensionChange: (value: number) => void;
  militaryPensionTaxCode: string;
  onMilitaryPensionTaxCodeChange: (value: string) => void;
  milTaxCodeInfo: TaxCodeInfo | null;
}) {
  const salaryMax = Math.max(200000, Math.ceil(annualSalary / 10000) * 10000);

  return (
    <>
      <div className="control-group">
        <div className="control-group-head">
          <span className="label">Display</span>
          <PeriodSwitch period={period} onChange={onPeriodChange} />
        </div>

        <div className="region-switch" role="group" aria-label="Tax region">
          <button
            type="button"
            className={taxRegion === 'scottish' ? 'active' : ''}
            aria-pressed={taxRegion === 'scottish'}
            onClick={() => onTaxRegionChange('scottish')}
          >
            Scotland
          </button>
          <button
            type="button"
            className={taxRegion === 'english' ? 'active' : ''}
            aria-pressed={taxRegion === 'english'}
            onClick={() => onTaxRegionChange('english')}
          >
            Rest of UK
          </button>
        </div>
      </div>

      <div className="control-group">
        <span className="label">Employment</span>

        <ValueControl
          id="salary"
          label="Gross salary"
          value={annualSalary}
          onChange={onAnnualSalaryChange}
          min={0}
          max={salaryMax}
          step={100}
          snapPoints={pensionSnapPoints}
          tolerance={250}
          prefix="£"
        />

        <ValueControl
          id="pension"
          label="Your pension"
          value={pensionContribution.annualValue}
          onChange={pensionContribution.setAnnualValue}
          min={0}
          max={Math.max(annualSalary, 1)}
          step={100}
          snapPoints={pensionSnapPoints}
          tolerance={250}
          prefix="£"
          hint="Snaps to the nearest band threshold"
        />

        <ValueControl
          id="employer-pension"
          label="Employer pension"
          value={employerPension}
          onChange={onEmployerPensionChange}
          min={0}
          max={Math.max(annualSalary, 1)}
          step={100}
          prefix="£"
        />

        <ValueControl
          id="sacrifice"
          label="Other sacrifice"
          value={salarySacrifice.annualValue}
          onChange={salarySacrifice.setAnnualValue}
          min={0}
          max={Math.max(annualSalary, 1)}
          step={100}
          prefix="£"
        />

        <TaxCodeInput
          id="employment-tax-code"
          label="Tax code"
          value={employmentTaxCode}
          onChange={onEmploymentTaxCodeChange}
          info={empTaxCodeInfo}
          placeholder="S1257L"
          emptyHint="Leave blank to use the standard personal allowance."
          invalidExamples="S1257L, BR, D0, K475"
        />
      </div>

      <div className="control-group">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={hasMilitaryPension}
            onChange={(e) => onHasMilitaryPensionChange(e.target.checked)}
          />
          <span className="label">Military pension</span>
        </label>

        {hasMilitaryPension && (
          <>
            <ValueControl
              id="military-pension"
              label="Annual pension"
              value={militaryPension}
              onChange={onMilitaryPensionChange}
              min={0}
              max={100000}
              step={100}
              prefix="£"
            />

            <TaxCodeInput
              id="military-tax-code"
              label="Tax code"
              value={militaryPensionTaxCode}
              onChange={onMilitaryPensionTaxCodeChange}
              info={milTaxCodeInfo}
              placeholder="BR"
              emptyHint="Blank means it is taxed at marginal rates above your salary."
              invalidExamples="BR, D0, S1257L, NT"
            />
          </>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Append control-group styles to `src/styles/controls.css`**

```css
.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-bottom: 0.9rem;
}

.control-group + .control-group {
  border-top: 1px solid var(--rule);
  padding-top: 0.9rem;
}

.control-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
}

.region-switch {
  display: flex;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  overflow: hidden;
}

.region-switch button {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border: 0;
  background: transparent;
  color: var(--text-dim);
  font: inherit;
  font-size: 0.7rem;
  cursor: pointer;
}

.region-switch button.active {
  background: var(--rule);
  color: var(--figure);
}

.control-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
```

- [ ] **Step 3: Rewrite the body of `src/App.tsx`**

Replace the entire file with:

```tsx
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  calculate,
  parseTaxCode,
  getOptimisationTargets,
  type TaxRegion,
  type CalculationInput,
  type CalculationResult,
  type PostTaxDeduction,
} from './taxEngine';
import { sanitizeNumber } from './sanitize';
import { decodeInput, encodeInput, type UrlStatePayload } from './urlState';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { useNumericInput } from './hooks/useNumericInput';
import { useScenario } from './hooks/useScenario';
import { usePeriod } from './hooks/usePeriod';
import { CockpitShell } from './components/CockpitShell';
import { ControlPanel } from './components/ControlPanel';
import { Readout } from './components/Readout';
import { DetailSections } from './components/DetailSections';
import { ScenarioComparison } from './components/ScenarioComparison';
import { BaselineActions } from './components/BaselineActions';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { ThemeToggle } from './components/ThemeToggle';

export default function App() {
  const { isDark, toggle } = useTheme();
  const { period, setPeriod } = usePeriod();

  const [disclaimerDismissed, setDisclaimerDismissed] = useLocalStorage<boolean>(
    'disclaimer-dismissed',
    false
  );
  const dismissDisclaimer = useCallback(() => setDisclaimerDismissed(true), [setDisclaimerDismissed]);

  const initialUrlState = useMemo(() => decodeInput(window.location.search), []);

  const [annualSalary, setAnnualSalary] = useState(() => sanitizeNumber(initialUrlState.annualSalary));
  const salarySacrificeInput = useNumericInput(initialUrlState.salarySacrifice);
  const pensionContributionInput = useNumericInput(initialUrlState.pensionContribution);
  const [employerPension, setEmployerPension] = useState(() => sanitizeNumber(initialUrlState.employerPension));
  const [militaryPension, setMilitaryPension] = useState(() => sanitizeNumber(initialUrlState.militaryPension));
  const [hasMilitaryPension, setHasMilitaryPension] = useState(initialUrlState.hasMilitaryPension);
  const [taxRegion, setTaxRegion] = useState<TaxRegion>(initialUrlState.taxRegion);
  const [employmentTaxCode, setEmploymentTaxCode] = useState(initialUrlState.employmentTaxCode);
  const [militaryPensionTaxCode, setMilitaryPensionTaxCode] = useState(initialUrlState.militaryPensionTaxCode);
  const [postTaxDeductions] = useState<{ name: string; amount: string }[]>(
    () => initialUrlState.postTaxDeductions.map((d) => ({ name: d.name, amount: d.amount }))
  );

  const parsedPostTaxDeductions: PostTaxDeduction[] = useMemo(
    () => postTaxDeductions.map((d) => ({ name: d.name || 'Deduction', amount: sanitizeNumber(d.amount) })),
    [postTaxDeductions]
  );

  const empTaxCodeInfo = useMemo(
    () => (employmentTaxCode ? parseTaxCode(employmentTaxCode) : null),
    [employmentTaxCode]
  );
  const milTaxCodeInfo = useMemo(
    () => (militaryPensionTaxCode ? parseTaxCode(militaryPensionTaxCode) : null),
    [militaryPensionTaxCode]
  );

  const currentInput: CalculationInput = useMemo(
    () => ({
      annualSalary,
      salarySacrifice: salarySacrificeInput.annualValue,
      pensionContribution: pensionContributionInput.annualValue,
      employerPension,
      militaryPension: hasMilitaryPension ? militaryPension : 0,
      postTaxDeductions: parsedPostTaxDeductions,
      taxRegion,
      employmentTaxCode,
      militaryPensionTaxCode: hasMilitaryPension ? militaryPensionTaxCode : '',
    }),
    [annualSalary, salarySacrificeInput.annualValue, pensionContributionInput.annualValue, employerPension, militaryPension, hasMilitaryPension, parsedPostTaxDeductions, taxRegion, employmentTaxCode, militaryPensionTaxCode]
  );

  const result: CalculationResult = useMemo(() => calculate(currentInput), [currentInput]);

  const scenario = useScenario(currentInput, result);

  // Band thresholds the pension slider should snap onto.
  const pensionSnapPoints = useMemo(
    () => getOptimisationTargets(currentInput, result).map((target) => target.threshold),
    [currentInput, result]
  );

  const urlPayload: UrlStatePayload = useMemo(() => ({
    annualSalary: String(annualSalary),
    salarySacrifice: String(salarySacrificeInput.annualValue),
    pensionContribution: String(pensionContributionInput.annualValue),
    employerPension: String(employerPension),
    militaryPension: String(militaryPension),
    hasMilitaryPension,
    taxRegion,
    employmentTaxCode,
    militaryPensionTaxCode,
    postTaxDeductions,
  }), [annualSalary, salarySacrificeInput.annualValue, pensionContributionInput.annualValue, employerPension, militaryPension, hasMilitaryPension, taxRegion, employmentTaxCode, militaryPensionTaxCode, postTaxDeductions]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const query = encodeInput(urlPayload).toString();
      const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    }, 200);
    return () => clearTimeout(timeout);
  }, [urlPayload]);

  const controls = (
    <ControlPanel
      period={period}
      onPeriodChange={setPeriod}
      taxRegion={taxRegion}
      onTaxRegionChange={setTaxRegion}
      annualSalary={annualSalary}
      onAnnualSalaryChange={setAnnualSalary}
      pensionContribution={pensionContributionInput}
      pensionSnapPoints={pensionSnapPoints}
      employerPension={employerPension}
      onEmployerPensionChange={setEmployerPension}
      salarySacrifice={salarySacrificeInput}
      employmentTaxCode={employmentTaxCode}
      onEmploymentTaxCodeChange={setEmploymentTaxCode}
      empTaxCodeInfo={empTaxCodeInfo}
      hasMilitaryPension={hasMilitaryPension}
      onHasMilitaryPensionChange={setHasMilitaryPension}
      militaryPension={militaryPension}
      onMilitaryPensionChange={setMilitaryPension}
      militaryPensionTaxCode={militaryPensionTaxCode}
      onMilitaryPensionTaxCodeChange={setMilitaryPensionTaxCode}
      milTaxCodeInfo={milTaxCodeInfo}
    />
  );

  return (
    <>
      {!disclaimerDismissed && <DisclaimerBanner onDismiss={dismissDisclaimer} />}
      <ThemeToggle isDark={isDark} onToggle={toggle} />

      <Header />

      <CockpitShell controls={controls}>
        <Readout result={result} period={period} diff={scenario.scenarioDiff} />

        <BaselineActions
          hasBaseline={!!scenario.baseline}
          onSave={scenario.saveBaseline}
          onClear={scenario.clearBaseline}
        />

        <DetailSections result={result} period={period} />

        {scenario.baseline && (
          <ScenarioComparison
            baseline={scenario.baseline}
            scenarioResult={scenario.scenarioResult}
            scenarioDiff={scenario.scenarioDiff}
            scenarioPreset={scenario.scenarioPreset}
            onSelectPreset={scenario.setScenarioPreset}
            onApplyOptimise={scenario.applyOptimise}
            onApplySalaryChange={scenario.applySalaryChange}
            onApplySacrifice={scenario.applySacrifice}
            optimisationTargets={scenario.optimisationTargets}
          />
        )}
      </CockpitShell>

      <Footer />
    </>
  );
}
```

> **Scope note — post-tax deduction editing:** the rewrite above keeps post-tax deductions in state and in the URL, and displays them in `DetailSections`, but drops the add/remove editor that `PostTaxDeductionsCard` provided. Rebuild that editor as a `control-group` inside `ControlPanel` before deleting `PostTaxDeductionsCard`. If it is not rebuilt in this task, **do not delete `PostTaxDeductionsCard.tsx`** — keep it mounted in the rail instead, and raise it as a follow-up.

- [ ] **Step 4: Drop the old stylesheet import**

In `src/main.tsx`, delete the `import './index.css';` line. The five `styles/*.css` imports remain.

- [ ] **Step 5: Delete the superseded files**

```bash
git rm src/index.css \
  src/components/SliderSpinner.tsx \
  src/components/PeriodToggle.tsx \
  src/components/SummaryHero.tsx \
  src/components/IncomeCard.tsx \
  src/components/MilitaryPensionCard.tsx \
  src/components/IncomeDeductionsCard.tsx \
  src/components/EffectiveRatesCard.tsx \
  src/components/TaxBreakdownCard.tsx \
  src/components/NiBreakdownCard.tsx \
  src/components/PensionSummaryCard.tsx \
  src/components/PostTaxDeductionsSummaryCard.tsx \
  src/components/MilitarySplitStats.tsx \
  src/components/BarRow.tsx \
  src/components/RegionCard.tsx
```

Delete `src/components/PostTaxDeductionsCard.tsx` **only** if its editor was rebuilt in Step 3.

- [ ] **Step 6: Verify the build is green again**

Run: `npm run build`
Expected: PASS. `ScenarioComparison.tsx` may reference removed CSS classes — that is a visual issue, not a build error, and is addressed in Step 8.

- [ ] **Step 7: Verify the full test suite**

Run: `npm run test`
Expected: PASS — all of `taxEngine`, `urlState`, `display`, `snapping` and `waterfall`.

- [ ] **Step 8: Manual verification**

Run: `npm run dev` and open `http://localhost:3000`. Confirm each of these, since none is covered by automated tests:

1. Dragging the pension slider updates the headline figure and the waterfall with no sideways digit jitter.
2. The pension slider snaps onto a band threshold when released near one.
3. Arrow keys move the focused slider by one step; `Shift`+arrow by ten.
4. Typing directly into a value field and pressing Enter (or blurring) commits it.
5. The Annual/Monthly switch changes every figure on the page at once, and survives a reload.
6. Narrow the window below 900px: the rail disappears and the sheet appears. Tapping the handle opens and closes it; the headline figure stays visible above it.
7. Detail sections expand and collapse; wide band tables scroll inside their own container without the page scrolling sideways.
8. Toggle the theme. Check light mode specifically — every figure must stay legible with the glow disabled, and no text should sit on a same-colour background.
9. Save a baseline, change the pension, and confirm the delta chip appears next to the headline figure with the right sign.
10. Reload a URL copied before the redesign and confirm the inputs decode unchanged.

Fix anything that fails before committing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: replace card stack with cockpit UI

Fixed control rail beside a live readout on desktop, drag-up control sheet
on mobile, Instrument visual language throughout. Deletes index.css and the
superseded result cards. taxEngine and urlState are unchanged."
```

- [ ] **Step 10: Update project documentation**

`CLAUDE.md` describes an architecture that this branch replaces. Update the **Architecture** section: `App.tsx` is no longer "one ~1550-line root component" (it already was not), sub-components no longer live in the same file, and the styling section must describe `src/styles/` rather than `index.css`. Note the self-hosted font and that the CSP needed no change.

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for the cockpit architecture"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Instrument tokens, dark base / light override | 1 |
| Self-hosted JetBrains Mono, no CSP change | 1 |
| `index.css` split into `src/styles/` | 1, 5, 6, 7, 9 (created), 10 (old file deleted) |
| `CockpitShell` | 9 |
| `ControlRail` / `ControlSheet` | 9 (containers), 10 (`ControlPanel` contents) |
| `Readout` with waterfall + delta chip | 6 |
| `DetailSections` replacing nine cards | 7 |
| `ValueControl` replacing `SliderSpinner` | 5 |
| One primary control per value, `−`/`+` removed | 5 |
| Page-level period, `isMonthly` removed from `useNumericInput` | 8 |
| Period in `localStorage`, not the URL | 8 |
| Slider snapping, arrow nudge, `Shift` coarse | 3, 5 |
| Snap to `getOptimisationTargets()` thresholds | 10 (`pensionSnapPoints`) |
| Scenario entry point moves to rail toggle | 10 |
| Tests for snapping, waterfall, period scaling | 2, 3, 4 |
| No DOM testing library added | Global constraints |
| URL payload frozen | Global constraints; verified 10 §8.10 |

**Known gaps, flagged rather than hidden:**

- The spec says the scenario entry point becomes a *toggle in the control rail*. Task 10 keeps `BaselineActions` on the canvas instead, which is the smaller change; moving it into `ControlPanel` is a one-line relocation the implementer should make if the rail has room.
- `PostTaxDeductionsCard`'s add/remove editor has no dedicated task. Task 10 Step 3 calls this out explicitly with a fallback instruction rather than leaving it to be discovered mid-implementation.
- The spec predicted the build would break "partway through". The plan confines that to exactly one commit (Task 8), and Tasks 9's verification step asserts no *new* errors appear.

**Type consistency:** `NumericInput` is defined in Task 8 as `{ raw, annualValue, setRaw, setAnnualValue }` and consumed in Task 10 as `pensionContribution.annualValue` / `pensionContribution.setAnnualValue` — consistent. `DisplayPeriod` is defined in Task 2 and used identically in 6, 7, 8, 10. `WaterfallSegment.percentOfGross` is produced in Task 4 and consumed in Task 6. `SnapOptions` is produced in Task 3 and consumed in Task 5.

**Field names verified against source**, not assumed:

- `NIBreakdownBand` is `{ name, earningsInBand, rate, contribution }` — an early draft of this plan used `band.ni`, which does not exist. Task 7 uses `contribution`.
- `TaxBreakdownBand` is `{ name, taxableInBand, rate, tax }` — matches Task 7's `BandTable`.
- `UrlStatePayload` has `annualSalary`, `salarySacrifice`, `pensionContribution`, `employerPension`, `militaryPension` as **strings**, `hasMilitaryPension` as boolean, `taxRegion`, both tax codes, and `postTaxDeductions: { name: string; amount: string }[]`. Task 10's `urlPayload` produces exactly that shape, with `String(...)` around the numeric fields since `App` now holds them as numbers.
- The net-income identity asserted in Task 4 was derived from `calculate()` at `src/taxEngine.ts:537-540`, not assumed.
