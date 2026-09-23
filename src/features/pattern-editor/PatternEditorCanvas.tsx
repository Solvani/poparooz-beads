import { useCallback, useMemo, useRef, useState } from "react";
import { PatternCanvas } from "../pattern-canvas/PatternCanvas";
import {
  applyBatchDraft,
  createRectangleDraft,
  createReplaceDraft,
  resolvePaletteOrdinal,
} from "./pattern-batch-operations";
import { getPatternEditorPalette } from "./pattern-document";
import {
  isPatternEditorDirty,
  reducePatternEditorSession,
} from "./pattern-editor-reducer";
import {
  PATTERN_DOCUMENT_EMPTY_CELL,
  type PatternEditorSession,
} from "./pattern-editor.types";
import { PatternEditorToolbar } from "./PatternEditorToolbar";
import {
  applyDraftCells,
  interpolatePatternCells,
  strokeValue,
  type PatternCell,
  type PatternEditorTool,
} from "./pattern-editing";
import { PatternPalette, type ReplacePreviewState } from "./PatternPalette";

interface ReplaceBatch extends ReplacePreviewState {
  readonly type: "replace";
  readonly draft: ReadonlyMap<number, number>;
}
interface RectangleBatch {
  readonly type: "rectangle";
  readonly anchor: PatternCell;
  readonly end: PatternCell;
  readonly ready: boolean;
  readonly draft: ReadonlyMap<number, number>;
}
type BatchPreview = ReplaceBatch | RectangleBatch;

