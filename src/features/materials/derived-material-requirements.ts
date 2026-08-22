import type { PublicMaterialRequirement } from "../../domain/pattern/public-pattern.types";

export const NOMINAL_BEADS_PER_COLOR = 1000 as const;

export interface DerivedMaterialRequirementV1 {
  readonly patternColorIndex: number;
  readonly color: PublicMaterialRequirement["color"];
  readonly beadCount: number;
  readonly nominalBeadsPerColor: typeof NOMINAL_BEADS_PER_COLOR;
  readonly totalPacksRequired: number;
  readonly additionalRefillPacks: number;
}

export function deriveMaterialRequirementsV1(
  materials: readonly PublicMaterialRequirement[],
): readonly DerivedMaterialRequirementV1[] {
  return Object.freeze(
    materials.map((material) => {
      if (!Number.isSafeInteger(material.beadCount) || material.beadCount < 0) {
        throw new TypeError(
          "Material bead counts must be non-negative safe integers.",
        );
      }

      const totalPacksRequired = Math.ceil(
        material.beadCount / NOMINAL_BEADS_PER_COLOR,
      );
      return Object.freeze({
        patternColorIndex: material.patternColorIndex,
        color: material.color,
        beadCount: material.beadCount,
        nominalBeadsPerColor: NOMINAL_BEADS_PER_COLOR,
        totalPacksRequired,
        additionalRefillPacks: Math.max(0, totalPacksRequired - 1),
      });
    }),
  );
}
