import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColorRow } from "./ColorRow";

afterEach(cleanup);

describe("ColorRow", () => {
  it("shows only public identity and bead count with a bordered swatch", () => {
    const view = render(
      <ul>
        <ColorRow
          row={{
            index: 0,
            code: "P01",
            name: "White",
            hex: "#FFFFFF",
            beadCount: 1,
            beadCountLabel: "1 bead",
          }}
          selected={false}
          onSelect={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByText("P01")).toBeInTheDocument();
    expect(screen.getByText("White")).toBeInTheDocument();
    expect(screen.getByText("1 bead")).toBeInTheDocument();
    expect(view.container.querySelector(".color-row__swatch")).toHaveStyle({
      backgroundColor: "rgb(255, 255, 255)",
    });
    expect(view.container.textContent).not.toContain("reference");
  });

  it("renders a code-only identity without a placeholder name", () => {
    const view = render(
      <ul>
        <ColorRow
          row={{
            index: 0,
            code: "A1",
            hex: "#FFFFFF",
            beadCount: 1,
            beadCountLabel: "1 bead",
          }}
          selected={false}
          onSelect={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("1 bead")).toBeInTheDocument();
    expect(
      view.container.querySelector(".color-row__identity span"),
    ).toBeNull();
    expect(view.container.textContent).not.toContain("undefined");
    expect(view.container.textContent).not.toContain("Unknown Color");
  });

  it("exposes an accessible selected control and keeps repeated activation explicit", async () => {
    const onSelect = vi.fn();
    render(
      <ul>
        <ColorRow
          row={{
            index: 3,
            code: "A4",
            hex: "#123456",
            beadCount: 12,
            beadCountLabel: "12 beads",
          }}
          selected
          onSelect={onSelect}
        />
      </ul>,
    );

    const row = screen.getByRole("button", { name: "A4, 12 beads" });
    expect(row).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Highlighted")).toBeInTheDocument();
    await userEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(3);
  });
});
