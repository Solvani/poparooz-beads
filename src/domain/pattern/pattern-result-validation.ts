import { GenerationPaletteColorSchema } from "../../runtime/generation-palette/generation-palette.schema";
import { PATTERN_TRANSPARENT_INDEX } from "./pattern-constants";
import { PatternAssemblyError } from "./pattern-errors";
import type { PatternAssemblyResult, PatternBoardTile } from "./pattern.types";

function fail(
  code:
    | "INVALID_PATTERN_MATRIX"
    | "INVALID_MATERIAL_REQUIREMENT"
    | "INVALID_BOARD_LAYOUT"
    | "INVALID_PATTERN_RESULT",
): never {
  const messages = {
    INVALID_PATTERN_MATRIX: "The pattern matrix is invalid.",
    INVALID_MATERIAL_REQUIREMENT: "The material requirements are invalid.",
    INVALID_BOARD_LAYOUT: "The board layout is invalid.",
    INVALID_PATTERN_RESULT: "The assembled pattern result is invalid.",
  } as const;
  throw new PatternAssemblyError(code, messages[code]);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function compareBinary(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePatternColors(
  left: PatternAssemblyResult["colors"][number],
  right: PatternAssemblyResult["colors"][number],
): number {
  return (
    left.color.sortOrder - right.color.sortOrder ||
    compareBinary(left.color.code, right.color.code)
  );
}

function validateTile(
  tile: PatternBoardTile,
  expectedIndex: number,
  boardPegCapacity: number,
): void {
  if (
    typeof tile !== "object" ||
    tile === null ||
    tile.index !== expectedIndex ||
    !isNonNegativeSafeInteger(tile.row) ||
    !isNonNegativeSafeInteger(tile.column) ||
    !isNonNegativeSafeInteger(tile.originX) ||
    !isNonNegativeSafeInteger(tile.originY) ||
    !isPositiveSafeInteger(tile.coveredWidth) ||
    !isPositiveSafeInteger(tile.coveredHeight) ||
    !isNonNegativeSafeInteger(tile.beadCount) ||
    !isNonNegativeSafeInteger(tile.transparentPatternPositions) ||
    !isNonNegativeSafeInteger(tile.outsidePatternPegCount) ||
    tile.beadCount +
      tile.transparentPatternPositions +
      tile.outsidePatternPegCount !==
      boardPegCapacity
  ) {
    fail("INVALID_BOARD_LAYOUT");
  }
}

export function validatePatternAssemblyResult(
  result: PatternAssemblyResult,
): void {
  if (typeof result !== "object" || result === null) {
    fail("INVALID_PATTERN_RESULT");
  }
  const { matrix, colors, materials, totals, boardLayout } = result;
  if (
    typeof matrix !== "object" ||
    matrix === null ||
    !isPositiveSafeInteger(matrix.width) ||
    !isPositiveSafeInteger(matrix.height) ||
    matrix.width > Math.floor(Number.MAX_SAFE_INTEGER / matrix.height) ||
    !(matrix.colorIndices instanceof Uint16Array) ||
    matrix.colorIndices.length !== matrix.width * matrix.height ||
    matrix.transparentIndex !== PATTERN_TRANSPARENT_INDEX ||
    !Array.isArray(colors) ||
    colors.length < 1 ||
    colors.length >= PATTERN_TRANSPARENT_INDEX
  ) {
    fail("INVALID_PATTERN_MATRIX");
  }

  const observedCounts = new Uint32Array(colors.length);
  let observedTransparent = 0;
  for (const index of matrix.colorIndices) {
    if (index === PATTERN_TRANSPARENT_INDEX) {
      observedTransparent += 1;
    } else if (index < colors.length) {
      observedCounts[index] = observedCounts[index]! + 1;
    } else {
      fail("INVALID_PATTERN_MATRIX");
    }
  }

  const codes = new Set<string>();
  const quantizedIndices = new Set<number>();
  for (let index = 0; index < colors.length; index += 1) {
    const patternColor = colors[index]!;
    if (
      typeof patternColor !== "object" ||
      patternColor === null ||
      patternColor.index !== index ||
      typeof patternColor.color !== "object" ||
      patternColor.color === null ||
      !GenerationPaletteColorSchema.safeParse(patternColor.color).success ||
      codes.has(patternColor.color.code) ||
      (index > 0 &&
        comparePatternColors(colors[index - 1]!, patternColor) >= 0) ||
      !isPositiveSafeInteger(patternColor.beadCount) ||
      observedCounts[index] !== patternColor.beadCount ||
      !Array.isArray(patternColor.sourceMappings) ||
      patternColor.sourceMappings.length < 1 ||
      !Number.isFinite(patternColor.weightedAverageDistance) ||
      patternColor.weightedAverageDistance < 0 ||
      Object.is(patternColor.weightedAverageDistance, -0) ||
      !Number.isFinite(patternColor.maximumDistance) ||
      patternColor.maximumDistance < 0 ||
      Object.is(patternColor.maximumDistance, -0)
    ) {
      fail("INVALID_PATTERN_RESULT");
    }
    codes.add(patternColor.color.code);

    let mappedBeads = 0;
    let weightedDistance = 0;
    let maximumDistance = 0;
    let previousQuantizedIndex = -1;
    for (const mapping of patternColor.sourceMappings) {
      if (
        typeof mapping !== "object" ||
        mapping === null ||
        !isNonNegativeSafeInteger(mapping.quantizedColorIndex) ||
        mapping.quantizedColorIndex <= previousQuantizedIndex ||
        mapping.paletteCode !== patternColor.color.code ||
        !Number.isFinite(mapping.distance) ||
        mapping.distance < 0 ||
        Object.is(mapping.distance, -0) ||
        !isPositiveSafeInteger(mapping.pixelCount)
      ) {
        fail("INVALID_PATTERN_RESULT");
      }
      previousQuantizedIndex = mapping.quantizedColorIndex;
      if (quantizedIndices.has(mapping.quantizedColorIndex)) {
        fail("INVALID_PATTERN_RESULT");
      }
      quantizedIndices.add(mapping.quantizedColorIndex);
      mappedBeads += mapping.pixelCount;
      weightedDistance += mapping.distance * mapping.pixelCount;
      maximumDistance = Math.max(maximumDistance, mapping.distance);
    }
    if (
      mappedBeads !== patternColor.beadCount ||
      weightedDistance / mappedBeads !== patternColor.weightedAverageDistance ||
      maximumDistance !== patternColor.maximumDistance
    ) {
      fail("INVALID_PATTERN_RESULT");
    }
  }
  for (let index = 0; index < quantizedIndices.size; index += 1) {
    if (!quantizedIndices.has(index)) {
      fail("INVALID_PATTERN_RESULT");
    }
  }

  if (!Array.isArray(materials) || materials.length !== colors.length) {
    fail("INVALID_MATERIAL_REQUIREMENT");
  }
  for (let index = 0; index < materials.length; index += 1) {
    const material = materials[index]!;
    const color = colors[index]!;
    if (
      typeof material !== "object" ||
      material === null ||
      typeof material.color !== "object" ||
      material.color === null ||
      !GenerationPaletteColorSchema.safeParse(material.color).success ||
      material.patternColorIndex !== index ||
      material.color.code !== color.color.code ||
      material.beadCount !== color.beadCount
    ) {
      fail("INVALID_MATERIAL_REQUIREMENT");
    }
  }

  const totalPositions = matrix.width * matrix.height;
  const totalBeads = colors.reduce((sum, color) => sum + color.beadCount, 0);
  if (
    typeof totals !== "object" ||
    totals === null ||
    totals.width !== matrix.width ||
    totals.height !== matrix.height ||
    totals.totalPositions !== totalPositions ||
    totals.totalBeads !== totalBeads ||
    totals.transparentPositions !== observedTransparent ||
    totals.totalBeads + totals.transparentPositions !== totalPositions ||
    totals.colorCount !== colors.length
  ) {
    fail("INVALID_PATTERN_RESULT");
  }

  if (
    typeof boardLayout !== "object" ||
    boardLayout === null ||
    typeof boardLayout.boardProfileId !== "string" ||
    boardLayout.boardProfileId.length === 0 ||
    typeof boardLayout.boardProfileVersion !== "string" ||
    boardLayout.boardProfileVersion.length === 0 ||
    !isPositiveSafeInteger(boardLayout.boardColumns) ||
    !isPositiveSafeInteger(boardLayout.boardRows) ||
    !isPositiveSafeInteger(boardLayout.boardWidthInBeads) ||
    !isPositiveSafeInteger(boardLayout.boardHeightInBeads) ||
    boardLayout.boardCount !==
      boardLayout.boardColumns * boardLayout.boardRows ||
    boardLayout.totalPegCapacity !==
      boardLayout.boardCount *
        boardLayout.boardWidthInBeads *
        boardLayout.boardHeightInBeads ||
    boardLayout.usedBeadCount !== totals.totalBeads ||
    boardLayout.transparentPatternPositions !== totals.transparentPositions ||
    boardLayout.outsidePatternPegCount !==
      boardLayout.totalPegCapacity - totals.totalPositions ||
    boardLayout.unusedPegCount !==
      boardLayout.transparentPatternPositions +
        boardLayout.outsidePatternPegCount ||
    boardLayout.usedBeadCount + boardLayout.unusedPegCount !==
      boardLayout.totalPegCapacity ||
    !Array.isArray(boardLayout.tiles) ||
    boardLayout.tiles.length !== boardLayout.boardCount
  ) {
    fail("INVALID_BOARD_LAYOUT");
  }

  const boardPegCapacity =
    boardLayout.boardWidthInBeads * boardLayout.boardHeightInBeads;
  let tileBeads = 0;
  let tileTransparent = 0;
  let tileOutside = 0;
  boardLayout.tiles.forEach((tile, index) => {
    validateTile(tile, index, boardPegCapacity);
    const expectedRow = Math.floor(index / boardLayout.boardColumns);
    const expectedColumn = index % boardLayout.boardColumns;
    if (
      tile.row !== expectedRow ||
      tile.column !== expectedColumn ||
      tile.originX !== expectedColumn * boardLayout.boardWidthInBeads ||
      tile.originY !== expectedRow * boardLayout.boardHeightInBeads ||
      tile.coveredWidth !==
        Math.min(boardLayout.boardWidthInBeads, matrix.width - tile.originX) ||
      tile.coveredHeight !==
        Math.min(boardLayout.boardHeightInBeads, matrix.height - tile.originY)
    ) {
      fail("INVALID_BOARD_LAYOUT");
    }
    let observedTileBeads = 0;
    let observedTileTransparent = 0;
    for (let y = 0; y < tile.coveredHeight; y += 1) {
      const matrixRow = (tile.originY + y) * matrix.width;
      for (let x = 0; x < tile.coveredWidth; x += 1) {
        if (
          matrix.colorIndices[matrixRow + tile.originX + x] ===
          PATTERN_TRANSPARENT_INDEX
        ) {
          observedTileTransparent += 1;
        } else {
          observedTileBeads += 1;
        }
      }
    }
    if (
      tile.beadCount !== observedTileBeads ||
      tile.transparentPatternPositions !== observedTileTransparent ||
      tile.outsidePatternPegCount !==
        boardPegCapacity - tile.coveredWidth * tile.coveredHeight
    ) {
      fail("INVALID_BOARD_LAYOUT");
    }
    tileBeads += tile.beadCount;
    tileTransparent += tile.transparentPatternPositions;
    tileOutside += tile.outsidePatternPegCount;
  });
  if (
    tileBeads !== totals.totalBeads ||
    tileTransparent !== totals.transparentPositions ||
    tileOutside !== boardLayout.outsidePatternPegCount
  ) {
    fail("INVALID_BOARD_LAYOUT");
  }
}
