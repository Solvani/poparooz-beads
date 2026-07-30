import { BoardProfileSchema } from "../board/board-profile.schema";
import { QuantizationError } from "../quantization/quantization-errors";
import { validateQuantizedImage } from "../quantization/quantized-result-validation";
import { buildPatternBoardLayout } from "./board-layout";
import { buildMaterialRequirements } from "./material-requirements";
import { PatternAssemblyError } from "./pattern-errors";
import { buildPatternMatrix } from "./pattern-matrix";
import { buildPatternPaletteMapping } from "./pattern-palette-mapping";
import { validatePatternAssemblyResult } from "./pattern-result-validation";
import type {
  AssemblePatternInput,
  PatternAssemblyResult,
  PatternTotals,
} from "./pattern.types";

export function assemblePattern(
  input: AssemblePatternInput,
): PatternAssemblyResult {
  if (typeof input !== "object" || input === null) {
    throw new PatternAssemblyError(
      "INVALID_PATTERN_RESULT",
      "Pattern assembly input is invalid.",
    );
  }

  try {
    validateQuantizedImage(input.quantizedImage);
  } catch (error) {
    throw new PatternAssemblyError(
      "INVALID_QUANTIZED_IMAGE",
      "The quantized image is invalid for pattern assembly.",
      error instanceof QuantizationError ? error.code : undefined,
    );
  }

  const parsedBoard = BoardProfileSchema.safeParse(input.boardProfile);
  if (!parsedBoard.success) {
    throw new PatternAssemblyError(
      "INVALID_BOARD_PROFILE",
      "The board profile is invalid for pattern assembly.",
    );
  }

  const mapping = buildPatternPaletteMapping(
    input.quantizedImage,
    input.palette,
  );
  const matrix = buildPatternMatrix(
    input.quantizedImage,
    mapping.quantizedToPatternIndex,
    mapping.colors.length,
  );
  const materials = buildMaterialRequirements(mapping.colors);
  const totals: PatternTotals = Object.freeze({
    width: matrix.width,
    height: matrix.height,
    totalPositions: matrix.width * matrix.height,
    totalBeads: input.quantizedImage.opaquePixelCount,
    transparentPositions: input.quantizedImage.transparentPixelCount,
    colorCount: mapping.colors.length,
  });
  const boardLayout = buildPatternBoardLayout(matrix, totals, parsedBoard.data);
  const result: PatternAssemblyResult = Object.freeze({
    matrix,
    colors: mapping.colors,
    materials,
    totals,
    boardLayout,
  });
  validatePatternAssemblyResult(result);
  return result;
}
