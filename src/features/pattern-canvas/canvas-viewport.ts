import type {
  CanvasViewportState,
  PatternDimensions,
} from "./pattern-canvas.types";

export const FIT_PADDING_CSS_PX = 24;
export const ZOOM_FACTOR = 1.25;
export const MAX_CELL_SCALE_CSS_PX = 64;
export const MIN_CELL_SCALE_CSS_PX = 0.25;
export const GRID_RENDER_THRESHOLD_CSS_PX = 6;

export function createUnmeasuredViewport(): CanvasViewportState {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    fitScale: 1,
    gridVisible: false,
    viewportWidth: 0,
    viewportHeight: 0,
    fitMode: true,
  };
}

export function fitPattern(
  pattern: PatternDimensions,
  viewportWidth: number,
  viewportHeight: number,
  gridVisible = false,
): CanvasViewportState | null {
  if (
    !validDimension(pattern.width) ||
    !validDimension(pattern.height) ||
    !validMeasurement(viewportWidth) ||
    !validMeasurement(viewportHeight)
  ) {
    return null;
  }
  const availableWidth = Math.max(0, viewportWidth - FIT_PADDING_CSS_PX * 2);
  const availableHeight = Math.max(0, viewportHeight - FIT_PADDING_CSS_PX * 2);
  if (availableWidth === 0 || availableHeight === 0) return null;
  const fitScale = Math.min(
    availableWidth / pattern.width,
    availableHeight / pattern.height,
    MAX_CELL_SCALE_CSS_PX,
  );
  if (!Number.isFinite(fitScale) || fitScale <= 0) return null;
  return {
    scale: fitScale,
    fitScale,
    offsetX: (viewportWidth - pattern.width * fitScale) / 2,
    offsetY: (viewportHeight - pattern.height * fitScale) / 2,
    gridVisible,
    viewportWidth,
    viewportHeight,
    fitMode: true,
  };
}

export function zoomViewport(
  viewport: CanvasViewportState,
  pattern: PatternDimensions,
  multiplier: number,
): CanvasViewportState {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return viewport;
  const minimum = minimumScale(viewport.fitScale);
  const nextScale = clamp(
    viewport.scale * multiplier,
    minimum,
    MAX_CELL_SCALE_CSS_PX,
  );
  if (nextScale === viewport.scale) return viewport;
  const centerX = viewport.viewportWidth / 2;
  const centerY = viewport.viewportHeight / 2;
  const patternCenterX = (centerX - viewport.offsetX) / viewport.scale;
  const patternCenterY = (centerY - viewport.offsetY) / viewport.scale;
  return clampViewport(
    {
      ...viewport,
      scale: nextScale,
      offsetX: centerX - patternCenterX * nextScale,
      offsetY: centerY - patternCenterY * nextScale,
      fitMode: false,
    },
    pattern,
  );
}

export function panViewport(
  viewport: CanvasViewportState,
  pattern: PatternDimensions,
  deltaX: number,
  deltaY: number,
): CanvasViewportState {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return viewport;
  return clampViewport(
    {
      ...viewport,
      offsetX: viewport.offsetX + deltaX,
      offsetY: viewport.offsetY + deltaY,
      fitMode: false,
    },
    pattern,
  );
}

export function resizeViewport(
  viewport: CanvasViewportState,
  pattern: PatternDimensions,
  viewportWidth: number,
  viewportHeight: number,
): CanvasViewportState {
  if (!validMeasurement(viewportWidth) || !validMeasurement(viewportHeight))
    return viewport;
  if (viewport.fitMode) {
    return (
      fitPattern(
        pattern,
        viewportWidth,
        viewportHeight,
        viewport.gridVisible,
      ) ?? viewport
    );
  }
  const oldCenterX = viewport.viewportWidth / 2;
  const oldCenterY = viewport.viewportHeight / 2;
  const patternCenterX = (oldCenterX - viewport.offsetX) / viewport.scale;
  const patternCenterY = (oldCenterY - viewport.offsetY) / viewport.scale;
  return clampViewport(
    {
      ...viewport,
      viewportWidth,
      viewportHeight,
      offsetX: viewportWidth / 2 - patternCenterX * viewport.scale,
      offsetY: viewportHeight / 2 - patternCenterY * viewport.scale,
    },
    pattern,
  );
}

export function clampViewport(
  viewport: CanvasViewportState,
  pattern: PatternDimensions,
): CanvasViewportState {
  if (
    !validDimension(pattern.width) ||
    !validDimension(pattern.height) ||
    !validMeasurement(viewport.viewportWidth) ||
    !validMeasurement(viewport.viewportHeight) ||
    !Number.isFinite(viewport.scale) ||
    viewport.scale <= 0
  ) {
    return viewport;
  }
  const patternWidth = pattern.width * viewport.scale;
  const patternHeight = pattern.height * viewport.scale;
  return {
    ...viewport,
    offsetX: clampAxis(viewport.offsetX, viewport.viewportWidth, patternWidth),
    offsetY: clampAxis(
      viewport.offsetY,
      viewport.viewportHeight,
      patternHeight,
    ),
  };
}

export function toggleGrid(viewport: CanvasViewportState): CanvasViewportState {
  return { ...viewport, gridVisible: !viewport.gridVisible };
}

export function zoomPercentage(viewport: CanvasViewportState): number {
  if (
    !Number.isFinite(viewport.scale) ||
    !Number.isFinite(viewport.fitScale) ||
    viewport.fitScale <= 0
  ) {
    return 100;
  }
  return Math.round((viewport.scale / viewport.fitScale) * 100);
}

export function canZoomIn(viewport: CanvasViewportState): boolean {
  return viewport.scale < MAX_CELL_SCALE_CSS_PX;
}

export function canZoomOut(viewport: CanvasViewportState): boolean {
  return viewport.scale > minimumScale(viewport.fitScale);
}

export function minimumScale(fitScale: number): number {
  return Math.min(
    Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1,
    MIN_CELL_SCALE_CSS_PX,
  );
}

function clampAxis(offset: number, viewportSize: number, patternSize: number) {
  if (patternSize <= viewportSize) return (viewportSize - patternSize) / 2;
  return clamp(offset, viewportSize - patternSize, 0);
}

function validDimension(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validMeasurement(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
