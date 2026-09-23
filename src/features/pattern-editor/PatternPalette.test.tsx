import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPatternEditorPalette } from "./pattern-document";
import type { PatternDocument } from "./pattern-editor.types";
import { PatternPalette } from "./PatternPalette";

const palette = getPatternEditorPalette();
const document: PatternDocument = {
  width: 2,
  height: 2,
  cells: new Uint16Array([0, 1, 0, 65_535]),
  palette: { paletteId: "poparooz-standard", paletteVersion: "1.0.0" },
  boardProfile: { id: "poparooz-board-104", version: "1.0.0" },
};

afterEach(cleanup);

describe("PatternPalette", () => {
  it("exposes used colors, all 221 authoritative colors, filtering, and accessible selection", async () => {
    const select = vi.fn();
    render(
      <PatternPalette
        document={document}
        selectedPaintColorCode={palette.colors[0]!.code}
        replacePreview={null}
        onSelectPaintColor={select}
        onPreviewReplace={vi.fn()}
        onApplyReplace={vi.fn()}
        onCancelReplace={vi.fn()}
      />,
    );
    const used = screen.getByLabelText("Pattern palette");
    expect(
      within(used).getByRole("button", {
        name: `${palette.colors[0]!.code}, 2 beads`,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(used).getByRole("button", {
        name: `${palette.colors[1]!.code}, 1 beads`,
      }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText("All Poparooz Colors (221)"));
    expect(
      within(
        screen.getByRole("list", { name: "All Poparooz colors" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(221);
    await userEvent.type(screen.getByLabelText("Filter by code"), "M15");
    expect(
      within(
        screen.getByRole("list", { name: "All Poparooz colors" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Select Poparooz M15" }),
    );
    expect(select).toHaveBeenCalledWith("M15");
  });

  it("keeps replace as preview-first and reports affected counts", async () => {
    const preview = vi.fn();
    const view = render(
      <PatternPalette
        document={document}
        selectedPaintColorCode={palette.colors[0]!.code}
        replacePreview={null}
        onSelectPaintColor={vi.fn()}
        onPreviewReplace={preview}
        onApplyReplace={vi.fn()}
        onCancelReplace={vi.fn()}
      />,
    );
    const source = screen.getByLabelText("Source color");
    const target = screen.getByLabelText("Target color");
    await userEvent.selectOptions(source, palette.colors[0]!.code);
    await userEvent.selectOptions(target, palette.colors[2]!.code);
    await userEvent.click(
      screen.getByRole("button", { name: "Preview Replace" }),
    );
    expect(preview).toHaveBeenCalledWith(
      palette.colors[0]!.code,
      palette.colors[2]!.code,
    );
    view.rerender(
      <PatternPalette
        document={document}
        selectedPaintColorCode={palette.colors[0]!.code}
        replacePreview={{
          sourceCode: palette.colors[0]!.code,
          targetCode: palette.colors[2]!.code,
          affectedCount: 2,
        }}
        onSelectPaintColor={vi.fn()}
        onPreviewReplace={preview}
        onApplyReplace={vi.fn()}
        onCancelReplace={vi.fn()}
      />,
    );
    expect(screen.getByText("2 beads affected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("shows the used-color empty state while retaining all colors", async () => {
    const empty = {
      ...document,
      cells: new Uint16Array([65_535, 65_535, 65_535, 65_535]),
    };
    render(
      <PatternPalette
        document={empty}
        selectedPaintColorCode={palette.colors[0]!.code}
        replacePreview={null}
        onSelectPaintColor={vi.fn()}
        onPreviewReplace={vi.fn()}
        onApplyReplace={vi.fn()}
        onCancelReplace={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No colors are currently used."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Source color")).toBeDisabled();
    await userEvent.click(screen.getByText("All Poparooz Colors (221)"));
    expect(
      within(
        screen.getByRole("list", { name: "All Poparooz colors" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(221);
  });
});
