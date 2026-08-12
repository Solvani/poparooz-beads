import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { CanvasViewportState } from "./pattern-canvas.types";
import { calculateVisiblePatternRect } from "./pattern-renderer";

export const CODE_RENDER_THRESHOLD_CSS_PX = 20;

export interface PatternCodeRenderResult {
  readonly ok: boolean;
  readonly codesVisible: boolean;
}

export function renderPatternCodes({
  context,
  pattern,
  viewport,
  focusedColorIndex = null,
}: {
  readonly context: CanvasRenderingContext2D;
  readonly pattern: PublicPatternResult;
  readonly viewport: CanvasViewportState;
  readonly focusedColorIndex?: number | null;
}): PatternCodeRenderResult {
  if (viewport.scale < CODE_RENDER_THRESHOLD_CSS_PX) {
    return { ok: true, codesVisible: false };
  }
  const visible = calculateVisiblePatternRect(pattern.matrix, viewport);
  if (visible === null) return { ok: true, codesVisible: true };

  const firstColumn = Math.max(0, Math.floor(visible.sourceX));
  const lastColumn = Math.min(
    pattern.matrix.width,
    Math.ceil(visible.sourceX + visible.sourceWidth),
  );
  const firstRow = Math.max(0, Math.floor(visible.sourceY));
  const lastRow = Math.min(
    pattern.matrix.height,
    Math.ceil(visible.sourceY + visible.sourceHeight),
  );
  const fontSize = Math.max(8, Math.min(18, viewport.scale * 0.34));
  const colors = new Map(pattern.colors.map((entry) => [entry.index, entry]));

  try {
    context.font = `700 ${fontSize}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let row = firstRow; row < lastRow; row += 1) {
      for (let column = firstColumn; column < lastColumn; column += 1) {
        const matrixIndex = row * pattern.matrix.width + column;
        const colorIndex = pattern.matrix.colorIndices[matrixIndex];
        if (colorIndex === undefined) return { ok: false, codesVisible: false };
        if (colorIndex === pattern.matrix.transparentIndex) continue;
        const color = colors.get(colorIndex);
        if (color === undefined) return { ok: false, codesVisible: false };

        const x = viewport.offsetX + column * viewport.scale;
        const y = viewport.offsetY + row * viewport.scale;
        context.save();
        if (focusedColorIndex !== null && colorIndex !== focusedColorIndex) {
          context.globalAlpha = 0.38;
        }
        context.beginPath();
        context.rect(x, y, viewport.scale, viewport.scale);
        context.clip();
        context.fillStyle = readableTextColor(color.color.hex);
        context.fillText(
          color.color.code,
          x + viewport.scale / 2,
          y + viewport.scale / 2,
          Math.max(1, viewport.scale - 4),
        );
        context.restore();
      }
    }
    return { ok: true, codesVisible: true };
  } catch {
    return { ok: false, codesVisible: false };
  }
}

function readableTextColor(hex: string): "#111111" | "#FFFFFF" {
  const match = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i.exec(hex);
  if (match === null) return "#111111";
  const red = Number.parseInt(match[1]!, 16);
  const green = Number.parseInt(match[2]!, 16);
  const blue = Number.parseInt(match[3]!, 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance >= 150 ? "#111111" : "#FFFFFF";
}
