import type { z } from "zod";

import type {
  PaletteColorSchema,
  PaletteDefinitionSchema,
  PaletteDisplayBrandSchema,
  PaletteFinishTypeSchema,
  PaletteReferenceSystemSchema,
  PaletteSourceTypeSchema,
} from "./palette.schema";

export type PaletteColor = z.infer<typeof PaletteColorSchema>;
export type PaletteDefinition = z.infer<typeof PaletteDefinitionSchema>;
export type PaletteDisplayBrand = z.infer<typeof PaletteDisplayBrandSchema>;
export type PaletteFinishType = z.infer<typeof PaletteFinishTypeSchema>;
export type PaletteReferenceSystem = z.infer<
  typeof PaletteReferenceSystemSchema
>;
export type PaletteSourceType = z.infer<typeof PaletteSourceTypeSchema>;
