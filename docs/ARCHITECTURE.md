# Architecture

Deep-dive reference for `geo-location-resolver`. This is the canonical, detailed
document — `CLAUDE.md` and `AGENTS.md` at the repo root are short pointers into
this file, kept lean on purpose so they're cheap to auto-load every session.
Read this document fully before making a structural change to the fallback
chain, the graph UI, or the CI pipeline.

## 1. System overview

A React + TypeScript single-page app with **no backend**. It resolves a
visitor's location by racing three strategies in priority order and stopping
at the first one that fully succeeds:

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

Timezone/locale "hints" are collected once, in parallel, and merged into
whichever result wins — they never gate the chain and never get a step of
their own.

## 2. Module map and responsibilities

```
src/
  types/location.ts              # LocationStep, StepStatus, NormalizedLocation,
                                  # BrowserFailureReason — the shared contract
                                  # every other module imports.
  services/location/
    browserGeolocation.ts        # Strategy 1. navigator.geolocation.getCurrentPosition
                                  # (callback-based) wrapped as a Promise. Throws a
                                  # typed GeolocationError{reason}, not a plain Error.
    reverseGeocode.ts            # Strategy 1b. BigDataCloud coords -> {country, region, city}.
    ipGeolocation.ts             # Strategy 2. ipapi.co IP-based fallback (frontend-only).
    hints.ts                     # Strategy 3 (weak). timezone + locale, always collected,
                                  # never a chain step.
    resolveLocation.ts           # THE ORCHESTRATOR. Chain-of-responsibility + a per-step
                                  # state machine (idle -> trying -> success|failed|skipped).
  hooks/useLocationResolver.ts   # React adapter: owns status/steps/result/error state,
                                  # exposes run(). The only thing that calls resolveLocation().
  components/
    LocationInfo.tsx             # Top-level UI: button, graph, result panel, map.
    LocationGraph.tsx            # Renders `steps` as two DOM trees (vertical stepper +
                                  # horizontal branching tree), toggled by CSS breakpoint only.
    LocationMap.tsx              # OpenStreetMap <iframe> embed, no API key, no library.
```

Every strategy module has a co-located `*.test.ts(x)`. Nothing outside
`resolveLocation.ts` knows about more than one strategy at a time — each
strategy module is independently swappable.

## 3. The orchestrator pattern (`resolveLocation.ts`)

This is the piece most likely to need explaining to a fresh session, so here
it is with the actual code:

```ts
export async function resolveLocation(
  onStepChange?: StepChangeListener
): Promise<NormalizedLocation> {
  const steps = INITIAL_LOCATION_STEPS.map((step) => ({ ...step }));

  const setStep = (id: StepId, status: StepStatus, detail?: string, reason?: BrowserFailureReason) => {
    const step = steps.find((s) => s.id === id)!;
    step.status = status;
    step.detail = detail;
    step.reason = reason;
    onStepChange?.(steps.map((s) => ({ ...s }))); // always emit a fresh copy
  };

  setStep("browser-geolocation", "trying");
  try {
    const coords = await getBrowserCoordinates();
    setStep("browser-geolocation", "success", `accuracy ±${Math.round(coords.accuracyMeters)}m`);

    setStep("reverse-geocode", "trying");
    try {
      const address = await reverseGeocode(coords);
      setStep("reverse-geocode", "success");
      setStep("ip-geolocation", "skipped", "browser location resolved");
      return { ...address, ...coords, source: "browser", hints };
    } catch (error) {
      setStep("reverse-geocode", "failed", messageOf(error));
      // falls through to IP geolocation below
    }
  } catch (error) {
    const reason = error instanceof GeolocationError ? error.reason : "unknown";
    setStep("browser-geolocation", "failed", messageOf(error), reason);
    setStep("reverse-geocode", "skipped", "no coordinates to geocode");
    // falls through to IP geolocation below
  }

  setStep("ip-geolocation", "trying");
  try {
    const ipResult = await getIpGeolocation();
    setStep("ip-geolocation", "success");
    return { ...ipResult, source: "ip", hints };
  } catch (error) {
    setStep("ip-geolocation", "failed", messageOf(error));
    throw new LocationResolutionError("All location detection methods failed.", steps);
  }
}
```

**Used for**: this is the single source of truth for the fallback order and
for step status. **When to touch it**: only when the fallback *order* or
*branching logic* itself changes — adding a new detection method, changing
what counts as a "full success," or changing what happens on partial failure.
Do not put UI concerns here; it has zero React/DOM knowledge by design.

