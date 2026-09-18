import { describe, it, expect, afterEach, vi } from "vitest";
import {
  GeolocationError,
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

  it("rejects with a permission-denied message and reason for error code 1", async () => {
    mockGeolocation({ success: false, errorCode: 1 });
    try {
      await getBrowserCoordinates();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(GeolocationError);
      expect((error as Error).message).toMatch(/denied/i);
      expect((error as GeolocationError).reason).toBe("permission-denied");
    }
  });

  it("reports position-unavailable for error code 2", async () => {
    mockGeolocation({ success: false, errorCode: 2 });
    try {
      await getBrowserCoordinates();
      expect.unreachable();
    } catch (error) {
      expect((error as GeolocationError).reason).toBe("position-unavailable");
    }
  });

  it("reports timeout for error code 3", async () => {
    mockGeolocation({ success: false, errorCode: 3 });
    try {
      await getBrowserCoordinates();
      expect.unreachable();
    } catch (error) {
      expect((error as GeolocationError).reason).toBe("timeout");
    }
  });

  it("rejects with an unsupported reason when geolocation is unsupported", async () => {
    try {
      await getBrowserCoordinates();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(GeolocationError);
      expect((error as GeolocationError).reason).toBe("unsupported");
      expect((error as GeolocationError).message).toMatch(/not supported/i);
    }
  });
});
