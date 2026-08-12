import { useId, useState } from "react";

import { Button } from "../../components/ui/Button";

export interface CanvasToolbarProps {
  readonly viewMode: "color" | "code";
  readonly zoomPercentage: number;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFit: () => void;
  readonly onReadCodes: () => void;
  readonly onViewModeChange: (mode: "color" | "code") => void;
}

export function CanvasToolbar({
  viewMode,
  zoomPercentage,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onFit,
  onReadCodes,
  onViewModeChange,
}: CanvasToolbarProps) {
  const secondaryControlsId = useId();
  const [secondaryControlsOpen, setSecondaryControlsOpen] = useState(false);

  return (
    <div className="canvas-toolbar" aria-label="Pattern preview controls">
      <div
        className="canvas-toolbar__primary"
        role="group"
        aria-label="Primary pattern controls"
      >
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
        <Button variant="secondary" onClick={onFit}>
          Fit to Screen
        </Button>
      </div>
      <Button
        className="canvas-toolbar__more"
        variant="tertiary"
        aria-expanded={secondaryControlsOpen}
        aria-controls={secondaryControlsId}
        onClick={() => setSecondaryControlsOpen((open) => !open)}
      >
        More controls
      </Button>
      {secondaryControlsOpen ? (
        <div
          id={secondaryControlsId}
          className="canvas-toolbar__secondary"
          role="group"
          aria-label="More pattern controls"
        >
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
          {viewMode === "code" ? (
            <Button variant="secondary" onClick={onReadCodes}>
              Read Codes
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
