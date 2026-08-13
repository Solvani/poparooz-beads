export interface BoardPurchaseOption {
  readonly optionId: "board-52" | "board-78" | "board-104";
  readonly beadWidth: 52 | 78 | 104;
  readonly beadHeight: 52 | 78 | 104;
  readonly physicalWidthCm: 14 | 21 | 28;
  readonly physicalHeightCm: 14 | 21 | 28;
  readonly assembly: "modular" | "standalone";
}

export interface ModularBoardAlternative {
  readonly board: BoardPurchaseOption;
  readonly columns: number;
  readonly rows: number;
  readonly boardCount: number;
  readonly coverageWidth: number;
  readonly coverageHeight: number;
}

export interface RecommendedBoardSetup {
  readonly primary: BoardPurchaseOption;
  readonly modularAlternative: ModularBoardAlternative | null;
}

export const BOARD_PURCHASE_OPTIONS: readonly BoardPurchaseOption[] =
  Object.freeze([
    Object.freeze({
      optionId: "board-52",
      beadWidth: 52,
      beadHeight: 52,
      physicalWidthCm: 14,
      physicalHeightCm: 14,
      assembly: "modular",
    }),
    Object.freeze({
      optionId: "board-78",
      beadWidth: 78,
      beadHeight: 78,
      physicalWidthCm: 21,
      physicalHeightCm: 21,
      assembly: "standalone",
    }),
    Object.freeze({
      optionId: "board-104",
      beadWidth: 104,
      beadHeight: 104,
      physicalWidthCm: 28,
      physicalHeightCm: 28,
      assembly: "standalone",
    }),
  ]);

const MODULAR_BOARD = BOARD_PURCHASE_OPTIONS[0]!;
const MAX_SUPPORTED_PATTERN_SIZE = 104;

export function recommendBoardSetup({
  width,
  height,
}: {
  readonly width: number;
  readonly height: number;
}): RecommendedBoardSetup | null {
  if (
    !positiveInteger(width) ||
    !positiveInteger(height) ||
    width > MAX_SUPPORTED_PATTERN_SIZE ||
    height > MAX_SUPPORTED_PATTERN_SIZE
  ) {
    return null;
  }
  const primary = BOARD_PURCHASE_OPTIONS.find(
    (board) => width <= board.beadWidth && height <= board.beadHeight,
  );
  if (primary === undefined) return null;
  const columns = Math.ceil(width / MODULAR_BOARD.beadWidth);
  const rows = Math.ceil(height / MODULAR_BOARD.beadHeight);
  const boardCount = columns * rows;
  const modularAlternative =
    primary.optionId === MODULAR_BOARD.optionId && boardCount === 1
      ? null
      : Object.freeze({
          board: MODULAR_BOARD,
          columns,
          rows,
          boardCount,
          coverageWidth: columns * MODULAR_BOARD.beadWidth,
          coverageHeight: rows * MODULAR_BOARD.beadHeight,
        });
  return Object.freeze({ primary, modularAlternative });
}

function positiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
