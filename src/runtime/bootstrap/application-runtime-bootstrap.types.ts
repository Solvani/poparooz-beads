import type {
  GenerationDependencies,
  GenerationRuntime,
  GenerationWorkerClient,
} from "../../features/generator/generation.types";
import type {
  ApprovedBoardProfileProvider,
  ApprovedBoardProfileSnapshot,
} from "../board-profile/board-profile.types";
import type { GenerationBoardProfileSnapshot } from "../generation-board-profile/generation-board-profile.types";
import type { GenerationPaletteSnapshot } from "../generation-palette/generation-palette.types";
import type {
  ColorSetProvider,
  ColorSetSnapshot,
} from "../color-set/color-set.types";
import type { GenerationColorSetSnapshot } from "../generation-color-set/generation-color-set.types";
import type {
  RuntimePaletteProvider,
  RuntimePaletteSnapshot,
} from "../palette/runtime-palette.types";
import type { SafeApplicationBootstrapErrorCode } from "./application-runtime-bootstrap.errors";
import type {
  ProcessingPolicyProvider,
  ProcessingPolicySnapshot,
} from "../processing-policy/processing-policy.types";

export type ApplicationRuntimeBootstrapResult =
  | {
      readonly status: "dependencies-ready";
      readonly paletteProvider: RuntimePaletteProvider;
      readonly generationPalette: GenerationPaletteSnapshot;
      readonly colorSetProvider: ColorSetProvider;
      readonly generationColorSets: GenerationColorSetSnapshot;
      readonly boardProfileProvider: ApprovedBoardProfileProvider;
      readonly generationBoardProfile: GenerationBoardProfileSnapshot;
      readonly processingPolicyProvider: ProcessingPolicyProvider;
      readonly processingPolicy: ProcessingPolicySnapshot;
      readonly generationRuntime: GenerationRuntime;
    }
  | {
      readonly status: "palette-unavailable";
      readonly paletteProvider: null;
      readonly generationPalette: null;
      readonly colorSetProvider: null;
      readonly generationColorSets: null;
      readonly boardProfileProvider: null;
      readonly generationBoardProfile: null;
      readonly processingPolicyProvider: null;
      readonly processingPolicy: null;
      readonly generationRuntime: GenerationRuntime;
      readonly errorCode: SafeApplicationBootstrapErrorCode;
    }
  | {
      readonly status: "color-set-unavailable";
      readonly paletteProvider: null;
      readonly generationPalette: null;
      readonly colorSetProvider: null;
      readonly generationColorSets: null;
      readonly boardProfileProvider: null;
      readonly generationBoardProfile: null;
      readonly processingPolicyProvider: null;
      readonly processingPolicy: null;
      readonly generationRuntime: GenerationRuntime;
      readonly errorCode: SafeApplicationBootstrapErrorCode;
    }
  | {
      readonly status: "board-profile-unavailable";
      readonly paletteProvider: null;
      readonly generationPalette: null;
      readonly colorSetProvider: null;
      readonly generationColorSets: null;
      readonly boardProfileProvider: null;
      readonly generationBoardProfile: null;
      readonly processingPolicyProvider: null;
      readonly processingPolicy: null;
      readonly generationRuntime: GenerationRuntime;
      readonly errorCode: SafeApplicationBootstrapErrorCode;
    }
  | {
      readonly status: "processing-policy-unavailable" | "runtime-unavailable";
      readonly paletteProvider: null;
      readonly generationPalette: null;
      readonly colorSetProvider: null;
      readonly generationColorSets: null;
      readonly boardProfileProvider: null;
      readonly generationBoardProfile: null;
      readonly processingPolicyProvider: null;
      readonly processingPolicy: null;
      readonly generationRuntime: GenerationRuntime;
      readonly errorCode: SafeApplicationBootstrapErrorCode;
    };

export interface ApplicationRuntimeBootstrapDependencies {
  readonly createPaletteProvider: () => RuntimePaletteProvider;
  readonly adaptPalette: (
    snapshot: RuntimePaletteSnapshot,
  ) => GenerationPaletteSnapshot;
  readonly createColorSetProvider: () => ColorSetProvider;
  readonly adaptColorSets: (
    snapshot: ColorSetSnapshot,
  ) => GenerationColorSetSnapshot;
  readonly createBoardProfileProvider: () => ApprovedBoardProfileProvider;
  readonly adaptBoardProfile: (
    snapshot: ApprovedBoardProfileSnapshot,
  ) => GenerationBoardProfileSnapshot;
  readonly createProcessingPolicyProvider: () => ProcessingPolicyProvider;
  readonly createWorkerClient: () => GenerationWorkerClient;
  readonly createGenerationRuntime: (
    dependencies: GenerationDependencies | Partial<GenerationDependencies>,
  ) => GenerationRuntime;
}
