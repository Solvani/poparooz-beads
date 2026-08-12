import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PatternResults } from "./PatternResults";
import { createManyColors, createResultFixture } from "./test/result-fixture";

afterEach(cleanup);

const focusProps = {
  focusedColorIndex: null,
  onFocusColor: vi.fn(),
  onClearHighlight: vi.fn(),
} as const;

describe("PatternResults", () => {
  it("renders summary, colors, and board layout from one public result", () => {
    render(
      <PatternResults
        {...focusProps}
        pattern={createResultFixture()}
        status="success"
        selectedColorSetLabel="72-Color Set"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Pattern Summary" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Colors" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Board Layout" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Selected Bead Color Set")).toBeInTheDocument();
    expect(screen.getByText("72-Color Set")).toBeInTheDocument();
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
      screen.getByRole("button", { name: "Show all colors" }),
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
      8,
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
