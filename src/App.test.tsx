import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App.tsx";

describe("App", () => {
  it("renders the heading and the Get Location button", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /geo location resolver/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /get location/i })
    ).toBeInTheDocument();
  });
});
