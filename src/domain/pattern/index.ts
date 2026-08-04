export {
  MAX_PATTERN_COLORS,
  PATTERN_TRANSPARENT_INDEX,
} from "./pattern-constants";
export {
  PATTERN_ASSEMBLY_ERROR_CODES,
  PatternAssemblyError,
  type PatternAssemblyErrorCode,
} from "./pattern-errors";
export { assemblePattern } from "./pattern-assembler";
export { toPublicPatternResult } from "./public-pattern.mapper";
export { validatePatternAssemblyResult } from "./pattern-result-validation";
export type {
  AssemblePatternInput,
  MaterialRequirement,
  PatternAssemblyResult,
  PatternBoardLayout,
  PatternBoardTile,
  PatternColor,
  PatternMatrix,
  PatternTotals,
  QuantizedPaletteMapping,
} from "./pattern.types";
export type {
  PublicMaterialRequirement,
  PublicPatternBoardLayout,
  PublicPatternColor,
  PublicPatternPaletteColor,
  PublicPatternResult,
} from "./public-pattern.types";
