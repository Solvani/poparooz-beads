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
  readonly focus?: {
    readonly colorIndex: number;
    readonly colorIndices: Uint16Array;
    readonly transparentIndex: number;
  };
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
    if (options.focus !== undefined) {
      drawFocusDimming(
        context,
        raster,
        viewport,
        visible,
        options.focus,
        options.backgroundColor,
      );
    }
    if (viewport.gridVisible) {
      drawVisibleGrid(
        context,
        raster,
        viewport,
        options.gridColor,
        visible,
        dpr,
      );
      drawReadingSections(context, raster, viewport, options.gridColor);
    }
    return true;
  } catch {
    return false;
  }
}

function drawFocusDimming(
  context: CanvasRenderingContext2D,
  raster: PatternRaster,
  viewport: CanvasViewportState,
  visible: VisiblePatternRect,
  focus: NonNullable<RenderPatternOptions["focus"]>,
  backgroundColor: string,
) {
  if (focus.colorIndices.length !== raster.width * raster.height) return;
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
  context.save();
  context.globalAlpha = 0.72;
  context.fillStyle = backgroundColor;
  for (let row = firstRow; row < lastRow; row += 1) {
    for (let column = firstColumn; column < lastColumn; column += 1) {
      const colorIndex = focus.colorIndices[row * raster.width + column];
      if (
        colorIndex === undefined ||
        colorIndex === focus.transparentIndex ||
        colorIndex === focus.colorIndex
      ) {
        continue;
      }
      context.fillRect(
        viewport.offsetX + column * viewport.scale,
        viewport.offsetY + row * viewport.scale,
        viewport.scale,
        viewport.scale,
      );
    }
  }
  context.restore();
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

// Screen/CSS-pixel overlay only; section boundaries are not board boundaries.
function drawReadingSections(
  context: CanvasRenderingContext2D,
  raster: PatternRaster,
  viewport: CanvasViewportState,
  color: string,
) {
  context.save();
  context.beginPath();
  context.strokeStyle = color;
  // Stay inside the cell-edge gutters even at fit zoom; codes are centered.
  context.lineWidth = Math.min(3, viewport.scale * 0.15);
  for (let column = 52; column < raster.width; column += 52) {
    const x = viewport.offsetX + column * viewport.scale;
    context.moveTo(x, viewport.offsetY);
    context.lineTo(x, viewport.offsetY + raster.height * viewport.scale);
  }
  for (let row = 52; row < raster.height; row += 52) {
    const y = viewport.offsetY + row * viewport.scale;
    context.moveTo(viewport.offsetX, y);
    context.lineTo(viewport.offsetX + raster.width * viewport.scale, y);
  }
  context.stroke();
  context.beginPath();
  context.lineWidth = Math.min(4, viewport.scale * 0.2);
  const left = viewport.offsetX;
  const top = viewport.offsetY;
  const right = left + raster.width * viewport.scale;
  const bottom = top + raster.height * viewport.scale;
  context.moveTo(left, top);
  context.lineTo(right, top);
  context.lineTo(right, bottom);
  context.lineTo(left, bottom);
  context.lineTo(left, top);
  context.stroke();
  context.restore();
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
