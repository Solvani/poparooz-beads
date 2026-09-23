import {
  copyPatternDocument,
  getPatternEditorPalette,
} from "./pattern-document";
import {
  PATTERN_DOCUMENT_EMPTY_CELL,
  type PatternDocument,
} from "./pattern-editor.types";
import type { PatternCell } from "./pattern-editing";

export interface UsedPatternColor {
  readonly code: string;
  readonly ordinal: number;
  readonly hex: string;
  readonly count: number;
}

export interface PatternRectangle {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export function resolvePaletteOrdinal(code: string): number | null {
  return (
    getPatternEditorPalette().colors.find((color) => color.code === code)
      ?.sortOrder ?? null
  );
}

export function deriveUsedPatternColors(
  document: PatternDocument,
): readonly UsedPatternColor[] {
  const counts = new Uint32Array(getPatternEditorPalette().colors.length);
  for (const cell of document.cells)
    if (cell !== PATTERN_DOCUMENT_EMPTY_CELL) counts[cell]! += 1;
  return getPatternEditorPalette().colors.flatMap((color) =>
    counts[color.sortOrder] === 0
      ? []
      : [
          {
            code: color.code,
            ordinal: color.sortOrder,
            hex: color.hex,
            count: counts[color.sortOrder]!,
          },
        ],
  );
}

export function createReplaceDraft(
  document: PatternDocument,
  sourceColorCode: string,
  targetColorCode: string,
): ReadonlyMap<number, number> {
  const source = resolvePaletteOrdinal(sourceColorCode);
  const target = resolvePaletteOrdinal(targetColorCode);
  if (source === null || target === null || source === target) return new Map();
  const draft = new Map<number, number>();
  document.cells.forEach((cell, position) => {
    if (cell === source) draft.set(position, target);
  });
  return draft;
}

export function normalizePatternRectangle(
  anchor: PatternCell,
  end: PatternCell,
): PatternRectangle {
  return {
    left: Math.min(anchor.column, end.column),
    top: Math.min(anchor.row, end.row),
    right: Math.max(anchor.column, end.column),
    bottom: Math.max(anchor.row, end.row),
  };
}

export function createRectangleDraft(
  document: PatternDocument,
  anchor: PatternCell,
  end: PatternCell,
  targetOrdinal: number,
): ReadonlyMap<number, number> {
  if (
    targetOrdinal < 0 ||
    targetOrdinal >= getPatternEditorPalette().colors.length
  )
    return new Map();
  const rectangle = normalizePatternRectangle(anchor, end);
  const draft = new Map<number, number>();
  for (
    let row = Math.max(0, rectangle.top);
    row <= Math.min(document.height - 1, rectangle.bottom);
    row += 1
  ) {
    for (
      let column = Math.max(0, rectangle.left);
      column <= Math.min(document.width - 1, rectangle.right);
      column += 1
    ) {
      const position = row * document.width + column;
      if (document.cells[position] !== targetOrdinal)
        draft.set(position, targetOrdinal);
    }
  }
  return draft;
}

export function applyBatchDraft(
  document: PatternDocument,
  draft: ReadonlyMap<number, number>,
): PatternDocument {
  if (draft.size === 0) return document;
  const copy = copyPatternDocument(document);
  const cells = new Uint16Array(copy.cells);
  for (const [position, value] of draft) cells[position] = value;
  return Object.freeze({ ...copy, cells });
}
