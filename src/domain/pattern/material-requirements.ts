import { PatternAssemblyError } from "./pattern-errors";
import type { MaterialRequirement, PatternColor } from "./pattern.types";

export function buildMaterialRequirements(
  colors: readonly PatternColor[],
): readonly MaterialRequirement[] {
  return Object.freeze(
    colors.map((patternColor) => {
      if (
        !Number.isSafeInteger(patternColor.beadCount) ||
        patternColor.beadCount <= 0
      ) {
        throw new PatternAssemblyError(
          "INVALID_MATERIAL_REQUIREMENT",
          "Material bead counts must be positive integers.",
        );
      }
      const packSize = patternColor.color.packSize;
      const packsRequired =
        packSize === undefined
          ? undefined
          : Math.ceil(patternColor.beadCount / packSize);
      return Object.freeze({
        patternColorIndex: patternColor.index,
        color: patternColor.color,
        beadCount: patternColor.beadCount,
        ...(packSize === undefined ? {} : { packSize, packsRequired }),
      });
    }),
  );
}
