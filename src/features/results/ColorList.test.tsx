import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColorList, DEFAULT_VISIBLE_COLORS } from "./ColorList";
import type { ColorRowView } from "./result.types";

afterEach(cleanup);

function rows(count: number): readonly ColorRowView[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    code: `P${index + 1}`,
    name: `Color ${index + 1}`,
    hex: "#123456",
    beadCount: index + 1,
    beadCountLabel: `${index + 1} beads`,
  }));
}

function renderList(
  colors: readonly ColorRowView[],
  focusedColorIndex: number | null = null,
  onFocusColor = vi.fn(),
  onClearHighlight = vi.fn(),
) {
  return render(
    <ColorList
      colors={colors}
      focusedColorIndex={focusedColorIndex}
      onFocusColor={onFocusColor}
      onClearHighlight={onClearHighlight}
    />,
  );
}

describe("ColorList", () => {
  it("shows a compact six-row preview with table labels and the total", () => {
    renderList(rows(10));
    expect(DEFAULT_VISIBLE_COLORS).toBe(6);
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      6,
    );
    expect(
      screen.getByRole("heading", { name: "Bead Requirements" }),
    ).toBeInTheDocument();
    expect(screen.getByText("10 colors")).toBeInTheDocument();
    expect(document.querySelector(".color-list__header")).toHaveTextContent(
      "ColorPoparooz CodeBeads",
    );
  });

  it("expands and collapses all colors with accessible native controls", async () => {
    renderList(rows(10));
    const toggle = screen.getByRole("button", {
      name: "Show All Colors (10)",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      10,
    );
    expect(
      screen.getByRole("button", { name: "Show Fewer Colors (10)" }),
    ).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(
      screen.getByRole("button", { name: "Show Fewer Colors (10)" }),
    );
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      6,
    );
  });

  it("does not render a toggle for six or fewer colors", () => {
    renderList(rows(6));
    expect(
      screen.queryByRole("button", { name: /Show All Colors/ }),
    ).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });

  it("bounds the collapsed DOM for 512 colors and expands only on request", async () => {
    renderList(rows(512));
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      6,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Show All Colors (512)" }),
    );
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      512,
    );
  });

  it("selects one color and provides the canonical clear action", async () => {
    const onFocusColor = vi.fn();
    const onClearHighlight = vi.fn();
    renderList(rows(3), 1, onFocusColor, onClearHighlight);

    expect(screen.getByRole("button", { name: "P2, 2 beads" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByText("P2")).toHaveLength(2);
    expect(screen.getByText("Highlighted")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "P3, 3 beads" }));
    expect(onFocusColor).toHaveBeenCalledWith(2);

    await userEvent.click(
      screen.getByRole("button", { name: "Clear Highlight" }),
    );
    expect(onClearHighlight).toHaveBeenCalledOnce();
  });
});
