import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";

export const READING_SHEET_MAX_SPAN = 52;
export interface ReadingSheet {
  readonly sectionId: string;
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly globalStartX: number;
  readonly globalEndX: number;
  readonly globalStartY: number;
  readonly globalEndY: number;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly number[];
  readonly perColorBeadCounts: readonly Readonly<{
    patternColorIndex: number;
    beadCount: number;
  }>[];
  readonly totalBeads: number;
}
export function segmentPatternIntoReadingSheets(
  pattern: PublicPatternResult,
): readonly ReadingSheet[] {
  const { width, height, colorIndices, transparentIndex } = pattern.matrix;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 104 ||
    height > 104 ||
    colorIndices.length !== width * height
  )
    throw new Error("Invalid reading-sheet matrix.");
  const indices = new Set(pattern.colors.map((c) => c.index));
  const totals = new Map<number, number>();
  const sheets: ReadingSheet[] = [];
  for (
    let rowIndex = 0;
    rowIndex < Math.ceil(height / READING_SHEET_MAX_SPAN);
    rowIndex++
  ) {
    for (
      let columnIndex = 0;
      columnIndex < Math.ceil(width / READING_SHEET_MAX_SPAN);
      columnIndex++
    ) {
      const startX = columnIndex * READING_SHEET_MAX_SPAN,
        startY = rowIndex * READING_SHEET_MAX_SPAN;
      const sheetWidth = Math.min(READING_SHEET_MAX_SPAN, width - startX),
        sheetHeight = Math.min(READING_SHEET_MAX_SPAN, height - startY);
      const cells: number[] = [],
        counts = new Map<number, number>();
      for (let y = 0; y < sheetHeight; y++)
        for (let x = 0; x < sheetWidth; x++) {
          const index = colorIndices[(startY + y) * width + startX + x]!;
          if (index !== transparentIndex && !indices.has(index))
            throw new Error("Unknown reading-sheet color.");
          cells.push(index);
          if (index !== transparentIndex) {
            counts.set(index, (counts.get(index) ?? 0) + 1);
            totals.set(index, (totals.get(index) ?? 0) + 1);
          }
        }
      const perColorBeadCounts = Object.freeze(
        pattern.colors
          .filter((c) => counts.has(c.index))
          .map((c) =>
            Object.freeze({
              patternColorIndex: c.index,
              beadCount: counts.get(c.index)!,
            }),
          ),
      );
      sheets.push(
        Object.freeze({
          sectionId: String.fromCharCode(65 + rowIndex) + (columnIndex + 1),
          rowIndex,
          columnIndex,
          globalStartX: startX + 1,
          globalEndX: startX + sheetWidth,
          globalStartY: startY + 1,
          globalEndY: startY + sheetHeight,
          width: sheetWidth,
          height: sheetHeight,
          cells: Object.freeze(cells),
          perColorBeadCounts,
          totalBeads: perColorBeadCounts.reduce(
            (sum, c) => sum + c.beadCount,
            0,
          ),
        }),
      );
    }
  }
  if (
    sheets.reduce((sum, s) => sum + s.totalBeads, 0) !==
      pattern.totals.totalBeads ||
    pattern.materials.length !== totals.size ||
    pattern.materials.some(
      (m) => totals.get(m.patternColorIndex) !== m.beadCount,
    )
  )
    throw new Error("Reading-sheet counts disagree with material authority.");
  return Object.freeze(sheets);
}
export function getReadingGuides(span: number) {
  return Object.freeze(
    Array.from(
      { length: Math.max(0, Math.ceil(span / 5) - 1) },
      (_, i) => (i + 1) * 5,
    ).map((position) =>
      Object.freeze({
        position,
        kind: position % 10 === 0 ? ("major" as const) : ("helper" as const),
        thickness: position % 10 === 0 ? 3 : 2,
      }),
    ),
  );
}
export function readingSheetFilename(target: string): string {
  return target === "overview"
    ? "poparooz-pattern-overview.png"
    : `poparooz-pattern-${target}.png`;
}
