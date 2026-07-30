import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  canZoomIn,
  canZoomOut,
  createUnmeasuredViewport,
  fitPattern,
  GRID_RENDER_THRESHOLD_CSS_PX,
  panViewport,
  resizeViewport,
  toggleGrid,
  zoomPercentage,
  zoomViewport,
  ZOOM_FACTOR,
} from "./canvas-viewport";
import type {
  CanvasFrameScheduler,
  CanvasResizeObserverFactory,
  PatternDimensions,
} from "./pattern-canvas.types";

export interface CanvasViewportEnvironment {
  readonly scheduler?: CanvasFrameScheduler;
  readonly createResizeObserver?: CanvasResizeObserverFactory | null;
}

interface DragState {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly target: HTMLCanvasElement;
}

export function useCanvasViewport(
  pattern: PatternDimensions,
  environment: CanvasViewportEnvironment = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(createUnmeasuredViewport);
  const drag = useRef<DragState | null>(null);
  const resizeFrame = useRef<number | null>(null);
  const scheduler = environment.scheduler ?? browserFrameScheduler;

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (container === null) return;
    const bounds = container.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    setViewport((current) =>
      resizeViewport(current, pattern, bounds.width, bounds.height),
    );
  }, [pattern]);

  const scheduleMeasure = useCallback(() => {
    if (resizeFrame.current !== null) return;
    resizeFrame.current = scheduler.request(() => {
      resizeFrame.current = null;
      measure();
    });
  }, [measure, scheduler]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const createObserver =
      environment.createResizeObserver === undefined
        ? defaultResizeObserverFactory()
        : environment.createResizeObserver;
    const observer = createObserver?.(() => scheduleMeasure()) ?? null;
    observer?.observe(container);
    if (observer === null) window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();
    return () => {
      observer?.disconnect();
      if (observer === null)
        window.removeEventListener("resize", scheduleMeasure);
      if (resizeFrame.current !== null) {
        scheduler.cancel(resizeFrame.current);
        resizeFrame.current = null;
      }
      releaseActivePointer(drag);
    };
  }, [environment.createResizeObserver, scheduleMeasure, scheduler]);

  const fit = useCallback(
    () =>
      setViewport(
        (current) =>
          fitPattern(
            pattern,
            current.viewportWidth,
            current.viewportHeight,
            current.gridVisible,
          ) ?? current,
      ),
    [pattern],
  );
  const zoomIn = useCallback(
    () => setViewport((current) => zoomViewport(current, pattern, ZOOM_FACTOR)),
    [pattern],
  );
  const zoomOut = useCallback(
    () =>
      setViewport((current) => zoomViewport(current, pattern, 1 / ZOOM_FACTOR)),
    [pattern],
  );
  const grid = useCallback(
    () => setViewport((current) => toggleGrid(current)),
    [],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!event.isPrimary || event.button !== 0) return;
      drag.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        target: event.currentTarget,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const current = drag.current;
      if (current?.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - current.x;
      const deltaY = event.clientY - current.y;
      drag.current = {
        pointerId: current.pointerId,
        x: event.clientX,
        y: event.clientY,
        target: current.target,
      };
      setViewport((view) => panViewport(view, pattern, deltaX, deltaY));
    },
    [pattern],
  );
  const endPointer = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (drag.current?.pointerId !== event.pointerId) return;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );
  const onWheel = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      setViewport((view) =>
        panViewport(view, pattern, -event.deltaX, -event.deltaY),
      );
    },
    [pattern],
  );

  return {
    containerRef: containerRef as RefObject<HTMLDivElement>,
    viewport,
    zoomIn,
    zoomOut,
    fit,
    toggleGrid: grid,
    canZoomIn: canZoomIn(viewport),
    canZoomOut: canZoomOut(viewport),
    zoomPercentage: zoomPercentage(viewport),
    gridNeedsZoom:
      viewport.gridVisible && viewport.scale < GRID_RENDER_THRESHOLD_CSS_PX,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onWheel,
    },
  } as const;
}

function releaseActivePointer(drag: React.RefObject<DragState | null>) {
  const active = drag.current;
  drag.current = null;
  if (active === null) return;
  try {
    if (active.target.hasPointerCapture(active.pointerId))
      active.target.releasePointerCapture(active.pointerId);
  } catch {
    // A detached Canvas may already have released capture.
  }
}

const browserFrameScheduler: CanvasFrameScheduler = {
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

function defaultResizeObserverFactory(): CanvasResizeObserverFactory | null {
  if (typeof ResizeObserver === "undefined") return null;
  return (callback) => new ResizeObserver(callback);
}
