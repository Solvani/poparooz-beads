import { describe, expect, it, vi } from "vitest";
import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import {
  renderReadingSheetExport,
  READING_GRID_X,
  READING_GRID_Y,
} from "./reading-sheet-export";
import { segmentPatternIntoReadingSheets } from "./reading-sheets";
const logo = { source: {} as CanvasImageSource, width: 1154, height: 428 };
function target() {
  const context = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  return { canvas, context };
}
describe("R05 section PNG renderer", () => {
  it.each([40, 60, 80, 104])(
    "renders all exact section cells, local codes, four axes and local legends at %i",
    (size) => {
      const values = Uint16Array.from({ length: size * size }, (_, i) =>
          i % 17 === 0 ? 65535 : i % 2,
        ),
        pattern = createPublicPattern(size, size, values);
      for (const s of segmentPatternIntoReadingSheets(pattern)) {
        const t = target(),
          result = renderReadingSheetExport(
            {
              pattern,
              selectedColorSetLabel: "72-Color Set",
              readingSheet: s.sectionId,
            },
            logo,
            () => t.canvas,
          );
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("Render failed");
        expect(result.filename).toBe(`poparooz-pattern-${s.sectionId}.png`);
        expect(result.geometry.gridWidth).toBe(s.width * 24);
        expect(result.geometry.gridHeight).toBe(s.height * 24);
        expect(t.context.fillRect).toHaveBeenCalledTimes(
          1 +
            s.width * s.height +
            Math.floor((s.width - 1) / 5) +
            Math.floor((s.height - 1) / 5) +
            s.perColorBeadCounts.length,
        );
        const labels = vi.mocked(t.context.fillText).mock.calls;
        const cellLabels = labels.filter(
          ([, x, y]) =>
            x >= READING_GRID_X &&
            x < READING_GRID_X + s.width * 24 &&
            y >= READING_GRID_Y &&
            y < READING_GRID_Y + s.height * 24,
        );
        expect(cellLabels).toHaveLength(s.totalBeads);
        expect(
          cellLabels.every(([code]) => code === "A1" || code === "B1"),
        ).toBe(true);
        expect(labels.map(([text]) => text)).toContain(
          `Global X: ${s.globalStartX}–${s.globalEndX} · Global Y: ${s.globalStartY}–${s.globalEndY}`,
        );
        expect(labels.map(([text]) => text)).toContain(
          "Sheet Legend · Local Bead Counts",
        );
        for (const m of s.perColorBeadCounts) {
          const code = pattern.colors.find(
            (c) => c.index === m.patternColorIndex,
          )!.color.code;
          expect(labels.map(([text]) => text)).toContain(
            `${code}    ${m.beadCount.toLocaleString("en-US")} beads`,
          );
        }
        expect(
          labels.filter(
            ([, , y]) =>
              y === READING_GRID_Y - 14 ||
              y === READING_GRID_Y + s.height * 24 + 14,
          ),
        ).toHaveLength(s.width * 2);
        expect(
          labels.filter(
            ([, x]) =>
              x === READING_GRID_X - 14 ||
              x === READING_GRID_X + s.width * 24 + 14,
          ),
        ).toHaveLength(s.height * 2);
      }
    },
  );
  it("draws 5/10 lines at exact local positions and keeps outer border strongest", () => {
    const t = target(),
      p = createPublicPattern(104, 104, new Uint16Array(10816));
    const r = renderReadingSheetExport(
      { pattern: p, selectedColorSetLabel: "72-Color Set", readingSheet: "B2" },
      logo,
      () => t.canvas,
    );
    expect(r.ok).toBe(true);
    for (const pos of [10, 20, 30, 40, 50])
      expect(t.context.fillRect).toHaveBeenCalledWith(
        60 + pos * 24 - 1.5,
        328,
        3,
        1248,
      );
    for (const pos of [5, 15, 25, 35, 45])
      expect(t.context.fillRect).toHaveBeenCalledWith(
        60 + pos * 24 - 1,
        328,
        2,
        1248,
      );
    expect(t.context.strokeRect).toHaveBeenCalledWith(62, 330, 1244, 1244);
  });
  it("uses overview placement from segmentation without a giant coded grid", () => {
    const t = target(),
      p = createPublicPattern(80, 80, new Uint16Array(6400));
    const r = renderReadingSheetExport(
      {
        pattern: p,
        selectedColorSetLabel: "72-Color Set",
        readingSheet: "overview",
      },
      logo,
      () => t.canvas,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("Render failed");
    expect(r.filename).toBe("poparooz-pattern-overview.png");
    expect(r.geometry.gridWidth).toBe(624);
    const text = vi.mocked(t.context.fillText).mock.calls.map(([s]) => s);
    expect(text).toEqual(
      expect.arrayContaining([
        "Pattern Overview",
        "A1",
        "A2",
        "B1",
        "B2",
        "Required Board Layout: 1 × poparooz-board-104",
      ]),
    );
    expect(text.filter((s) => s === "A1")).toHaveLength(1);
  });
  it("does not fall back to another section when the requested ID is unavailable", () => {
    const t = target();
    expect(
      renderReadingSheetExport(
        {
          pattern: createPublicPattern(),
          selectedColorSetLabel: "72-Color Set",
          readingSheet: "C1",
        },
        logo,
        () => t.canvas,
      ).ok,
    ).toBe(false);
  });
});
