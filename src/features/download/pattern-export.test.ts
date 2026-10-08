import { describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import { buildPatternBoardLayout } from "../../domain/pattern/board-layout";
import { selectPatternDownload } from "./pattern-download-selection";
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
  it.each([40, 52, 60, 80, 104])(
    "qualifies G1 cells, one board, edited codes and reading guides at %i",
    (size) => {
      const values = new Uint16Array(size * size);
      values[1] = 1;
      values[2] = 65535;
      const base = createPublicPattern(size, size, values);
      const boardLayout = buildPatternBoardLayout(base.matrix, base.totals, {
        id: "poparooz-board-104",
        version: "1.0.0",
        shape: "square",
        pegGrid: { columns: 104, rows: 104 },
        tiling: { supported: true, sharedEdgePegs: false },
      });
      const pattern = { ...base, boardLayout };
      expect(pattern.matrix.colorIndices).toHaveLength(size * size);
      expect(boardLayout.boardCount).toBe(1);
      expect(boardLayout.tiles[0]).toMatchObject({
        originX: 0,
        originY: 0,
        coveredWidth: size,
        coveredHeight: size,
      });
      expect(boardLayout.outsidePatternPegCount).toBe(104 * 104 - size * size);
      const original = createPublicPattern(
        size,
        size,
        new Uint16Array(size * size),
      );
      const selection = selectPatternDownload({
        generationIdentity: 1,
        originalPattern: original,
        customerResult: { kind: "edited", edited: true, pattern },
        selectedColorSetLabel: "72-Color Set",
      });
      expect(selection.kind).toBe("ready");
      if (selection.kind !== "ready")
        throw new Error("Expected edited download");
      expect(selection.input.pattern).toBe(pattern);
      const before = Array.from(values);
      const { result, target } = render(selection.input.pattern);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Export failed");
      const g = result.geometry;
      expect(g.gridWidth).toBe(size * 24);
      expect(g.gridHeight).toBe(size * 24);
      const fills = vi.mocked(target.context.fillRect).mock.calls;
      expect(fills.filter(([, , w, h]) => w === 24 && h === 24)).toHaveLength(
        size * size,
      );
      const labels = vi
        .mocked(target.context.fillText)
        .mock.calls.map(([text]) => text);
      expect(labels.filter((label) => label === "A1")).toHaveLength(
        size * size - 2 + 1,
      );
      expect(labels.filter((label) => label === "B1")).toHaveLength(2);
      expect(labels).toContain("Required Board Layout: 1 × poparooz-board-104");
      expect(labels).toContain(
        "PNG reading aid · Not a calibrated actual-size print",
      );
      expect(labels).not.toContain("65535");
      for (let position = 10; position < size; position += 10) {
        expect(target.context.fillRect).toHaveBeenCalledWith(
          g.gridX + position * 24 - 1.5,
          g.gridY,
          3,
          g.gridHeight,
        );
        expect(target.context.fillRect).toHaveBeenCalledWith(
          g.gridX,
          g.gridY + position * 24 - 1.5,
          g.gridWidth,
          3,
        );
      }
      expect(target.context.strokeRect).toHaveBeenCalledWith(
        g.gridX + 2,
        g.gridY + 2,
        g.gridWidth - 4,
        g.gridHeight - 4,
      );
      expect(Array.from(values)).toEqual(before);
      expect(pattern.totals.totalBeads).toBe(size * size - 1);
      expect(pattern.materials.reduce((sum, m) => sum + m.beadCount, 0)).toBe(
        pattern.totals.totalBeads,
      );
    },
  );
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
        `poparooz-pattern-${size}x${size}.png`,
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
          60 +
          36 +
          16 +
          result.geometry.legendRows * PATTERN_EXPORT_LEGEND_ROW_HEIGHT +
          32,
      );
      expect(result.geometry.height).toBeLessThanOrEqual(3572);
      if (colorCount === 64) expect(result.geometry.height).toBe(3572);
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
      60,
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
    expect(labels).toContain("Generation Color Set: 48-Color Set");
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

  it("renders bead counts from materials when colors disagree", () => {
    const base = createPublicPattern();
    const pattern = Object.freeze({
      ...base,
      colors: Object.freeze(
        base.colors.map((entry) => Object.freeze({ ...entry, beadCount: 999 })),
      ),
    });
    const { result, target } = render(pattern);

    expect(result.ok).toBe(true);
    const labels = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text));
    expect(labels).toContain("2 beads");
    expect(labels).toContain("1 beads");
    expect(labels).not.toContain("999 beads");
  });

  it("preserves color legend order while resolving material counts by index", () => {
    const base = createPatternWithColors(3, 3);
    const colorIndices = new Uint16Array([0, 1, 1, 1, 2, 2, 2, 2, 2]);
    const colors = Object.freeze(
      base.colors.map((entry, index) =>
        Object.freeze({ ...entry, beadCount: 100 + index }),
      ),
    );
    const materialsByIndex = new Map<
      number,
      PublicPatternResult["materials"][number]
    >([
      [
        0,
        Object.freeze({
          patternColorIndex: 0,
          color: colors[0]!.color,
          beadCount: 1,
        }),
      ],
      [
        1,
        Object.freeze({
          patternColorIndex: 1,
          color: colors[1]!.color,
          beadCount: 3,
        }),
      ],
      [
        2,
        Object.freeze({
          patternColorIndex: 2,
          color: colors[2]!.color,
          beadCount: 5,
        }),
      ],
    ]);
    const pattern = Object.freeze({
      ...base,
      matrix: Object.freeze({ ...base.matrix, colorIndices }),
      colors,
      materials: Object.freeze([
        materialsByIndex.get(2)!,
        materialsByIndex.get(0)!,
        materialsByIndex.get(1)!,
      ]),
    });
    const { result, target } = render(pattern);

    expect(result.ok).toBe(true);
    const labels = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text));
    const legendStart = labels.indexOf("Bead Requirements");
    expect(labels.slice(legendStart)).toEqual([
      "Bead Requirements",
      "A1",
      "1 beads",
      "A2",
      "3 beads",
      "A3",
      "5 beads",
    ]);
    expect(labels).not.toContain("100 beads");
    expect(labels).not.toContain("101 beads");
    expect(labels).not.toContain("102 beads");
  });

  it("renders every used legend color exactly once with its swatch and count", () => {
    const pattern = createPatternWithColors(40, 15);
    const { result, target } = render(pattern);
    expect(result.ok).toBe(true);
    const labels = vi
      .mocked(target.context.fillText)
      .mock.calls.map(([text]) => String(text));
    for (const entry of pattern.materials) {
      expect(labels.filter((label) => label === entry.color.code)).toHaveLength(
        entry.beadCount + 1,
      );
    }
    expect(target.context.fillRect).toHaveBeenCalledTimes(
      1 + 40 * 40 + 2 * Math.floor((40 - 1) / 5) + pattern.materials.length,
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
