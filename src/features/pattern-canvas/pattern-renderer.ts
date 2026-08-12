import type {
  CanvasViewportState,
  PatternRaster,
} from "./pattern-canvas.types";

export const MAX_EFFECTIVE_DPR = 2;

export interface VisiblePatternRect {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly destinationX: number;
  readonly destinationY: number;
  readonly destinationWidth: number;
  readonly destinationHeight: number;
}

export interface RenderPatternOptions {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly raster: PatternRaster;
  readonly viewport: CanvasViewportState;
  readonly devicePixelRatio?: number;
  readonly gridColor: string;
  readonly backgroundColor: string;
}

export function renderPattern(options: RenderPatternOptions): boolean {
  const { canvas, context, raster, viewport } = options;
  if (
    viewport.viewportWidth <= 0 ||
    viewport.viewportHeight <= 0 ||
    viewport.scale <= 0 ||
    !Number.isFinite(viewport.scale)
  ) {
    return false;
  }
  const dpr = effectiveDevicePixelRatio(options.devicePixelRatio);
  const backingWidth = Math.max(1, Math.round(viewport.viewportWidth * dpr));
  const backingHeight = Math.max(1, Math.round(viewport.viewportHeight * dpr));
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;

  try {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, viewport.viewportWidth, viewport.viewportHeight);
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, viewport.viewportWidth, viewport.viewportHeight);
    const visible = calculateVisiblePatternRect(raster, viewport);
    if (visible === null) return true;
    context.imageSmoothingEnabled = false;
    context.drawImage(
      raster.source,
      visible.sourceX,
      visible.sourceY,
      visible.sourceWidth,
      visible.sourceHeight,
      visible.destinationX,
      visible.destinationY,
      visible.destinationWidth,
      visible.destinationHeight,
    );
    if (viewport.gridVisible) {
      drawVisibleGrid(
        context,
        raster,
        viewport,
        options.gridColor,
        visible,
        dpr,
      );
    }
    return true;
  } catch {
    return false;
  }
}

export function calculateVisiblePatternRect(
  raster: Pick<PatternRaster, "width" | "height">,
  viewport: CanvasViewportState,
): VisiblePatternRect | null {
  const sourceX = Math.max(0, -viewport.offsetX / viewport.scale);
  const sourceY = Math.max(0, -viewport.offsetY / viewport.scale);
  const sourceRight = Math.min(
    raster.width,
    (viewport.viewportWidth - viewport.offsetX) / viewport.scale,
  );
  const sourceBottom = Math.min(
    raster.height,
    (viewport.viewportHeight - viewport.offsetY) / viewport.scale,
  );
  const sourceWidth = sourceRight - sourceX;
  const sourceHeight = sourceBottom - sourceY;
  if (sourceWidth <= 0 || sourceHeight <= 0) return null;
  return {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    destinationX: viewport.offsetX + sourceX * viewport.scale,
    destinationY: viewport.offsetY + sourceY * viewport.scale,
    destinationWidth: sourceWidth * viewport.scale,
    destinationHeight: sourceHeight * viewport.scale,
  };
}

export function effectiveDevicePixelRatio(value = globalThis.devicePixelRatio) {
  return Number.isFinite(value) && value > 0
    ? Math.min(value, MAX_EFFECTIVE_DPR)
    : 1;
}

function drawVisibleGrid(
  context: CanvasRenderingContext2D,
  raster: PatternRaster,
  viewport: CanvasViewportState,
  color: string,
  visible: VisiblePatternRect,
  dpr: number,
) {
  const firstColumn = Math.max(0, Math.floor(visible.sourceX));
  const lastColumn = Math.min(
    raster.width,
    Math.ceil(visible.sourceX + visible.sourceWidth),
  );
  const firstRow = Math.max(0, Math.floor(visible.sourceY));
  const lastRow = Math.min(
    raster.height,
    Math.ceil(visible.sourceY + visible.sourceHeight),
  );
  context.beginPath();
  context.strokeStyle = color;
  context.lineWidth = 1 / dpr;
  for (let column = firstColumn; column <= lastColumn; column += 1) {
    const x = viewport.offsetX + column * viewport.scale;
    context.moveTo(x, viewport.offsetY + firstRow * viewport.scale);
    context.lineTo(x, viewport.offsetY + lastRow * viewport.scale);
  }
  for (let row = firstRow; row <= lastRow; row += 1) {
    const y = viewport.offsetY + row * viewport.scale;
    context.moveTo(viewport.offsetX + firstColumn * viewport.scale, y);
    context.lineTo(viewport.offsetX + lastColumn * viewport.scale, y);
  }
  context.stroke();
}