**Mechanism**: nested `try/catch` blocks *are* the branching logic — each
catch block is a fallback edge. `setStep` is called before and after every
async boundary so `onStepChange` fires on every transition, which is what
lets the UI animate progress live instead of only seeing a final snapshot.
`LocationResolutionError` carries the full `steps` array so the caller can
still render the whole trail even on total failure.

## 4. The typed-error pattern (`browserGeolocation.ts`)

```ts
export class GeolocationError extends Error {
  constructor(message: string, public readonly reason: BrowserFailureReason) {
    super(message);
    this.name = "GeolocationError";
  }
}

export function getBrowserCoordinates(): Promise<BrowserCoordinates> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new GeolocationError("Geolocation is not supported by your browser.", "unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, /* ... */ }),
      (geoError) => reject(new GeolocationError(
        GEOLOCATION_ERROR_MESSAGES[geoError.code] ?? "An unknown error occurred while getting your location.",
        GEOLOCATION_ERROR_REASONS[geoError.code] ?? "unknown"
      ))
    );
  });
}
```

**Used for**: turning the browser's callback-based `getCurrentPosition` API
into an `await`-able Promise, *and* carrying a machine-readable `reason`
alongside the human-readable message — `resolveLocation.ts` reads `.reason`
to decide which graph edge to highlight, without string-matching the message.

**When to use this pattern elsewhere**: any time you're wrapping a
callback-based browser API where the caller needs to branch on *which* kind
of failure occurred, not just that one occurred. A plain `Error` would lose
that distinction.

**Reliability caveat (do not silently "fix")**: `permission-denied` vs
`position-unavailable` is not 100% reliable across browsers — see the
Decision Log (§8). The message text is deliberately honest about this
("or OS location off, browser-dependent"); don't tighten the wording to
imply more certainty than the API actually gives.

## 5. The React-adapter pattern (`useLocationResolver.ts`)

```ts
export function useLocationResolver() {
  const [status, setStatus] = useState<ResolverStatus>("idle");
  const [steps, setSteps] = useState<LocationStep[]>(INITIAL_LOCATION_STEPS);
  const [result, setResult] = useState<NormalizedLocation | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setStatus("running");
    try {
      const location = await resolveLocation(setSteps); // setSteps IS the onStepChange callback
      setResult(location);
      setStatus("success");
    } catch (err) {
      if (err instanceof LocationResolutionError) setSteps(err.steps);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setStatus("error");
    }
  }, []);

  return { status, steps, result, error, run };
}
```

**Used for**: this is the *only* file that imports `resolveLocation` directly
— it's the seam between framework-agnostic business logic and React state.
Passing `setSteps` straight in as the `onStepChange` callback is what makes
the live step-by-step UI updates work: every `setStep()` call inside the
orchestrator becomes a React re-render.

**When to use this pattern elsewhere**: any async orchestrator with
multiple intermediate states that a UI needs to reflect live — keep the
orchestrator itself framework-free and give it a plain callback, then let a
thin hook translate callback calls into `useState` updates.

## 6. The CSS-only responsive dual-render pattern (`LocationGraph.tsx`)

```tsx
<div data-testid="detection-tree-mobile" className="mt-4 space-y-2 xl:hidden">
  {/* vertical stepper, full-width nodes */}
</div>

<div data-testid="detection-tree" className="hidden overflow-x-auto xl:mt-4 xl:block">
  {/* horizontal branching tree */}
</div>
```

**Used for**: showing the same `steps`/`result` data as two different DOM
shapes depending on viewport width, without any JS media-query state
(`window.matchMedia`, `useEffect` + resize listeners, etc.).

**Mechanism**: both trees are *always* in the DOM; Tailwind's `xl:hidden` /
`hidden xl:block` toggle `display: none` purely via CSS media queries. Only
one is ever visually shown at a given viewport width — the other is `display:
none` (and therefore not perceived by assistive tech either, so no duplicate
`aria-live` announcements in practice).

**Why `xl` (1280px) and not `md` (768px)**: see Decision Log §8 — this value
is derived from the horizontal tree's actual minimum content width, not a
device-category guess. If you resize/redesign the horizontal tree, re-derive
this number.

**Testing implication**: because both trees are always mounted, every test
that queries by text must scope to one tree (`within(screen.getByTestId(...))`)
or expect `getAllByText` with a length of 2 — see `LocationGraph.test.tsx`.

## 7. The zero-dependency embed pattern (`LocationMap.tsx`)

