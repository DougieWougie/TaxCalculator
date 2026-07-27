# UI Redesign — Cockpit Layout, Instrument Visual Language

**Date:** 2026-07-27
**Status:** Approved for planning

## Problem

Four distinct complaints about the current interface, all confirmed by the user:

1. **Looks templated.** Indigo-on-cards with glassmorphism tokens reads as a default SaaS scaffold.
2. **Card soup.** Nine stacked result cards mean the important number competes with detail.
3. **Clunky inputs.** Three controls per value (range slider, `−`/number/`+` spinner, per-field Annual/Monthly toggle).
4. **Poor on mobile.** The two-column grid and wide tables don't hold up on a phone.

The decisive constraint is *how the app is used*: the user tweaks pension %, salary sacrifice and tax codes repeatedly and watches the numbers move. Comparison and live feedback are the point, not a bonus feature. Nothing that matters should ever be below the fold while adjusting a control.

## Decisions

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Layout | **Cockpit** — fixed control rail, live readout canvas, detail expanded inline | Sticky vitals bar + tabs (tabs hide things); permanent Current/What-if split (halves width, poor on mobile) |
| Visual language | **Instrument** — dark-first, monospaced tabular figures, saturated data colour on near-black | Editorial ledger (safe, distinctive, but less suited to a live readout); Tactile (closest to today, so fixes "generic" least) |
| Mobile | **Drag-up control sheet** with tap-to-expand fallback | Plain stack with sticky readout (safer, but the slider's effect scrolls out of view) |
| Sequencing | **One branch, all at once** | Phased PRs; parallel prototype route |

The rejected Current/What-if split contributed one idea that is retained: a **delta readout** beside the headline figure, driven by the existing baseline/scenario machinery.

Monospaced tabular figures are a functional choice as well as an aesthetic one — they stop numbers jittering sideways as they update during a slider drag.

## Out of Scope

Unchanged by this work:

- `src/taxEngine.ts` and `src/taxEngine.test.ts` — no calculation changes. The existing suite stays green throughout and is the safety net for the refactor.
- `src/urlState.ts` and `src/urlState.test.ts` — the URL payload schema is unchanged, so existing shared links keep working.
- `src/sanitize.ts`.
- Deployment, Dockerfile, CI workflow.

## Styling Architecture

`src/index.css` (30KB, ~90 global classes) is replaced by `src/styles/`:

- **`tokens.css`** — Instrument palette as CSS custom properties. Dark is the base; light is the override, inverting the current arrangement. Tokens are named semantically (`--surface`, `--rule`, `--figure`, `--tax`, `--ni`, `--pension`, `--net`) rather than by appearance, so data colours are addressable by meaning.
- **`base.css`** — reset, typography, focus rings, and the existing `prefers-reduced-motion` block, which is carried over unchanged.
- **`cockpit.css`, `controls.css`, `readout.css`, `sheet.css`** — one file per region.

`index.css` is reduced to four `@import` statements. No new tooling: no CSS-in-JS, no Tailwind, no CSS modules. Global class names remain the convention, consistent with the existing codebase.

### Typography

Instrument requires a monospace family with true tabular figures. **JetBrains Mono** is the choice: it has a large x-height and unambiguous digit shapes at the display sizes the headline figure uses, and it ships an OFL-licensed woff2 suitable for self-hosting.

**Decision: self-host the woff2** in the repo. The CSP's existing `font-src 'self'` already permits this with no nginx change; it removes two render-blocking preconnects and eliminates a third-party request from a page displaying someone's salary. Cost is roughly 30KB of repo assets. The `<link>` tags and `preconnect` hints for Google Fonts are removed from `index.html`.

## Components

`App.tsx` retains ownership of input state and the `useMemo(() => calculate(input))` derivation — that structure is sound and does not change. What changes is the shell it renders into.

### New

- **`CockpitShell`** — the responsive frame. CSS grid with a fixed control rail above ~900px; below that the rail collapses and the sheet mounts. A single breakpoint, handled in CSS; no JavaScript viewport measuring.
- **`ControlRail`** / **`ControlSheet`** — two containers hosting the same control components. The sheet supports drag *and* tap-to-expand, is `role="dialog"` with focus trapping, and defaults to expanded if pointer events are unavailable.
- **`Readout`** — headline figure, gross→net waterfall, delta chip.
- **`DetailSections`** — bands, NI, pension summary and post-tax deductions as inline expanders on one surface rather than nine sibling cards. This resolves complaint 2: the same information, disclosed on demand.
- **`ValueControl`** — replaces `SliderSpinner`.

### Retained, relocated

`useScenario` and `ScenarioComparison` survive largely intact, but the entry point moves from a card at the bottom of the page to a **what-if toggle in the control rail**. With a baseline snapshotted, the delta chip beside the headline figure goes live.

### Removed

`SliderSpinner`, `PeriodToggle` (per-field), and the card wrappers superseded by `DetailSections`.

## Input Rework

Addressing complaint 3, per the three specific pain points identified:

**One primary control per value.** The slider is the control. The adjacent number is directly editable *and* draggable. The `−`/`+` spinner buttons are removed.

**A single page-level period setting** replaces the per-field Annual/Monthly toggles. The `isMonthly` state currently held inside each `useNumericInput` instance is removed; the hook keeps the annual value as its single source of truth and display scaling becomes a render concern. This is the fiddliest part of the refactor, since `useNumericInput` currently owns annual↔monthly conversion per field and that logic moves upward.

Period preference is display state and is persisted to `localStorage`, **not** the URL. The URL payload is unchanged.

**Precise sliders.** Arrow-key nudges, `Shift`+arrow for coarse steps, and snapping to meaningful values: whole percents, plus the band thresholds that `getOptimisationTargets()` already computes.

## Testing

Extractable pure logic gets unit tests under the existing vitest setup, requiring no new dependencies:

- slider snapping (including snap-to-threshold behaviour),
- waterfall segment geometry,
- period scaling.

The project has no DOM testing library, and this design does not add one — introducing a component-testing stack is a separate decision from a redesign. The sheet's drag behaviour, focus trapping and the responsive collapse are verified by hand via `npm run dev`. Stated plainly: the interactive behaviour of this redesign will not be covered by automated tests.

## Risks

**The drag gesture is the highest-effort, most fragile piece.** Mitigated by making tap-to-expand the primary interaction path, with drag as a progressive enhancement — if drag is dropped or broken, the sheet still works.

**The branch will not build partway through.** `noUnusedLocals` and `noUnusedParameters` mean `npm run build` fails loudly as components are gutted and rewired. Expected during the refactor; the gate is that it passes before review.

**Light mode is a genuine second implementation, not a token flip.** Instrument's glow treatment on the live figure has no direct light-mode equivalent and needs a distinct solution.

## Success Criteria

- While adjusting any control, the headline figure and the waterfall remain visible without scrolling — on desktop and on a phone.
- The nine result cards are consolidated onto one surface with progressive disclosure.
- Each input value has one primary control.
- `npm run test` passes; `npm run build` passes.
- Existing shared URLs decode to the same inputs as before.
