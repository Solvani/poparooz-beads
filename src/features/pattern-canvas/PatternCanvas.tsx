import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { CanvasToolbar } from "./CanvasToolbar";
import type {
  CanvasFrameScheduler,
  PatternCanvasProps,
} from "./pattern-canvas.types";
import {
  buildPatternRaster,
  type PatternRasterSurfaceFactory,
} from "./pattern-raster";
import {
  CODE_RENDER_THRESHOLD_CSS_PX,
  renderPatternCodes,
} from "./pattern-code-renderer";
import { renderPattern } from "./pattern-renderer";
import { createPatternDocumentView } from "../pattern-editor/pattern-document-view";
import { clientPointToPatternCell } from "../pattern-editor/pattern-editing";
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
  focusedColorIndex = null,
  document: patternDocument,
  focusedDocumentColorIndex = null,
  editor,
  environment = {},
}: PatternCanvasComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawFrame = useRef<number | null>(null);
  const [viewFailed, setViewFailed] = useState(false);
  const [viewMode, setViewMode] = useState<"color" | "code">("color");
  const [codesVisible, setCodesVisible] = useState(false);
  const createRasterSurface = environment.createRasterSurface;
  const getDevicePixelRatio = environment.getDevicePixelRatio;
  const canvasPattern = useMemo(
    () =>
      patternDocument === undefined
        ? pattern
        : createPatternDocumentView(patternDocument),
    [patternDocument, pattern],
  );
  const dimensions = patternDocument ?? pattern.matrix;
  const rasterResult = useMemo(
    () => buildPatternRaster(canvasPattern, createRasterSurface),
    [canvasPattern, createRasterSurface],
  );
  const {
    containerRef,
    viewport,
    zoomIn,
    zoomOut,
    ensureMinimumScale,
    fit,
    setGridVisible,
    canZoomIn,
    canZoomOut,
    zoomPercentage,
    wheelHandler,
    pointerHandlers,
  } = useCanvasViewport(
    dimensions,
    environment,
    editor?.activeTool === "pan" || editor === undefined,
  );
  const scheduler = environment.drawScheduler ?? browserDrawScheduler;
  const effectiveFocusedColorIndex =
    patternDocument === undefined
      ? pattern.colors.some((entry) => entry.index === focusedColorIndex)
        ? focusedColorIndex
        : null
      : canvasPattern.colors.some(
            (entry) => entry.index === focusedDocumentColorIndex,
          )
        ? focusedDocumentColorIndex
        : null;
  const activeEditorTool = editor?.activeTool;
  const cancelEditorDraft = editor?.onCancel;
  const activeEditPointer = useRef<number | null>(null);
  const editorPointerHandlers =
    editor === undefined || editor.activeTool === "pan"
      ? pointerHandlers
      : {
          onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
            if (!event.isPrimary || event.button !== 0) return;
            const cell = clientPointToPatternCell(
              event.clientX,
              event.clientY,
              event.currentTarget.getBoundingClientRect(),
              viewport,
              dimensions,
            );
            if (cell === null) return;
            activeEditPointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            editor.onBegin(cell);
          },
          onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
            if (
              activeEditPointer.current !== event.pointerId ||
              editor.activeTool === "eyedropper"
            )
              return;
            const cell = clientPointToPatternCell(
              event.clientX,
              event.clientY,
              event.currentTarget.getBoundingClientRect(),
              viewport,
              dimensions,
            );
            if (cell !== null) editor.onMove(cell);
          },
          onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
            if (activeEditPointer.current !== event.pointerId) return;
            activeEditPointer.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
            editor.onCommit();
          },
          onPointerCancel(event: ReactPointerEvent<HTMLCanvasElement>) {
            if (activeEditPointer.current !== event.pointerId) return;
            activeEditPointer.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
            editor.onCancel();
          },
        };

  useEffect(() => {
    if (activeEditPointer.current !== null) {
      activeEditPointer.current = null;
      cancelEditorDraft?.();
    }
  }, [activeEditorTool, cancelEditorDraft]);
  const changeViewMode = useCallback(
    (mode: "color" | "code") => {
      setGridVisible(mode === "code");
      if (mode === "code") fit();
      setViewMode(mode);
    },
    [fit, setGridVisible],
  );
  const readCodes = useCallback(
    () => ensureMinimumScale(CODE_RENDER_THRESHOLD_CSS_PX),
    [ensureMinimumScale],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    canvas.addEventListener("wheel", wheelHandler, { passive: false });
    return () => canvas.removeEventListener("wheel", wheelHandler);
  }, [wheelHandler]);

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
        focus:
          effectiveFocusedColorIndex === null
            ? undefined
            : {
                colorIndex: effectiveFocusedColorIndex,
                colorIndices: canvasPattern.matrix.colorIndices,
                transparentIndex: canvasPattern.matrix.transparentIndex,
              },
      });
      if (!rendered) {
        setViewFailed(true);
        return;
      }
      if (viewMode === "code") {
        const codeResult = renderPatternCodes({
          context,
          pattern: canvasPattern,
          viewport,
          focusedColorIndex: effectiveFocusedColorIndex,
        });
        if (!codeResult.ok) setViewFailed(true);
        else setCodesVisible(codeResult.codesVisible);
      } else {
        setCodesVisible(false);
      }
    });
    return () => {
      if (drawFrame.current !== null) {
        scheduler.cancel(drawFrame.current);
        drawFrame.current = null;
      }
    };
  }, [
    getDevicePixelRatio,
    canvasPattern,
    rasterResult,
    scheduler,
    viewMode,
    viewport,
    effectiveFocusedColorIndex,
  ]);

  if (!rasterResult.ok || viewFailed) {
    return (
      <div className="canvas-view-error" role="status">
        We couldn’t display this pattern preview.
      </div>
    );
  }

  return (
    <section className="pattern-canvas" aria-label="Pattern preview">
      <div className="pattern-canvas__topbar">
        <p className="pattern-canvas__meta">
          {dimensions.width} × {dimensions.height} beads ·{" "}
          {canvasPattern.colors.length}{" "}
          {canvasPattern.colors.length === 1 ? "color" : "colors"}
        </p>
        <CanvasToolbar
          viewMode={viewMode}
          zoomPercentage={zoomPercentage}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fit}
          onReadCodes={readCodes}
          onViewModeChange={changeViewMode}
        />
      </div>
      <div
        className={`pattern-canvas__viewport${
          viewMode === "code" ? " pattern-canvas__viewport--code" : ""
        }${editor === undefined ? "" : ` pattern-canvas__viewport--${editor.activeTool}`}`}
        ref={containerRef}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Bead pattern preview, ${dimensions.width} columns by ${dimensions.height} rows.`}
          {...editorPointerHandlers}
        />
      </div>
      <p className="pattern-canvas__help">
        {viewMode === "code" && !codesVisible
          ? "Zoom in to read color codes."
          : viewMode === "code"
            ? "Poparooz color codes are aligned with their pattern cells."
            : "Pattern preview available. Use the zoom controls to inspect the pattern."}
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
