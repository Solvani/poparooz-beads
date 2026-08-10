import { describe, expect, it } from "vitest";

import {
  canZoomIn,
  canZoomOut,
  clampViewport,
  FIT_PADDING_CSS_PX,
  fitPattern,
  MAX_CELL_SCALE_CSS_PX,
  panViewport,
  resizeViewport,
  zoomPercentage,
  zoomViewport,
  zoomViewportToMinimumScale,
  ZOOM_FACTOR,
} from "./canvas-viewport";

describe("canvas viewport math", () => {
  it.each([
    [{ width: 200, height: 100 }, 500, 300],
    [{ width: 100, height: 200 }, 300, 500],
    [{ width: 100, height: 100 }, 400, 400],
  ])(
    "fits and centers horizontal, vertical, and square patterns",
    (pattern, width, height) => {
      const view = fitPattern(pattern, width, height)!;
      expect(view.scale).toBeGreaterThan(0);
      expect(view.offsetX).toBeCloseTo(
        (width - pattern.width * view.scale) / 2,
      );
      expect(view.offsetY).toBeCloseTo(
        (height - pattern.height * view.scale) / 2,
      );
      expect(pattern.width * view.scale).toBeLessThanOrEqual(
        width - FIT_PADDING_CSS_PX * 2,
      );
      expect(pattern.height * view.scale).toBeLessThanOrEqual(
        height - FIT_PADDING_CSS_PX * 2,
      );
      expect(zoomPercentage(view)).toBe(100);
    },
  );

  it("rejects invalid or unmeasured dimensions without NaN", () => {
    expect(fitPattern({ width: 0, height: 10 }, 100, 100)).toBeNull();
    expect(fitPattern({ width: 10, height: 10 }, 0, 100)).toBeNull();
    expect(fitPattern({ width: Number.NaN, height: 10 }, 100, 100)).toBeNull();
  });

  it("zooms around the viewport center with stable 125 percent steps", () => {
    const fit = fitPattern({ width: 100, height: 80 }, 500, 400)!;
    const beforeCenterX = (250 - fit.offsetX) / fit.scale;
    const beforeCenterY = (200 - fit.offsetY) / fit.scale;
    const zoomed = zoomViewport(fit, { width: 100, height: 80 }, ZOOM_FACTOR);

    expect(zoomPercentage(zoomed)).toBe(125);
    expect((250 - zoomed.offsetX) / zoomed.scale).toBeCloseTo(beforeCenterX);
    expect((200 - zoomed.offsetY) / zoomed.scale).toBeCloseTo(beforeCenterY);
    const restored = zoomViewport(
      zoomed,
      { width: 100, height: 80 },
      1 / ZOOM_FACTOR,
    );
    expect(zoomPercentage(restored)).toBe(100);
  });

  it("zooms directly to a requested readable scale without shrinking an already readable view", () => {
    const pattern = { width: 104, height: 104 };
    const fit = fitPattern(pattern, 600, 420)!;
    const readable = zoomViewportToMinimumScale(fit, pattern, 20);

    expect(readable.scale).toBe(20);
    expect(readable.fitMode).toBe(false);
    expect(zoomViewportToMinimumScale(readable, pattern, 20)).toBe(readable);
  });

  it("clamps zoom at the minimum and 64 CSS pixels per cell maximum", () => {
    const fit = fitPattern({ width: 10, height: 10 }, 400, 400)!;
    let view = fit;
    for (let index = 0; index < 50; index += 1)
      view = zoomViewport(view, { width: 10, height: 10 }, ZOOM_FACTOR);
    expect(view.scale).toBe(MAX_CELL_SCALE_CSS_PX);
    expect(canZoomIn(view)).toBe(false);
    for (let index = 0; index < 100; index += 1)
      view = zoomViewport(view, { width: 10, height: 10 }, 1 / ZOOM_FACTOR);
    expect(Number.isFinite(view.scale)).toBe(true);
    expect(view.scale).toBeGreaterThan(0);
    expect(canZoomOut(view)).toBe(false);
  });

  it("clamps pan to every large-pattern edge and centers a small pattern", () => {
    const large = {
      ...fitPattern({ width: 100, height: 100 }, 200, 200)!,
      scale: 10,
      fitMode: false,
    };
    const farTopLeft = panViewport(
      large,
      { width: 100, height: 100 },
      -5000,
      -5000,
    );
    expect(farTopLeft.offsetX).toBe(200 - 1000);
    expect(farTopLeft.offsetY).toBe(200 - 1000);
    const farBottomRight = panViewport(
      farTopLeft,
      { width: 100, height: 100 },
      5000,
      5000,
    );
    expect(farBottomRight.offsetX).toBe(0);
    expect(farBottomRight.offsetY).toBe(0);

    const small = clampViewport(
      { ...large, scale: 1, offsetX: -100, offsetY: 500 },
      { width: 100, height: 100 },
    );
    expect(small.offsetX).toBe(50);
    expect(small.offsetY).toBe(50);
  });

  it("refits on resize in fit mode and preserves the pattern center otherwise", () => {
    const pattern = { width: 100, height: 80 };
    const fit = fitPattern(pattern, 500, 400)!;
    const resizedFit = resizeViewport(fit, pattern, 700, 500);
    expect(resizedFit.fitMode).toBe(true);
    expect(zoomPercentage(resizedFit)).toBe(100);

    const manual = panViewport(
      zoomViewport(fit, pattern, ZOOM_FACTOR),
      pattern,
      -20,
      -10,
    );
    const oldCenter = {
      x: (manual.viewportWidth / 2 - manual.offsetX) / manual.scale,
      y: (manual.viewportHeight / 2 - manual.offsetY) / manual.scale,
    };
    const resizedManual = resizeViewport(manual, pattern, 600, 450);
    expect(resizedManual.fitMode).toBe(false);
    expect(oldCenter.x).toBeGreaterThan(50);
    expect(resizedManual.offsetX).toBeCloseTo(
      (600 - pattern.width * resizedManual.scale) / 2,
    );
    expect(resizedManual.offsetY).toBeCloseTo(
      (450 - pattern.height * resizedManual.scale) / 2,
    );
  });
});
