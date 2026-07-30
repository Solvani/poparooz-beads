import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { BoardLayoutView, BoardTileView } from "./result.types";

export const MAX_DOM_BOARD_TILES = 100;
export const MAX_COMPRESSED_GRID_LINES = 20;

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

export function toBoardLayoutView(
  pattern: PublicPatternResult,
): BoardLayoutView | null {
  const layout = pattern.boardLayout;
  if (
    !positiveInteger(layout.boardColumns) ||
    !positiveInteger(layout.boardRows) ||
    !positiveInteger(layout.boardCount) ||
    layout.boardColumns * layout.boardRows !== layout.boardCount ||
    !positiveInteger(layout.boardWidthInBeads) ||
    !positiveInteger(layout.boardHeightInBeads) ||
    !nonNegativeInteger(layout.totalPegCapacity) ||
    !nonNegativeInteger(layout.usedBeadCount) ||
    !nonNegativeInteger(layout.transparentPatternPositions) ||
    !nonNegativeInteger(layout.outsidePatternPegCount) ||
    !nonNegativeInteger(layout.unusedPegCount) ||
    layout.usedBeadCount !== pattern.totals.totalBeads ||
    layout.transparentPatternPositions !==
      pattern.totals.transparentPositions ||
    layout.totalPegCapacity !==
      layout.boardCount *
        layout.boardWidthInBeads *
        layout.boardHeightInBeads ||
    layout.unusedPegCount !==
      layout.transparentPatternPositions + layout.outsidePatternPegCount ||
    layout.tiles.length !== layout.boardCount
  ) {
    return null;
  }

  let tileBeads = 0;
  let tileTransparent = 0;
  let tileOutside = 0;
  const visibleTiles: BoardTileView[] = [];
  for (let position = 0; position < layout.tiles.length; position += 1) {
    const tile = layout.tiles[position]!;
    const expectedRow = Math.floor(position / layout.boardColumns);
    const expectedColumn = position % layout.boardColumns;
    if (
      tile.index !== position ||
      tile.row !== expectedRow ||
      tile.column !== expectedColumn ||
      !nonNegativeInteger(tile.originX) ||
      !nonNegativeInteger(tile.originY) ||
      !positiveInteger(tile.coveredWidth) ||
      !positiveInteger(tile.coveredHeight) ||
      tile.coveredWidth > layout.boardWidthInBeads ||
      tile.coveredHeight > layout.boardHeightInBeads ||
      tile.originX + tile.coveredWidth > pattern.matrix.width ||
      tile.originY + tile.coveredHeight > pattern.matrix.height ||
      !nonNegativeInteger(tile.beadCount) ||
      !nonNegativeInteger(tile.transparentPatternPositions) ||
      !nonNegativeInteger(tile.outsidePatternPegCount)
    ) {
      return null;
    }
    tileBeads += tile.beadCount;
    tileTransparent += tile.transparentPatternPositions;
    tileOutside += tile.outsidePatternPegCount;
    if (layout.boardCount <= MAX_DOM_BOARD_TILES) {
      visibleTiles.push(
        Object.freeze({
          row: tile.row,
          column: tile.column,
          label: `Board at row ${tile.row + 1}, column ${tile.column + 1}`,
        }),
      );
    }
  }
  if (
    tileBeads !== layout.usedBeadCount ||
    tileTransparent !== layout.transparentPatternPositions ||
    tileOutside !== layout.outsidePatternPegCount
  ) {
    return null;
  }

  const boardCountLabel = `${formatNumber(layout.boardCount)} ${
    layout.boardCount === 1 ? "board" : "boards"
  }`;
  return Object.freeze({
    boardCount: layout.boardCount,
    boardCountLabel,
    boardColumns: layout.boardColumns,
    boardRows: layout.boardRows,
    dimensionsLabel: `${formatNumber(layout.boardColumns)} ${
      layout.boardColumns === 1 ? "column" : "columns"
    } × ${formatNumber(layout.boardRows)} ${
      layout.boardRows === 1 ? "row" : "rows"
    }`,
    accessibilityLabel: `Board layout, ${boardCountLabel}, ${formatNumber(layout.boardColumns)} ${
      layout.boardColumns === 1 ? "column" : "columns"
    } by ${formatNumber(layout.boardRows)} ${
      layout.boardRows === 1 ? "row" : "rows"
    }.`,
    previewKind:
      layout.boardCount <= MAX_DOM_BOARD_TILES ? "tiles" : "compressed",
    previewColumns: Math.min(layout.boardColumns, MAX_COMPRESSED_GRID_LINES),
    previewRows: Math.min(layout.boardRows, MAX_COMPRESSED_GRID_LINES),
    tiles: Object.freeze(visibleTiles),
  });
}

function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

function positiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
