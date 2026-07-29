import { PaletteColorSchema, PaletteDefinitionSchema } from "./palette.schema";

export function parsePaletteColor(input: unknown) {
  return PaletteColorSchema.parse(input);
}

export function safeParsePaletteColor(input: unknown) {
  return PaletteColorSchema.safeParse(input);
}

export function parsePaletteDefinition(input: unknown) {
  return PaletteDefinitionSchema.parse(input);
}

export function safeParsePaletteDefinition(input: unknown) {
  return PaletteDefinitionSchema.safeParse(input);
}
