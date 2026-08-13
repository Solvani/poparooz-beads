import { describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import {
  PATTERN_EXPORT_CELL_SIZE,
  PATTERN_EXPORT_LEGEND_ROW_HEIGHT,
  PATTERN_EXPORT_LOGO_MAX_HEIGHT,
  renderPatternExport,
  type PatternExportLogo,
} from "./pattern-export";

const logo = Object.freeze({
  source: {} as CanvasImageSource,
  width: 1154,
  height: 428,
});

function exportCanvas() {
  const context = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
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

function render(
  pattern: PublicPatternResult = createPublicPattern(),
  target = exportCanvas(),
  exportLogo: PatternExportLogo = logo,
) {
  return {
    result: renderPatternExport(
      { pattern, selectedColorSetLabel: "72-Color Set" },
      exportLogo,
      () => target.canvas,
    ),
    target,
  };
}

function createPatternWithColors(size: number, colorCount: number) {
  const indices = new Uint16Array(size * size);
  const beadCounts = Array.from({ length: colorCount }, () => 0);
  for (let index = 0; index < indices.length; index += 1) {
    const colorIndex = index % colorCount;
    indices[index] = colorIndex;
    beadCounts[colorIndex]! += 1;
  }
  const colors = Object.freeze(
    beadCounts.map((beadCount, index) => {
      const series = index < 32 ? "A" : "B";
      const number = (index % 32) + 1;
      return Object.freeze({
        index,
        color: Object.freeze({
          brand: "Poparooz" as const,
          code: `${series}${number}`,
          hex: `#${index.toString(16).padStart(6, "0").toUpperCase()}`,
        }),
        beadCount,
      });
    }),
  );
  const base = createPublicPattern(size, size, indices);
  return Object.freeze({
    ...base,
    matrix: Object.freeze({ ...base.matrix, colorIndices: indices }),
    colors,
    materials: Object.freeze(
      colors.map((entry) =>
        Object.freeze({
          patternColorIndex: entry.index,
          color: entry.color,
          beadCount: entry.beadCount,
        }),
      ),
    ),
    totals: Object.freeze({
      ...base.totals,
      totalBeads: size * size,
      transparentPositions: 0,
      colorCount,
    }),
  }) satisfies PublicPatternResult;
}

describe("renderPatternExport", () => {
  it.each([
    [40, 3],
    [60, 4],
    [80, 6],
    [104, 6],
  ])(
    "uses deterministic geometry and %i-preset legend columns",
    (size, expectedColumns) => {
      const first = render(createPatternWithColors(size, 15));
      const second = render(createPatternWithColors(size, 15));
      expect(first.result.ok).toBe(true);
      expect(second.result.ok).toBe(true);
      if (!first.result.ok || !second.result.ok) return;
      expect(first.result.geometry).toEqual(second.result.geometry);
      expect(first.result.geometry.gridWidth).toBe(
        size * PATTERN_EXPORT_CELL_SIZE,
      );
      expect(first.result.geometry.gridHeight).toBe(
        size * PATTERN_EXPORT_CELL_SIZE,
      );
      expect(first.result.geometry.legendColumns).toBe(expectedColumns);
      expect(first.result.geometry.legendRows).toBe(
        Math.ceil(15 / expectedColumns),
      );
      expect(first.result.filename).toBe(
        `poparooz-pattern-${size}x${size}-code.png`,
      );
      expect(first.target.canvas.width).toBe(first.result.geometry.width);
      expect(first.target.canvas.height).toBe(first.result.geometry.height);
    },
  );

  it.each([2, 15, 32, 64])(
    "derives height from exactly %i used colors without reserved rows",
    (colorCount) => {
      const { result } = render(createPatternWithColors(104, colorCount));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.geometry.legendRows).toBe(
        Math.ceil(colorCount / result.geometry.legendColumns),
      );
      expect(result.geometry.height).toBe(
        result.geometry.gridY +
          result.geometry.gridHeight +
          32 +
          36 +
          16 +
          result.geometry.legendRows * PATTERN_EXPORT_LEGEND_ROW_HEIGHT +
          32,
      );
      expect(result.geometry.height).toBeLessThanOrEqual(3420);
      if (colorCount === 64) expect(result.geometry.height).toBe(3420);
    },
  );

  it("renders the official logo with preserved aspect ratio and no text fallback", () => {
    const { result, target } = render();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.geometry.logoHeight).toBe(PATTERN_EXPORT_LOGO_MAX_HEIGHT);
    expect(result.geometry.logoWidth / result.geometry.logoHeight).toBeCloseTo(
      logo.width / logo.height,
    );
    expect(target.context.drawImage).toHaveBeenCalledWith(
      logo.source,
      32,
      32,
      result.geometry.logoWidth,
      result.geometry.logoHeight,
    );
    const labels = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text));
    expect(labels).not.toContain("Poparooz");
  });

  it("does not upscale an official logo smaller than 96 pixels high", () => {
    const smallLogo = Object.freeze({
      source: {} as CanvasImageSource,
      width: 80,
      height: 40,
    });
    const { result } = render(createPublicPattern(), exportCanvas(), smallLogo);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.geometry.logoWidth).toBe(80);
    expect(result.geometry.logoHeight).toBe(40);
  });

  it("renders canonical metadata, codes, counts, and no code for transparency", () => {
    const target = exportCanvas();
    const result = renderPatternExport(
      {
        pattern: createPublicPattern(),
        selectedColorSetLabel: "48-Color Set",
      },
      logo,
      () => target.canvas,
    );
    expect(result.ok).toBe(true);
    const labels = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text));
    expect(labels).toContain("Color Code Pattern");
    expect(labels).toContain("Pattern Size: 2 × 2");
    expect(labels).toContain("Colors Used: 2 · Total Beads: 3");
    expect(labels).toContain("Bead Color Set: 48-Color Set");
    expect(labels).not.toContain(expect.stringContaining("Actual Colors"));
    expect(labels.filter((label) => label === "A1")).toHaveLength(3);
    expect(labels.filter((label) => label === "B1")).toHaveLength(2);
    expect(labels.filter((label) => /^(?:A1|B1)$/.test(label))).toHaveLength(5);
    expect(labels).toContain("2 beads");
    expect(labels).toContain("1 beads");
    expect(target.context.fillRect).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      30,
      30,
    );
  });

  it("renders every used legend color exactly once with its swatch and count", () => {
    const pattern = createPatternWithColors(40, 15);
    const { result, target } = render(pattern);
    expect(result.ok).toBe(true);
    const labels = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text));
    for (const entry of pattern.colors) {
      expect(labels.filter((label) => label === entry.color.code)).toHaveLength(
        entry.beadCount + 1,
      );
    }
    expect(target.context.fillRect).toHaveBeenCalledTimes(
      1 + 40 * 40 + pattern.colors.length,
    );
  });

  it("omits codes for excluded background positions and retains an interior white code", () => {
    const target = exportCanvas();
    const base = createPublicPattern(
      3,
      3,
      [65535, 65535, 65535, 65535, 1, 65535, 65535, 65535, 65535],
    );
    const white = Object.freeze({
      index: 1,
      color: Object.freeze({
        brand: "Poparooz" as const,
        code: "H2",
        hex: "#FEFFFF",
      }),
      beadCount: 1,
    });
    const pattern = Object.freeze({
      ...base,
      colors: Object.freeze([white]),
      materials: Object.freeze([
        Object.freeze({
          patternColorIndex: 1,
          color: white.color,
          beadCount: 1,
        }),
      ]),
    });

    expect(
      renderPatternExport(
        { pattern, selectedColorSetLabel: "221-Color Set" },
        logo,
        () => target.canvas,
      ).ok,
    ).toBe(true);
    const cellCodes = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text))
      .filter((label) => /^[A-HM]\d{1,2}$/.test(label));
    expect(cellCodes).toEqual(["H2", "H2"]);
  });

  it("renders no code for H02 fringe positions and retains a cream subject code", () => {
    const target = exportCanvas();
    const base = createPublicPattern(3, 1, [65535, 65535, 1]);
    const cream = Object.freeze({
      index: 1,
      color: Object.freeze({
        brand: "Poparooz" as const,
        code: "A2",
        hex: "#FFFFD5",
      }),
      beadCount: 1,
    });
    const pattern = Object.freeze({
      ...base,
      colors: Object.freeze([cream]),
      materials: Object.freeze([
        Object.freeze({
          patternColorIndex: 1,
          color: cream.color,
          beadCount: 1,
        }),
      ]),
    });

    expect(
      renderPatternExport(
        { pattern, selectedColorSetLabel: "221-Color Set" },
        logo,
        () => target.canvas,
      ).ok,
    ).toBe(true);
    const cellCodes = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text))
      .filter((label) => /^[A-HM]\d{1,2}$/.test(label));
    expect(cellCodes).toEqual(["A2", "A2"]);
  });

  it("fails closed for invalid logo geometry, unknown indices, and canvas failures", () => {
    expect(
      renderPatternExport(
        {
          pattern: createPublicPattern(),
          selectedColorSetLabel: "24-Color Set",
        },
        { ...logo, height: 0 },
        () => exportCanvas().canvas,
      ),
    ).toEqual({
      ok: false,
      message: "We couldn’t prepare this pattern download.",
    });
    expect(
      renderPatternExport(
        {
          pattern: createPublicPattern(1, 1, [9]),
          selectedColorSetLabel: "24-Color Set",
        },
        logo,
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
        logo,
        () => null,
      ),
    ).toEqual({
      ok: false,
      message: "We couldn’t prepare this pattern download.",
    });
  });
});
