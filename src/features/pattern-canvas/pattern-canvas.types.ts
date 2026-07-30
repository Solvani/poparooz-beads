import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";

export interface CanvasViewportState {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly fitScale: number;
  readonly gridVisible: boolean;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly fitMode: boolean;
}

export interface PatternDimensions {
  readonly width: number;
  readonly height: number;
}

export interface PatternRaster {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export interface PatternCanvasProps {
  readonly pattern: PublicPatternResult;
}

export interface CanvasFrameScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
}

export interface CanvasResizeObserver {
  observe(target: Element): void;
  disconnect(): void;
}

export type CanvasResizeObserverFactory = (
  callback: ResizeObserverCallback,
) => CanvasResizeObserver;
