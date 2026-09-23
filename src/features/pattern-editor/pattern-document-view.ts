import type { PublicPatternPaletteColor } from "../../domain/pattern/public-pattern.types";
import { getPatternEditorPalette } from "./pattern-document";
import {
  PATTERN_DOCUMENT_EMPTY_CELL,
  type PatternDocument,
} from "./pattern-editor.types";

export interface PatternDocumentView {
  readonly matrix: {
    readonly width: number;
    readonly height: number;
    readonly colorIndices: Uint16Array;
    readonly transparentIndex: number;
  };
  readonly colors: readonly {
    readonly index: number;
    readonly color: PublicPatternPaletteColor;
  }[];
}

export function createPatternDocumentView(
  document: PatternDocument,
): PatternDocumentView {
  const palette = getPatternEditorPalette();
  const used = new Set<number>();
  for (const cell of document.cells) {
    if (cell !== PATTERN_DOCUMENT_EMPTY_CELL) used.add(cell);
  }
  const colors = [...used]
    .sort((left, right) => left - right)
    .map((ordinal) => {
      const color = palette.colors[ordinal]!;
      return Object.freeze({
        index: ordinal,
        color: Object.freeze({
          brand: "Poparooz" as const,
          code: color.code,
          hex: color.hex,
        }),
      });
    });
  return Object.freeze({
    matrix: Object.freeze({
      width: document.width,
      height: document.height,
      colorIndices: document.cells,
      transparentIndex: PATTERN_DOCUMENT_EMPTY_CELL,
    }),
    colors: Object.freeze(colors),
  });
}
