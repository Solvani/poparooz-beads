import type { z } from "zod";

import type {
  FormalPaletteManifestSchema,
  NormalizedFormalPaletteColorSchema,
  NormalizedFormalPaletteSchema,
} from "./formal-palette.schema.ts";

export type FormalPaletteManifest = z.infer<typeof FormalPaletteManifestSchema>;
export type NormalizedFormalPaletteColor = z.infer<
  typeof NormalizedFormalPaletteColorSchema
>;
export type NormalizedFormalPalette = z.infer<
  typeof NormalizedFormalPaletteSchema
>;

export interface CompiledFormalPaletteColorCore {
  readonly code: string;
  readonly referenceSystem: "POPAROOZ";
  readonly referenceCode: string;
  readonly displayCode: string;
  readonly displayName?: string;
  readonly hex: string;
  readonly rgb: readonly [number, number, number];
  readonly lab: readonly [number, number, number];
  readonly sortOrder: number;
}
