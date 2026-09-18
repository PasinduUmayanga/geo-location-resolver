import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LocationSteps from "./LocationSteps.tsx";
import type { LocationStep } from "../types/location.ts";

const steps: LocationStep[] = [
  { id: "browser-geolocation", label: "Browser Geolocation", status: "success", detail: "accuracy ±25m" },
  { id: "reverse-geocode", label: "Reverse Geocode", status: "failed", detail: "geocode down" },
  { id: "ip-geolocation", label: "IP Geolocation Fallback", status: "trying" },
];

describe("LocationSteps", () => {
  it("renders every step with its label and status", () => {
    render(<LocationSteps steps={steps} />);

    expect(screen.getByText("Browser Geolocation")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("accuracy ±25m")).toBeInTheDocument();

    expect(screen.getByText("Reverse Geocode")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("geocode down")).toBeInTheDocument();

    expect(screen.getByText("IP Geolocation Fallback")).toBeInTheDocument();
    expect(screen.getByText("Trying…")).toBeInTheDocument();
  });

  it("renders a skipped step", () => {
    render(
      <LocationSteps
        steps={[
          {
            id: "ip-geolocation",
            label: "IP Geolocation Fallback",
            status: "skipped",
            detail: "browser location resolved",
          },
        ]}
      />
    );

    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(screen.getByText("browser location resolved")).toBeInTheDocument();
  });
});