export function PatternEditorCanvas({
  session,
  focusedColorCode = null,
  onSessionChange,
}: {
  readonly session: PatternEditorSession;
  readonly focusedColorCode?: string | null;
  readonly onSessionChange: (session: PatternEditorSession) => void;
}) {
  const sourceResult = session.sourceResult;
  const initialOrdinal =
    session.history.present.cells.find(
      (cell) => cell !== PATTERN_DOCUMENT_EMPTY_CELL,
    ) ?? 0;
  const [activeTool, setActiveTool] = useState<PatternEditorTool>("pan");
  const [selectedPaintColorCode, setSelectedPaintColorCode] = useState(
    getPatternEditorPalette().colors[initialOrdinal]!.code,
  );
  const [strokeDraft, setStrokeDraft] = useState<ReadonlyMap<number, number>>(
    new Map(),
  );
  const [batchPreview, setBatchPreview] = useState<BatchPreview | null>(null);
  const [virtualCursor, setVirtualCursor] = useState<PatternCell>({
    column: 0,
    row: 0,
  });
  const strokeDraftRef = useRef<ReadonlyMap<number, number>>(new Map());
  const batchPreviewRef = useRef<BatchPreview | null>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const lastCell = useRef<PatternCell | null>(null);
  const drawingTool = useRef<"pen" | "eraser">("pen");
  const document = session.history.present;
  const selectedOrdinal = resolvePaletteOrdinal(selectedPaintColorCode) ?? 0;

  const updateBatchPreview = useCallback((preview: BatchPreview | null) => {
    batchPreviewRef.current = preview;
    setBatchPreview(preview);
  }, []);
  const cancelStroke = useCallback(() => {
    lastCell.current = null;
    strokeDraftRef.current = new Map();
    setStrokeDraft(strokeDraftRef.current);
  }, []);
  const cancelPreview = useCallback(
    () => updateBatchPreview(null),
    [updateBatchPreview],
  );
  const cancelTransient = useCallback(() => {
    cancelStroke();
    cancelPreview();
  }, [cancelPreview, cancelStroke]);
  const changeTool = useCallback(
    (tool: PatternEditorTool) => {
      cancelTransient();
      if (tool === "pen" || tool === "eraser") drawingTool.current = tool;
      setActiveTool(tool);
    },
    [cancelTransient],
  );
  const selectPaintColor = useCallback((code: string) => {
    if (resolvePaletteOrdinal(code) !== null) setSelectedPaintColorCode(code);
  }, []);
  const addStrokeCell = useCallback(
    (cell: PatternCell) => {
      const previous = lastCell.current ?? cell;
      lastCell.current = cell;
      const value = strokeValue(
        activeTool as "pen" | "eraser",
        selectedOrdinal,
      );
      setStrokeDraft((current) => {
        const next = new Map(current);
        for (const point of interpolatePatternCells(previous, cell))
          next.set(point.row * document.width + point.column, value);
        strokeDraftRef.current = next;
        return next;
      });
    },
    [activeTool, document.width, selectedOrdinal],
  );
  const updateRectangle = useCallback(
    (cell: PatternCell) => {
      const current = batchPreviewRef.current;
      if (current?.type !== "rectangle" || current.ready) {
        updateBatchPreview({
          type: "rectangle",
          anchor: cell,
          end: cell,
          ready: false,
          draft: new Map(),
        });
        return;
      }
      const draft = createRectangleDraft(
        document,
        current.anchor,
        cell,
        selectedOrdinal,
      );
      updateBatchPreview({ ...current, end: cell, ready: true, draft });
    },
    [document, selectedOrdinal, updateBatchPreview],
  );
  const begin = useCallback(
    (cell: PatternCell) => {
      setVirtualCursor(cell);
      if (activeTool === "eyedropper") {
        const value = document.cells[cell.row * document.width + cell.column];
        if (value !== undefined && value !== PATTERN_DOCUMENT_EMPTY_CELL) {
          setSelectedPaintColorCode(
            getPatternEditorPalette().colors[value]!.code,
          );
          setActiveTool(drawingTool.current);
        }
      } else if (activeTool === "rectangle") updateRectangle(cell);
      else if (activeTool === "pen" || activeTool === "eraser")
        addStrokeCell(cell);
    },
    [activeTool, addStrokeCell, document, updateRectangle],
  );
  const move = useCallback(
    (cell: PatternCell) => {
      setVirtualCursor(cell);
      if (activeTool === "rectangle") {
        const current = batchPreviewRef.current;
        if (current?.type === "rectangle") {
          const draft = createRectangleDraft(
            document,
            current.anchor,
            cell,
            selectedOrdinal,
          );
          updateBatchPreview({ ...current, end: cell, ready: true, draft });
        }
      } else if (activeTool === "pen" || activeTool === "eraser")
        addStrokeCell(cell);
    },
    [activeTool, addStrokeCell, document, selectedOrdinal, updateBatchPreview],
  );
  const commitPointer = useCallback(() => {
    if (activeTool === "rectangle") return;
    const completed = strokeDraftRef.current;
    if (completed.size > 0) {
      const candidate = applyDraftCells(document, completed);
      onSessionChange(
        reducePatternEditorSession(session, {
          type: "commit",
          document: candidate,
        }),
      );
    }
    cancelStroke();
  }, [activeTool, cancelStroke, document, onSessionChange, session]);
  const applyBatch = useCallback(() => {
    const preview = batchPreviewRef.current;
    if (preview !== null && preview.draft.size > 0) {
      const candidate = applyBatchDraft(document, preview.draft);
      onSessionChange(
        reducePatternEditorSession(session, {
          type: "commit",
          document: candidate,
        }),
      );
    }
    cancelPreview();
  }, [cancelPreview, document, onSessionChange, session]);
  const returnFocusToRectangleTool = useCallback(() => {
    window.requestAnimationFrame(() => {
      editorRootRef.current
        ?.querySelector<HTMLButtonElement>('[data-editor-tool="rectangle"]')
        ?.focus();
    });
  }, []);
  const previewReplace = useCallback(
    (sourceCode: string, targetCode: string) => {
      const draft = createReplaceDraft(document, sourceCode, targetCode);
      updateBatchPreview({
        type: "replace",
        sourceCode,
        targetCode,
        affectedCount: draft.size,
        draft,
      });
    },
    [document, updateBatchPreview],
  );
  const undo = useCallback(() => {
    cancelTransient();
    onSessionChange(reducePatternEditorSession(session, { type: "undo" }));
  }, [cancelTransient, onSessionChange, session]);
  const redo = useCallback(() => {
    cancelTransient();
    onSessionChange(reducePatternEditorSession(session, { type: "redo" }));
  }, [cancelTransient, onSessionChange, session]);
  const reset = useCallback(() => {
    cancelTransient();
    onSessionChange(reducePatternEditorSession(session, { type: "reset" }));
  }, [cancelTransient, onSessionChange, session]);
  const keyCommand = useCallback(
    (command: {
      key: string;
      ctrlKey: boolean;
      metaKey: boolean;
      shiftKey: boolean;
    }) => {
      const modifier = command.ctrlKey || command.metaKey;
      if (modifier && command.key.toLowerCase() === "z") {
        if (command.shiftKey) redo();
        else undo();
        return true;
      }
      if (modifier && command.key.toLowerCase() === "y") {
        redo();
        return true;
      }
      if (command.key === "Escape") {
        cancelTransient();
        return true;
      }
      const delta =
        command.key === "ArrowLeft"
          ? [-1, 0]
          : command.key === "ArrowRight"
            ? [1, 0]
            : command.key === "ArrowUp"
              ? [0, -1]
              : command.key === "ArrowDown"
                ? [0, 1]
                : null;
      if (delta !== null) {
        setVirtualCursor((current) => ({
          column: Math.max(
            0,
            Math.min(document.width - 1, current.column + delta[0]!),
          ),
          row: Math.max(
            0,
            Math.min(document.height - 1, current.row + delta[1]!),
          ),
        }));
        return true;
      }
      if (
        activeTool === "rectangle" &&
        (command.key === "Enter" || command.key === " ")
      ) {
        updateRectangle(virtualCursor);
        return true;
      }
      return false;
    },
    [
      activeTool,
      cancelTransient,
      document,
      redo,
      undo,
      updateRectangle,
      virtualCursor,
    ],
  );

  const transientDocument = useMemo(() => {
    const stroked = applyDraftCells(document, strokeDraft);
    return batchPreview === null
      ? stroked
      : applyBatchDraft(stroked, batchPreview.draft);
  }, [batchPreview, document, strokeDraft]);
  const focusedOrdinal =
    focusedColorCode === null ? null : resolvePaletteOrdinal(focusedColorCode);
  const replacePreview = batchPreview?.type === "replace" ? batchPreview : null;
  return (
    <div className="pattern-editor" ref={editorRootRef}>
      <PatternEditorToolbar
        activeTool={activeTool}
        selectedPaintColorCode={selectedPaintColorCode}
        canUndo={session.history.past.length > 0}
        canRedo={session.history.future.length > 0}
        dirty={isPatternEditorDirty(session)}
        onToolChange={changeTool}
        onUndo={undo}
        onRedo={redo}
        onReset={reset}
      />
      <PatternPalette
        document={document}
        selectedPaintColorCode={selectedPaintColorCode}
        replacePreview={replacePreview}
        onSelectPaintColor={selectPaintColor}
        onPreviewReplace={previewReplace}
        onApplyReplace={applyBatch}
        onCancelReplace={cancelPreview}
      />
      {batchPreview?.type === "rectangle" ? (
        <div className="pattern-batch-preview" aria-label="Rectangle preview">
          <p aria-live="polite">
            Rectangle {batchPreview.anchor.column + 1},
            {batchPreview.anchor.row + 1} to {batchPreview.end.column + 1},
            {batchPreview.end.row + 1}
            <br />
            <strong>{batchPreview.draft.size} cells will change</strong>
          </p>
          <div>
            <button
              type="button"
              className="button button--primary"
              disabled={!batchPreview.ready || batchPreview.draft.size === 0}
              onClick={() => {
                applyBatch();
                returnFocusToRectangleTool();
              }}
            >
              Apply
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                cancelPreview();
                returnFocusToRectangleTool();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <PatternCanvas
        pattern={sourceResult}
        document={transientDocument}
        focusedDocumentColorIndex={focusedOrdinal}
        editor={{
          activeTool,
          onBegin: begin,
          onMove: move,
          onCommit: commitPointer,
          onCancel: cancelTransient,
          virtualCursor,
          onKeyCommand: keyCommand,
        }}
      />
      <p className="pattern-editor__status" role="status" aria-live="polite">
        {batchPreview !== null
          ? "Preview only. Apply or cancel this batch edit."
          : isPatternEditorDirty(session)
            ? "Results reflect local edits. Downloads still use the generated pattern."
            : "Editing the generated pattern locally."}
      </p>
    </div>
  );
}
