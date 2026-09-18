import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LocationStep } from "../../types/location.ts";

vi.mock("./browserGeolocation.ts");
vi.mock("./reverseGeocode.ts");
vi.mock("./ipGeolocation.ts");
vi.mock("./hints.ts", () => ({
  collectHints: () => ({ timezone: "UTC", locale: "en-US" }),
}));

import { getBrowserCoordinates } from "./browserGeolocation.ts";
import { reverseGeocode } from "./reverseGeocode.ts";
import { getIpGeolocation } from "./ipGeolocation.ts";
import { LocationResolutionError, resolveLocation } from "./resolveLocation.ts";

const coords = { latitude: 37.7749, longitude: -122.4194, accuracyMeters: 25 };

function statusOf(steps: LocationStep[], id: LocationStep["id"]) {
  return steps.find((s) => s.id === id)?.status;
}

describe("resolveLocation", () => {
  beforeEach(() => {
    vi.mocked(getBrowserCoordinates).mockReset();
    vi.mocked(reverseGeocode).mockReset();
    vi.mocked(getIpGeolocation).mockReset();
  });

  it("returns a browser-sourced result and skips IP geolocation on full success", async () => {
    vi.mocked(getBrowserCoordinates).mockResolvedValue(coords);
    vi.mocked(reverseGeocode).mockResolvedValue({
      country: "United States",
      region: "California",
      city: "San Francisco",
    });

    const steps: LocationStep[][] = [];
    const result = await resolveLocation((s) => steps.push(s));

    expect(result).toEqual({
      country: "United States",
      region: "California",
      city: "San Francisco",
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters: coords.accuracyMeters,
      source: "browser",
      hints: { timezone: "UTC", locale: "en-US" },
    });
    expect(getIpGeolocation).not.toHaveBeenCalled();

    const finalSteps = steps[steps.length - 1];
    expect(statusOf(finalSteps, "browser-geolocation")).toBe("success");
    expect(statusOf(finalSteps, "reverse-geocode")).toBe("success");
    expect(statusOf(finalSteps, "ip-geolocation")).toBe("skipped");
  });

  it("falls back to IP geolocation when reverse geocoding fails", async () => {
    vi.mocked(getBrowserCoordinates).mockResolvedValue(coords);
    vi.mocked(reverseGeocode).mockRejectedValue(new Error("geocode down"));
    vi.mocked(getIpGeolocation).mockResolvedValue({
      country: "United States",
      region: "New York",
      city: "New York",
      latitude: 40.7128,
      longitude: -74.006,
    });

    const steps: LocationStep[][] = [];
    const result = await resolveLocation((s) => steps.push(s));

    expect(result.source).toBe("ip");
    expect(result.city).toBe("New York");

    const finalSteps = steps[steps.length - 1];
    expect(statusOf(finalSteps, "browser-geolocation")).toBe("success");
    expect(statusOf(finalSteps, "reverse-geocode")).toBe("failed");
    expect(statusOf(finalSteps, "ip-geolocation")).toBe("success");
  });

  it("falls back to IP geolocation when browser geolocation fails, skipping reverse geocode", async () => {
    vi.mocked(getBrowserCoordinates).mockRejectedValue(new Error("permission denied"));
    vi.mocked(getIpGeolocation).mockResolvedValue({
      country: "United States",
      region: "New York",
      city: "New York",
    });

    const steps: LocationStep[][] = [];
    const result = await resolveLocation((s) => steps.push(s));

    expect(result.source).toBe("ip");
    expect(reverseGeocode).not.toHaveBeenCalled();

    const finalSteps = steps[steps.length - 1];
    expect(statusOf(finalSteps, "browser-geolocation")).toBe("failed");
    expect(statusOf(finalSteps, "reverse-geocode")).toBe("skipped");
    expect(statusOf(finalSteps, "ip-geolocation")).toBe("success");
  });

  it("throws a LocationResolutionError with the full step trail when every method fails", async () => {
    vi.mocked(getBrowserCoordinates).mockRejectedValue(new Error("permission denied"));
    vi.mocked(getIpGeolocation).mockRejectedValue(new Error("network down"));

    await expect(resolveLocation()).rejects.toThrow(LocationResolutionError);

    try {
      await resolveLocation();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(LocationResolutionError);
      const steps = (error as LocationResolutionError).steps;
      expect(statusOf(steps, "browser-geolocation")).toBe("failed");
      expect(statusOf(steps, "reverse-geocode")).toBe("skipped");
      expect(statusOf(steps, "ip-geolocation")).toBe("failed");
    }
  });
});
