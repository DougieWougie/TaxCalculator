# UK Pension & Salary Calculator

A web application that calculates take-home pay for UK workers, accounting for income tax, National Insurance, pension contributions, and various deductions for the 2025-26 tax year.

## Features

- **Tax region support** — Scottish (6 bands, 19%–48%) and England/Wales/Northern Ireland (3 bands, 20%–45%)
- **UK tax code parsing** — standard codes (e.g. 1257L), BR, D0, D1, NT, K codes, and cumulative/non-cumulative indicators
- **Pension contributions** — employee and employer pension percentages, salary sacrifice
- **Pre-tax deductions** — cycle-to-work, childcare vouchers, and other salary sacrifice schemes
- **Post-tax deductions** — SAYE, Give As You Earn, union dues, subscriptions
- **Military pension** — separate tax code handling for Armed Forces Pension Scheme income
- **Personal allowance taper** — automatic reduction for income between £100k and £125,140
- **National Insurance** — Class 1 employee contributions with band-based rates
- **Detailed breakdown** — monthly and annual figures, effective and marginal tax rates, bar chart visualisation
- **Dark/light theme** — toggle with preference saved in localStorage
- **Mobile-responsive** design

## Tech Stack

- **React 19** with **TypeScript 5.7** (strict mode)
- **Vite 6** for development and production builds
- **Nginx 1.27** (Alpine) for production serving
- **Docker** with multi-stage builds and security hardening

## Prerequisites

- **Node.js 22+** for development
- **Docker & Docker Compose** for containerised deployment (optional)

## Development

```bash
# Install dependencies
npm install

# Start dev server on http://localhost:3000
npm run dev
```

## Production Build

```bash
# Build static assets to dist/
npm run build

# Preview the production build locally
npm run preview
```

## Docker

```bash
# Build and run with Docker Compose on http://localhost:8080
docker-compose up --build
```

The Docker setup uses a multi-stage build (Node for compilation, Nginx for serving) with a hardened runtime: read-only filesystem, dropped capabilities, no-new-privileges, and health checks.

## Project Structure

```
src/
  App.tsx          Main React component — inputs, state, results display
  taxEngine.ts     Tax calculation engine — bands, NI, tax code parsing
  main.tsx         App entry point
  index.css        Styles with CSS custom properties for theming
Dockerfile         Multi-stage Docker build
docker-compose.yml Container orchestration with security constraints
nginx.conf         Nginx config — security headers, gzip, SPA routing
vite.config.ts     Vite build configuration
tsconfig.json      TypeScript configuration
```