```tsx
const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${marker}`;
<iframe title="Map showing the resolved location" src={embedSrc} loading="lazy" ... />
```

**Used for**: showing a map without adding a mapping library (Leaflet,
Mapbox GL, Google Maps JS SDK) or requiring an API key. OpenStreetMap's
public embed endpoint is free and keyless.

**When to reach for this instead of a real map library**: when you need a
single static point shown on a map and don't need pan/zoom interactivity
beyond what the embed itself provides, custom marker styling, or multiple
markers/layers. If those needs grow, swap this one component for a real
library — nothing else in the app depends on how the map is rendered.

## 8. Decision log (chronological, why not what)

- **IP geolocation is frontend-only.** `ipapi.co` is called directly from the
  browser — it auto-detects the caller's IP from the request itself, so a
  backend proxy was explicitly considered and rejected as unnecessary
  complexity for this app's scale. Trade-off knowingly accepted:
  unauthenticated, rate-limited (~1,000 req/day), not centrally swappable. If
  this becomes a real constraint, only `ipGeolocation.ts` needs to change —
  the rest of the chain is provider-agnostic.
- **`GeolocationError`/`BrowserFailureReason`** exist specifically to
  distinguish `permission-denied` from `position-unavailable`. This
  distinction is not 100% reliable across browsers/OSes (e.g. Chrome often
  reports code `1` for both an explicit permission denial *and* Windows
  Location Services being off) — the UI labels this honestly rather than
  claiming false precision.
- **`LocationGraph.tsx` renders twice, unconditionally** (§6) — deliberate,
  for simplicity and testability, instead of JS-driven responsive state.
- **The breakpoint is `xl` (1280px), not `md` (768px).** It was originally
  `md`; that let tablets and small laptops (768-1280px) get the horizontal
  tree even though it needs ~1150-1300px to fit, so they still had to scroll
  internally — not genuinely "enough room." `xl` was chosen because it
  matches the tree's actual `min-w-[1000px]` (plus padding) content width.
- **No real browser/viewport testing tool is available in this development
  sandbox** — no `chromium-cli`, no cached Playwright browsers. Responsive
  tests (`src/responsive.test.tsx`, the responsive assertions in
  `LocationGraph.test.tsx`) check that the right Tailwind classes are present
  on the right elements — a regression guard, not real-viewport or
  real-engine verification. Don't claim visual/cross-browser confirmation
  without actually running a browser tool; state the limitation instead.
- **Dependencies were bumped together** to React 19.3 / TypeScript 7 / Vite 8
  / Vitest 5 / Tailwind 4. Two non-obvious fixes were required: import
  `@testing-library/jest-dom/vitest` (not the bare package — v7 no longer
  auto-augments Vitest's `expect`), and `src/vite-env.d.ts` with
  `/// <reference types="vite/client" />` (TS7 is stricter about
  type-checking side-effect CSS imports).
- **CI is AppVeyor** (`appveyor.yml`): `typecheck → test → build → npm
  outdated (non-blocking) → npm audit --audit-level=critical`. Vulnerability
  severity is always printed in the log; only a critical-severity finding
  actually fails the build.

## 9. Testing strategy

| Layer | File(s) | What's covered |
|---|---|---|
| Strategy units | `services/location/*.test.ts` | Each strategy's success/failure mapping in isolation, mocked `fetch`/`navigator.geolocation`. |
| Orchestrator | `resolveLocation.test.ts` | Every branch of the fallback chain (full success, geocode-fail→IP, browser-fail→IP, total failure) with strategy modules mocked via `vi.mock`. |
| Graph UI | `LocationGraph.test.tsx` | Correct edge highlighted per scenario; both mobile/desktop trees render consistent status. |
| Integration | `LocationInfo.test.tsx` | Full button-click → chain → result-card flow, `fetch` routed by URL to simulate BigDataCloud vs. ipapi.co. |
| Responsive | `responsive.test.tsx` | Presence of the right Tailwind breakpoint classes (see the sandbox limitation noted in §8). |

Test-mocking convention: `globalThis.navigator`/`globalThis.fetch` (not
`global` — no `@types/node` in this project), with `as unknown as X` casts
where the mock shape is intentionally narrower than the real type.

## 10. CI/CD and deployment

- **CI**: AppVeyor, `appveyor.yml`, see §8.
- **Deploy**: Vercel, static build (`npm run build` output, no backend/API
  routes), live at https://geo-location-resolver.vercel.app/.
- **Open manual step**: the AppVeyor badge in `README.md` only renders once
  the repo is linked as a project on ci.appveyor.com — not something doable
  from this CLI.
