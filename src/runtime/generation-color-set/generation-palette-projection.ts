import type {
  GenerationPaletteColor,
  GenerationPaletteSnapshot,
} from "../generation-palette/generation-palette.types";
import { GenerationColorSetError } from "./generation-color-set.errors";
import type { GenerationColorSetProfile } from "./generation-color-set.types";

export function projectGenerationPaletteForColorSet(
  palette: GenerationPaletteSnapshot,
  profile: GenerationColorSetProfile,
): readonly GenerationPaletteColor[] {
  const membership = new Set(profile.memberCodes);
  const paletteCodes = new Set(palette.colors.map((color) => color.code));
  if (
    membership.size !== profile.size ||
    profile.memberCodes.some((code) => !paletteCodes.has(code))
  )
    throw new GenerationColorSetError(
      "GENERATION_COLOR_SET_PROJECTION_INVALID",
    );
  const colors = palette.colors.filter(
    (color) =>
      membership.has(color.code) && color.active && color.autoMatchEligible,
  );
  if (
    colors.some(
      (color, index) =>
        index > 0 && color.sortOrder <= colors[index - 1]!.sortOrder,
    )
  )
    throw new GenerationColorSetError(
      "GENERATION_COLOR_SET_PROJECTION_INVALID",
    );
  return Object.freeze(colors);
}
