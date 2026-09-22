import { copyPatternDocument } from "./pattern-document";
import {
  PATTERN_DOCUMENT_EMPTY_CELL,
  type PatternDocument,
} from "./pattern-editor.types";

export type PatternEditorTool =
  "pan" | "pen" | "eraser" | "eyedropper" | "rectangle";

export interface PatternCell {
  readonly column: number;
  readonly row: number;
}

export function clientPointToPatternCell(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, "left" | "top" | "width" | "height">,
  viewport: {
    readonly scale: number;
    readonly offsetX: number;
    readonly offsetY: number;
  },
  document: Pick<PatternDocument, "width" | "height">,
): PatternCell | null {
  const x = clientX - bounds.left;
  const y = clientY - bounds.top;
  if (
    x < 0 ||
    y < 0 ||
    x >= bounds.width ||
    y >= bounds.height ||
    viewport.scale <= 0
  )
    return null;
  const column = Math.floor((x - viewport.offsetX) / viewport.scale);
  const row = Math.floor((y - viewport.offsetY) / viewport.scale);
  return column >= 0 &&
    row >= 0 &&
    column < document.width &&
    row < document.height
    ? { column, row }
    : null;
}

export function interpolatePatternCells(
  from: PatternCell,
  to: PatternCell,
): PatternCell[] {
  const cells: PatternCell[] = [];
  let x = from.column;
  let y = from.row;
  const dx = Math.abs(to.column - x);
  const dy = Math.abs(to.row - y);
  const stepX = x < to.column ? 1 : -1;
  const stepY = y < to.row ? 1 : -1;
  let error = dx - dy;
  while (true) {
    cells.push({ column: x, row: y });
    if (x === to.column && y === to.row) return cells;
    const doubled = error * 2;
    if (doubled > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubled < dx) {
      error += dx;
      y += stepY;
    }
  }
}

export function applyDraftCells(
  base: PatternDocument,
  draft: ReadonlyMap<number, number>,
): PatternDocument {
  if (draft.size === 0) return base;
  const copy = copyPatternDocument(base);
  const cells = new Uint16Array(copy.cells);
  for (const [position, value] of draft) cells[position] = value;
  return Object.freeze({ ...copy, cells });
}

export function strokeValue(
  tool: "pen" | "eraser",
  paintOrdinal: number,
): number {
  return tool === "eraser" ? PATTERN_DOCUMENT_EMPTY_CELL : paintOrdinal;
}
