# geo-location-resolver

[![Build status](https://ci.appveyor.com/api/projects/status/github/Mahadenamuththa/geo-location-resolver?svg=true&branch=create-a-react-vite)](https://ci.appveyor.com/project/Mahadenamuththa/geo-location-resolver)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

A small React + TypeScript app that resolves a visitor's country, region, and city entirely client-side: it reads the browser's [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) for coordinates, then reverse-geocodes them via the free [BigDataCloud](https://www.bigdatacloud.com/) API. There is no backend — everything runs in the browser.

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
  App.tsx                      # page shell, renders LocationInfo
  main.tsx                     # React root / entry point
  index.css                    # Tailwind import
  vite-env.d.ts                # ambient types for Vite asset imports
  components/
    LocationInfo.tsx           # geolocation + reverse-geocode UI
    LocationInfo.test.tsx      # component tests
  App.test.tsx                 # smoke test for App
  test/setup.ts                # jest-dom matchers for Vitest
appveyor.yml                   # CI: typecheck -> test -> build
```

## How it works

The core logic lives in `src/components/LocationInfo.tsx`.

- **State machine.** `status` is one of `"idle" | "loading" | "success" | "error"`, alongside `location` (the resolved data) and `error` (a human-readable message). This single piece of state drives the button label/disabled state and which result block renders, instead of juggling multiple booleans.
- **Feature detection.** `isSupported` checks `!!navigator.geolocation` up front, so browsers without geolocation support get an inline message and a disabled button rather than a silent failure when the button is clicked.
- **Two-callback geolocation API.** `navigator.geolocation.getCurrentPosition` takes a success callback and an error callback. The error callback is wired up and `GEOLOCATION_ERROR_MESSAGES` maps the standard [`GeolocationPositionError.code`](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError/code) values (`1` permission denied, `2` position unavailable, `3` timeout) to readable messages, so a user who denies the permission prompt sees why nothing happened instead of the app hanging.
- **Reverse geocoding.** On success, the coordinates are sent to BigDataCloud's `reverse-geocode-client` endpoint. The fetch is wrapped in `try/catch` and checks `response.ok` before parsing JSON, so a network error or non-2xx response surfaces as an error state rather than throwing inside a promise no one awaits. `city: data.city || data.locality` falls back to `locality` because BigDataCloud omits `city` for some rural/unincorporated coordinates.

## Testing

`src/components/LocationInfo.test.tsx` covers:

- initial render (button present, no result shown)
- the unsupported-browser message when `navigator.geolocation` is absent
- the loading state while the reverse-geocode request is in flight
- a successful resolution, including the `city`/`locality` fallback
- a permission-denied geolocation error
- a failed reverse-geocode request (non-`ok` response)

`navigator.geolocation` and `fetch` aren't available/deterministic in the jsdom test environment, so both are stubbed per-test on `globalThis` and reset in `afterEach`. `src/App.test.tsx` is a smoke test confirming the heading and button render.

## Continuous integration

`appveyor.yml` runs on every push/PR: it installs dependencies with `npm ci` (caching `node_modules` keyed on `package-lock.json`), then runs `npm run typecheck`, `npm test`, and `npm run build` in sequence — a broken type, a failing test, or a broken production build all fail the CI run. It then reports outdated packages (`npm outdated`, non-blocking) and audits for known vulnerabilities (`npm audit`, printing every severity but only failing the build on a critical-severity finding).
