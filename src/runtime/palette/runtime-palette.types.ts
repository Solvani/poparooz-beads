export interface RuntimePaletteRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface RuntimePaletteLab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

export interface RuntimePaletteColor {
  readonly code: string;
  readonly hex: string;
  readonly rgb: RuntimePaletteRgb;
  readonly lab: RuntimePaletteLab;
  readonly sortOrder: number;
  readonly active: boolean;
  readonly autoMatchEligible: boolean;
}

export interface RuntimePaletteArtifact {
  readonly schemaVersion: "1.0.0";
  readonly artifactVersion: "1.0.0";
  readonly paletteId: "poparooz-standard";
  readonly paletteVersion: "1.0.0";
  readonly referenceSystem: "POPAROOZ";
  readonly recordCount: 221;
  readonly activeCount: 221;
  readonly autoMatchEligibleCount: 221;
  readonly colors: readonly RuntimePaletteColor[];
}

export type RuntimePaletteSnapshot = RuntimePaletteArtifact;

export interface RuntimePaletteProvider {
  getSnapshot(): RuntimePaletteSnapshot;
  getColorByCode(code: string): RuntimePaletteColor | undefined;
  getActiveColors(): readonly RuntimePaletteColor[];
  getAutoMatchEligibleColors(): readonly RuntimePaletteColor[];
}
