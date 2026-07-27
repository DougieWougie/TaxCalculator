# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build
npm run test       # vitest run (one-shot, not watch)
npx vitest run -t 'partial test name'   # run a single test by name
docker-compose up --build                # full container build on :8080
```

TypeScript is `strict` with `noUnusedLocals` / `noUnusedParameters` — `npm run build` will fail on unused identifiers, not just type errors.

## Architecture

Single-page React 19 app ("Instrument" cockpit UI). The calculation engine and the UI are cleanly split:

- `src/taxEngine.ts` — pure-function calculation engine. No React, no DOM, fully unit-tested in `taxEngine.test.ts`. All tax logic lives here and should stay here.
- `src/App.tsx` — owns all input state (including post-tax deductions, which keep a working add/remove editor), derives the result via `useMemo(() => calculate(input))`, and assembles the tree. It renders no markup of its own beyond wiring: `Header`/`Footer`/`DisclaimerBanner`/`ThemeToggle` around a `CockpitShell`, whose `controls` prop is `ControlPanel` and whose children are `Readout`, `BaselineActions`, `DetailSections`, and (when a baseline is saved) `ScenarioComparison`.
- Each UI concern is its own component under `src/components/`: `ControlPanel` (all inputs, in `control-group` sections), `ValueControl` (slider + text field with snapping, replacing the old per-field slider/spinner), `PeriodSwitch` (the page-level Annual/Monthly toggle), `Readout` (headline figure + waterfall bar), `DetailSections` (collapsible band-breakdown tables), `CockpitShell` / `ControlSheet` (the responsive frame).
- `CockpitShell` renders `ControlPanel` exactly once, inside a single `ControlSheet`. One CSS breakpoint at 900px decides its presentation — a sticky rail beside the canvas at/above 900px, a fixed draggable bottom sheet below it — there is no separate rail component and no duplicated controls subtree.
- The Annual/Monthly display setting lives at the page level (`usePeriod`, backed by `useLocalStorage`) rather than per field; `useNumericInput` now only tracks one annual value plus its text draft (`{ raw, annualValue, setRaw, setAnnualValue }`). Display-only period conversion happens at render time via `formatForPeriod` (`src/display.ts`). The period setting is never part of the URL payload — `UrlStatePayload` (`src/urlState.ts`) keeps its original shape so old shared links still decode.
- Styling lives in `src/styles/*.css`, loaded as separate imports from `main.tsx` — `tokens.css` (the dark-base/light-override colour and spacing tokens), `base.css`, `controls.css`, `readout.css`, `details.css`, `cockpit.css`, `sheet.css`, `chrome.css` (header/footer/disclaimer/theme toggle/copy-link), and `widgets.css` (card/input primitives, tax-code input, baseline actions, scenario comparison). There is no `index.css` and no hardcoded colour literals — everything references a token from `tokens.css`. `JetBrains Mono Variable` is self-hosted via `@fontsource-variable/jetbrains-mono`, so the CSP in `nginx.conf` needed no change for fonts.

### Per-source calculation in `taxEngine.ts`

`calculate()` runs one combined default calculation (single personal allowance tapered against `totalTaxableIncome`, sources stacked in order — employment fills the lower bands, military pension on top) and splits the band breakdown across sources. A source with a valid tax code overrides its slice via `calculateTaxWithCode`, using the PA / flat rate / K-adjustment implied by its code. A codeless source alongside a coded one keeps its slice of the combined calculation — so a military pension with no code is taxed at marginal rates above employment income, never given a second personal allowance.

NI is always computed only on employment income (not military pension) and is unaffected by tax codes.

### Tax-code parsing

`parseTaxCode()` handles: `S`/`C` region prefixes, flat-rate codes (`BR`/`D0`/`D1`/`D2`/`D3`), `NT`, `0T`, `K` codes (adds `digits × 10` to taxable income), and standard cumulative codes (`digits + [LMNT]` → PA of `digits × 10`). Scottish flat rates differ from English (`D0` = 21% Scottish vs 40% English, etc.) — `getFlatRate` branches on the effective region, which is forced Scottish when the code has an `S` prefix regardless of the selected region.

### Bands / constants (2025-26)

`SCOTTISH_TAX_BANDS`, `ENGLISH_TAX_BANDS`, `NI_BANDS`, `BASE_PERSONAL_ALLOWANCE` (£12,570), and `PA_TAPER_THRESHOLD` (£100,000) are exported. Personal allowance tapers £1 for every £2 over £100k (see `calculatePersonalAllowance`). Band widths are fixed in *taxable* income: `buildTaxBands` shifts every boundary below £125,140 down by the lost PA (so a tapered PA also lowers the higher-rate threshold); the £125,140 boundary is fixed in law and never moves. Marginal rate in the taper zone is `rate × 1.5` — this is intentional (see comment in `getMarginalTaxRate`).

### Scenario comparison

`App.tsx` can snapshot the current input+result as a `baseline`, then apply preset "what if" modifications (pension bump, salary change, salary sacrifice) to produce a `scenarioInput`. `diffResults(a, b)` returns `b - a` per field. `getOptimisationTargets()` picks the two nearest meaningful band thresholds above current taxable employment income (skips PA/Starter/Basic as "not meaningful") plus the PA taper threshold; `calculateOptimalPension()` computes the salary-sacrifice amount needed to hit a given threshold. Note that salary sacrifice cannot offset military pension, so optimisation uses employment income only.

## Deployment

`.github/workflows/deploy.yaml` runs the vitest suite on every PR and push to `main`. On `main` only, a passing test job gates the Docker build, which pushes to GHCR as `ghcr.io/<repo>:latest` + `:sha-<full commit>`, then SSHes into the deploy host and runs `docker compose pull && up -d` in `/opt/docker/tax` pinned to that commit's sha tag via the `IMAGE_TAG` env var (the host's compose file reads `${IMAGE_TAG:-latest}`). The deploy script waits up to 60s for the container HEALTHCHECK to pass, rolls back to the previous image and fails the run if it doesn't, and prunes unused images older than 7 days. A `concurrency` group queues deploys in commit order. The production image runs nginx 1.27-alpine as non-root with a read-only root filesystem, dropped capabilities, `no-new-privileges`, and a strict CSP defined in `nginx.conf` — new external origins (fonts, analytics, APIs) need a CSP update or they will be blocked.

## Docs

- `docs/plans/` and `docs/superpowers/plans/` — implementation plans for past features
- `docs/superpowers/specs/` — design specs

Worth grepping before non-trivial feature work to see if there's already a plan.
