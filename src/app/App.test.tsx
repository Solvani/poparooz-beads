import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the engineering baseline placeholder", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Fuse Bead Pattern Generator",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Engineering baseline ready")).toBeInTheDocument();
  });
});
