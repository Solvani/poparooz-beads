import { Button } from "../../components/ui/Button";
import { getPatternEditorPalette } from "./pattern-document";
import type { PatternEditorTool } from "./pattern-editing";

export interface PatternEditorToolbarProps {
  readonly activeTool: PatternEditorTool;
  readonly selectedPaintColorCode: string;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly dirty: boolean;
  readonly onToolChange: (tool: PatternEditorTool) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onReset: () => void;
}

export function PatternEditorToolbar(props: PatternEditorToolbarProps) {
  const selected = getPatternEditorPalette().colors.find(
    (color) => color.code === props.selectedPaintColorCode,
  )!;
  return (
    <div
      className="pattern-editor-toolbar"
      aria-label="Pattern editing controls"
    >
      <div
        className="pattern-editor-toolbar__tools"
        role="toolbar"
        aria-label="Editing tools"
      >
        {(["pan", "pen", "eraser", "eyedropper", "rectangle"] as const).map(
          (tool) => (
            <Button
              key={tool}
              data-editor-tool={tool}
              variant="secondary"
              aria-pressed={props.activeTool === tool}
              onClick={() => props.onToolChange(tool)}
            >
              {tool[0]!.toUpperCase() + tool.slice(1)}
            </Button>
          ),
        )}
      </div>
      <div
        className="pattern-editor-toolbar__history"
        role="group"
        aria-label="Edit history"
      >
        <Button
          variant="secondary"
          disabled={!props.canUndo}
          onClick={props.onUndo}
        >
          Undo
        </Button>
        <Button
          variant="secondary"
          disabled={!props.canRedo}
          onClick={props.onRedo}
        >
          Redo
        </Button>
        <Button
          variant="secondary"
          disabled={!props.dirty}
          onClick={props.onReset}
        >
          Reset
        </Button>
      </div>
      <p className="pattern-editor-toolbar__selection">
        <span
          className="pattern-editor-toolbar__swatch"
          style={{ backgroundColor: selected.hex }}
          aria-hidden="true"
        />
        Paint {props.selectedPaintColorCode} ·{" "}
        {props.dirty ? "Edited" : "Original"}
      </p>
    </div>
  );
}
