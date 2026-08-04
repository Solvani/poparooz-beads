import type { GenerationRuntime } from "../../features/generator/generation.types";
import type { RuntimePaletteProvider } from "../palette/runtime-palette.types";
import type { SafeApplicationBootstrapErrorCode } from "./application-runtime-bootstrap.errors";

export type ApplicationRuntimeBootstrapResult =
  | {
      readonly status: "palette-ready";
      readonly paletteProvider: RuntimePaletteProvider;
      readonly generationRuntime: GenerationRuntime;
    }
  | {
      readonly status: "palette-unavailable";
      readonly paletteProvider: null;
      readonly generationRuntime: GenerationRuntime;
      readonly errorCode: SafeApplicationBootstrapErrorCode;
    };

export interface ApplicationRuntimeBootstrapDependencies {
  readonly createPaletteProvider: () => RuntimePaletteProvider;
}
