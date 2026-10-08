import { describe, expect, it, vi } from "vitest";
import { createPublicPattern } from "../pattern-canvas/test/pattern-result";
import { getPatternReadingGuides, renderPatternExport } from "./pattern-export";
import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";

function render(pattern: PublicPatternResult) {
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
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const result = renderPatternExport(
    { pattern, selectedColorSetLabel: "72-Color Set" },
    { source: {} as CanvasImageSource, width: 1154, height: 428 },
    () => canvas,
  );
  if (!result.ok) throw new Error(result.message);
  const g = result.geometry;
  return {
    result,
    context,
    cells: vi
      .mocked(context.fillRect)
      .mock.calls.filter(([, , w, h]) => w === 24 && h === 24),
    codes: vi
      .mocked(context.fillText)
      .mock.calls.filter(
        ([, x, y]) =>
          x >= g.gridX &&
          x < g.gridX + g.gridWidth &&
          y >= g.gridY &&
          y < g.gridY + g.gridHeight,
      ),
    labels: vi.mocked(context.fillText).mock.calls.map(([text]) => text),
  };
}

describe("R06 complete pattern-sheet conformance", () => {
  it.each([40, 52, 60, 80, 104])(
    "maps every cell once in the exact %i grid, without padding or fake transparent codes",
    (size) => {
      const values = Uint16Array.from({ length: size * size }, (_, i) =>
        i % 17 === 0 ? 65535 : i % 2,
      );
      const before = Array.from(values);
      const pattern = createPublicPattern(size, size, values);
      const { result, cells, codes, labels } = render(pattern);
      const g = result.geometry;
      expect(g.gridWidth).toBe(size * 24);
      expect(g.gridHeight).toBe(size * 24);
      expect(result.filename).toBe(`poparooz-pattern-${size}x${size}.png`);
      expect(cells).toHaveLength(size * size);
      expect(new Set(cells.map(([x, y]) => `${x},${y}`)).size).toBe(
        size * size,
      );
      cells.forEach(([x, y, w, h], i) => {
        expect([x, y, w, h]).toEqual([
          g.gridX + (i % size) * 24,
          g.gridY + Math.floor(i / size) * 24,
          24,
          24,
        ]);
      });
      expect(codes).toHaveLength(pattern.totals.totalBeads);
      for (const [code, x, y, maxWidth] of codes) {
        const col = (x - g.gridX - 12) / 24;
        const row = (y - g.gridY - 12) / 24;
        expect(Number.isInteger(col) && Number.isInteger(row)).toBe(true);
        expect(code).toBe(values[row * size + col] === 0 ? "A1" : "B1");
        expect(maxWidth).toBe(20);
      }
      expect(labels).toContain(
        `Colors Used: 2 · Total Beads: ${pattern.totals.totalBeads.toLocaleString("en-US")}`,
      );
      for (const material of pattern.materials)
        expect(labels).toContain(
          `${material.beadCount.toLocaleString("en-US")} beads`,
        );
      expect(pattern.materials.reduce((sum, m) => sum + m.beadCount, 0)).toBe(
        pattern.totals.totalBeads,
      );
      expect(
        labels.some((t) => /Overview|Section|Local grid|65535|#FF0000/.test(t)),
      ).toBe(false);
      expect(Array.from(values)).toEqual(before);
    },
  );

  it.each([40, 52, 60, 80, 104])(
    "uses four whole-pattern coordinate axes and exact 5/10 guide hierarchy at %i",
    (size) => {
      const { result, context } = render(
        createPublicPattern(size, size, new Uint16Array(size * size)),
      );
      const g = result.geometry;
      const guides = getPatternReadingGuides(size);
      expect(
        guides
          .filter((guide) => guide.kind === "major")
          .map((guide) => guide.position),
      ).toEqual(
        Array.from(
          { length: Math.floor((size - 1) / 10) },
          (_, i) => (i + 1) * 10,
        ),
      );
      expect(
        guides
          .filter((guide) => guide.kind === "helper")
          .map((guide) => guide.position),
      ).toEqual(
        Array.from(
          { length: Math.ceil((size - 5) / 10) },
          (_, i) => i * 10 + 5,
        ),
      );
      for (const guide of guides) {
        expect(guide.position).toBeLessThan(size);
        expect(context.fillRect).toHaveBeenCalledWith(
          g.gridX + guide.position * 24 - guide.thickness / 2,
          g.gridY,
          guide.thickness,
          g.gridHeight,
        );
        expect(context.fillRect).toHaveBeenCalledWith(
          g.gridX,
          g.gridY + guide.position * 24 - guide.thickness / 2,
          g.gridWidth,
          guide.thickness,
        );
      }
      expect(context.strokeRect).toHaveBeenCalledWith(
        g.gridX + 2,
        g.gridY + 2,
        g.gridWidth - 4,
        g.gridHeight - 4,
      );
      const text = vi.mocked(context.fillText).mock.calls;
      const sequence = Array.from({ length: size }, (_, i) => String(i + 1));
      for (const axisY of [g.gridY - 14, g.gridY + g.gridHeight + 14])
        expect(text.filter(([, , y]) => y === axisY).map(([t]) => t)).toEqual(
          sequence,
        );
      for (const axisX of [g.gridX - 14, g.gridX + g.gridWidth + 14])
        expect(text.filter(([, x]) => x === axisX).map(([t]) => t)).toEqual(
          sequence,
        );
    },
  );

  it("updates exactly one edited cell, code, whole-pattern legend and colors used without regeneration", () => {
    const size = 80,
      position = 1000;
    const original = new Uint16Array(size * size),
      edited = original.slice();
    edited[position] = 1;
    const a = render(createPublicPattern(size, size, original));
    const b = render(createPublicPattern(size, size, edited));
    expect(b.cells).toEqual(a.cells);
    expect(
      b.codes.filter(
        (call, i) => JSON.stringify(call) !== JSON.stringify(a.codes[i]),
      ),
    ).toEqual([b.codes[position]]);
    expect(b.codes[position]![0]).toBe("B1");
    expect(b.labels).toContain("Colors Used: 2 · Total Beads: 6,400");
    expect(b.labels).toContain("6,399 beads");
    expect(b.labels).toContain("1 beads");
    expect(a.labels).toContain("Colors Used: 1 · Total Beads: 6,400");
    expect(original[position]).toBe(0);
    const removed = edited.slice();
    removed[position] = 65535;
    const c = render(createPublicPattern(size, size, removed));
    expect(c.cells).toEqual(a.cells);
    expect(c.codes).toEqual(b.codes.filter((_, i) => i !== position));
    expect(c.labels).toContain("Colors Used: 1 · Total Beads: 6,399");
    expect(c.labels).not.toContain("B1");
    expect(c.labels).not.toContain("1 beads");
  });

  it("retains legitimate internal empty background cells and produces no codes or unused legend rows for an empty pattern", () => {
    const result = render(
      createPublicPattern(52, 52, new Uint16Array(52 * 52).fill(65535)),
    );
    expect(result.cells).toHaveLength(52 * 52);
    expect(result.codes).toHaveLength(0);
    expect(result.result.geometry.legendRows).toBe(0);
    expect(result.labels).toContain("Colors Used: 0 · Total Beads: 0");
  });

  it("fails closed when a plausible whole-pattern legend has wrong per-color counts", () => {
    const pattern = createPublicPattern(2, 2, [0, 0, 0, 1]);
    const inconsistent = {
      ...pattern,
      materials: pattern.materials.map((m) => ({
        ...m,
        beadCount: m.patternColorIndex === 0 ? 1 : 3,
      })),
    };
    expect(
      renderPatternExport(
        { pattern: inconsistent, selectedColorSetLabel: "72-Color Set" },
        { source: {} as CanvasImageSource, width: 1154, height: 428 },
      ),
    ).toEqual({
      ok: false,
      message: "We couldn’t prepare this pattern download.",
    });
  });
});
