export interface GenerationPaletteIdentity {
  readonly schemaVersion: "1.0.0";
  readonly artifactVersion: "1.0.0";
  readonly paletteId: "poparooz-standard";
  readonly paletteVersion: "1.0.0";
}

export interface GenerationPaletteColor {
  readonly code: string;
  readonly hex: string;
  readonly rgb: readonly [number, number, number];
  readonly lab: readonly [number, number, number];
  readonly sortOrder: number;
  readonly active: boolean;
  readonly autoMatchEligible: boolean;
}

export interface GenerationPaletteSnapshot {
  readonly identity: GenerationPaletteIdentity;
  readonly recordCount: 221;
  readonly activeCount: 221;
  readonly autoMatchEligibleCount: 221;
  readonly colors: readonly GenerationPaletteColor[];
}
