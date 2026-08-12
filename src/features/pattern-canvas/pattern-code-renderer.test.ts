import { describe, expect, it, vi } from "vitest";

import { createPublicPattern } from "./test/pattern-result";
import {
  CODE_RENDER_THRESHOLD_CSS_PX,
  renderPatternCodes,
} from "./pattern-code-renderer";
import type { CanvasViewportState } from "./pattern-canvas.types";

function context() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    fillText: vi.fn(),
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function viewport(overrides: Partial<CanvasViewportState> = {}) {
  return {
    scale: 24,
    offsetX: 0,
    offsetY: 0,
    fitScale: 24,
    gridVisible: false,
    viewportWidth: 48,
    viewportHeight: 48,
    fitMode: false,
    ...overrides,
  };
}

describe("renderPatternCodes", () => {
  it("draws exact public codes, skips transparent cells, and clips each label", () => {
    const target = context();
    const result = renderPatternCodes({
      context: target,
      pattern: createPublicPattern(),
      viewport: viewport(),
    });

    expect(result).toEqual({ ok: true, codesVisible: true });
    expect(target.fillText).toHaveBeenCalledTimes(3);
    expect(
      vi.mocked(target.fillText).mock.calls.map(([value]) => value),
    ).toEqual(["A1", "B1", "A1"]);
    expect(target.clip).toHaveBeenCalledTimes(3);
  });

  it("does not draw overlapping labels below the safe zoom threshold", () => {
    const target = context();
    expect(
      renderPatternCodes({
        context: target,
        pattern: createPublicPattern(),
        viewport: viewport({ scale: CODE_RENDER_THRESHOLD_CSS_PX - 1 }),
      }),
    ).toEqual({ ok: true, codesVisible: false });
    expect(target.fillText).not.toHaveBeenCalled();
  });

  it("uses the public color index and fails safely for an unknown index", () => {
    const target = context();
    expect(
      renderPatternCodes({
        context: target,
        pattern: createPublicPattern(1, 1, [9]),
        viewport: viewport({ viewportWidth: 24, viewportHeight: 24 }),
      }),
    ).toEqual({ ok: false, codesVisible: false });
    expect(target.fillText).not.toHaveBeenCalled();
  });

  it("renders only cells inside the visible crop after pan", () => {
    const target = context();
    const result = renderPatternCodes({
      context: target,
      pattern: createPublicPattern(),
      viewport: viewport({
        offsetX: -24,
        viewportWidth: 24,
        viewportHeight: 48,
      }),
    });
    expect(result.ok).toBe(true);
    expect(target.fillText).toHaveBeenCalledTimes(2);
    expect(target.fillText).toHaveBeenCalledWith("B1", 12, 12, 20);
    expect(target.fillText).toHaveBeenCalledWith("A1", 12, 36, 20);
  });

  it("keeps focused codes prominent while dimming other occupied codes", () => {
    const target = context();
    const result = renderPatternCodes({
      context: target,
      pattern: createPublicPattern(),
      viewport: viewport(),
      focusedColorIndex: 0,
    });

    expect(result).toEqual({ ok: true, codesVisible: true });
    expect(
      vi.mocked(target.fillText).mock.calls.map(([value]) => value),
    ).toEqual(["A1", "B1", "A1"]);
    expect(target.globalAlpha).toBe(0.38);
  });
});
