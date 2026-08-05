import {
  BOARD_PROFILE_UNAVAILABLE_GENERATION_RUNTIME,
  STARTUP_GATED_GENERATION_RUNTIME,
} from "../../features/generator/generation.types";
import { createApprovedBoardProfileProvider } from "../board-profile/approved-board-profile";
import { BoardProfileBrowserError } from "../board-profile/board-profile.errors";
import { adaptBoardProfileToGeneration } from "../generation-board-profile/board-profile-to-generation.adapter";
import { GenerationBoardProfileError } from "../generation-board-profile/generation-board-profile.errors";
import { GenerationPaletteAdapterError } from "../generation-palette/generation-palette.errors";
import { adaptRuntimePaletteToGeneration } from "../generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import { RuntimePaletteBrowserError } from "../palette/runtime-palette.errors";
import type { GenerationPaletteSnapshot } from "../generation-palette/generation-palette.types";
import type { RuntimePaletteProvider } from "../palette/runtime-palette.types";
import type {
  ApplicationRuntimeBootstrapDependencies,
  ApplicationRuntimeBootstrapResult,
} from "./application-runtime-bootstrap.types";

export function createApplicationRuntimeBootstrap(
  dependencies: ApplicationRuntimeBootstrapDependencies,
): ApplicationRuntimeBootstrapResult {
  let paletteProvider: RuntimePaletteProvider;
  let generationPalette: GenerationPaletteSnapshot;
  try {
    paletteProvider = dependencies.createPaletteProvider();
    generationPalette = dependencies.adaptPalette(
      paletteProvider.getSnapshot(),
    );
  } catch (error) {
    return Object.freeze({
      status: "palette-unavailable",
      paletteProvider: null,
      generationPalette: null,
      boardProfileProvider: null,
      generationBoardProfile: null,
      generationRuntime: STARTUP_GATED_GENERATION_RUNTIME,
      errorCode:
        error instanceof RuntimePaletteBrowserError ||
        error instanceof GenerationPaletteAdapterError
          ? "APPLICATION_RUNTIME_PALETTE_INVALID"
          : "APPLICATION_RUNTIME_INITIALIZATION_FAILED",
    });
  }

  try {
    const boardProfileProvider = dependencies.createBoardProfileProvider();
    const generationBoardProfile = dependencies.adaptBoardProfile(
      boardProfileProvider.getSnapshot(),
    );
    return Object.freeze({
      status: "dependencies-ready",
      paletteProvider,
      generationPalette,
      boardProfileProvider,
      generationBoardProfile,
      generationRuntime: STARTUP_GATED_GENERATION_RUNTIME,
    });
  } catch (error) {
    return Object.freeze({
      status: "board-profile-unavailable",
      paletteProvider: null,
      generationPalette: null,
      boardProfileProvider: null,
      generationBoardProfile: null,
      generationRuntime: BOARD_PROFILE_UNAVAILABLE_GENERATION_RUNTIME,
      errorCode:
        error instanceof BoardProfileBrowserError ||
        error instanceof GenerationBoardProfileError
          ? "APPLICATION_BOARD_PROFILE_INVALID"
          : "APPLICATION_RUNTIME_INITIALIZATION_FAILED",
    });
  }
}

export function bootstrapApprovedApplicationRuntime(): ApplicationRuntimeBootstrapResult {
  return createApplicationRuntimeBootstrap({
    createPaletteProvider: createApprovedRuntimePaletteProvider,
    adaptPalette: adaptRuntimePaletteToGeneration,
    createBoardProfileProvider: createApprovedBoardProfileProvider,
    adaptBoardProfile: adaptBoardProfileToGeneration,
  });
}
