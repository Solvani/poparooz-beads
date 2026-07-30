import type { BoardProfile } from "../board/board-profile.types";
import type { PaletteColor, PaletteDefinition } from "../palette/palette.types";
import type { QuantizedImage } from "../quantization/quantization.types";

export interface AssemblePatternInput {
  readonly quantizedImage: QuantizedImage;
  readonly palette: PaletteDefinition;
  readonly boardProfile: BoardProfile;
}

export interface QuantizedPaletteMapping {
  readonly quantizedColorIndex: number;
  readonly paletteReferenceCode: string;
  readonly distance: number;
  readonly pixelCount: number;
}

export interface PatternColor {
  readonly index: number;
  readonly color: PaletteColor;
  readonly beadCount: number;
  readonly sourceMappings: readonly QuantizedPaletteMapping[];
  readonly weightedAverageDistance: number;
  readonly maximumDistance: number;
}

export interface PatternMatrix {
  readonly width: number;
  readonly height: number;
  readonly colorIndices: Uint16Array;
  readonly transparentIndex: number;
}

export interface MaterialRequirement {
  readonly patternColorIndex: number;
  readonly color: PaletteColor;
  readonly beadCount: number;
  readonly packSize?: number;
  readonly packsRequired?: number;
}

export interface PatternTotals {
  readonly width: number;
  readonly height: number;
  readonly totalPositions: number;
  readonly totalBeads: number;
  readonly transparentPositions: number;
  readonly colorCount: number;
}

export interface PatternBoardTile {
  readonly index: number;
  readonly row: number;
  readonly column: number;
  readonly originX: number;
  readonly originY: number;
  readonly coveredWidth: number;
  readonly coveredHeight: number;
  readonly beadCount: number;
  readonly transparentPatternPositions: number;
  readonly outsidePatternPegCount: number;
}

export interface PatternBoardLayout {
  readonly boardProfileId: string;
  readonly boardProfileName: string;
  readonly boardColumns: number;
  readonly boardRows: number;
  readonly boardCount: number;
  readonly boardWidthInBeads: number;
  readonly boardHeightInBeads: number;
  readonly totalPegCapacity: number;
  readonly usedBeadCount: number;
  readonly transparentPatternPositions: number;
  readonly outsidePatternPegCount: number;
  readonly unusedPegCount: number;
  readonly tiles: readonly PatternBoardTile[];
}

export interface PatternAssemblyResult {
  readonly matrix: PatternMatrix;
  readonly colors: readonly PatternColor[];
  readonly materials: readonly MaterialRequirement[];
  readonly totals: PatternTotals;
  readonly boardLayout: PatternBoardLayout;
}
