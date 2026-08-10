import { describe, expect, it, vi } from "vitest";

import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import {
  PATTERN_EXPORT_CELL_SIZE,
  renderPatternExport,
} from "./pattern-export";

function exportCanvas() {
  const context = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement;
  return { canvas, context };
}

describe("renderPatternExport", () => {
  it.each([40, 60, 80, 104])(
    "uses deterministic geometry for the %i by %i preset",
    (size) => {
      const target = exportCanvas();
      const pattern = createPublicPattern(
        size,
        size,
        new Uint16Array(size * size),
      );
      const result = renderPatternExport(
        { pattern, selectedColorSetLabel: "72-Color Set" },
        () => target.canvas,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.geometry.gridWidth).toBe(size * PATTERN_EXPORT_CELL_SIZE);
      expect(result.geometry.gridHeight).toBe(size * PATTERN_EXPORT_CELL_SIZE);
      expect(result.filename).toBe(`poparooz-pattern-${size}x${size}-code.png`);
      expect(target.canvas.width).toBe(result.geometry.width);
      expect(target.canvas.height).toBe(result.geometry.height);
    },
  );

  it("renders public codes, metadata, counts, and no code for transparency", () => {
    const target = exportCanvas();
    const result = renderPatternExport(
      {
        pattern: createPublicPattern(),
        selectedColorSetLabel: "48-Color Set",
      },
      () => target.canvas,
    );
    expect(result.ok).toBe(true);
    const labels = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text));
    expect(labels).toContain("Poparooz");
    expect(labels).toContain("Pattern Size: 2 × 2");
    expect(labels).toContain("Selected Bead Color Set: 48-Color Set");
    expect(labels).toContain("Actual Colors: 2 · Total Beads: 3");
    expect(labels.filter((label) => label === "A1")).toHaveLength(2);
    expect(labels.filter((label) => label === "B1")).toHaveLength(1);
    expect(labels).toContain("A1  2 beads");
    expect(labels).toContain("B1  1 beads");
  });

  it("fails closed for unknown color indices and canvas failures", () => {
    expect(
      renderPatternExport(
        {
          pattern: createPublicPattern(1, 1, [9]),
          selectedColorSetLabel: "24-Color Set",
        },
        () => exportCanvas().canvas,
      ),
    ).toEqual({
      ok: false,
      message: "We couldn’t prepare this pattern download.",
    });
    expect(
      renderPatternExport(
        {
          pattern: createPublicPattern(),
          selectedColorSetLabel: "24-Color Set",
        },
        () => null,
      ),
    ).toEqual({
      ok: false,
      message: "We couldn’t prepare this pattern download.",
    });
  });
});
