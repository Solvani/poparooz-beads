import {
  BOARD_PROFILE_UNAVAILABLE_GENERATION_RUNTIME,
  STARTUP_GATED_GENERATION_RUNTIME,
} from "../../features/generator/generation.types";
import { createGenerationRuntime } from "../../features/generator/generation-service";
import { QuantizationWorkerClient } from "../../lib/quantization-worker/quantization-worker.client";
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
import { createApprovedProcessingPolicyProvider } from "../processing-policy/approved-processing-policy";
import { ProcessingPolicyError } from "../processing-policy/processing-policy.errors";
import type {
  ProcessingPolicyProvider,
  ProcessingPolicySnapshot,
} from "../processing-policy/processing-policy.types";
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
      processingPolicyProvider: null,
      processingPolicy: null,
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
      processingPolicyProvider: null,
      processingPolicy: null,
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
    let processingPolicyProvider: ProcessingPolicyProvider;
    let processingPolicy: ProcessingPolicySnapshot;
    try {
      processingPolicyProvider = dependencies.createProcessingPolicyProvider();
      processingPolicy = processingPolicyProvider.getSnapshot();
    } catch (error) {
      return Object.freeze({
        status: "processing-policy-unavailable",
        paletteProvider: null,
        generationPalette: null,
        colorSetProvider: null,
        generationColorSets: null,
        boardProfileProvider: null,
        generationBoardProfile: null,
        processingPolicyProvider: null,
        processingPolicy: null,
        generationRuntime: STARTUP_GATED_GENERATION_RUNTIME,
        errorCode:
          error instanceof ProcessingPolicyError
            ? "APPLICATION_PROCESSING_POLICY_INVALID"
            : "APPLICATION_RUNTIME_INITIALIZATION_FAILED",
      });
    }

    let generationRuntime;
    try {
      generationRuntime = dependencies.createGenerationRuntime({
        palette: generationPalette,
        colorSets: generationColorSets,
        boardProfile: generationBoardProfile,
        processingPolicy,
        createWorkerClient: dependencies.createWorkerClient,
      });
    } catch {
      return runtimeUnavailable();
    }
    if (!generationRuntime.availability.available) return runtimeUnavailable();
    return Object.freeze({
      status: "dependencies-ready",
      paletteProvider,
      generationPalette,
      colorSetProvider,
      generationColorSets,
      boardProfileProvider,
      generationBoardProfile,
      processingPolicyProvider,
      processingPolicy,
      generationRuntime,
    });

    function runtimeUnavailable(): ApplicationRuntimeBootstrapResult {
      return Object.freeze({
        status: "runtime-unavailable",
        paletteProvider: null,
        generationPalette: null,
        colorSetProvider: null,
        generationColorSets: null,
        boardProfileProvider: null,
        generationBoardProfile: null,
        processingPolicyProvider: null,
        processingPolicy: null,
        generationRuntime: STARTUP_GATED_GENERATION_RUNTIME,
        errorCode: "APPLICATION_GENERATION_RUNTIME_UNAVAILABLE",
      });
    }
  } catch (error) {
    return Object.freeze({
      status: "board-profile-unavailable",
      paletteProvider: null,
      generationPalette: null,
      colorSetProvider: null,
      generationColorSets: null,
      boardProfileProvider: null,
      generationBoardProfile: null,
      processingPolicyProvider: null,
      processingPolicy: null,
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
    createProcessingPolicyProvider: createApprovedProcessingPolicyProvider,
    createWorkerClient: () => new QuantizationWorkerClient(),
    createGenerationRuntime,
  });
}
