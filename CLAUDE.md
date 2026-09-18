# CLAUDE.md

Authoritative agent context for `geo-location-resolver`. This file is deliberately short — the full architecture, module-by-module code walkthrough, and the reasoning behind every non-obvious decision live in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**. Read that before making a structural change; don't re-derive from scratch what's already answered there.

## Project overview

A React + TypeScript SPA that resolves a visitor's location entirely client-side, with a layered fallback chain: **Browser Geolocation → Reverse Geocode → IP Geolocation**, stopping at the first fully-successful method. No backend. Live at https://geo-location-resolver.vercel.app/.

## Critical gotchas (don't relearn these the hard way)

- IP geolocation is **frontend-only** (`ipapi.co` called directly from the browser) — this was a deliberate choice, not an oversight. Details: [ARCHITECTURE.md §8](docs/ARCHITECTURE.md#8-decision-log-chronological-why-not-what).
- The responsive breakpoint in `LocationGraph.tsx` is `xl` (1280px), not `md` — it was moved there on purpose to match the tree's real content width. Details: [ARCHITECTURE.md §6](docs/ARCHITECTURE.md#6-the-css-only-responsive-dual-render-pattern-locationgraphtsx).
- **No real browser/viewport testing tool exists in this sandbox** (no `chromium-cli`, no cached Playwright). Responsive/mobile tests only assert Tailwind classes are present — that is not real visual/cross-browser verification. State this limitation explicitly rather than implying a screenshot was checked.
- TypeScript 7 + Vite 8 require `@testing-library/jest-dom/vitest` (not the bare package) and `src/vite-env.d.ts` with `/// <reference types="vite/client" />` — both already in place; don't remove them.

## Conventions

- TypeScript strict mode; no `any` unless justified.
- Tests mock `navigator.geolocation`/`fetch` via `globalThis` (not `global` — no `@types/node` here), with `as unknown as X` casts for intentionally-narrow mock shapes.
- `data-testid` only where there's no unique accessible text to query by: `app-shell`, `location-card`, `result-grid`, `detection-tree`, `detection-tree-mobile`, `detection-tree-row`.
- Prefer editing/extending the existing service modules under `src/services/location/` over adding new top-level abstractions — the fallback chain is intentionally small and flat.

## Commands

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b`, check-only |
| `npm test` | `vitest run` (CI mode) |
| `npm run test:watch` | `vitest` watch mode |

Always run `npm run typecheck && npm test && npm run build` before considering a change done.

## Documentation map

| File | Purpose |
|---|---|
| `README.md` | Human-facing overview, getting started, code samples with explanations. |
| `docs/ARCHITECTURE.md` | The deep-dive: module responsibilities, patterns used and when to reach for them, full decision log, testing strategy, CI/CD. |
| `CLAUDE.md` (this file) | Short, auto-loaded pointer + the handful of things worth repeating every session. |
| `AGENTS.md` | Pointer to this file, for tools that look for that filename instead. |
