import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";
import App from "./App.tsx";

/**
 * These tests don't render at real viewport sizes or in real browser engines
 * (Vitest runs on jsdom, a single DOM implementation with no CSS layout engine) —
 * they assert that the Tailwind responsive utility classes the layout depends on
 * are actually present on the right elements, as a guard against regressions like
 * a max-width cap creeping back in or a breakpoint class being dropped.
 *
 * True cross-browser/visual verification would need a real browser (e.g. Playwright);
 * see README's "Responsive layout" section for that trade-off.
 */

function mockGeolocation() {
  const getCurrentPosition = vi.fn((successCallback: PositionCallback) => {
    successCallback({
      coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 25 },
    } as unknown as GeolocationPosition);
  });
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });
}

function mockFetchRouting() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("bigdatacloud")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          countryName: "United States",
          principalSubdivision: "California",
          city: "San Francisco",
        }),
      });
    }

    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  }) as unknown as typeof fetch;
}

async function resolveToSuccess() {
  mockGeolocation();
  mockFetchRouting();

  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: /get location/i }));
  await waitFor(() => expect(screen.getByText("San Francisco")).toBeInTheDocument());
}

describe("responsive layout", () => {
  afterEach(() => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: undefined,
      configurable: true,
    });
    globalThis.fetch = undefined as unknown as typeof fetch;
    vi.restoreAllMocks();
  });

  it("gives the page full-width breakpoint-scaled padding instead of a fixed narrow column", () => {
    render(<App />);
    const shell = screen.getByTestId("app-shell");

    expect(shell).toHaveClass("w-full");
    expect(shell).toHaveClass("px-4");
    expect(shell).toHaveClass("sm:px-6");
    expect(shell).toHaveClass("lg:px-10");
  });

  it("renders the card at full width with no max-width cap", () => {
    render(<App />);
    const card = screen.getByTestId("location-card");

    expect(card).toHaveClass("w-full");
    expect(
      Array.from(card.classList).some((cls) => cls.startsWith("max-w"))
    ).toBe(false);
  });

  it("scales the result grid from 1 to 2 to 3 columns across breakpoints", async () => {
    await resolveToSuccess();
    const grid = screen.getByTestId("result-grid");

    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).toHaveClass("sm:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-3");
  });

  it("keeps the desktop detection tree horizontally scrollable as a tablet-and-up fallback", async () => {
    await resolveToSuccess();
    const tree = screen.getByTestId("detection-tree");
    const row = screen.getByTestId("detection-tree-row");

    expect(tree).toHaveClass("overflow-x-auto");
    expect(row).toHaveClass("min-w-[1000px]");
  });

  it("swaps to a vertical stepper below xl (1280px, the tree's own minimum fit width) so phones — e.g. a Xiaomi 15 Ultra at ~450-460px CSS width — and tablets get a non-scrolling layout", async () => {
    await resolveToSuccess();
    const mobileTree = screen.getByTestId("detection-tree-mobile");
    const desktopTree = screen.getByTestId("detection-tree");

    expect(mobileTree).toHaveClass("xl:hidden");
    expect(desktopTree).toHaveClass("hidden");
    expect(desktopTree).toHaveClass("xl:block");
  });

  it("scales the embedded map taller on tablet/desktop breakpoints", async () => {
    await resolveToSuccess();
    const map = screen.getByTitle("Map showing the resolved location");

    expect(map).toHaveClass("h-48");
    expect(map).toHaveClass("sm:h-64");
    expect(map).toHaveClass("lg:h-80");
  });
});
