import { Button } from "../../components/ui/Button";

export interface CanvasToolbarProps {
  readonly zoomPercentage: number;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly gridVisible: boolean;
  readonly gridNeedsZoom: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFit: () => void;
  readonly onToggleGrid: () => void;
}

export function CanvasToolbar({
  zoomPercentage,
  canZoomIn,
  canZoomOut,
  gridVisible,
  gridNeedsZoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleGrid,
}: CanvasToolbarProps) {
  return (
    <div className="canvas-toolbar" aria-label="Pattern preview controls">
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
