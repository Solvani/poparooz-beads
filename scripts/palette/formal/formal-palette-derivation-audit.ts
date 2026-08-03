import { createHash } from "node:crypto";

import type { CompiledFormalPaletteColorCore } from "./formal-palette.types.ts";
import type { NormalizedFormalPalette } from "./formal-palette.types.ts";

export const FORMAL_COLOR_DERIVATION_ALGORITHM = "rgb8ToLab-v1";
export const FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION = 12;

export interface FormalColorDerivationAuditRecord {
  readonly code: string;
  readonly hex: string;
  readonly canonicalSourceIndex: number;
  readonly sortOrder: number;
  readonly rgb8: { readonly r: number; readonly g: number; readonly b: number };
  readonly lab: { readonly l: number; readonly a: number; readonly b: number };
}

export interface FormalColorDerivationAudit {
  readonly schemaVersion: "1.0.0";
  readonly paletteId: "poparooz-standard";
  readonly paletteVersion: "1.0.0";
  readonly algorithm: typeof FORMAL_COLOR_DERIVATION_ALGORITHM;
  readonly decimalPrecision: typeof FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION;
  readonly recordCount: 221;
  readonly records: readonly FormalColorDerivationAuditRecord[];
}

export function createFormalColorDerivationAudit(
  palette: NormalizedFormalPalette,
  compiledColors: readonly CompiledFormalPaletteColorCore[],
): FormalColorDerivationAudit {
  const compiledByCode = new Map(
    compiledColors.map((color) => [color.code, color] as const),
  );
  const records = [...palette.colors]
    .sort(
      (left, right) => left.canonicalSourceIndex - right.canonicalSourceIndex,
    )
    .map((color) => {
      const compiled = compiledByCode.get(color.code);
      if (compiled === undefined) {
        throw new Error("Compiled color is missing from derivation audit.");
      }
      return {
        code: color.code,
        hex: color.hex,
        canonicalSourceIndex: color.canonicalSourceIndex,
        sortOrder: compiled.sortOrder,
        rgb8: {
          r: compiled.rgb[0],
          g: compiled.rgb[1],
          b: compiled.rgb[2],
        },
        lab: {
          l: roundAuditNumber(compiled.lab[0]),
          a: roundAuditNumber(compiled.lab[1]),
          b: roundAuditNumber(compiled.lab[2]),
        },
      };
    });

  return {
    schemaVersion: "1.0.0",
    paletteId: "poparooz-standard",
    paletteVersion: "1.0.0",
    algorithm: FORMAL_COLOR_DERIVATION_ALGORITHM,
    decimalPrecision: FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION,
    recordCount: 221,
    records,
  };
}

export function serializeFormalColorDerivationAudit(
  audit: FormalColorDerivationAudit,
): string {
  return `${JSON.stringify(audit, null, 2)}\n`;
}

export function hashFormalColorDerivationAuditBytes(bytes: string): string {
  return createHash("sha256").update(bytes, "utf8").digest("hex");
}

function roundAuditNumber(value: number): number {
  const rounded = Number(
    value.toFixed(FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION),
  );
  return Object.is(rounded, -0) ? 0 : rounded;
}
