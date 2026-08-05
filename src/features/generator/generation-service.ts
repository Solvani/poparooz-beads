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
  const boardProfile = parseGenerationBoardProfileSnapshot(
    dependencies.boardProfile,
  );
  return Object.freeze({
    async generate(
      input: GenerationInputSnapshot,
      signal: AbortSignal,
    ): Promise<PublicPatternResult> {
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
            allowUpscale: dependencies.processingPolicy.allowUpscale,
          },
          signal,
        );
        const quantized: QuantizedImage = await client.quantize(
          normalized.image,
          {
            maxColors: input.settings.maxColors,
            alphaThreshold: dependencies.processingPolicy.alphaThreshold,
          },
          signal,
        );
        const assembled = pipeline.assemble({
          quantizedImage: quantized,
          paletteColors: dependencies.palette.colors,
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
  if (dependencies.createWorkerClient === undefined)
    return unavailable("worker-unavailable");
  return {
    availability: { available: true },
    service: createGenerationService({
      palette: dependencies.palette,
      boardProfile: dependencies.boardProfile,
      processingPolicy: dependencies.processingPolicy,
      createWorkerClient: dependencies.createWorkerClient,
    }),
  };
}

function unavailable(
  reason: Exclude<
    GenerationRuntime,
    { availability: { available: true } }
  >["availability"]["reason"],
): GenerationRuntime {
  return { availability: { available: false, reason } };
}
