# geo-location-resolver

[![Build status](https://ci.appveyor.com/api/projects/status/github/Mahadenamuththa/geo-location-resolver?svg=true&branch=create-a-react-vite)](https://ci.appveyor.com/project/Mahadenamuththa/geo-location-resolver)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white)](https://geo-location-resolver.vercel.app/)

**[Try it live →](https://geo-location-resolver.vercel.app/)**

A React + TypeScript app that resolves a visitor's country, region, and city entirely client-side, with a layered fallback chain so it still returns a result when the browser can't give one:

1. **Browser Geolocation API** (`navigator.geolocation`) for precise coordinates, reverse-geocoded via the free [BigDataCloud](https://www.bigdatacloud.com/) API to get country/region/city.
2. **IP-based geolocation fallback** (via [ipapi.co](https://ipapi.co/)) when geolocation is denied, unavailable, or the reverse-geocode step fails — approximate, and called out as such in the UI (VPNs/proxies/CGNAT can skew it).
3. **Weak supporting hints** (timezone, locale) collected alongside either path — informational only, never used to gate or replace the result.

There is no backend — every step runs in the browser (see [Design notes](#design-notes) for the trade-off).

## Tech stack

- [React 19](https://react.dev/) + [TypeScript 7](https://www.typescriptlang.org/)
- [Vite 8](https://vite.dev/) for dev server / bundling
- [Tailwind CSS v4](https://tailwindcss.com/) (via `@tailwindcss/vite`) for styling
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) for tests

## Getting started

Requires Node.js `^20.19.0` or `>=22.12.0` (see `engines` in `package.json` — Vite 8's minimum).

```bash
npm install
npm run dev
```

Open the printed local URL and click **Get Location** — your browser will prompt for location permission.

## Scripts

| Script               | What it does                                           |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Starts the Vite dev server                             |
| `npm run build`      | Type-checks (`tsc -b`) then builds a production bundle |
| `npm run preview`    | Serves the production build locally                    |
| `npm run typecheck`  | Runs the TypeScript compiler in check-only mode        |
| `npm test`           | Runs the Vitest suite once (CI mode)                   |
| `npm run test:watch` | Runs Vitest in watch mode                              |

## Project structure

```
src/
  App.tsx                          # page shell, renders LocationInfo
  main.tsx                         # React root / entry point
  index.css                        # Tailwind import
  vite-env.d.ts                    # ambient types for Vite asset imports
  types/
    location.ts                    # LocationStep, NormalizedLocation, LocationSource — shared contract
  services/location/
    browserGeolocation.ts          # navigator.geolocation wrapped as a Promise
    reverseGeocode.ts              # BigDataCloud coords -> address
    ipGeolocation.ts               # ipapi.co IP-based fallback
    hints.ts                       # timezone/locale collection
    resolveLocation.ts             # orchestrator: runs the fallback chain, tracks step status
  hooks/
    useLocationResolver.ts         # React hook wrapping resolveLocation for LocationInfo
  components/
    LocationInfo.tsx               # button + graph view + result card + map
    LocationGraph.tsx              # node/edge graph view of the fallback chain
    LocationMap.tsx                # embedded OpenStreetMap view of the result
  App.test.tsx                     # smoke test for App
  test/setup.ts                    # jest-dom matchers for Vitest
appveyor.yml                       # CI: typecheck -> test -> build -> outdated/audit report
```

## How it works

The fallback chain is orchestrated by `resolveLocation()` in `src/services/location/resolveLocation.ts`. Each detection method is a small, independently testable strategy module; the orchestrator runs them in priority order and tracks each as its own `idle → trying → (success | failed | skipped)` step, calling an `onStepChange` callback after every transition so the UI can render live progress instead of just a final result.

```
Browser Geolocation ──success──▶ Reverse Geocode ──success──▶ done (source: "browser")
      │failed                          │failed
      ▼                                ▼
  [Reverse Geocode: skipped]      IP Geolocation Fallback ──success──▶ done (source: "ip")
      │                                │failed
      └────────────▶ IP Geolocation ◀──┘
                          │
                     all failed ▶ throws LocationResolutionError
```

- **`browserGeolocation.ts`** wraps `navigator.geolocation.getCurrentPosition` as a Promise and throws a typed `GeolocationError` with a `reason` (`permission-denied`, `position-unavailable`, `timeout`, `unsupported`) mapped from [`GeolocationPositionError.code`](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError/code) (`1`/`2`/`3`) — not just a message string, so the UI can branch on *why* it failed, not just *that* it failed.
- **`reverseGeocode.ts`** sends browser coordinates to BigDataCloud's `reverse-geocode-client` endpoint (`city: data.city || data.locality`, since BigDataCloud omits `city` for some rural/unincorporated coordinates). If browser geolocation succeeds but this fails, the chain still falls through to IP geolocation — raw coordinates without a resolved address aren't treated as a full success.
- **`ipGeolocation.ts`** calls `ipapi.co`, which detects the caller's IP from the request itself — no backend needed. It also handles ipapi.co's quirk of returning HTTP 200 with `{ error: true }` when rate-limited, rather than a non-2xx status.
- **`hints.ts`** collects timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and locale (`navigator.language`) once, merged into whichever result wins — these never gate the chain or get a step of their own, since they're supporting metadata, not a location source.
- **"Stop at first success."** The moment browser geolocation + reverse geocoding both succeed, the IP step is marked `skipped` (with a reason) rather than attempted — `useLocationResolver.ts` (the hook `LocationInfo.tsx` consumes) and `LocationGraph.tsx` both just render whatever `resolveLocation` reports.
- **IP-result disclaimer.** When `source === "ip"`, `LocationInfo.tsx` shows an inline note that the location is approximate, per the "don't treat IP location as exact" requirement.
- **`LocationMap.tsx`** shows the resolved coordinates (from either path) on a free, no-API-key OpenStreetMap embed — a plain `<iframe>` pointed at `openstreetmap.org/export/embed.html` with a marker and a small bbox around the point, plus a "View larger map" link out to the full site.

### Graph view (`LocationGraph.tsx`)

Instead of a flat status list, the chain renders as a node/edge graph — Start → Browser Geolocation → Reverse Geocode → IP Geolocation Fallback → Result — with `aria-live="polite"` so status changes are still announced to screen readers. The Browser Geolocation node shows all of its possible outgoing edges, dimming the ones not taken this run and highlighting the one that was, so the graph reads as a map of possibilities rather than a log of one run. Real-world scenarios map onto it as:

| # | Scenario | How it shows up in the graph |
|---|----------|-------------------------------|
| 1 | OS location ON + browser permission ALLOWED | "Location ON + permission ALLOWED" edge → Reverse Geocode |
| 2 | OS location ON, browser permission DENIED | `GeolocationPositionError.code === 1` → "Permission denied…" edge → IP Geolocation |
| 3 | Browser permission ALLOWED, OS location OFF | `code === 2` → "Position unavailable / OS location off" edge → IP Geolocation |
| 4 | Both OS location OFF and permission DENIED | Not distinguishable from #2 client-side — most browsers report code `1` for both, so the graph is honest about it: the edge is labeled "Permission denied (or OS location off, browser-dependent)" rather than claiming false precision |
| 5 | Location resolved from the ISP | Reaching the IP Geolocation Fallback node at all |
| 6 | Mobile ISP location can be inaccurate | Static caveat note on the IP Geolocation node (not detected — always shown) |
| 7 | VPN skewing IP location | Static caveat note on the IP Geolocation node (not detected — always shown) |

### Responsive layout

The page (`App.tsx`) and card (`LocationInfo.tsx`) use full-width layouts with breakpoint-scaled padding (`px-4` → `sm:px-6` → `lg:px-10`) instead of a fixed narrow column, so the tree has room to breathe on wide screens. The result `<dl>` scales `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3`, and the embedded map scales `h-48` → `sm:h-64` → `lg:h-80`. The detection tree itself is inherently wide (it's a horizontal diagram, not a paragraph that can reflow), so on viewports narrower than its content it stays in `overflow-x-auto` rather than clipping — that's the intentional small-screen fallback, not a bug.

**Testing trade-off**: `src/responsive.test.tsx` asserts the responsive Tailwind classes are present on the right elements (a regression guard, e.g. against a `max-w` cap creeping back in) — but it runs on Vitest/jsdom, a single DOM implementation with no real CSS layout engine, so it can't render at actual viewport sizes or catch engine-specific rendering differences across Chrome/Firefox/Safari. Real cross-browser/viewport verification would need a tool like Playwright (browser binaries + a slower CI step) — not currently set up.

## Design notes

Going frontend-only for the IP fallback means `ipapi.co` is called directly from the browser rather than through a backend proxy. Its free tier is unauthenticated (no key to manage) and HTTPS-safe to call from a browser page, but rate-limited (~1,000 req/day) and not centrally swappable. If that ever becomes a real constraint, only `ipGeolocation.ts` needs to change — the rest of the chain (`resolveLocation.ts`, the hook, the UI) is provider-agnostic.

## Testing

- `src/services/location/*.test.ts` unit-test each strategy in isolation (`browserGeolocation`, `reverseGeocode`, `ipGeolocation`) and `resolveLocation.test.ts` covers every branch of the fallback chain: full browser success (IP skipped), browser success + geocode failure → IP fallback, browser failure → IP fallback, and total failure (`LocationResolutionError` with the full step trail attached).
- `src/components/LocationGraph.test.tsx` checks each node/edge renders the right status and that the correct edge is highlighted for full success, permission-denied, and position-unavailable scenarios.
- `src/components/LocationInfo.test.tsx` is an integration test: `navigator.geolocation` and `fetch` are stubbed per-test on `globalThis` (with `fetch` routed by URL to simulate BigDataCloud vs. ipapi.co) to exercise the full button-click → chain → result-card flow for each outcome.
- `src/App.test.tsx` is a smoke test confirming the heading and button render.

## Continuous integration

`appveyor.yml` runs on every push/PR: it installs dependencies with `npm ci` (caching `node_modules` keyed on `package-lock.json`), then runs `npm run typecheck`, `npm test`, and `npm run build` in sequence — a broken type, a failing test, or a broken production build all fail the CI run. It then reports outdated packages (`npm outdated`, non-blocking) and audits for known vulnerabilities (`npm audit`, printing every severity but only failing the build on a critical-severity finding).
