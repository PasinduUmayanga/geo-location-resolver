import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LocationGraph from "./LocationGraph.tsx";
import type { LocationStep, NormalizedLocation } from "../types/location.ts";

function step(overrides: Partial<LocationStep> & Pick<LocationStep, "id" | "status">): LocationStep {
  const labels: Record<LocationStep["id"], string> = {
    "browser-geolocation": "Browser Geolocation",
    "reverse-geocode": "Reverse Geocode",
    "ip-geolocation": "IP Geolocation Fallback",
  };
  return { label: labels[overrides.id], ...overrides };
}

describe("LocationGraph", () => {
  it("highlights the success edge and skips IP geolocation on full browser success", () => {
    const steps: LocationStep[] = [
      step({ id: "browser-geolocation", status: "success" }),
      step({ id: "reverse-geocode", status: "success" }),
      step({ id: "ip-geolocation", status: "skipped", detail: "browser location resolved" }),
    ];
    const result: NormalizedLocation = {
      country: "United States",
      source: "browser",
      hints: {},
    };

    render(<LocationGraph status="success" steps={steps} result={result} />);

    expect(screen.getByText(/Location ON \+ permission ALLOWED/)).toHaveClass(
      "font-medium"
    );
    expect(
      screen.getByText(/Permission denied \(or OS location off/)
    ).not.toHaveClass("font-medium");
    expect(screen.getByText("Result: Browser Location (precise)")).toBeInTheDocument();
    expect(
      screen.getByText(/Mobile ISP location can be especially inaccurate/)
    ).toBeInTheDocument();
    expect(screen.getByText(/VPNs\/proxies can skew/)).toBeInTheDocument();
  });

  it("highlights the permission-denied edge and falls back to IP", () => {
    const steps: LocationStep[] = [
      step({ id: "browser-geolocation", status: "failed", reason: "permission-denied" }),
      step({ id: "reverse-geocode", status: "skipped" }),
      step({ id: "ip-geolocation", status: "success" }),
    ];
    const result: NormalizedLocation = { country: "United States", source: "ip", hints: {} };

    render(<LocationGraph status="success" steps={steps} result={result} />);

    expect(screen.getByText(/Permission denied \(or OS location off/)).toHaveClass(
      "font-medium"
    );
    expect(screen.getByText(/Location ON \+ permission ALLOWED/)).not.toHaveClass(
      "font-medium"
    );
    expect(screen.getByText("Result: IP Location (approximate)")).toBeInTheDocument();
  });

  it("highlights the position-unavailable edge distinctly from permission-denied", () => {
    const steps: LocationStep[] = [
      step({ id: "browser-geolocation", status: "failed", reason: "position-unavailable" }),
      step({ id: "reverse-geocode", status: "skipped" }),
      step({ id: "ip-geolocation", status: "success" }),
    ];
    const result: NormalizedLocation = { country: "United States", source: "ip", hints: {} };

    render(<LocationGraph status="success" steps={steps} result={result} />);

    expect(
      screen.getByText(/Position unavailable \/ OS location off/)
    ).toHaveClass("font-medium");
    expect(screen.getByText(/Permission denied \(or OS location off/)).not.toHaveClass(
      "font-medium"
    );
  });

  it("shows the final failure state when every method fails", () => {
    const steps: LocationStep[] = [
      step({ id: "browser-geolocation", status: "failed", reason: "permission-denied" }),
      step({ id: "reverse-geocode", status: "skipped" }),
      step({ id: "ip-geolocation", status: "failed", detail: "network down" }),
    ];

    render(<LocationGraph status="error" steps={steps} result={null} />);

    expect(screen.getByText("Result: All methods failed")).toBeInTheDocument();
  });
});
