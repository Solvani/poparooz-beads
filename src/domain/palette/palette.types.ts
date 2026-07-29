import type { z } from "zod";

import type {
  PaletteColorSchema,
  PaletteDefinitionSchema,
  PaletteFinishTypeSchema,
  PaletteSourceTypeSchema,
} from "./palette.schema";

export type PaletteColor = z.infer<typeof PaletteColorSchema>;
export type PaletteDefinition = z.infer<typeof PaletteDefinitionSchema>;
export type PaletteFinishType = z.infer<typeof PaletteFinishTypeSchema>;
export type PaletteSourceType = z.infer<typeof PaletteSourceTypeSchema>;
