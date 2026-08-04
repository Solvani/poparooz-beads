import type { PaletteColor } from "../palette/internal";

export interface MatchableColor {
  readonly code: string;
  readonly lab: readonly [number, number, number];
  readonly sortOrder: number;
  readonly active: boolean;
  readonly autoMatchEligible: boolean;
}

export interface ColorMatchCandidate<
  TColor extends MatchableColor = MatchableColor,
> {
  readonly color: TColor;
}

export interface ColorMatchResult<
  TColor extends MatchableColor = MatchableColor,
> {
  readonly color: TColor;
  readonly distance: number;
}

/** Legacy PaletteDefinition compatibility for the current Pattern pipeline. */
export interface PaletteMatchCandidate {
  readonly color: PaletteColor;
}

/** Legacy PaletteDefinition compatibility for the current Pattern pipeline. */
export interface PaletteMatchResult {
  readonly color: PaletteColor;
  readonly distance: number;
}
