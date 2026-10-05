import { describe, expect, it } from "vitest";
import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import {
  segmentPatternIntoReadingSheets,
  getReadingGuides,
  readingSheetFilename,
} from "./reading-sheets";
const shapes = {
  40: [[40, 40]],
  60: [
    [52, 52],
    [8, 52],
    [52, 8],
    [8, 8],
  ],
  80: [
    [52, 52],
    [28, 52],
    [52, 28],
    [28, 28],
  ],
  104: [
    [52, 52],
    [52, 52],
    [52, 52],
    [52, 52],
  ],
} as const;
describe("R05 deterministic reading sheets", () => {
  it.each([40, 60, 80, 104] as const)(
    "covers each %i source position exactly once and reconciles all counts",
    (size) => {
      const values = Uint16Array.from({ length: size * size }, (_, i) =>
        i % 13 === 0 ? 65535 : i % 2,
      );
      const pattern = createPublicPattern(size, size, values),
        sheets = segmentPatternIntoReadingSheets(pattern);
      expect(sheets.map((s) => [s.width, s.height])).toEqual(shapes[size]);
      expect(sheets.map((s) => s.sectionId)).toEqual(
        size === 40 ? ["A1"] : ["A1", "A2", "B1", "B2"],
      );
      const visited = new Uint8Array(size * size),
        restored = new Uint16Array(size * size);
      for (const s of sheets) {
        expect(s.cells).toHaveLength(s.width * s.height);
        expect(s.globalEndX - s.globalStartX + 1).toBe(s.width);
        expect(s.globalEndY - s.globalStartY + 1).toBe(s.height);
        expect(s.totalBeads).toBe(s.cells.filter((c) => c !== 65535).length);
        expect(
          s.perColorBeadCounts.reduce((sum, c) => sum + c.beadCount, 0),
        ).toBe(s.totalBeads);
        s.cells.forEach((c, i) => {
          const p =
            (s.globalStartY - 1 + Math.floor(i / s.width)) * size +
            s.globalStartX -
            1 +
            (i % s.width);
          visited[p]!++;
          restored[p] = c;
        });
      }
      expect(Array.from(visited).every((v) => v === 1)).toBe(true);
      expect(restored).toEqual(values);
      expect(sheets.reduce((sum, s) => sum + s.totalBeads, 0)).toBe(
        pattern.totals.totalBeads,
      );
      for (const m of pattern.materials)
        expect(
          sheets.reduce(
            (sum, s) =>
              sum +
              (s.perColorBeadCounts.find(
                (c) => c.patternColorIndex === m.patternColorIndex,
              )?.beadCount ?? 0),
            0,
          ),
        ).toBe(m.beadCount);
      expect(pattern.boardLayout.boardCount).toBe(1);
      expect(sheets.length).toBe(size === 40 ? 1 : 4);
    },
  );
  it("uses exact global ranges and local remainder dimensions", () => {
    const sheets = segmentPatternIntoReadingSheets(
      createPublicPattern(60, 60, new Uint16Array(3600)),
    );
    expect(
      sheets.map(({ globalStartX, globalEndX, globalStartY, globalEndY }) => [
        globalStartX,
        globalEndX,
        globalStartY,
        globalEndY,
      ]),
    ).toEqual([
      [1, 52, 1, 52],
      [53, 60, 1, 52],
      [1, 52, 53, 60],
      [53, 60, 53, 60],
    ]);
  });
  it("changes only the intended B2 cell and local legend after a boundary edit", () => {
    const values = new Uint16Array(104 * 104),
      source = createPublicPattern(104, 104, values);
    const before = segmentPatternIntoReadingSheets(source);
    values[52 * 104 + 52] = 1;
    const edited = createPublicPattern(104, 104, values),
      after = segmentPatternIntoReadingSheets(edited);
    expect(after.slice(0, 3)).toEqual(before.slice(0, 3));
    expect(before[3]!.cells[0]).toBe(0);
    expect(after[3]!.cells[0]).toBe(1);
    expect(after[3]!.perColorBeadCounts).toEqual([
      { patternColorIndex: 0, beadCount: 2703 },
      { patternColorIndex: 1, beadCount: 1 },
    ]);
    expect(source.matrix.colorIndices[52 * 104 + 52]).toBe(0);
  });
  it("retains an entirely transparent reading sheet without padding or fake legend entries", () => {
    const values = new Uint16Array(3600).fill(65535);
    values[0] = 0;
    const s = segmentPatternIntoReadingSheets(
      createPublicPattern(60, 60, values),
    )[3]!;
    expect(s.cells).toHaveLength(64);
    expect(s.totalBeads).toBe(0);
    expect(s.perColorBeadCounts).toEqual([]);
  });
  it("fails closed on count disagreement", () => {
    const p = createPublicPattern();
    expect(() =>
      segmentPatternIntoReadingSheets({
        ...p,
        totals: { ...p.totals, totalBeads: 4 },
      }),
    ).toThrow();
  });
  it("exposes the ordinary < helper < major < border hierarchy", () => {
    const guides = getReadingGuides(52);
    expect(
      guides.filter((g) => g.kind === "major").map((g) => g.position),
    ).toEqual([10, 20, 30, 40, 50]);
    expect(
      guides.filter((g) => g.kind === "helper").map((g) => g.position),
    ).toEqual([5, 15, 25, 35, 45]);
    expect(
      guides.every((g) =>
        g.kind === "major" ? g.thickness === 3 : g.thickness === 2,
      ),
    ).toBe(true);
    expect(getReadingGuides(8)).toEqual([
      { position: 5, kind: "helper", thickness: 2 },
    ]);
    expect(getReadingGuides(28).map((g) => g.position)).toEqual([
      5, 10, 15, 20, 25,
    ]);
  });
  it("derives deterministic individual filenames", () => {
    expect(readingSheetFilename("overview")).toBe(
      "poparooz-pattern-overview.png",
    );
    expect(readingSheetFilename("B2")).toBe("poparooz-pattern-B2.png");
  });
});
