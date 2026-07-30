import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BoardLayoutSummary } from "./BoardLayoutSummary";
import type { BoardLayoutView } from "./result.types";

afterEach(cleanup);

function layout(overrides: Partial<BoardLayoutView> = {}): BoardLayoutView {
  return {
    boardCount: 4,
    boardCountLabel: "4 boards",
    boardColumns: 2,
    boardRows: 2,
    dimensionsLabel: "2 columns × 2 rows",
    accessibilityLabel: "Board layout, 4 boards, 2 columns by 2 rows.",
    previewKind: "tiles",
    previewColumns: 2,
    previewRows: 2,
    tiles: [
      { row: 0, column: 0, label: "Board at row 1, column 1" },
      { row: 0, column: 1, label: "Board at row 1, column 2" },
      { row: 1, column: 0, label: "Board at row 2, column 1" },
      { row: 1, column: 1, label: "Board at row 2, column 2" },
    ],
    ...overrides,
  };
}

describe("BoardLayoutSummary", () => {
  it("renders exact small-layout tiles and an accessible text summary", () => {
    render(<BoardLayoutSummary layout={layout()} />);
    expect(screen.getByText("4 boards")).toBeInTheDocument();
    expect(screen.getByText("2 columns × 2 rows")).toBeInTheDocument();
    expect(
      screen.getByRole("list", {
        name: "Board layout, 4 boards, 2 columns by 2 rows.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("renders one compressed preview and no tile nodes for a large layout", () => {
    render(
      <BoardLayoutSummary
        layout={layout({
          boardCount: 110,
          boardCountLabel: "110 boards",
          boardColumns: 11,
          boardRows: 10,
          dimensionsLabel: "11 columns × 10 rows",
          accessibilityLabel:
            "Board layout, 110 boards, 11 columns by 10 rows.",
          previewKind: "compressed",
          previewColumns: 11,
          previewRows: 10,
          tiles: [],
        })}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "Board layout, 110 boards, 11 columns by 10 rows.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Large board layout preview")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
