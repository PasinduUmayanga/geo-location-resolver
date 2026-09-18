import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";
import LocationInfo from "./LocationInfo.tsx";

const mockCoords = { latitude: 37.7749, longitude: -122.4194 };

function mockGeolocation({
  success = true,
  errorCode = 1,
}: { success?: boolean; errorCode?: number } = {}) {
  const getCurrentPosition = vi.fn(
    (
      successCallback: PositionCallback,
      errorCallback?: PositionErrorCallback | null
    ) => {
      if (success) {
        successCallback({
          coords: { ...mockCoords, accuracy: 25 },
        } as unknown as GeolocationPosition);
      } else {
        errorCallback?.({ code: errorCode } as unknown as GeolocationPositionError);
      }
    }
  );
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });
}

function mockFetchRouting({
  reverseGeocodeOk = true,
  ipGeolocationOk = true,
}: { reverseGeocodeOk?: boolean; ipGeolocationOk?: boolean } = {}) {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("bigdatacloud")) {
      return reverseGeocodeOk
        ? Promise.resolve({
            ok: true,
            json: async () => ({
              countryName: "United States",
              principalSubdivision: "California",
              city: "San Francisco",
            }),
          })
        : Promise.resolve({ ok: false, status: 500 });
    }

    if (url.includes("ipapi.co")) {
      return ipGeolocationOk
        ? Promise.resolve({
            ok: true,
            json: async () => ({
              country_name: "United States",
              region: "New York",
              city: "New York",
              latitude: 40.7128,
              longitude: -74.006,
              org: "Example ISP",
            }),
          })
        : Promise.resolve({ ok: false, status: 503 });
    }

    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  }) as unknown as typeof fetch;
}

describe("LocationInfo", () => {
  afterEach(() => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: undefined,
      configurable: true,
    });
    globalThis.fetch = undefined as unknown as typeof fetch;
    vi.restoreAllMocks();
  });

  it("renders the Get Location button initially with no steps shown", () => {
    render(<LocationInfo />);
    expect(
      screen.getByRole("button", { name: /get location/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("Browser Geolocation")).not.toBeInTheDocument();
  });

  it("resolves via the browser and skips the IP fallback on full success", async () => {
    mockGeolocation({ success: true });
    mockFetchRouting({ reverseGeocodeOk: true });

    const user = userEvent.setup();
    render(<LocationInfo />);
    await user.click(screen.getByRole("button", { name: /get location/i }));

    await waitFor(() =>
      expect(screen.getByText("San Francisco")).toBeInTheDocument()
    );
    expect(screen.getByText("browser")).toBeInTheDocument();
    expect(screen.getAllByText("Success")).toHaveLength(2);
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(
      screen.queryByText(/approximate location/i)
    ).not.toBeInTheDocument();
  });

  it("falls back to IP geolocation when the browser permission is denied", async () => {
    mockGeolocation({ success: false, errorCode: 1 });
    mockFetchRouting({ ipGeolocationOk: true });

    const user = userEvent.setup();
    render(<LocationInfo />);
    await user.click(screen.getByRole("button", { name: /get location/i }));

    await waitFor(() =>
      expect(screen.getAllByText("New York").length).toBeGreaterThan(0)
    );
    expect(screen.getByText("ip")).toBeInTheDocument();
    expect(screen.getByText(/approximate location/i)).toBeInTheDocument();
    expect(screen.getByText("Example ISP")).toBeInTheDocument();
  });

  it("shows a failure message when every method fails", async () => {
    mockGeolocation({ success: false, errorCode: 2 });
    mockFetchRouting({ ipGeolocationOk: false });

    const user = userEvent.setup();
    render(<LocationInfo />);
    await user.click(screen.getByRole("button", { name: /get location/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/all location detection methods failed/i)
      ).toBeInTheDocument()
    );
  });
});
