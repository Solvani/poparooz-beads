import type { PaletteColor } from "../palette/internal";

export interface PaletteMatchCandidate {
  readonly color: PaletteColor;
}

export interface PaletteMatchResult {
  readonly color: PaletteColor;
  readonly distance: number;
}
