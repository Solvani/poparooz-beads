export {
  GENERATION_PALETTE_ADAPTER_ERROR_CODES,
  GenerationPaletteAdapterError,
  type GenerationPaletteAdapterErrorCode,
} from "./generation-palette.errors";
export type {
  GenerationPaletteColor,
  GenerationPaletteIdentity,
  GenerationPaletteSnapshot,
} from "./generation-palette.types";
export { adaptRuntimePaletteToGeneration } from "./runtime-to-generation-palette.adapter";
