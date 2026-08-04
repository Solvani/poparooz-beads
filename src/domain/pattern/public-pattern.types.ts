import type { GenerationPaletteColor } from "../../runtime/generation-palette/generation-palette.types";
import type { PatternBoardTile, PatternTotals } from "./pattern.types";

export interface PublicPatternPaletteColor {
  readonly brand: "Poparooz";
  readonly code: GenerationPaletteColor["code"];
  readonly hex: string;
  readonly name?: string;
}

export interface PublicPatternColor {
  readonly index: number;
  readonly color: PublicPatternPaletteColor;
  readonly beadCount: number;
}

export interface PublicMaterialRequirement {
  readonly patternColorIndex: number;
  readonly color: PublicPatternPaletteColor;
  readonly beadCount: number;
}

export interface PublicPatternBoardLayout {
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

export interface PublicPatternResult {
  readonly matrix: {
    readonly width: number;
    readonly height: number;
    readonly colorIndices: Uint16Array;
    readonly transparentIndex: number;
  };
  readonly colors: readonly PublicPatternColor[];
  readonly materials: readonly PublicMaterialRequirement[];
  readonly totals: PatternTotals;
  readonly boardLayout: PublicPatternBoardLayout;
}
