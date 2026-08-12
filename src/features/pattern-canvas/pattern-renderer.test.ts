import { describe, expect, it, vi } from "vitest";

import type {
  CanvasViewportState,
  PatternRaster,
} from "./pattern-canvas.types";
import {
  calculateVisiblePatternRect,
  effectiveDevicePixelRatio,
  renderPattern,
} from "./pattern-renderer";

function context() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    imageSmoothingEnabled: true,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

function viewport(
  overrides: Partial<CanvasViewportState> = {},
): CanvasViewportState {
  return {
    scale: 10,
    offsetX: 0,
    offsetY: 0,
    fitScale: 10,
    gridVisible: false,
    viewportWidth: 100,
    viewportHeight: 80,
    fitMode: false,
    ...overrides,
  };
}

function raster(): PatternRaster {
  return { source: document.createElement("canvas"), width: 20, height: 20 };
}

describe("pattern renderer", () => {
  it("uses a visible source crop instead of drawing the entire zoomed raster", () => {
    const visible = calculateVisiblePatternRect(
      { width: 100, height: 100 },
      viewport({ scale: 10, offsetX: -300, offsetY: -200 }),
    )!;
    expect(visible).toMatchObject({
      sourceX: 30,
      sourceY: 20,
      sourceWidth: 10,
      sourceHeight: 8,
      destinationX: 0,
      destinationY: 0,
      destinationWidth: 100,
      destinationHeight: 80,
    });
  });

  it("draws at DPR 1 and DPR 2 with CSS coordinates unchanged", () => {
    for (const dpr of [1, 2]) {
      const canvas = document.createElement("canvas");
      const target = context();
      expect(
        renderPattern({
          canvas,
          context: target,
          raster: raster(),
          viewport: viewport(),
          devicePixelRatio: dpr,
          gridColor: "#000000",
          backgroundColor: "#EEEEEE",
        }),
      ).toBe(true);
      expect(canvas.width).toBe(100 * dpr);
      expect(canvas.height).toBe(80 * dpr);
      expect(target.setTransform).toHaveBeenCalledWith(dpr, 0, 0, dpr, 0, 0);
    }
  });

  it("clamps invalid DPR to 1 and high DPR to 2", () => {
    expect(effectiveDevicePixelRatio(0)).toBe(1);
    expect(effectiveDevicePixelRatio(Number.NaN)).toBe(1);
    expect(effectiveDevicePixelRatio(3)).toBe(2);
  });

  it("draws grid exactly when the explicit view state selects it", () => {
    const off = context();
    renderPattern({
      canvas: document.createElement("canvas"),
      context: off,
      raster: raster(),
      viewport: viewport({ gridVisible: false, scale: 10 }),
      gridColor: "#000000",
      backgroundColor: "#EEEEEE",
    });
    expect(off.stroke).not.toHaveBeenCalled();

    const selected = context();
    renderPattern({
      canvas: document.createElement("canvas"),
      context: selected,
      raster: raster(),
      viewport: viewport({ gridVisible: true, scale: 5 }),
      gridColor: "#123456",
      backgroundColor: "#EEEEEE",
    });
    expect(selected.stroke).toHaveBeenCalledOnce();
    expect(selected.strokeStyle).toBe("#123456");
  });

  it("safely rejects unmeasured viewports and context failures", () => {
    expect(
      renderPattern({
        canvas: document.createElement("canvas"),
        context: context(),
        raster: raster(),
        viewport: viewport({ viewportWidth: 0 }),
        gridColor: "#000000",
        backgroundColor: "#EEEEEE",
      }),
    ).toBe(false);
    const broken = context();
    vi.mocked(broken.drawImage).mockImplementationOnce(() => {
      throw new Error("context unavailable");
    });
    expect(
      renderPattern({
        canvas: document.createElement("canvas"),
        context: broken,
        raster: raster(),
        viewport: viewport(),
        gridColor: "#000000",
        backgroundColor: "#EEEEEE",
      }),
    ).toBe(false);
  });
});
