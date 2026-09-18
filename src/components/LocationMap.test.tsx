import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LocationMap from "./LocationMap.tsx";

describe("LocationMap", () => {
  it("renders an OpenStreetMap embed iframe centered on the coordinates", () => {
    render(<LocationMap latitude={37.7749} longitude={-122.4194} />);

    const iframe = screen.getByTitle("Map showing the resolved location");
    const src = iframe.getAttribute("src");

    expect(src).toContain("https://www.openstreetmap.org/export/embed.html");
    expect(src).toContain("bbox=-122.4294%2C37.7649%2C-122.4094%2C37.7849");
    expect(src).toContain("marker=37.7749%2C-122.4194");
  });

  it("links out to the full OpenStreetMap view centered on the same point", () => {
    render(<LocationMap latitude={37.7749} longitude={-122.4194} />);

    const link = screen.getByRole("link", { name: /view larger map/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/?mlat=37.7749&mlon=-122.4194#map=15/37.7749/-122.4194"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });
});
