import { describe, it, expect, afterEach, vi } from "vitest";
import { getIpGeolocation } from "./ipGeolocation.ts";

describe("getIpGeolocation", () => {
  afterEach(() => {
    globalThis.fetch = undefined as unknown as typeof fetch;
    vi.restoreAllMocks();
  });

  it("maps a successful ipapi.co response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        country_name: "United States",
        region: "California",
        city: "San Francisco",
        latitude: 37.7749,
        longitude: -122.4194,
        org: "Example ISP",
        asn: "AS12345",
      }),
    }) as unknown as typeof fetch;

    await expect(getIpGeolocation()).resolves.toEqual({
      country: "United States",
      region: "California",
      city: "San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
      ispName: "Example ISP",
      asn: "AS12345",
    });
  });

  it("throws when the response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as unknown as typeof fetch;

    await expect(getIpGeolocation()).rejects.toThrow(/503/);
  });

  it("throws when ipapi.co reports a rate-limit/error payload with HTTP 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: true, reason: "RateLimited" }),
    }) as unknown as typeof fetch;

    await expect(getIpGeolocation()).rejects.toThrow(/RateLimited/);
  });
});
