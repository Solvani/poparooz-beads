import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

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
});
