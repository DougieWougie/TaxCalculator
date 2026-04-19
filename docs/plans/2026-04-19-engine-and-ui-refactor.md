# Engine and UI Refactor — Master Plan

**Date:** 2026-04-19
**Shape:** 6 phases, one PR per phase, merged to `main` in order.
**Scope:** Address accumulated issues across calculation logic, component architecture, and visual design without changing the feature set visible to end users (except where explicitly noted under "Visible changes" in each phase).

Each phase below describes the intent, files touched, key decisions, and visible changes. A detailed task-by-task implementation plan will be written per-phase at the point that phase is picked up (following the `docs/plans/YYYY-MM-DD-<slug>.md` convention).

---

## Mental model update

User clarification (2026-04-19): **military pension is identical to employment income except it is not liable for NI**. No other behavioural difference — same bands, same PA taper contribution, same tax-code semantics. This simplifies the engine considerably and removes several special cases currently scattered across `calculate()`.

The cleanest internal model is a list of income sources, each with a `niLiable: boolean` flag and an optional tax code. Salary sacrifice and pension contribution reduce the first (NI-liable) source only — you cannot salary-sacrifice a pension income stream.

```ts
interface IncomeSource {
  amount: number;
  taxCode?: string;
  niLiable: boolean;
}
```

The public `CalculationInput` shape keeps its current fields (employment + optional military) for UI/test compatibility; the internal calc path builds a `sources[]` array from them.

---

## Phase 1 — Engine refactor (PR 1)

**Intent:** Collapse the dual calc paths, remove PA magic strings, fix `effectiveTaxRate` and the military-pension breakdown, strip `monthly*` fields from the result type, add K-code comment.

**Files:** `src/taxEngine.ts`, `src/taxEngine.test.ts`, `src/App.tsx` (mechanical consumer updates only).

**Key changes:**

1. **Income-source model.** Introduce internal `IncomeSource` and `buildSources(input)` that produces `[employment, ...(military if > 0)]`. All downstream functions take sources instead of separate employment/military params.

2. **Unified calc path.** Remove the `if (usingTaxCodes)` branch in `calculate()`. For each source:
   - If it has a valid tax code → use it.
   - Otherwise → synthesize a default cumulative code with `PA = calculatePersonalAllowance(combinedTaxableIncome)`.

   Single path, identical outputs.

3. **PA separated from band array.** Replace `adjustBandsForPersonalAllowance(bands, pa)` with `buildTaxBands(region, pa)` returning bands that already account for PA, without a magic `'Personal Allowance'` name match. Band array no longer contains the PA pseudo-band.

4. **Military pension breakdown fix.** In default mode, military tax currently appears as a single "Marginal Rate" row. Replace with band-level allocation: employment income fills bands first (bottom-up), military fills the remainder — produces a real per-band `TaxBreakdownBand[]` for each source. Total tax is unchanged; breakdown is now accurate.

5. **`effectiveTaxRate` denominator fix.** Change from `(tax + NI) / (annualSalary + militaryPension)` to `(tax + NI) / totalTaxableIncome`. Add a one-line comment documenting what the rate represents.

6. **Remove `monthly*` fields from `CalculationResult`.** Add `toPeriod(result, period: 'annual' | 'monthly' | 'weekly')` helper. UI switches to `toPeriod(result, 'monthly').takeHome` etc. Opens the door to future period toggles (weekly, fortnightly) without engine changes.

7. **K-code cap comment.** One-line comment in `calculateTaxWithCode` noting HMRC's 50%-of-pay cap is not implemented (acceptable for an annualised calc but documented).

**Tests:** expand `taxEngine.test.ts` to cover:
- Military breakdown allocation across bands (new behaviour).
- `effectiveTaxRate` on a sample with salary sacrifice.
- Parity: for every existing test, old calc output matches new calc output to the penny.

**Visible changes:** military-pension breakdown in the UI now shows real band names instead of "Marginal Rate". `effectiveTaxRate` number changes slightly on inputs with salary sacrifice — add a note to the PR description.

**Risk:** highest of the 6 phases. Lock behind the existing + new tests before touching the UI in later phases.

---

## Phase 2 — State hooks (PR 2)

