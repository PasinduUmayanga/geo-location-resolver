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
        successCallback({ coords: mockCoords } as unknown as GeolocationPosition);
      } else {
        errorCallback?.({ code: errorCode } as unknown as GeolocationPositionError);
      }
    }
  );
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });
  return getCurrentPosition;
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

  it("renders the Get Location button initially with no result", () => {
    render(<LocationInfo />);
    expect(
      screen.getByRole("button", { name: /get location/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
  });

  it("shows an unsupported message when geolocation is not available", () => {
    render(<LocationInfo />);
    expect(screen.getByText(/not supported/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get location/i })).toBeDisabled();
  });

  it("shows a loading state while the request is in flight", async () => {
    mockGeolocation({ success: true });
    let resolveFetch: (value: unknown) => void = () => {};
    globalThis.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<LocationInfo />);
    await user.click(screen.getByRole("button", { name: /get location/i }));

    expect(screen.getByRole("button", { name: /locating/i })).toBeDisabled();

    resolveFetch({
      ok: true,
      json: async () => ({
        countryName: "United States",
        principalSubdivision: "California",
        city: "San Francisco",
      }),
    });

    await waitFor(() =>
      expect(screen.getByText("United States")).toBeInTheDocument()
    );
  });

  it("displays resolved location details on success", async () => {
    mockGeolocation({ success: true });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        countryName: "United States",
        principalSubdivision: "California",
        city: "San Francisco",
      }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<LocationInfo />);
    await user.click(screen.getByRole("button", { name: /get location/i }));

    await waitFor(() =>
      expect(screen.getByText("United States")).toBeInTheDocument()
    );
    expect(screen.getByText("California")).toBeInTheDocument();
    expect(screen.getByText("San Francisco")).toBeInTheDocument();
    expect(screen.getByText(mockCoords.latitude.toFixed(6))).toBeInTheDocument();
    expect(screen.getByText(mockCoords.longitude.toFixed(6))).toBeInTheDocument();
  });

  it("falls back to locality when city is missing", async () => {
    mockGeolocation({ success: true });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        countryName: "United States",
        principalSubdivision: "California",
        locality: "Bernal Heights",
      }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<LocationInfo />);
    await user.click(screen.getByRole("button", { name: /get location/i }));

    await waitFor(() =>
      expect(screen.getByText("Bernal Heights")).toBeInTheDocument()
    );
  });

  it("shows a permission-denied message when geolocation errors", async () => {
    mockGeolocation({ success: false, errorCode: 1 });

    const user = userEvent.setup();
    render(<LocationInfo />);
    await user.click(screen.getByRole("button", { name: /get location/i }));

    await waitFor(() =>
      expect(screen.getByText(/location access was denied/i)).toBeInTheDocument()
    );
  });

  it("shows a generic error message when the reverse-geocode request fails", async () => {
    mockGeolocation({ success: true });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<LocationInfo />);
    await user.click(screen.getByRole("button", { name: /get location/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/couldn't resolve them to an address/i)
      ).toBeInTheDocument()
    );
  });
});
