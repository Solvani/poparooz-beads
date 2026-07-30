import { toPublicPaletteColor } from "../palette/palette-public.mapper";
import { PatternAssemblyError } from "./pattern-errors";
import { validatePatternAssemblyResult } from "./pattern-result-validation";
import type { PatternAssemblyResult } from "./pattern.types";
import type {
  PublicPatternBoardLayout,
  PublicPatternResult,
} from "./public-pattern.types";

export function toPublicPatternResult(
  internal: PatternAssemblyResult,
): PublicPatternResult {
  try {
    validatePatternAssemblyResult(internal);
    const colors = Object.freeze(
      internal.colors.map((patternColor) =>
        Object.freeze({
          index: patternColor.index,
          color: toPublicPaletteColor(patternColor.color),
          beadCount: patternColor.beadCount,
        }),
      ),
    );
    const materials = Object.freeze(
      internal.materials.map((material) =>
        Object.freeze({
          patternColorIndex: material.patternColorIndex,
          color: toPublicPaletteColor(material.color),
          beadCount: material.beadCount,
          ...(material.packSize === undefined
            ? {}
            : {
                packSize: material.packSize,
                packsRequired: material.packsRequired,
              }),
        }),
      ),
    );
    const tiles = Object.freeze(
      internal.boardLayout.tiles.map((tile) =>
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
    );
    const boardLayout: PublicPatternBoardLayout = Object.freeze({
      boardColumns: internal.boardLayout.boardColumns,
      boardRows: internal.boardLayout.boardRows,
      boardCount: internal.boardLayout.boardCount,
      boardWidthInBeads: internal.boardLayout.boardWidthInBeads,
      boardHeightInBeads: internal.boardLayout.boardHeightInBeads,
      totalPegCapacity: internal.boardLayout.totalPegCapacity,
      usedBeadCount: internal.boardLayout.usedBeadCount,
      transparentPatternPositions:
        internal.boardLayout.transparentPatternPositions,
      outsidePatternPegCount: internal.boardLayout.outsidePatternPegCount,
      unusedPegCount: internal.boardLayout.unusedPegCount,
      tiles,
    });
    return Object.freeze({
      matrix: Object.freeze({
        width: internal.matrix.width,
        height: internal.matrix.height,
        colorIndices: new Uint16Array(internal.matrix.colorIndices),
        transparentIndex: internal.matrix.transparentIndex,
      }),
      colors,
      materials,
      totals: Object.freeze({
        width: internal.totals.width,
        height: internal.totals.height,
        totalPositions: internal.totals.totalPositions,
        totalBeads: internal.totals.totalBeads,
        transparentPositions: internal.totals.transparentPositions,
        colorCount: internal.totals.colorCount,
      }),
      boardLayout,
    });
  } catch (error) {
    if (
      error instanceof PatternAssemblyError &&
      error.code === "PUBLIC_PATTERN_MAPPING_FAILED"
    ) {
      throw error;
    }
    throw new PatternAssemblyError(
      "PUBLIC_PATTERN_MAPPING_FAILED",
      "The public pattern result could not be created.",
      error instanceof PatternAssemblyError ? error.code : undefined,
    );
  }
}
