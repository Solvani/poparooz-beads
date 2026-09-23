import { buildPatternBoardLayout } from "../../domain/pattern/board-layout";
import type {
  PublicPatternBoardLayout,
  PublicPatternPaletteColor,
  PublicPatternResult,
} from "../../domain/pattern/public-pattern.types";
import {
  getPatternEditorBoardProfile,
  getPatternEditorPalette,
  validatePatternDocument,
} from "./pattern-document";
import {
  PATTERN_DOCUMENT_EMPTY_CELL,
  PatternEditorError,
  type PatternDocument,
} from "./pattern-editor.types";

export interface EmptyPatternDocumentProjection {
  readonly kind: "empty-edited-pattern";
  readonly width: number;
  readonly height: number;
  readonly totalPositions: number;
  readonly totalBeads: 0;
  readonly transparentPositions: number;
  readonly colorCount: 0;
  readonly colors: readonly never[];
  readonly materials: readonly never[];
  readonly boardLayout: PublicPatternBoardLayout;
}

export function projectPatternDocument(
  document: PatternDocument,
): PublicPatternResult {
  validatePatternDocument(document);
  const palette = getPatternEditorPalette();
  const counts = new Uint32Array(palette.colors.length);
  let transparentPositions = 0;
  for (const cell of document.cells) {
    if (cell === PATTERN_DOCUMENT_EMPTY_CELL) transparentPositions += 1;
    else counts[cell] = counts[cell]! + 1;
  }

  const usedOrdinals: number[] = [];
  counts.forEach((count, ordinal) => {
    if (count > 0) usedOrdinals.push(ordinal);
  });
  if (usedOrdinals.length === 0) {
    throw new PatternEditorError(
      "EMPTY_PATTERN_RESULT_UNSUPPORTED",
      "PublicPatternResult requires at least one used color.",
    );
  }

  const localIndexByOrdinal = new Int32Array(palette.colors.length).fill(-1);
  usedOrdinals.forEach((ordinal, localIndex) => {
    localIndexByOrdinal[ordinal] = localIndex;
  });
  const colorIndices = new Uint16Array(document.cells.length);
  document.cells.forEach((cell, position) => {
    colorIndices[position] =
      cell === PATTERN_DOCUMENT_EMPTY_CELL
        ? PATTERN_DOCUMENT_EMPTY_CELL
        : localIndexByOrdinal[cell]!;
  });

  const colors = Object.freeze(
    usedOrdinals.map((ordinal, index) => {
      const canonical = palette.colors[ordinal]!;
      return Object.freeze({
        index,
        color: publicColor(canonical.code, canonical.hex),
        beadCount: counts[ordinal]!,
      });
    }),
  );
  const materials = Object.freeze(
    colors.map((entry) =>
      Object.freeze({
        patternColorIndex: entry.index,
        color: entry.color,
        beadCount: entry.beadCount,
      }),
    ),
  );
  const totals = Object.freeze({
    width: document.width,
    height: document.height,
    totalPositions: document.cells.length,
    totalBeads: document.cells.length - transparentPositions,
    transparentPositions,
    colorCount: colors.length,
  });
  const matrix = Object.freeze({
    width: document.width,
    height: document.height,
    colorIndices,
    transparentIndex: PATTERN_DOCUMENT_EMPTY_CELL,
  });
  const boardLayout = toPublicBoardLayout(
    buildPatternBoardLayout(matrix, totals, getPatternEditorBoardProfile()),
  );

  return Object.freeze({ matrix, colors, materials, totals, boardLayout });
}

export function projectEmptyPatternDocument(
  document: PatternDocument,
): EmptyPatternDocumentProjection {
  validatePatternDocument(document);
  if (document.cells.some((cell) => cell !== PATTERN_DOCUMENT_EMPTY_CELL)) {
    throw new PatternEditorError(
      "INVALID_PATTERN_DOCUMENT",
      "An empty edited-pattern projection requires every cell to be empty.",
    );
  }
  const totalPositions = document.cells.length;
  const totals = Object.freeze({
    width: document.width,
    height: document.height,
    totalPositions,
    totalBeads: 0,
    transparentPositions: totalPositions,
    colorCount: 0,
  });
  const matrix = Object.freeze({
    width: document.width,
    height: document.height,
    colorIndices: document.cells.slice(),
    transparentIndex: PATTERN_DOCUMENT_EMPTY_CELL,
  });
  return Object.freeze({
    kind: "empty-edited-pattern",
    width: document.width,
    height: document.height,
    totalPositions,
    totalBeads: 0,
    transparentPositions: totalPositions,
    colorCount: 0,
    colors: Object.freeze([]),
    materials: Object.freeze([]),
    boardLayout: toPublicBoardLayout(
      buildPatternBoardLayout(matrix, totals, getPatternEditorBoardProfile()),
    ),
  });
}

function publicColor(code: string, hex: string): PublicPatternPaletteColor {
  return Object.freeze({ brand: "Poparooz", code, hex });
}

function toPublicBoardLayout(
  layout: ReturnType<typeof buildPatternBoardLayout>,
): PublicPatternBoardLayout {
  return Object.freeze({
    boardColumns: layout.boardColumns,
    boardRows: layout.boardRows,
    boardCount: layout.boardCount,
    boardWidthInBeads: layout.boardWidthInBeads,
    boardHeightInBeads: layout.boardHeightInBeads,
    totalPegCapacity: layout.totalPegCapacity,
    usedBeadCount: layout.usedBeadCount,
    transparentPatternPositions: layout.transparentPatternPositions,
    outsidePatternPegCount: layout.outsidePatternPegCount,
    unusedPegCount: layout.unusedPegCount,
    tiles: Object.freeze(
      layout.tiles.map((tile) =>
        Object.freeze({
          index: tile.index,
          row: tile.row,
          column: tile.column,
          originX: tile.originX,
          originY: tile.originY,
          coveredWidth: tile.coveredWidth,
          coveredHeight: tile.coveredHeight,
          beadCount: tile.beadCount,
          transparentPatternPositions: tile.transparentPatternPositions,
          outsidePatternPegCount: tile.outsidePatternPegCount,
        }),
      ),
    ),
  });
}
