import { Button } from "../../components/ui/Button";

export interface CanvasToolbarProps {
  readonly viewMode: "color" | "code";
  readonly zoomPercentage: number;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly gridVisible: boolean;
  readonly gridNeedsZoom: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFit: () => void;
  readonly onReadCodes: () => void;
  readonly onToggleGrid: () => void;
  readonly onViewModeChange: (mode: "color" | "code") => void;
}

export function CanvasToolbar({
  viewMode,
  zoomPercentage,
  canZoomIn,
  canZoomOut,
  gridVisible,
  gridNeedsZoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onReadCodes,
  onToggleGrid,
  onViewModeChange,
}: CanvasToolbarProps) {
  return (
    <div className="canvas-toolbar" aria-label="Pattern preview controls">
      <div className="canvas-toolbar__views" aria-label="Pattern view">
        <Button
          variant="secondary"
          aria-pressed={viewMode === "color"}
          onClick={() => onViewModeChange("color")}
        >
          Color Preview
        </Button>
        <Button
          variant="secondary"
          aria-pressed={viewMode === "code"}
          onClick={() => onViewModeChange("code")}
        >
          Color Code View
        </Button>
      </div>
      <Button
        variant="secondary"
        aria-label="Zoom out"
        disabled={!canZoomOut}
        onClick={onZoomOut}
      >
        −
      </Button>
      <output className="canvas-toolbar__zoom" aria-label="Current zoom">
        {zoomPercentage}%
      </output>
      <Button
        variant="secondary"
        aria-label="Zoom in"
        disabled={!canZoomIn}
        onClick={onZoomIn}
      >
        +
      </Button>
      <Button variant="secondary" onClick={onFit}>
        Fit Pattern
      </Button>
      {viewMode === "code" ? (
        <Button variant="secondary" onClick={onReadCodes}>
          Read Codes
        </Button>
      ) : null}
      <Button
        variant="secondary"
        aria-pressed={gridVisible}
        onClick={onToggleGrid}
      >
        Grid
      </Button>
      {gridNeedsZoom ? (
        <span className="canvas-toolbar__hint">Zoom in to see the grid.</span>
      ) : null}
    </div>
  );
}
