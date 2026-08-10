import {
  matchNearestColor,
  prepareColorMatchCandidates,
} from "../color/generation-color-matching";
import { ColorMatchingError } from "../color/color-matching-errors";
import type { QuantizedImage } from "../quantization/quantization.types";
import type { GenerationPaletteColor } from "../../runtime/generation-palette/generation-palette.types";
import { MAX_PATTERN_COLORS } from "./pattern-constants";
import { PatternAssemblyError } from "./pattern-errors";
import type { PatternColor, QuantizedPaletteMapping } from "./pattern.types";

export interface PatternPaletteMappingResult {
  readonly colors: readonly PatternColor[];
  readonly quantizedToPatternIndex: ReadonlyMap<number, number>;
}

function compareBinary(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePatternPaletteColor(
  left: { readonly color: PatternColor["color"] },
  right: { readonly color: PatternColor["color"] },
): number {
  return (
    left.color.sortOrder - right.color.sortOrder ||
    compareBinary(left.color.code, right.color.code)
  );
}

function matchingFailure(error: unknown): never {
  if (error instanceof ColorMatchingError) {
    if (error.code === "NO_ELIGIBLE_PALETTE_COLORS") {
      throw new PatternAssemblyError(
        "NO_ELIGIBLE_PALETTE_COLORS",
        "The palette contains no eligible colors for pattern assembly.",
        error.code,
      );
    }
    throw new PatternAssemblyError(
      "INVALID_PALETTE",
      "The palette is invalid for pattern assembly.",
      error.code,
    );
  }
  throw new PatternAssemblyError(
    "INVALID_PALETTE",
    "The palette is invalid for pattern assembly.",
  );
}

export function buildPatternPaletteMapping(
  quantizedImage: QuantizedImage,
  paletteColors: readonly GenerationPaletteColor[],
): PatternPaletteMappingResult {
  let candidates;
  try {
    candidates = prepareColorMatchCandidates(paletteColors);
  } catch (error) {
    matchingFailure(error);
  }

  const grouped = new Map<
    string,
    {
      readonly color: PatternColor["color"];
      readonly mappings: QuantizedPaletteMapping[];
    }
  >();
  const sortedQuantizedColors = [...quantizedImage.colors].sort(
    (left, right) => left.index - right.index,
  );

  for (const quantizedColor of sortedQuantizedColors) {
    let match;
    try {
      match = matchNearestColor(quantizedColor.lab, candidates);
    } catch (error) {
      matchingFailure(error);
    }
    const distance = Object.is(match.distance, -0) ? 0 : match.distance;
    if (!Number.isFinite(distance) || distance < 0) {
      throw new PatternAssemblyError(
        "INVALID_PATTERN_RESULT",
        "A palette match returned an invalid distance.",
      );
    }

    const mapping = Object.freeze({
      quantizedColorIndex: quantizedColor.index,
      paletteCode: match.color.code,
      distance,
      pixelCount: quantizedColor.pixelCount,
    });
    const existing = grouped.get(match.color.code);
    if (existing) {
      existing.mappings.push(mapping);
    } else {
      grouped.set(match.color.code, {
        color: match.color,
        mappings: [mapping],
      });
    }
  }

  if (grouped.size >= MAX_PATTERN_COLORS) {
    throw new PatternAssemblyError(
      "PATTERN_COLOR_CAPACITY_EXCEEDED",
      "The pattern color count exceeds the supported index capacity.",
    );
  }

  const sortedGroups = [...grouped.values()].sort(comparePatternPaletteColor);
  const quantizedToPatternIndex = new Map<number, number>();
  const colors = sortedGroups.map((group, index) => {
    const sourceMappings = Object.freeze(
      [...group.mappings].sort(
        (left, right) => left.quantizedColorIndex - right.quantizedColorIndex,
      ),
    );
    const beadCount = sourceMappings.reduce(
      (sum, mapping) => sum + mapping.pixelCount,
      0,
    );
    const weightedDistance = sourceMappings.reduce(
      (sum, mapping) => sum + mapping.distance * mapping.pixelCount,
      0,
    );
    const weightedAverageDistance = weightedDistance / beadCount;
    const maximumDistance = Math.max(
      ...sourceMappings.map((mapping) => mapping.distance),
    );
    if (
      !Number.isFinite(weightedAverageDistance) ||
      !Number.isFinite(maximumDistance)
    ) {
      throw new PatternAssemblyError(
        "INVALID_PATTERN_RESULT",
        "Pattern color distance statistics are invalid.",
      );
    }
    for (const mapping of sourceMappings) {
      if (quantizedToPatternIndex.has(mapping.quantizedColorIndex)) {
        throw new PatternAssemblyError(
          "INVALID_QUANTIZED_COLOR_INDEX",
          "Quantized color indices must be unique.",
        );
      }
      quantizedToPatternIndex.set(mapping.quantizedColorIndex, index);
    }
    return Object.freeze({
      index,
      color: group.color,
      beadCount,
      sourceMappings,
      weightedAverageDistance: Object.is(weightedAverageDistance, -0)
        ? 0
        : weightedAverageDistance,
      maximumDistance: Object.is(maximumDistance, -0) ? 0 : maximumDistance,
    });
  });

  if (quantizedToPatternIndex.size !== quantizedImage.colors.length) {
    throw new PatternAssemblyError(
      "MISSING_QUANTIZED_COLOR_MAPPING",
      "Every quantized color must have a pattern color mapping.",
    );
  }

  return Object.freeze({
    colors: Object.freeze(colors),
    quantizedToPatternIndex,
  });
}