**Intent:** DRY the input state sprawl before component decomposition. No visible change.

**Files:** `src/hooks/useNumericInput.ts` (new), `src/hooks/useLocalStorage.ts` (new), `src/App.tsx`.

**Key changes:**

1. **`useNumericInput({ defaultAnnual })`** — owns the `(rawAnnual, isMonthly, rawMonthly)` triple currently duplicated across salary sacrifice, pension contribution, and each post-tax deduction. Exposes `{ annualValue, controls: { ... } }`. Single source of truth; the annual/monthly sync bugs that motivated this disappear.

2. **`useLocalStorage<T>(key, default)`** — replaces ad-hoc `localStorage.getItem` / `setItem` for theme, disclaimer-dismissed, and (future) input persistence.

3. **`useTheme()`** — already exists inline; move to `src/hooks/useTheme.ts` and reimplement on top of `useLocalStorage`.

**Tests:** hook unit tests with `@testing-library/react-hooks` or `act()` — minimal, since logic is small.

**Visible changes:** none.

**Risk:** low. Purely internal.

---

## Phase 3 — Component decomposition (PR 3)

**Intent:** Break `App.tsx` (~1550 lines) into focused components. Makes Phase 4–6 tractable.

**Files:** `src/components/*.tsx` (new), `src/App.tsx` (becomes orchestrator).

**Decomposition:**

```
src/
  App.tsx                       (orchestrator: holds result, baseline, region)
  components/
    Header.tsx
    DisclaimerBanner.tsx
    ThemeToggle.tsx
    RegionCard.tsx
    IncomeCard.tsx              (salary, salary sacrifice, pension)
    EmployerPensionCard.tsx
    MilitaryPensionCard.tsx
    PostTaxDeductionsCard.tsx
    TaxCodesCard.tsx
    ResultsColumn.tsx           (P&L table, bar chart, band breakdown)
    ScenarioColumn.tsx          (baseline + ScenarioComparison)
    BarRow.tsx                  (existing sub-component, moved)
    PeriodToggle.tsx            (existing sub-component, moved)
    SliderSpinner.tsx           (existing sub-component, moved)
    ScenarioComparison.tsx      (existing sub-component, moved)
```

**Target:** `App.tsx` under 300 lines; each card component under 200 lines.

**State ownership:** cards own their input hooks internally; `App` subscribes to their computed values via lifted state (either `useReducer` at the root or `createContext` for form state — decide at implementation time based on prop-drilling pain).

**Tests:** no new tests required — existing engine tests continue to protect behaviour.

**Visible changes:** none (pixel-identical output required).

**Risk:** medium. Lots of code movement; easy to introduce subtle regressions via missed prop wiring. Manually compare dev-server output to the previous main before merging.

---

## Phase 4 — Visible logic fixes (PR 4)

**Intent:** Small, user-facing logic and accessibility corrections.

**Files:** `src/components/TaxCodesCard.tsx`, `src/components/DisclaimerBanner.tsx`, `src/index.css`.

**Key changes:**

1. **Tax-code validation hint.** When the employment or military tax-code field is non-empty and `parseTaxCode(code).isValid === false`, render an inline `<span className="input-hint error">` under the field ("Unrecognised tax code — using default"). The engine already falls back silently today; this makes it visible.

2. **Disclaimer role.** `role="alert"` → `role="status"`. Also add `aria-live="polite"` so it announces once, not repeatedly.

3. **Dark-mode `--text-muted` contrast.** `#5f6368` on `#1e2130` is ~3.8:1, below WCAG AA (4.5:1) for small text. Bump to `#8a91a0` (or re-measure with `https://webaim.org/resources/contrastchecker/` at implementation time).

**Tests:** snapshot of tax-code hint rendering via a lightweight `@testing-library/react` test.

**Visible changes:** yes (tax-code hint, contrast). Nothing surprising.

**Risk:** low.

---

## Phase 5 — Appearance (PR 5)

**Intent:** Replace emoji/entity detritus with proper SVGs, honour reduced motion, use the existing region-gradient tokens more ambitiously.

**Files:** `src/components/*.tsx`, `src/index.css`. New dependency: `lucide-react`.

