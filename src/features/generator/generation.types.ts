import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type {
  QuantizationOptions,
  QuantizedImage,
} from "../../domain/quantization/quantization.types";
import type { RgbaImage } from "../../domain/image/image.types";
import type { GenerationPaletteSnapshot } from "../../runtime/generation-palette/generation-palette.types";
import type { GenerationBoardProfileSnapshot } from "../../runtime/generation-board-profile/generation-board-profile.types";
import type { PatternSettingsValue } from "../settings/settings.types";

export type GenerationUnavailableReason =
  | "palette-unavailable"
  | "production-runtime-unavailable"
  | "board-profile-unavailable"
  | "processing-policy-unavailable"
  | "worker-unavailable";

export type GenerationAvailability =
  | { readonly available: true }
  | {
      readonly available: false;
      readonly reason: GenerationUnavailableReason;
    };

export interface GenerationCandidate {
  readonly file: File;
  readonly imageVersion: number;
  readonly settings: PatternSettingsValue;
  readonly inputKey: string;
}

export interface GenerationInputSnapshot extends GenerationCandidate {
  readonly jobId: number;
}

export interface GenerationWorkerClient {
  quantize(
    image: RgbaImage,
    options: QuantizationOptions,
    signal?: AbortSignal,
  ): Promise<QuantizedImage>;
  dispose(): void;
}

export interface GenerationProcessingPolicy {
  readonly allowUpscale: boolean;
  readonly alphaThreshold: number;
}

export interface GenerationDependencies {
  readonly palette: GenerationPaletteSnapshot;
  readonly boardProfile: GenerationBoardProfileSnapshot;
  readonly processingPolicy: GenerationProcessingPolicy;
  readonly createWorkerClient: () => GenerationWorkerClient;
}

export interface GenerationService {
  generate(
    input: GenerationInputSnapshot,
    signal: AbortSignal,
  ): Promise<PublicPatternResult>;
}

export type GenerationRuntime =
  | {
      readonly availability: { readonly available: true };
      readonly service: GenerationService;
    }
  | {
      readonly availability: {
        readonly available: false;
        readonly reason: GenerationUnavailableReason;
      };
      readonly service?: undefined;
    };

export const UNAVAILABLE_GENERATION_RUNTIME: GenerationRuntime = Object.freeze({
  availability: Object.freeze({
    available: false,
    reason: "palette-unavailable",
  }),
});

export const STARTUP_GATED_GENERATION_RUNTIME: GenerationRuntime =
  Object.freeze({
    availability: Object.freeze({
      available: false,
      reason: "production-runtime-unavailable",
    }),
  });

export const BOARD_PROFILE_UNAVAILABLE_GENERATION_RUNTIME: GenerationRuntime =
  Object.freeze({
    availability: Object.freeze({
      available: false,
      reason: "board-profile-unavailable",
    }),
  });
