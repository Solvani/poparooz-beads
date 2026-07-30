import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

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

describe("ColorList", () => {
  it("shows only eight rows by default while announcing the total", () => {
    render(<ColorList colors={rows(10)} />);
    expect(DEFAULT_VISIBLE_COLORS).toBe(8);
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      8,
    );
    expect(screen.getByText("10 total")).toBeInTheDocument();
  });

  it("expands and collapses all colors with accessible native controls", async () => {
    render(<ColorList colors={rows(10)} />);
    const toggle = screen.getByRole("button", { name: "Show all colors" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      10,
    );
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      8,
    );
  });

  it("does not render a toggle for eight or fewer colors", () => {
    render(<ColorList colors={rows(8)} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("bounds the collapsed DOM for 512 colors and expands only on request", async () => {
    render(<ColorList colors={rows(512)} />);
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      8,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Show all colors" }),
    );
    expect(document.querySelectorAll("#pattern-color-list > li")).toHaveLength(
      512,
    );
  });
});
