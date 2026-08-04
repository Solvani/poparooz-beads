import type { PublicPatternResult } from "../../../domain/pattern/public-pattern.types";

interface FixtureColor {
  readonly index: number;
  readonly beadCount: number;
  readonly code?: string;
  readonly name?: string;
  readonly hex?: string;
}

export interface ResultFixtureOptions {
  readonly width?: number;
  readonly height?: number;
  readonly transparentPositions?: number;
  readonly colors?: readonly FixtureColor[];
  readonly boardColumns?: number;
  readonly boardRows?: number;
}

export function createResultFixture(
  options: ResultFixtureOptions = {},
): PublicPatternResult {
  const width = options.width ?? 4;
  const height = options.height ?? 2;
  const transparentPositions = options.transparentPositions ?? 1;
  const totalBeads = width * height - transparentPositions;
  const definitions = options.colors ?? [
    { index: 0, beadCount: totalBeads - 2, code: "P01", name: "Red" },
    { index: 1, beadCount: 2, code: "P02", name: "Blue" },
  ];
  const matrixValues = definitions.flatMap((color) =>
    Array.from({ length: color.beadCount }, () => color.index),
  );
  matrixValues.push(
    ...Array.from({ length: transparentPositions }, () => 65535),
  );
  const boardColumns = options.boardColumns ?? 1;
  const boardRows = options.boardRows ?? 1;
  const boardWidthInBeads = Math.ceil(width / boardColumns);
  const boardHeightInBeads = Math.ceil(height / boardRows);
  const tiles = [];
  let outsidePatternPegCount = 0;
  for (let row = 0; row < boardRows; row += 1) {
    for (let column = 0; column < boardColumns; column += 1) {
      const originX = column * boardWidthInBeads;
      const originY = row * boardHeightInBeads;
      const coveredWidth = Math.min(boardWidthInBeads, width - originX);
      const coveredHeight = Math.min(boardHeightInBeads, height - originY);
      let tileBeads = 0;
      let tileTransparent = 0;
      for (let y = originY; y < originY + coveredHeight; y += 1) {
        for (let x = originX; x < originX + coveredWidth; x += 1) {
          if (matrixValues[y * width + x] === 65535) tileTransparent += 1;
          else tileBeads += 1;
        }
      }
      const tileOutside =
        boardWidthInBeads * boardHeightInBeads - coveredWidth * coveredHeight;
      outsidePatternPegCount += tileOutside;
      tiles.push(
        Object.freeze({
          index: tiles.length,
          row,
          column,
          originX,
          originY,
          coveredWidth,
          coveredHeight,
          beadCount: tileBeads,
          transparentPatternPositions: tileTransparent,
          outsidePatternPegCount: tileOutside,
        }),
      );
    }
  }
  const colors = definitions.map((definition, position) =>
    Object.freeze({
      index: definition.index,
      color: Object.freeze({
        brand: "Poparooz" as const,
        code: definition.code ?? `A${position + 1}`,
        name: definition.name ?? `Color ${position + 1}`,
        hex: definition.hex ?? hexFor(position),
      }),
      beadCount: definition.beadCount,
    }),
  );
  const boardCount = boardColumns * boardRows;
  return Object.freeze({
    matrix: Object.freeze({
      width,
      height,
      colorIndices: new Uint16Array(matrixValues),
      transparentIndex: 65535,
    }),
    colors: Object.freeze(colors),
    materials: Object.freeze(
      colors.map((entry) =>
        Object.freeze({
          patternColorIndex: entry.index,
          color: entry.color,
          beadCount: entry.beadCount,
        }),
      ),
    ),
    totals: Object.freeze({
      width,
      height,
      totalPositions: width * height,
      totalBeads,
      transparentPositions,
      colorCount: colors.length,
    }),
    boardLayout: Object.freeze({
      boardColumns,
      boardRows,
      boardCount,
      boardWidthInBeads,
      boardHeightInBeads,
      totalPegCapacity: boardCount * boardWidthInBeads * boardHeightInBeads,
      usedBeadCount: totalBeads,
      transparentPatternPositions: transparentPositions,
      outsidePatternPegCount,
      unusedPegCount: transparentPositions + outsidePatternPegCount,
      tiles: Object.freeze(tiles),
    }),
  });
}

export function createManyColors(count: number): readonly FixtureColor[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    beadCount: 1,
    code: `P${String(index + 1).padStart(3, "0")}`,
    name: `Color ${index + 1}`,
  }));
}

function hexFor(index: number): string {
  return `#${((index * 2_654_435 + 0x224466) & 0xffffff)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase()}`;
}
