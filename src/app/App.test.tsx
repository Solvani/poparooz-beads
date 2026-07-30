import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the Poparooz header and three empty workspace regions", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toHaveTextContent("Poparooz");
    expect(
      screen.getByRole("main", { name: "Pattern maker workspace" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Start with an image")).toBeInTheDocument();
    expect(
      screen.getByText("Your pattern will appear here."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your pattern details will appear here."),
    ).toBeInTheDocument();
  });

  it("contains no synthetic pattern values or internal customer-forbidden fields", () => {
    const { container } = render(<App />);
    const page = container.textContent ?? "";

    for (const forbidden of [
      "MARD",
      "referenceSystem",
      "referenceCode",
      "referenceName",
      "referenceSeries",
      "variantId",
      "shopifyHandle",
      "29×29",
      "40×40",
    ]) {
      expect(page).not.toContain(forbidden);
    }
  });
});
