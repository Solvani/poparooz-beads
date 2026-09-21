import { useCallback, useMemo, useRef, useState } from "react";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { PatternCanvas } from "../pattern-canvas/PatternCanvas";
import { getPatternEditorPalette } from "./pattern-document";
import {
  createPatternEditorSession,
  isPatternEditorDirty,
  reducePatternEditorSession,
} from "./pattern-editor-reducer";
import type { PatternEditorSession } from "./pattern-editor.types";
import { PatternEditorToolbar } from "./PatternEditorToolbar";
import {
  applyDraftCells,
  interpolatePatternCells,
  strokeValue,
  type PatternCell,
  type PatternEditorTool,
} from "./pattern-editing";
import { PATTERN_DOCUMENT_EMPTY_CELL } from "./pattern-editor.types";

export function PatternEditorCanvas({
  sourceResult,
  focusedColorIndex = null,
}: {
  readonly sourceResult: PublicPatternResult;
  readonly focusedColorIndex?: number | null;
}) {
  let initialSession: PatternEditorSession;
  try {
    initialSession = createPatternEditorSession(sourceResult);
  } catch {
    return (
      <div className="pattern-editor">
        <PatternCanvas
          pattern={sourceResult}
          focusedColorIndex={focusedColorIndex}
        />
        <p className="pattern-editor__status" role="status">
          Local editing is unavailable for this pattern.
        </p>
      </div>
    );
  }
  return (
    <PatternEditorSessionCanvas
      initialSession={initialSession}
      focusedColorIndex={focusedColorIndex}
    />
  );
}

function PatternEditorSessionCanvas({
  initialSession,
  focusedColorIndex,
}: {
  readonly initialSession: PatternEditorSession;
  readonly focusedColorIndex: number | null;
}) {
  const sourceResult = initialSession.sourceResult;
  const [session, setSession] = useState(initialSession);
  const initialOrdinal =
    initialSession.history.present.cells.find(
      (cell) => cell !== PATTERN_DOCUMENT_EMPTY_CELL,
    ) ?? 0;
  const [activeTool, setActiveTool] = useState<PatternEditorTool>("pan");
  const [selectedOrdinal, setSelectedOrdinal] = useState(initialOrdinal);
  const [draft, setDraft] = useState<ReadonlyMap<number, number>>(new Map());
  const draftRef = useRef<ReadonlyMap<number, number>>(new Map());
  const lastCell = useRef<PatternCell | null>(null);
  const drawingTool = useRef<"pen" | "eraser">("pen");
  const document = session.history.present;

  const cancelDraft = useCallback(() => {
    lastCell.current = null;
    draftRef.current = new Map();
    setDraft(draftRef.current);
  }, []);
  const changeTool = useCallback(
    (tool: PatternEditorTool) => {
      cancelDraft();
      if (tool === "pen" || tool === "eraser") drawingTool.current = tool;
      setActiveTool(tool);
    },
    [cancelDraft],
  );
  const addCell = useCallback(
    (cell: PatternCell) => {
      const previous = lastCell.current ?? cell;
      lastCell.current = cell;
      const value = strokeValue(
        activeTool as "pen" | "eraser",
        selectedOrdinal,
      );
      setDraft((current) => {
        const next = new Map(current);
        for (const point of interpolatePatternCells(previous, cell)) {
          next.set(point.row * document.width + point.column, value);
        }
        draftRef.current = next;
        return next;
      });
    },
    [activeTool, document.width, selectedOrdinal],
  );
  const begin = useCallback(
    (cell: PatternCell) => {
      if (activeTool === "eyedropper") {
        const value = document.cells[cell.row * document.width + cell.column];
        if (value !== undefined && value !== PATTERN_DOCUMENT_EMPTY_CELL) {
          setSelectedOrdinal(value);
          setActiveTool(drawingTool.current);
        }
        return;
      }
      if (activeTool === "pen" || activeTool === "eraser") addCell(cell);
    },
    [activeTool, addCell, document],
  );
  const commit = useCallback(() => {
    const completedDraft = draftRef.current;
    if (completedDraft.size > 0) {
      const candidate = applyDraftCells(document, completedDraft);
      setSession((current) =>
        reducePatternEditorSession(current, {
          type: "commit",
          document: candidate,
        }),
      );
    }
    cancelDraft();
  }, [cancelDraft, document]);
  const preview = useMemo(
    () => applyDraftCells(document, draft),
    [document, draft],
  );
  const focusedCode =
    focusedColorIndex === null
      ? null
      : (sourceResult.colors.find((entry) => entry.index === focusedColorIndex)
          ?.color.code ?? null);
  const focusedOrdinal =
    focusedCode === null
      ? null
      : (getPatternEditorPalette().colors.find(
          (color) => color.code === focusedCode,
        )?.sortOrder ?? null);

  return (
    <div className="pattern-editor">
      <PatternEditorToolbar
        activeTool={activeTool}
        selectedOrdinal={selectedOrdinal}
        canUndo={session.history.past.length > 0}
        canRedo={session.history.future.length > 0}
        dirty={isPatternEditorDirty(session)}
        onToolChange={changeTool}
        onSelectedOrdinalChange={setSelectedOrdinal}
        onUndo={() => {
          cancelDraft();
          setSession((current) =>
            reducePatternEditorSession(current, { type: "undo" }),
          );
        }}
        onRedo={() => {
          cancelDraft();
          setSession((current) =>
            reducePatternEditorSession(current, { type: "redo" }),
          );
        }}
      />
      <PatternCanvas
        pattern={sourceResult}
        document={preview}
        focusedDocumentColorIndex={focusedOrdinal}
        editor={{
          activeTool,
          onBegin: begin,
          onMove: addCell,
          onCommit: commit,
          onCancel: cancelDraft,
        }}
      />
      <p className="pattern-editor__status" role="status" aria-live="polite">
        {isPatternEditorDirty(session)
          ? "Local pattern edits are not included in downloads."
          : "Editing the generated pattern locally."}
      </p>
    </div>
  );
}