**Key changes:**

1. **Lucide icons.** Replace emoji icons (`card-title-icon`, disclaimer warning, theme toggle sun/moon, close X) with Lucide SVGs. Drop the regional-indicator Scottish flag sequence — it renders inconsistently across OSes. Use a text label or a simple SVG flag.

2. **UTF-8 for entities.** Replace `&pound;`, `&ndash;`, `&#9728;`, `&#9790;`, `&#9432;`, `&#8211;`, etc. with the literal characters. File is already UTF-8. Grep check: `rg '&[a-z#0-9]+;' src/`.

3. **`prefers-reduced-motion`.** Add a media query block wrapping `.bg-pattern::before` (animated gradient) and card entry animations:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0s !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0s !important;
     }
   }
   ```

4. **Region-themed result accents.** Use `--scottish-gradient` / `--english-gradient` on result card borders or the net-row underline in the P&L table based on selected region. Creates a stronger sense of place without being heavy-handed.

**Tests:** visual verification in dev server, both light and dark themes, both regions, with and without reduced-motion. Call out the manual test plan in the PR description.

**Visible changes:** yes (icons, small region colour accents). Noted in PR.

**Risk:** low.

---

## Phase 6 — Shareable URLs (PR 6)

**Intent:** Encode the full `CalculationInput` in the URL so users can bookmark / share calculations.

**Files:** `src/urlState.ts` (new), `src/App.tsx`.

**Key changes:**

1. **Encoder / decoder.** `encodeInput(input: CalculationInput): URLSearchParams` with short keys (`s` salary, `p` pension, `ss` salary sacrifice, `ep` employer pension, `mp` military pension, `r` region, `ec` emp tax code, `mc` mil tax code, `d` deductions as `name:amount;name:amount`). `decodeInput(params): Partial<CalculationInput>` with defensive parsing.

2. **Round-trip on mount.** On first render, read `window.location.search`; if non-empty, decode and seed state. Debounced push to `history.replaceState` on input changes (200ms) so the URL stays in sync without spamming history.

3. **Copy link button.** Add to the header or results card: "Copy shareable link" → copies `window.location.href` to clipboard, toasts "Link copied". Uses the existing Clipboard API.

4. **Default-value pruning.** Don't encode fields that equal their default — keeps shared URLs short.

**Tests:** unit tests for encode/decode round-trip across representative inputs (edge cases: empty deductions, special characters in deduction names, monetary precision).

**Visible changes:** yes (copy button + URL updates). Add to README.

**Risk:** medium. URL parsing is input from an untrusted source; decoder must be defensive (invalid values → defaults, not crashes). The `sanitizeNumber` guardrail in `App.tsx` already exists; reuse it.

---

## Cross-cutting concerns

- **Commit style.** Follow existing convention (`feat:`, `fix:`, `refactor:`, `style:`) seen in `git log`.
- **CI.** `.github/workflows/deploy.yaml` deploys from `main` on push. No staging env exists — each PR must be verified locally before merge (`npm run test && npm run build && docker-compose up --build`).
- **Rollback.** Each phase is a single squash-merge. Rollback = `git revert <merge-commit>` + redeploy.
- **Docs.** Update `CLAUDE.md` and `README.md` where the described architecture diverges (Phase 1: calc path; Phase 3: component layout; Phase 6: URL state).

## Open questions for implementation time

1. **Phase 3 state-lifting mechanism.** `useReducer` at root vs `createContext`. Decide based on prop-drilling pain after initial decomposition sketch.
2. **Phase 5 icon set size.** `lucide-react` tree-shakes well but adds ~10–30 KB gzipped depending on usage. Acceptable? If not, hand-roll SVGs for the ~6 icons actually used.
3. **Phase 6 compression.** If encoded URL exceeds ~500 chars (many deductions), consider base64(JSON) instead of query params. Measure at implementation time.

## Per-phase plan docs

This master plan stays at a high level. When a phase is picked up, write a task-by-task implementation plan at `docs/plans/YYYY-MM-DD-phase-N-<slug>.md` following the format of `2026-03-12-breakdown-table.md` (explicit file paths, code snippets, build steps, commit messages per task).
