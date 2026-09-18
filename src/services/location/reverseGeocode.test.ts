import { describe, it, expect, afterEach, vi } from "vitest";
import { reverseGeocode } from "./reverseGeocode.ts";

const coords = { latitude: 37.7749, longitude: -122.4194, accuracyMeters: 25 };

describe("reverseGeocode", () => {
  afterEach(() => {
    globalThis.fetch = undefined as unknown as typeof fetch;
    vi.restoreAllMocks();
  });

  it("maps country/region/city from a successful response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        countryName: "United States",
        principalSubdivision: "California",
        city: "San Francisco",
      }),
    }) as unknown as typeof fetch;

    await expect(reverseGeocode(coords)).resolves.toEqual({
      country: "United States",
      region: "California",
      city: "San Francisco",
    });
  });

  it("falls back to locality when city is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        countryName: "United States",
        principalSubdivision: "California",
        locality: "Bernal Heights",
      }),
    }) as unknown as typeof fetch;

    const result = await reverseGeocode(coords);
    expect(result.city).toBe("Bernal Heights");
  });

  it("throws when the response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    await expect(reverseGeocode(coords)).rejects.toThrow(/500/);
  });
});
