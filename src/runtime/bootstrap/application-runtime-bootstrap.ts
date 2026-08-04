import { STARTUP_GATED_GENERATION_RUNTIME } from "../../features/generator/generation.types";
import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import { RuntimePaletteBrowserError } from "../palette/runtime-palette.errors";
import type {
  ApplicationRuntimeBootstrapDependencies,
  ApplicationRuntimeBootstrapResult,
} from "./application-runtime-bootstrap.types";

export function createApplicationRuntimeBootstrap(
  dependencies: ApplicationRuntimeBootstrapDependencies,
): ApplicationRuntimeBootstrapResult {
  try {
    const paletteProvider = dependencies.createPaletteProvider();
    return Object.freeze({
      status: "palette-ready",
      paletteProvider,
      generationRuntime: STARTUP_GATED_GENERATION_RUNTIME,
    });
  } catch (error) {
    return Object.freeze({
      status: "palette-unavailable",
      paletteProvider: null,
      generationRuntime: STARTUP_GATED_GENERATION_RUNTIME,
      errorCode:
        error instanceof RuntimePaletteBrowserError
          ? "APPLICATION_RUNTIME_PALETTE_INVALID"
          : "APPLICATION_RUNTIME_INITIALIZATION_FAILED",
    });
  }
}

export function bootstrapApprovedApplicationRuntime(): ApplicationRuntimeBootstrapResult {
  return createApplicationRuntimeBootstrap({
    createPaletteProvider: createApprovedRuntimePaletteProvider,
  });
}
