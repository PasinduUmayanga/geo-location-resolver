import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getBrowserCoordinates,
  isGeolocationSupported,
} from "./browserGeolocation.ts";

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
          coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 25 },
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

describe("browserGeolocation", () => {
  afterEach(() => {
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: undefined,
      configurable: true,
    });
  });

  it("reports unsupported when navigator.geolocation is absent", () => {
    expect(isGeolocationSupported()).toBe(false);
  });

  it("reports supported when navigator.geolocation is present", () => {
    mockGeolocation({ success: true });
    expect(isGeolocationSupported()).toBe(true);
  });

  it("resolves with coordinates and accuracy on success", async () => {
    mockGeolocation({ success: true });
    await expect(getBrowserCoordinates()).resolves.toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      accuracyMeters: 25,
    });
  });

  it("rejects with a permission-denied message for error code 1", async () => {
    mockGeolocation({ success: false, errorCode: 1 });
    await expect(getBrowserCoordinates()).rejects.toThrow(/denied/i);
  });

  it("rejects when geolocation is unsupported", async () => {
    await expect(getBrowserCoordinates()).rejects.toThrow(/not supported/i);
  });
});
