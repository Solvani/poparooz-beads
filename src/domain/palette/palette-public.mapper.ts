import { PublicPaletteColorSchema } from "./palette-public.schema";
import type { PublicPaletteColor } from "./palette-public.types";
import type { PaletteColor } from "./palette.types";

export const PUBLIC_BRAND = "Poparooz" as const;

export function toPublicPaletteColor(color: PaletteColor): PublicPaletteColor {
  return PublicPaletteColorSchema.parse({
    brand: PUBLIC_BRAND,
    code: color.displayCode,
    name: color.displayName,
    hex: color.hex,
    isSpecialFinish: color.isSpecialFinish,
    ...(color.finishType === undefined ? {} : { finishType: color.finishType }),
  });
}
