import type { NormalizedImageResult } from "../../domain/image/image.types";
import { assemblePattern } from "../../domain/pattern/pattern-assembler";
import type {
  AssemblePatternInput,
  PatternAssemblyResult,
} from "../../domain/pattern/pattern.types";
import { toPublicPatternResult } from "../../domain/pattern/public-pattern.mapper";
import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { QuantizedImage } from "../../domain/quantization/quantization.types";
import { decodeAndNormalizeImage } from "../../lib/browser-image/browser-image-normalizer";
import { GenerationPaletteAdapterError } from "../../runtime/generation-palette/generation-palette.errors";
import { parseGenerationPaletteSnapshot } from "../../runtime/generation-palette/generation-palette.schema";
import { GenerationBoardProfileError } from "../../runtime/generation-board-profile/generation-board-profile.errors";
import { parseGenerationBoardProfileSnapshot } from "../../runtime/generation-board-profile/generation-board-profile.schema";
import { selectGenerationColorSetProfile } from "../../runtime/generation-color-set/color-set-to-generation.adapter";
import { GenerationColorSetError } from "../../runtime/generation-color-set/generation-color-set.errors";
import { parseGenerationColorSetSnapshot } from "../../runtime/generation-color-set/generation-color-set.schema";
import { projectGenerationPaletteForColorSet } from "../../runtime/generation-color-set/generation-palette-projection";
import { ProcessingPolicyError } from "../../runtime/processing-policy/processing-policy.errors";
import { parseProcessingPolicySnapshot } from "../../runtime/processing-policy/processing-policy.schema";
import { GenerationRequestError } from "./generation-error";
import type {
  GenerationDependencies,
  GenerationInputSnapshot,
  GenerationRuntime,
  GenerationService,
} from "./generation.types";

export interface GenerationPipeline {
  decode(
    input: Blob,
    options: {
      readonly targetWidth: number;
      readonly targetHeight: number;
      readonly preserveAspectRatio: true;
      readonly fit: "contain";
      readonly background: "white" | "transparent";
      readonly allowUpscale: boolean;
    },
    signal?: AbortSignal,
  ): Promise<NormalizedImageResult>;
  assemble(input: AssemblePatternInput): PatternAssemblyResult;
  toPublic(input: PatternAssemblyResult): PublicPatternResult;
}

const REAL_PIPELINE: GenerationPipeline = Object.freeze({
  decode: decodeAndNormalizeImage,
  assemble: assemblePattern,
  toPublic: toPublicPatternResult,
});

export function createGenerationService(
  dependencies: GenerationDependencies,
  pipeline: GenerationPipeline = REAL_PIPELINE,
): GenerationService {
  parseGenerationPaletteSnapshot(dependencies.palette);
  const colorSets = parseGenerationColorSetSnapshot(dependencies.colorSets);
  const boardProfile = parseGenerationBoardProfileSnapshot(
    dependencies.boardProfile,
  );
  const processingPolicy = parseProcessingPolicySnapshot(
    dependencies.processingPolicy,
  );
  return Object.freeze({
    async generate(
      input: GenerationInputSnapshot,
      signal: AbortSignal,
    ): Promise<PublicPatternResult> {
      validateMaximumColors(input.settings.maxColors, processingPolicy);
      const profile = selectGenerationColorSetProfile(
        colorSets,
        input.settings.selectedColorSetProfileId,
      );
      const paletteColors = projectGenerationPaletteForColorSet(
        dependencies.palette,
        profile,
      );
      if (paletteColors.length !== profile.size) {
        throw new GenerationColorSetError(
          "GENERATION_COLOR_SET_PROJECTION_INVALID",
        );
      }
      const client = dependencies.createWorkerClient();
      try {
        const normalized = await pipeline.decode(
          input.file,
          {
            targetWidth: input.settings.width,
            targetHeight: input.settings.height,
            preserveAspectRatio: true,
            fit: "contain",
            background: input.settings.background,
            allowUpscale: processingPolicy.imageNormalization.allowUpscale,
          },
          signal,
        );
        const quantized: QuantizedImage = await client.quantize(
          normalized.image,
          {
            maxColors: input.settings.maxColors,
            alphaThreshold: processingPolicy.quantization.alphaThresholdByte,
          },
          signal,
        );
        const assembled = pipeline.assemble({
          quantizedImage: quantized,
          paletteColors,
          boardProfile,
        });
        return pipeline.toPublic(assembled);
      } finally {
        client.dispose();
      }
    },
  });
}

export function createGenerationRuntime(
  dependencies:
    | GenerationDependencies
    | {
        readonly palette?: GenerationDependencies["palette"];
        readonly colorSets?: GenerationDependencies["colorSets"];
        readonly boardProfile?: GenerationDependencies["boardProfile"];
        readonly processingPolicy?: GenerationDependencies["processingPolicy"];
        readonly createWorkerClient?: GenerationDependencies["createWorkerClient"];
      },
): GenerationRuntime {
  if (dependencies.palette === undefined)
    return unavailable("palette-unavailable");
  try {
    parseGenerationPaletteSnapshot(dependencies.palette);
  } catch (error) {
    if (error instanceof GenerationPaletteAdapterError) {
      return unavailable("palette-unavailable");
    }
    throw error;
  }
  if (dependencies.colorSets === undefined)
    return unavailable("color-set-unavailable");
  try {
    parseGenerationColorSetSnapshot(dependencies.colorSets);
  } catch (error) {
    if (error instanceof GenerationColorSetError) {
      return unavailable("color-set-unavailable");
    }
    throw error;
  }
  if (dependencies.boardProfile === undefined)
    return unavailable("board-profile-unavailable");
  try {
    parseGenerationBoardProfileSnapshot(dependencies.boardProfile);
  } catch (error) {
    if (error instanceof GenerationBoardProfileError) {
      return unavailable("board-profile-unavailable");
    }
    throw error;
  }
  if (dependencies.processingPolicy === undefined)
    return unavailable("processing-policy-unavailable");
  try {
    parseProcessingPolicySnapshot(dependencies.processingPolicy);
  } catch (error) {
    if (error instanceof ProcessingPolicyError) {
      return unavailable("processing-policy-unavailable");
    }
    throw error;
  }
  if (typeof dependencies.createWorkerClient !== "function")
    return unavailable("worker-unavailable");
  const service = createGenerationService({
    palette: dependencies.palette,
    colorSets: dependencies.colorSets,
    boardProfile: dependencies.boardProfile,
    processingPolicy: dependencies.processingPolicy,
    createWorkerClient: dependencies.createWorkerClient,
  });
  const colorSetProfiles = Object.freeze(
    dependencies.colorSets.profiles.map((profile) =>
      Object.freeze({ profileId: profile.profileId, size: profile.size }),
    ),
  );
  return Object.freeze({
    availability: Object.freeze({ available: true as const }),
    service,
    colorSetProfiles,
  });
}

function validateMaximumColors(
  maxColors: number,
  policy: GenerationDependencies["processingPolicy"],
): void {
  if (
    !Number.isSafeInteger(maxColors) ||
    maxColors < policy.quantization.maxColors.minimum ||
    maxColors > policy.quantization.maxColors.maximum
  ) {
    throw new GenerationRequestError();
  }
}

function unavailable(
  reason: Exclude<
    GenerationRuntime,
    { availability: { available: true } }
  >["availability"]["reason"],
): GenerationRuntime {
  return { availability: { available: false, reason } };
}
