import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ColorRowView, PatternSummaryView } from "./result.types";
import { ResultRecommendations } from "./ResultRecommendations";

afterEach(cleanup);

function summary(size = 60): PatternSummaryView {
  return {
    width: size,
    height: size,
    patternSize: `${size} × ${size}`,
    totalBeads: size * size,
    totalBeadsLabel: String(size * size),
    boardsLabel: "1 board",
    transparentPositions: 0,
    transparentPositionsLabel: null,
    actualColors: 2,
    actualColorsLabel: "2",
  };
}

function colors(codes: readonly string[]): readonly ColorRowView[] {
  return codes.map((code, index) => ({
    index,
    code,
    name: `Color ${index + 1}`,
    hex: "#112233",
    beadCount: 1,
    beadCountLabel: "1 bead",
  }));
}

describe("ResultRecommendations", () => {
  it("renders the required bead set and board recommendation without customer recommendation copy", () => {
    render(
      <ResultRecommendations
        summary={summary()}
        colors={colors(["A4", "A10"])}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Bead Set Requirements" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Required Bead Set" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Recommended Bead Set" }),
    ).toBeNull();
    expect(screen.queryByText("Recommended for Your Image")).toBeNull();
    expect(screen.getByText("48-Color Set")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Smallest set that includes every color used in your pattern.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1 × 78×78 Board")).toBeInTheDocument();
    expect(screen.getByText("Alternative Board Setup")).toBeInTheDocument();
    expect(
      screen.getByText("4 × 52×52 Boards · 2×2 layout · 104×104 coverage"),
    ).toBeInTheDocument();
    expect(screen.getByText("14 × 14 cm each")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("updates from a new successful pattern result and fails safely when no match exists", () => {
    const view = render(
      <ResultRecommendations summary={summary(40)} colors={colors(["A4"])} />,
    );
    expect(screen.getByText("24-Color Set")).toBeInTheDocument();
    expect(screen.getByText("1 × 52×52 Board")).toBeInTheDocument();
    expect(screen.queryByText("Alternative Board Setup")).toBeNull();

    view.rerender(
      <ResultRecommendations summary={summary(104)} colors={colors(["A20"])} />,
    );
    expect(screen.getByText("221-Color Set")).toBeInTheDocument();
    expect(screen.getByText("1 × 104×104 Board")).toBeInTheDocument();
    expect(screen.getByText("Alternative Board Setup")).toBeInTheDocument();

    view.rerender(
      <ResultRecommendations
        summary={summary(105)}
        colors={colors(["UNKNOWN"])}
      />,
    );
    expect(
      screen.getByText("No published set covers every color in this pattern."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No approved board setup is available for this pattern size.",
      ),
    ).toBeInTheDocument();
  });
});
