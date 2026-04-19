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

Single-page React 19 app. Two files hold almost everything:

- `src/taxEngine.ts` — pure-function calculation engine. No React, no DOM, fully unit-tested in `taxEngine.test.ts`. All tax logic lives here and should stay here.
- `src/App.tsx` — one ~1550-line root component that owns all input state, derives the result via `useMemo(() => calculate(input))`, and renders the UI. Sub-components (`BarRow`, `PeriodToggle`, `SliderSpinner`, `ScenarioComparison`) live in the same file.

### The two calculation modes in `taxEngine.ts`

`calculate()` branches on whether the user supplied a valid UK tax code:

1. **Default mode** (no tax codes) — employment income and military pension are summed into `totalTaxableIncome`, personal allowance is tapered once against the combined total, and tax is computed in one pass against the region's bands.
2. **Tax-code mode** — each income source is calculated independently via `calculateTaxWithCode`, using the PA / flat rate / K-adjustment implied by its code. Military pension is only tax-code-driven when `militaryPension > 0` and a valid code is supplied; otherwise it falls back to marginal-rate-above-employment.

NI is always computed only on employment income (not military pension) and is unaffected by tax codes.

### Tax-code parsing

`parseTaxCode()` handles: `S`/`C` region prefixes, flat-rate codes (`BR`/`D0`/`D1`/`D2`/`D3`), `NT`, `0T`, `K` codes (adds `digits × 10` to taxable income), and standard cumulative codes (`digits + [LMNT]` → PA of `digits × 10`). Scottish flat rates differ from English (`D0` = 21% Scottish vs 40% English, etc.) — `getFlatRate` branches on the effective region, which is forced Scottish when the code has an `S` prefix regardless of the selected region.

### Bands / constants (2025-26)

`SCOTTISH_TAX_BANDS`, `ENGLISH_TAX_BANDS`, `NI_BANDS`, `BASE_PERSONAL_ALLOWANCE` (£12,570), and `PA_TAPER_THRESHOLD` (£100,000) are exported. Personal allowance tapers £1 for every £2 over £100k (see `calculatePersonalAllowance`). Marginal rate in the taper zone is `rate × 1.5` — this is intentional (see comment in `getMarginalTaxRate`).

### Scenario comparison

`App.tsx` can snapshot the current input+result as a `baseline`, then apply preset "what if" modifications (pension bump, salary change, salary sacrifice) to produce a `scenarioInput`. `diffResults(a, b)` returns `b - a` per field. `getOptimisationTargets()` picks the two nearest meaningful band thresholds above current taxable employment income (skips PA/Starter/Basic as "not meaningful") plus the PA taper threshold; `calculateOptimalPension()` computes the salary-sacrifice amount needed to hit a given threshold. Note that salary sacrifice cannot offset military pension, so optimisation uses employment income only.

## Deployment

`.github/workflows/deploy.yaml` fires on push to `main`: builds the Docker image, pushes to GHCR as `ghcr.io/<repo>:latest` + `:sha-…`, then SSHes into the deploy host and runs `docker compose pull && up -d` in `/opt/docker/myapp`. The production image runs nginx 1.27-alpine as non-root with a read-only root filesystem, dropped capabilities, `no-new-privileges`, and a strict CSP defined in `nginx.conf` — new external origins (fonts, analytics, APIs) need a CSP update or they will be blocked.

## Docs

- `docs/plans/` and `docs/superpowers/plans/` — implementation plans for past features
- `docs/superpowers/specs/` — design specs

Worth grepping before non-trivial feature work to see if there's already a plan.
