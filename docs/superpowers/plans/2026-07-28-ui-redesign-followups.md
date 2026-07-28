# UI Redesign — Deferred Follow-Ups

Findings from the final whole-branch review of `feat/ui-redesign` (see
`docs/superpowers/specs/2026-07-27-ui-redesign-design.md` and
`docs/superpowers/plans/2026-07-27-ui-redesign.md`) that were **deliberately
deferred** rather than fixed on that branch. Nine higher-severity findings were
fixed before merge; these are what remains.

Ordered by the reviewer's assessment of importance.

## Needs a real device before it can be called done

### F1 — Nothing keeps the headline figure visible on mobile with the sheet open

`src/styles/sheet.css`, `src/styles/readout.css`

The control sheet is `position: fixed; bottom: 0; max-height: 80vh`. The readout
sits in normal document flow below a ~180px header, with no sticky positioning.
On a 700px viewport an open sheet can occupy 560px, leaving ~140px for a readout
that starts ~200px down the page. Nothing in the code guarantees the figure stays
on screen while a control is being dragged.

This is **success criterion 1** of the design spec — the thing the whole redesign
exists to serve — and the reviewer judged it "not met as built".

Likely fix: reduce the sheet cap to ~55vh, and/or `position: sticky; top: 0` on
`.readout` below the 900px breakpoint. Desktop is fine; the sticky rail is
correctly constructed and no ancestor clips overflow.

**Verify on an actual phone, not a resized desktop window** — viewport units and
browser chrome behave differently.

## Correctness / honesty of displayed numbers

### F2 — The pension slider's snap points are income thresholds, not contribution amounts

`src/App.tsx` (`pensionSnapPoints`) → `src/components/ControlPanel.tsx`

`getOptimisationTargets()` returns raw band thresholds. Those are correct and
useful for the **salary** slider, but they are passed to the **pension** slider
too, where they mean nothing. The meaningful attractor for a contribution is the
sacrifice *needed to reach* a threshold — `calculateOptimalPension()`'s
`annualSalary − salarySacrifice − threshold`.

Concretely: salary £120,000 → targets include the £100,000 PA taper → dragging
the pension amount near £100,000 snaps the *contribution* to £100,000, a
meaningless number, while the genuinely useful £69,730 is not an attractor. The
hint text "Snaps to the nearest band threshold" is therefore inaccurate.

Also unimplemented from the spec: snapping to whole percents.

### F3 — The page-level period governs only two of the four money-displaying regions

`src/components/ControlPanel.tsx`, `src/components/ScenarioComparison.tsx`

The readout and the detail tables respect the Annual/Monthly switch. The
`ValueControl` inputs are annual-only and carry no period marker, and
`ScenarioComparison` formats everything annually with `formatCurrency`.

With the default `monthly` setting, the readout says "Take-home · monthly" and
the tables are monthly, while beside them "Your pension £6,000" is annual and
unmarked. A user can reasonably misread it as monthly.

Note `toAnnual()` in `src/display.ts` is exported and unit-tested but **called
from nowhere** — the input side of the period rework was never wired up.

Cheapest honest fix: `suffix="/yr"` on the money `ValueControl`s (the
`value-control-affix` slot already exists) plus a "per year" note on the
comparison table. Actually scaling the inputs is a larger change and would break
the band-threshold snap points.

### F4 — The employment vs military net split is gone

`MilitarySplitStats` was deleted with no replacement. `result.militaryPensionTax`
now appears only as a band-table total. For a calculator whose distinguishing
feature is military-pension handling, "Net Salary / Net Military Pension per
month" is a headline stat.

Task 10's "all 12 capabilities present" check missed this one.

Fix: two rows in a `DetailSections` block, shown when `militaryPension > 0`.

### F5 — Negative net income renders as a positive green bar segment

`src/waterfall.ts`, `src/components/Readout.tsx`

Gross £20,000 with £30,000 of post-tax deductions: the net segment gets
`|amount| / Σ|amount|` width in green `--net` while the legend beneath reads
`-£10,000.00`, and the bar's `aria-label` still says "Breakdown of £20,000.00
gross income" even though the widths now sum over gross + 2|net|.

The magnitude-based percentage was the right call (it keeps widths renderable);
what is missing is a visual and label distinction. Suggest dropping the net
segment from the bar when negative and labelling the legend row "Shortfall".
Related: `readout.css` applies the green `--glow` to `.readout-figure`
unconditionally, including a negative take-home.

## Accessibility and theming

### F6 — No `color-scheme` declaration

`src/styles/tokens.css`

