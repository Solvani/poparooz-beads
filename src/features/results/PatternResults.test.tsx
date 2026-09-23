import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PatternResultDetails, PatternResults } from "./PatternResults";
import { createManyColors, createResultFixture } from "./test/result-fixture";

afterEach(cleanup);

const focusProps = {
  patternBackground: "white",
  focusedColorIndex: null,
  onFocusColor: vi.fn(),
  onClearHighlight: vi.fn(),
} as const;

describe("PatternResults", () => {
  it("renders an explicit no-beads state without manufacturing a public result", () => {
    render(
      <PatternResultDetails
        {...focusProps}
        edited
        view={{
          summary: {
            width: 2,
            height: 2,
            patternSize: "2 × 2",
            actualColors: 0,
            actualColorsLabel: "0",
            totalBeads: 0,
            totalBeadsLabel: "0",
            boardsLabel: "1 board",
            transparentPositions: 4,
            transparentPositionsLabel: "4 empty positions",
          },
          colors: [],
          materials: [],
          boardLayout: {
            boardCount: 1,
            boardCountLabel: "1 board",
            boardColumns: 1,
            boardRows: 1,
            dimensionsLabel: "1 column × 1 row",
            accessibilityLabel: "Board layout, 1 board.",
            previewKind: "tiles",
            previewColumns: 1,
            previewRows: 1,
            tiles: [],
          },
        }}
        status="success"
        selectedColorSetLabel="24-Color Set"
      />,
    );
    expect(screen.getByText("No beads required")).toBeInTheDocument();
    expect(screen.getByText("0 colors")).toBeInTheDocument();
    expect(screen.getByText("None needed")).toBeInTheDocument();
    expect(
      screen.getByText("Results updated from your local pattern edits."),
    ).toBeInTheDocument();
  });

  it("renders the frozen result hierarchy from one public result", () => {
    render(
      <PatternResults
        {...focusProps}
        pattern={createResultFixture({
          colors: [
            { index: 0, beadCount: 5, code: "A4" },
            { index: 1, beadCount: 2, code: "A10" },
          ],
        })}
        status="success"
        selectedColorSetLabel="72-Color Set"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Pattern Summary" }),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole("heading", { name: "Recommended Board Setup" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bead Requirements" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Board Layout" })).toBeNull();
    expect(screen.getByText("48-Color Set")).toBeInTheDocument();
    expect(screen.getByText("Generation Color Set")).toBeInTheDocument();
    expect(screen.getByText("None needed")).toBeInTheDocument();
    expect(screen.getByText("Full Background")).toBeInTheDocument();
    expect(screen.getByText("72-Color Set")).toBeInTheDocument();
  });

  it("renders bead and refill quantities from materials when colors disagree", () => {
    const pattern = createResultFixture({
      width: 1001,
      height: 1,
      transparentPositions: 0,
      colors: [{ index: 0, beadCount: 1001, code: "A4" }],
    });

    render(
      <PatternResults
        {...focusProps}
        pattern={{
          ...pattern,
          colors: [{ ...pattern.colors[0]!, beadCount: 1 }],
        }}
        status="success"
        selectedColorSetLabel="24-Color Set"
      />,
    );

    expect(
      screen.getByRole("button", { name: "A4, 1,001 beads" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("1 refill pack")).toHaveTextContent("×1");
    expect(screen.queryByRole("button", { name: "A4, 1 bead" })).toBeNull();
  });

  it.each([
    ["dirty", "These details belong to your previous pattern."],
    [
      "regenerating",
      "Previous pattern details remain visible until the update is ready.",
    ],
    [
      "aborted",
      "Pattern update stopped. These previous pattern details remain available.",
    ],
    [
      "error",
      "Pattern update failed. These previous pattern details remain available.",
    ],
  ] as const)("announces retained details while %s", (status, message) => {
    render(
      <PatternResults
        {...focusProps}
        pattern={createResultFixture()}
        status={status}
        selectedColorSetLabel="72-Color Set"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("keeps expansion for the same result and resets when a new keyed result mounts", async () => {
    const first = createResultFixture({
      width: 10,
      height: 1,
      transparentPositions: 0,
      colors: createManyColors(10),
    });
    const second = createResultFixture({
      width: 9,
      height: 1,
      transparentPositions: 0,
      colors: createManyColors(9),
    });
    const view = render(
      <PatternResults
        {...focusProps}
        key="first"
        pattern={first}
        status="success"
        selectedColorSetLabel="72-Color Set"
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Show All Colors/ }),
    );
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      10,
    );
    view.rerender(
      <PatternResults
        {...focusProps}
        key="first"
        pattern={first}
        status="dirty"
        selectedColorSetLabel="72-Color Set"
      />,
    );
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      10,
    );
    view.rerender(
      <PatternResults
        {...focusProps}
        key="second"
        pattern={second}
        status="success"
        selectedColorSetLabel="221-Color Set"
      />,
    );
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      6,
    );
  });

  it("shows a safe view error without exposing invalid result fields", () => {
    const pattern = createResultFixture();
    render(
      <PatternResults
        {...focusProps}
        pattern={{
          ...pattern,
          totals: { ...pattern.totals, totalBeads: -1 },
        }}
        status="success"
        selectedColorSetLabel="72-Color Set"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "We couldn’t display these pattern details.",
    );
    expect(screen.queryByText("P01")).toBeNull();
  });
});
