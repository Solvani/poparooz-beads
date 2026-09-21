import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { PatternDocument } from "../pattern-editor/pattern-editor.types";
import type {
  PatternCell,
  PatternEditorTool,
} from "../pattern-editor/pattern-editing";

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
  readonly focusedColorIndex?: number | null;
  readonly document?: PatternDocument;
  readonly focusedDocumentColorIndex?: number | null;
  readonly editor?: {
    readonly activeTool: PatternEditorTool;
    readonly onBegin: (cell: PatternCell) => void;
    readonly onMove: (cell: PatternCell) => void;
    readonly onCommit: () => void;
    readonly onCancel: () => void;
  };
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
