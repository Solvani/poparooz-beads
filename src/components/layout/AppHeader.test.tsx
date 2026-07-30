import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("renders the text wordmark, product name, and local privacy statement", () => {
    render(<AppHeader />);

    const header = screen.getByRole("banner");
    expect(header).toHaveTextContent("Poparooz");
    expect(header).toHaveTextContent("Pattern Maker");
    expect(header).toHaveTextContent(
      "Your image is processed on this device and is not uploaded.",
    );
    expect(header.querySelector("img")).not.toBeInTheDocument();
  });
});
