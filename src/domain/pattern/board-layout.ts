import type { BoardProfile } from "../board/board-profile.types";
import { PATTERN_TRANSPARENT_INDEX } from "./pattern-constants";
import { PatternAssemblyError } from "./pattern-errors";
import type {
  PatternBoardLayout,
  PatternBoardTile,
  PatternMatrix,
  PatternTotals,
} from "./pattern.types";

function safeMultiply(left: number, right: number): number {
  const result = left * right;
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new PatternAssemblyError(
      "INVALID_BOARD_LAYOUT",
      "The board layout exceeds safe integer capacity.",
    );
  }
  return result;
}

export function buildPatternBoardLayout(
  matrix: PatternMatrix,
  totals: PatternTotals,
  boardProfile: BoardProfile,
): PatternBoardLayout {
  const boardWidthInBeads = boardProfile.columns;
  const boardHeightInBeads = boardProfile.rows;
  const boardColumns = Math.ceil(matrix.width / boardWidthInBeads);
  const boardRows = Math.ceil(matrix.height / boardHeightInBeads);
  const boardCount = safeMultiply(boardColumns, boardRows);
  const boardPegCapacity = safeMultiply(boardWidthInBeads, boardHeightInBeads);
  const totalPegCapacity = safeMultiply(boardCount, boardPegCapacity);
  const tiles: PatternBoardTile[] = [];

  for (let row = 0; row < boardRows; row += 1) {
    for (let column = 0; column < boardColumns; column += 1) {
      const originX = column * boardWidthInBeads;
      const originY = row * boardHeightInBeads;
      const coveredWidth = Math.min(boardWidthInBeads, matrix.width - originX);
      const coveredHeight = Math.min(
        boardHeightInBeads,
        matrix.height - originY,
      );
      let beadCount = 0;
      let transparentPatternPositions = 0;
      for (let y = 0; y < coveredHeight; y += 1) {
        const matrixRow = (originY + y) * matrix.width;
        for (let x = 0; x < coveredWidth; x += 1) {
          if (
            matrix.colorIndices[matrixRow + originX + x] ===
            PATTERN_TRANSPARENT_INDEX
          ) {
            transparentPatternPositions += 1;
          } else {
            beadCount += 1;
          }
        }
      }
      const coveredPositions = coveredWidth * coveredHeight;
      const outsidePatternPegCount = boardPegCapacity - coveredPositions;
      tiles.push(
        Object.freeze({
          index: tiles.length,
          row,
          column,
          originX,
          originY,
          coveredWidth,
          coveredHeight,
          beadCount,
          transparentPatternPositions,
          outsidePatternPegCount,
        }),
      );
    }
  }

  const outsidePatternPegCount = totalPegCapacity - totals.totalPositions;
  const unusedPegCount = totals.transparentPositions + outsidePatternPegCount;
  return Object.freeze({
    boardProfileId: boardProfile.id,
    boardProfileName: boardProfile.name,
    boardColumns,
    boardRows,
    boardCount,
    boardWidthInBeads,
    boardHeightInBeads,
    totalPegCapacity,
    usedBeadCount: totals.totalBeads,
    transparentPatternPositions: totals.transparentPositions,
    outsidePatternPegCount,
    unusedPegCount,
    tiles: Object.freeze(tiles),
  });
}
