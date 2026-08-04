import approvedRuntimePalette from "./artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json";
import { createRuntimePaletteProvider } from "./runtime-palette.provider";
import type { RuntimePaletteProvider } from "./runtime-palette.types";

export function createApprovedRuntimePaletteProvider(): RuntimePaletteProvider {
  return createRuntimePaletteProvider(approvedRuntimePalette);
}
