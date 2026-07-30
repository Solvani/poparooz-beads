import { useEffect, useMemo, useRef, useState } from "react";

import { CanvasToolbar } from "./CanvasToolbar";
import type {
  CanvasFrameScheduler,
  PatternCanvasProps,
} from "./pattern-canvas.types";
import {
  buildPatternRaster,
  type PatternRasterSurfaceFactory,
} from "./pattern-raster";
import { renderPattern } from "./pattern-renderer";
import {
  useCanvasViewport,
  type CanvasViewportEnvironment,
} from "./use-canvas-viewport";

export interface PatternCanvasEnvironment extends CanvasViewportEnvironment {
  readonly createRasterSurface?: PatternRasterSurfaceFactory;
  readonly drawScheduler?: CanvasFrameScheduler;
  readonly getDevicePixelRatio?: () => number;
}

export interface PatternCanvasComponentProps extends PatternCanvasProps {
  readonly environment?: PatternCanvasEnvironment;
}

export function PatternCanvas({
  pattern,
  environment = {},
}: PatternCanvasComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawFrame = useRef<number | null>(null);
  const [viewFailed, setViewFailed] = useState(false);
  const createRasterSurface = environment.createRasterSurface;
  const getDevicePixelRatio = environment.getDevicePixelRatio;
  const rasterResult = useMemo(
    () => buildPatternRaster(pattern, createRasterSurface),
    [createRasterSurface, pattern],
  );
  const {
    containerRef,
    viewport,
    zoomIn,
    zoomOut,
    fit,
    toggleGrid,
    canZoomIn,
    canZoomOut,
    zoomPercentage,
    gridNeedsZoom,
    pointerHandlers,
  } = useCanvasViewport(pattern.matrix, environment);
  const scheduler = environment.drawScheduler ?? browserDrawScheduler;

  useEffect(() => {
    if (!rasterResult.ok) return;
    if (viewport.viewportWidth <= 0 || viewport.viewportHeight <= 0) return;
    if (drawFrame.current !== null) scheduler.cancel(drawFrame.current);
    drawFrame.current = scheduler.request(() => {
      drawFrame.current = null;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d") ?? null;
      if (canvas === null || context === null) {
        setViewFailed(true);
        return;
      }
      const styles = getComputedStyle(document.documentElement);
      const rendered = renderPattern({
        canvas,
        context,
        raster: rasterResult.raster,
        viewport,
        devicePixelRatio:
          getDevicePixelRatio?.() ?? globalThis.devicePixelRatio,
        gridColor:
          styles.getPropertyValue("--border-strong").trim() || "#BBC4BF",
        backgroundColor:
          styles.getPropertyValue("--surface-secondary").trim() || "#F3F4F1",
      });
      if (!rendered) setViewFailed(true);
    });
    return () => {
      if (drawFrame.current !== null) {
        scheduler.cancel(drawFrame.current);
        drawFrame.current = null;
      }
    };
  }, [getDevicePixelRatio, rasterResult, scheduler, viewport]);

  if (!rasterResult.ok || viewFailed) {
    return (
      <div className="canvas-view-error" role="status">
        We couldn’t display this pattern preview.
      </div>
    );
  }

  return (
    <section className="pattern-canvas" aria-label="Pattern preview">
      <CanvasToolbar
        zoomPercentage={zoomPercentage}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        gridVisible={viewport.gridVisible}
        gridNeedsZoom={gridNeedsZoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fit}
        onToggleGrid={toggleGrid}
      />
      <div className="pattern-canvas__viewport" ref={containerRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Bead pattern preview, ${pattern.matrix.width} columns by ${pattern.matrix.height} rows.`}
          {...pointerHandlers}
        />
      </div>
      <p className="pattern-canvas__help">
        Pattern preview available. Use the zoom controls to inspect the pattern.
      </p>
    </section>
  );
}

const browserDrawScheduler: CanvasFrameScheduler = {
  request(callback) {
    return typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame(callback)
      : window.setTimeout(() => callback(performance.now()), 0);
  },
  cancel(handle) {
    if (typeof window.cancelAnimationFrame === "function")
      window.cancelAnimationFrame(handle);
    else window.clearTimeout(handle);
  },
};
