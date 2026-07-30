import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PatternSummary } from "./PatternSummary";

afterEach(cleanup);

describe("PatternSummary", () => {
  it("renders result values as a semantic definition list", () => {
    render(
      <PatternSummary
        summary={{
          width: 40,
          height: 30,
          patternSize: "40 × 30",
          actualColors: 2,
          actualColorsLabel: "2",
          totalBeads: 1199,
          totalBeadsLabel: "1,199",
          boardsLabel: "2 boards",
          transparentPositions: 1,
          transparentPositionsLabel: "1 transparent position",
        }}
      />,
    );
    expect(screen.getAllByRole("term")).toHaveLength(4);
    expect(screen.getAllByRole("definition")).toHaveLength(4);
    expect(screen.getByText("Pattern Size")).toBeInTheDocument();
    expect(screen.getByText("40 × 30")).toBeInTheDocument();
    expect(screen.getByText("1,199")).toBeInTheDocument();
    expect(screen.getByText("2 boards")).toBeInTheDocument();
    expect(screen.getByText("1 transparent position")).toBeInTheDocument();
  });
});
