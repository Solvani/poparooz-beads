import type { PublicPatternResult } from "../../../domain/pattern/public-pattern.types";

export function createPublicPattern(
  width = 2,
  height = 2,
  indexes: readonly number[] | Uint16Array = [0, 1, 65535, 0],
): PublicPatternResult {
  const values = Array.from(indexes);
  const beadCount = values.filter((index) => index !== 65535).length;
  const transparentPositions = values.filter((index) => index === 65535).length;
  const colorDefinitions = [
    {
      index: 0,
      color: {
        brand: "Poparooz" as const,
        code: "A1",
        name: "Red",
        hex: "#FF0000",
      },
    },
    {
      index: 1,
      color: {
        brand: "Poparooz" as const,
        code: "B1",
        name: "Blue",
        hex: "#0000FF",
      },
    },
  ];
  const colors = colorDefinitions
    .map((definition) => ({
      ...definition,
      beadCount: values.filter((index) => index === definition.index).length,
    }))
    .filter((definition) => definition.beadCount > 0)
    .map((definition) => Object.freeze(definition));
  return Object.freeze({
    matrix: Object.freeze({
      width,
      height,
      colorIndices: new Uint16Array(indexes),
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
      totalBeads: beadCount,
      transparentPositions,
      colorCount: colors.length,
    }),
    boardLayout: Object.freeze({
      boardColumns: 1,
      boardRows: 1,
      boardCount: 1,
      boardWidthInBeads: width,
      boardHeightInBeads: height,
      totalPegCapacity: width * height,
      usedBeadCount: beadCount,
      transparentPatternPositions: transparentPositions,
      outsidePatternPegCount: 0,
      unusedPegCount: transparentPositions,
      tiles: Object.freeze([
        Object.freeze({
          index: 0,
          row: 0,
          column: 0,
          originX: 0,
          originY: 0,
          coveredWidth: width,
          coveredHeight: height,
          beadCount,
          transparentPatternPositions: transparentPositions,
          outsidePatternPegCount: 0,
        }),
      ]),
    }),
  });
}
