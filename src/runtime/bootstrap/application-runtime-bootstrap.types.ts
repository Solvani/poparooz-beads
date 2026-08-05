import type { GenerationRuntime } from "../../features/generator/generation.types";
import type {
  ApprovedBoardProfileProvider,
  ApprovedBoardProfileSnapshot,
} from "../board-profile/board-profile.types";
import type { GenerationBoardProfileSnapshot } from "../generation-board-profile/generation-board-profile.types";
import type { GenerationPaletteSnapshot } from "../generation-palette/generation-palette.types";
import type {
  RuntimePaletteProvider,
  RuntimePaletteSnapshot,
} from "../palette/runtime-palette.types";
import type { SafeApplicationBootstrapErrorCode } from "./application-runtime-bootstrap.errors";

export type ApplicationRuntimeBootstrapResult =
  | {
      readonly status: "dependencies-ready";
      readonly paletteProvider: RuntimePaletteProvider;
      readonly generationPalette: GenerationPaletteSnapshot;
      readonly boardProfileProvider: ApprovedBoardProfileProvider;
      readonly generationBoardProfile: GenerationBoardProfileSnapshot;
      readonly generationRuntime: GenerationRuntime;
    }
  | {
      readonly status: "palette-unavailable";
      readonly paletteProvider: null;
      readonly generationPalette: null;
      readonly boardProfileProvider: null;
      readonly generationBoardProfile: null;
      readonly generationRuntime: GenerationRuntime;
      readonly errorCode: SafeApplicationBootstrapErrorCode;
    }
  | {
      readonly status: "board-profile-unavailable";
      readonly paletteProvider: null;
      readonly generationPalette: null;
      readonly boardProfileProvider: null;
      readonly generationBoardProfile: null;
      readonly generationRuntime: GenerationRuntime;
      readonly errorCode: SafeApplicationBootstrapErrorCode;
    };

export interface ApplicationRuntimeBootstrapDependencies {
  readonly createPaletteProvider: () => RuntimePaletteProvider;
  readonly adaptPalette: (
    snapshot: RuntimePaletteSnapshot,
  ) => GenerationPaletteSnapshot;
  readonly createBoardProfileProvider: () => ApprovedBoardProfileProvider;
  readonly adaptBoardProfile: (
    snapshot: ApprovedBoardProfileSnapshot,
  ) => GenerationBoardProfileSnapshot;
}
