import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PatternSummary } from "./PatternSummary";

afterEach(cleanup);

describe("PatternSummary", () => {
  it("renders result values as a semantic definition list", () => {
    render(
      <PatternSummary
        selectedColorSetLabel="72-Color Set"
        patternBackground="white"
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
    expect(screen.getAllByRole("term")).toHaveLength(5);
    expect(screen.getAllByRole("definition")).toHaveLength(5);
    expect(screen.getByText("Pattern Size")).toBeInTheDocument();
    expect(screen.getByText("40 × 30")).toBeInTheDocument();
    expect(screen.getByText("1,199")).toBeInTheDocument();
    expect(screen.getByText("Colors Used")).toBeInTheDocument();
    expect(screen.getByText("Bead Color Set")).toBeInTheDocument();
    expect(screen.getByText("72-Color Set")).toBeInTheDocument();
    expect(screen.getByText("Pattern Background")).toBeInTheDocument();
    expect(screen.getByText("Full Background")).toBeInTheDocument();
    expect(screen.queryByText("2 boards")).toBeNull();
    expect(screen.queryByText("1 transparent position")).toBeNull();
  });

  it.each([
    ["white", "Full Background"],
    ["transparent", "Remove Background"],
  ] as const)(
    "presents %s without exposing its internal value",
    (value, label) => {
      const summary = {
        width: 40,
        height: 40,
        patternSize: "40 × 40",
        actualColors: 2,
        actualColorsLabel: "2",
        totalBeads: 1600,
        totalBeadsLabel: "1,600",
        boardsLabel: "1 board",
        transparentPositions: 0,
        transparentPositionsLabel: null,
      };
      const view = render(
        <PatternSummary
          summary={summary}
          selectedColorSetLabel="72-Color Set"
          patternBackground={value}
        />,
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(view.container).not.toHaveTextContent(value);
      expect(summary).toEqual({
        width: 40,
        height: 40,
        patternSize: "40 × 40",
        actualColors: 2,
        actualColorsLabel: "2",
        totalBeads: 1600,
        totalBeadsLabel: "1,600",
        boardsLabel: "1 board",
        transparentPositions: 0,
        transparentPositionsLabel: null,
      });
    },
  );
});
