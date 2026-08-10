import {
  BOARD_PROFILE_UNAVAILABLE_GENERATION_RUNTIME,
  STARTUP_GATED_GENERATION_RUNTIME,
} from "../../features/generator/generation.types";
import { createApprovedBoardProfileProvider } from "../board-profile/approved-board-profile";
import { createApprovedColorSetProvider } from "../color-set/approved-color-set";
import { ColorSetBrowserError } from "../color-set/color-set.errors";
import type { ColorSetProvider } from "../color-set/color-set.types";
import { BoardProfileBrowserError } from "../board-profile/board-profile.errors";
import { adaptBoardProfileToGeneration } from "../generation-board-profile/board-profile-to-generation.adapter";
import { GenerationBoardProfileError } from "../generation-board-profile/generation-board-profile.errors";
import { adaptColorSetToGeneration } from "../generation-color-set/color-set-to-generation.adapter";
import { GenerationColorSetError } from "../generation-color-set/generation-color-set.errors";
import type { GenerationColorSetSnapshot } from "../generation-color-set/generation-color-set.types";
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
      colorSetProvider: null,
      generationColorSets: null,
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

  let colorSetProvider: ColorSetProvider;
  let generationColorSets: GenerationColorSetSnapshot;
  try {
    colorSetProvider = dependencies.createColorSetProvider();
    generationColorSets = dependencies.adaptColorSets(
      colorSetProvider.getSnapshot(),
    );
  } catch (error) {
    return Object.freeze({
      status: "color-set-unavailable",
      paletteProvider: null,
      generationPalette: null,
      colorSetProvider: null,
      generationColorSets: null,
      boardProfileProvider: null,
      generationBoardProfile: null,
      generationRuntime: STARTUP_GATED_GENERATION_RUNTIME,
      errorCode:
        error instanceof ColorSetBrowserError ||
        error instanceof GenerationColorSetError
          ? "APPLICATION_COLOR_SET_INVALID"
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
      colorSetProvider,
      generationColorSets,
      boardProfileProvider,
      generationBoardProfile,
      generationRuntime: STARTUP_GATED_GENERATION_RUNTIME,
    });
  } catch (error) {
    return Object.freeze({
      status: "board-profile-unavailable",
      paletteProvider: null,
      generationPalette: null,
      colorSetProvider: null,
      generationColorSets: null,
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
    createColorSetProvider: createApprovedColorSetProvider,
    adaptColorSets: adaptColorSetToGeneration,
    createBoardProfileProvider: createApprovedBoardProfileProvider,
    adaptBoardProfile: adaptBoardProfileToGeneration,
  });
}
