import { render, screen, within } from "@testing-library/react";
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
    const desktop = within(screen.getByTestId("detection-tree"));

    expect(desktop.getByText(/Location ON \+ permission ALLOWED/)).toHaveClass(
      "font-medium"
    );
    expect(
      desktop.getByText(/Permission denied \(or OS location off/)
    ).not.toHaveClass("font-medium");
    // The result and caveats render in both the mobile stepper and the desktop tree.
    expect(screen.getAllByText("Result: Browser Location (precise)")).toHaveLength(2);
    expect(
      screen.getAllByText(/Mobile ISP location can be especially inaccurate/)
    ).toHaveLength(2);
    expect(screen.getAllByText(/VPNs\/proxies can skew/)).toHaveLength(2);
  });

  it("highlights the permission-denied edge and falls back to IP", () => {
    const steps: LocationStep[] = [
      step({ id: "browser-geolocation", status: "failed", reason: "permission-denied" }),
      step({ id: "reverse-geocode", status: "skipped" }),
      step({ id: "ip-geolocation", status: "success" }),
    ];
    const result: NormalizedLocation = { country: "United States", source: "ip", hints: {} };

    render(<LocationGraph status="success" steps={steps} result={result} />);
    const desktop = within(screen.getByTestId("detection-tree"));

    expect(desktop.getByText(/Permission denied \(or OS location off/)).toHaveClass(
      "font-medium"
    );
    expect(desktop.getByText(/Location ON \+ permission ALLOWED/)).not.toHaveClass(
      "font-medium"
    );
    expect(screen.getAllByText("Result: IP Location (approximate)")).toHaveLength(2);
  });

  it("highlights the position-unavailable edge distinctly from permission-denied", () => {
    const steps: LocationStep[] = [
      step({ id: "browser-geolocation", status: "failed", reason: "position-unavailable" }),
      step({ id: "reverse-geocode", status: "skipped" }),
      step({ id: "ip-geolocation", status: "success" }),
    ];
    const result: NormalizedLocation = { country: "United States", source: "ip", hints: {} };

    render(<LocationGraph status="success" steps={steps} result={result} />);
    const desktop = within(screen.getByTestId("detection-tree"));

    expect(
      desktop.getByText(/Position unavailable \/ OS location off/)
    ).toHaveClass("font-medium");
    expect(desktop.getByText(/Permission denied \(or OS location off/)).not.toHaveClass(
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

    expect(screen.getAllByText("Result: All methods failed")).toHaveLength(2);
  });

  describe("mobile/tablet viewport support", () => {
    // Tailwind's `xl` breakpoint (1280px) is the cutover — roughly where the
    // horizontal tree's own minimum width actually fits without scrolling.
    // Everything below it (phones like a Xiaomi 15 Ultra at ~450-460px CSS
    // width, tablets, most laptop windows) gets the vertical stepper instead.
    const steps: LocationStep[] = [
      step({ id: "browser-geolocation", status: "failed", reason: "permission-denied" }),
      step({ id: "reverse-geocode", status: "skipped" }),
      step({ id: "ip-geolocation", status: "success" }),
    ];
    const result: NormalizedLocation = { country: "United States", source: "ip", hints: {} };

    it("renders a vertical stepper hidden at xl+ and a horizontal tree hidden below xl", () => {
      render(<LocationGraph status="success" steps={steps} result={result} />);

      const mobile = screen.getByTestId("detection-tree-mobile");
      const desktop = screen.getByTestId("detection-tree");

      expect(mobile).toHaveClass("xl:hidden");
      expect(desktop).toHaveClass("hidden");
      expect(desktop).toHaveClass("xl:block");
    });

    it("shows the same step statuses and IP caveats in the mobile stepper as the desktop tree", () => {
      render(<LocationGraph status="success" steps={steps} result={result} />);
      const mobile = within(screen.getByTestId("detection-tree-mobile"));

      expect(mobile.getByText("Browser Geolocation")).toBeInTheDocument();
      expect(mobile.getAllByText("Failed")).toHaveLength(1);
      expect(mobile.getByText("IP Geolocation Fallback")).toBeInTheDocument();
      expect(
        mobile.getByText(/Mobile ISP location can be especially inaccurate/)
      ).toBeInTheDocument();
      expect(mobile.getByText(/VPNs\/proxies can skew/)).toBeInTheDocument();
      expect(mobile.getByText("Result: IP Location (approximate)")).toBeInTheDocument();
    });
  });
});
