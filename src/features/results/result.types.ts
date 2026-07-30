export interface PatternSummaryView {
  readonly width: number;
  readonly height: number;
  readonly patternSize: string;
  readonly actualColors: number;
  readonly actualColorsLabel: string;
  readonly totalBeads: number;
  readonly totalBeadsLabel: string;
  readonly boardsLabel: string;
  readonly transparentPositions: number;
  readonly transparentPositionsLabel: string | null;
}

export interface ColorRowView {
  readonly index: number;
  readonly code: string;
  readonly name: string;
  readonly hex: string;
  readonly beadCount: number;
  readonly beadCountLabel: string;
}

export interface BoardTileView {
  readonly row: number;
  readonly column: number;
  readonly label: string;
}

export interface BoardLayoutView {
  readonly boardCount: number;
  readonly boardCountLabel: string;
  readonly boardColumns: number;
  readonly boardRows: number;
  readonly dimensionsLabel: string;
  readonly accessibilityLabel: string;
  readonly previewKind: "tiles" | "compressed";
  readonly previewColumns: number;
  readonly previewRows: number;
  readonly tiles: readonly BoardTileView[];
}

export interface PatternResultView {
  readonly summary: PatternSummaryView;
  readonly colors: readonly ColorRowView[];
  readonly boardLayout: BoardLayoutView;
}

export type PatternResultViewResult =
  | { readonly ok: true; readonly view: PatternResultView }
  | { readonly ok: false };