Dark is the default theme but the UA is never told, so native chrome renders
light on near-black: rail and table scrollbars, the entirely unstyled
military-pension checkbox, caret and selection colours, Chrome autofill.

Two lines: `:root { color-scheme: dark }` and
`[data-theme='light'] { color-scheme: light }`.

### F7 — Dark flash for light-theme users

`src/hooks/useTheme.ts` sets `data-theme` in an effect, so the first paint has no
attribute and falls through the dark `:root` base. This is inverted from before
the redesign, where light was the base. It also means the theme-toggle knob
renders on the wrong side for one frame.

Fix: set the attribute at module scope in `src/main.tsx`, or inline in
`index.html` before the bundle loads.

### F8 — Decorative chevron may leak into the accessible name

`src/styles/details.css` — the `▸` disclosure indicator is injected via
`summary::before { content: '▸' }`. Chrome and Firefox include `::before`
content in the accessible-name computation, so a summary may announce as
"▸ Income tax £1,234". The disclosure state itself is fine (native `<details>`).

Fix is not a one-liner: `content: '▸' / ''` (alt-text syntax) or switch to a mask
or background image.

### F9 — `aria-label` on a div with no role

`src/components/ControlSheet.tsx` — after removing the invalid `role="dialog"`,
the container keeps `aria-label="Controls"`. On a generic `div` with no role,
`aria-label` is ignored by assistive technology, so it is now inert. Either give
the element a legitimate role (`role="group"` or `<aside>`/`<section>`) or drop
the label.

## Small / cosmetic

- **F10** — `src/styles/sheet.css` has a hardcoded `rgba(0, 0, 0, 0.45)`
  box-shadow. Every other stylesheet consumes a token; literals belong in
  `tokens.css`. Should become `--shadow-sheet`. It is also heavier than a light
  surface wants.
- **F11** — `src/display.ts` `formatForPeriod` casts `period as PayPeriod`. The
  cast is unnecessary: `DisplayPeriod` is already assignable to the wider
  `PayPeriod` union. Zero-risk deletion.
- **F12** — `src/components/Readout.tsx` prints the raw enum in
  `Take-home · {period}` ("monthly"), where `periodSuffix()` exists and the rest
  of the app says "per month".
- **F13** — `src/components/ValueControl.tsx`: an arrow-key nudge reads from
  `value`, not the uncommitted draft, so typing `999` then pressing ArrowUp
  jumps from the last committed value and silently discards the `999`.
- **F14** — `src/components/ControlPanel.tsx`: when salary is 0 the dependent
  sliders get `max={Math.max(annualSalary, 1)}` on `step={100}` — a 0–1 range on
  a 100 grid, where every drag resolves to 0.
- **F15** — `src/components/ScenarioComparison.tsx` has a dead
  `animationDelay: '0.45s'`; the keyframes it referenced went with `index.css`,
  and no `@keyframes` remain in `src/styles/`.
- **F16** — `src/components/ControlSheet.tsx` uses a `control-sheet-peek` class
  with no CSS rule. It inherits what it needs from `.control-sheet-handle`;
  either delete the class or give it an explicit rule.
- **F17** — `src/snapping.ts` `toStep` derives its decimal count from
  `String(step)`, which is wrong for exponential notation (`String(1e-7)` is
  `"1e-7"`, so decimals resolves to 0). Unreachable today — every call site
  passes 100 — but the module is general-purpose.
- **F18** — `src/snapping.ts`: the exact-boundary case `distance === tolerance`
  is untested. The implementation treats it inclusively, which is correct; it is
  simply not pinned by a test.
- **F19** — `DetailSections` shows no combined income-tax total row when both
  employment and military band tables render. The combined figure is on screen in
  the collapsed summary and the sub-totals reconcile to it, so this is a
  convenience item only.

## Pre-existing, not introduced by the redesign

Noted so they are not misattributed to this branch:

- The fixed theme toggle overlaps the disclaimer's dismiss ✕ at typical widths.
  The same geometry existed in the old `index.css`.
- `CopyLinkButton` reads `window.location.href` while the URL sync is debounced
  200ms, so copying within 200ms of an edit yields a stale link.

## Capability changes worth an explicit decision

Both are defensible under "one primary control per value", but they are
user-visible removals that the Task 10 capability check counted as "present":

- **Pension as a percentage of salary** is gone. The old UI paired a 0–40%
  slider with a £ field; the new one is £ only.
- **Per-row Annual/Monthly toggles on post-tax deductions** are gone, replaced by
  the page-level period switch. Deduction amounts are now annual-only text
  inputs.
