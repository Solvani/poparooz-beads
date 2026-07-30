import type { QuantizedImage } from "../quantization/quantization.types";
import { PATTERN_TRANSPARENT_INDEX } from "./pattern-constants";
import { PatternAssemblyError } from "./pattern-errors";
import type { PatternMatrix } from "./pattern.types";

export function buildPatternMatrix(
  quantizedImage: QuantizedImage,
  quantizedToPatternIndex: ReadonlyMap<number, number>,
  patternColorCount: number,
): PatternMatrix {
  if (patternColorCount >= PATTERN_TRANSPARENT_INDEX) {
    throw new PatternAssemblyError(
      "PATTERN_COLOR_CAPACITY_EXCEEDED",
      "The pattern color count exceeds the supported index capacity.",
    );
  }

  const colorIndices = new Uint16Array(quantizedImage.colorIndices.length);
  for (let position = 0; position < colorIndices.length; position += 1) {
    const quantizedIndex = quantizedImage.colorIndices[position]!;
    if (quantizedIndex === quantizedImage.transparentIndex) {
      colorIndices[position] = PATTERN_TRANSPARENT_INDEX;
      continue;
    }
    const patternIndex = quantizedToPatternIndex.get(quantizedIndex);
    if (patternIndex === undefined) {
      throw new PatternAssemblyError(
        "MISSING_QUANTIZED_COLOR_MAPPING",
        "A quantized color has no pattern color mapping.",
      );
    }
    if (patternIndex < 0 || patternIndex >= patternColorCount) {
      throw new PatternAssemblyError(
        "INVALID_PATTERN_COLOR_INDEX",
        "A pattern color index is invalid.",
      );
    }
    colorIndices[position] = patternIndex;
  }

  return Object.freeze({
    width: quantizedImage.width,
    height: quantizedImage.height,
    colorIndices,
    transparentIndex: PATTERN_TRANSPARENT_INDEX,
  });
}
