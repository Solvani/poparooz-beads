import type { PublicPatternResult } from "../../../domain/pattern/public-pattern.types";

export function createPublicPattern(
  width = 2,
  height = 2,
  indexes: readonly number[] | Uint16Array = [0, 1, 65535, 0],
): PublicPatternResult {
  const values = Array.from(indexes);
  return Object.freeze({
    matrix: Object.freeze({
      width,
      height,
      colorIndices: new Uint16Array(indexes),
      transparentIndex: 65535,
    }),
    colors: Object.freeze([
      Object.freeze({
        index: 0,
        color: Object.freeze({
          brand: "Poparooz" as const,
          code: "POP-RED",
          name: "Red",
          hex: "#FF0000",
          isSpecialFinish: false,
        }),
        beadCount: values.filter((index) => index === 0).length,
      }),
      Object.freeze({
        index: 1,
        color: Object.freeze({
          brand: "Poparooz" as const,
          code: "POP-BLUE",
          name: "Blue",
          hex: "#0000FF",
          isSpecialFinish: false,
        }),
        beadCount: values.filter((index) => index === 1).length,
      }),
    ]),
    materials: Object.freeze([]),
    totals: Object.freeze({
      width,
      height,
      totalPositions: width * height,
      totalBeads: values.filter((index) => index !== 65535).length,
      transparentPositions: values.filter((index) => index === 65535).length,
      colorCount: 2,
    }),
    boardLayout: Object.freeze({
      boardColumns: 1,
      boardRows: 1,
      boardCount: 1,
      boardWidthInBeads: width,
      boardHeightInBeads: height,
      totalPegCapacity: width * height,
      usedBeadCount: values.filter((index) => index !== 65535).length,
      transparentPatternPositions: values.filter((index) => index === 65535)
        .length,
      outsidePatternPegCount: 0,
      unusedPegCount: values.filter((index) => index === 65535).length,
      tiles: Object.freeze([]),
    }),
  });
}
