import { excludeEdgeConnectedLightBackground } from "../../domain/image/edge-connected-light-background";
import type {
  NormalizedImageResult,
  RgbaImage,
} from "../../domain/image/image.types";
import { applyTransparentAlphaOccupancy } from "../../domain/image/transparent-alpha-occupancy";
import type {
  QuantizationOptions,
  QuantizedImage,
} from "../../domain/quantization/quantization.types";
import { throwIfAborted } from "../../lib/browser-image/abortable";
import { decodeAndNormalizeImage } from "../../lib/browser-image/browser-image-normalizer";
import type { GenerationColorSetSnapshot } from "../../runtime/generation-color-set/generation-color-set.types";
import { parseGenerationColorSetSnapshot } from "../../runtime/generation-color-set/generation-color-set.schema";
import type { GenerationPaletteSnapshot } from "../../runtime/generation-palette/generation-palette.types";
import { parseGenerationPaletteSnapshot } from "../../runtime/generation-palette/generation-palette.schema";
import type { ProcessingPolicySnapshot } from "../../runtime/processing-policy/processing-policy.types";
import { parseProcessingPolicySnapshot } from "../../runtime/processing-policy/processing-policy.schema";
import { PATTERN_SIZE_PRESETS } from "../settings/settings.types";
import { evaluateBeadSetCandidateQuality } from "./bead-set-quality-evaluator";
import type {
  BeadSetQualityEvaluationInput,
  BeadSetQualityService,
} from "./bead-set-quality.types";

export interface BeadSetQualityWorkerClient {
  quantize(
    image: RgbaImage,
    options: QuantizationOptions,
    signal?: AbortSignal,
  ): Promise<QuantizedImage>;
  dispose(): void;
}

export interface BeadSetQualityServiceDependencies {
  readonly palette: GenerationPaletteSnapshot;
  readonly colorSets: GenerationColorSetSnapshot;
  readonly processingPolicy: ProcessingPolicySnapshot;
  readonly createWorkerClient: () => BeadSetQualityWorkerClient;
}

export interface BeadSetQualityPipeline {
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
}

const REAL_PIPELINE: BeadSetQualityPipeline = Object.freeze({
  decode: decodeAndNormalizeImage,
});

export function createBeadSetQualityService(
  dependencies: BeadSetQualityServiceDependencies,
  pipeline: BeadSetQualityPipeline = REAL_PIPELINE,
): BeadSetQualityService {
  const palette = parseGenerationPaletteSnapshot(dependencies.palette);
  const colorSets = parseGenerationColorSetSnapshot(dependencies.colorSets);
  const processingPolicy = parseProcessingPolicySnapshot(
    dependencies.processingPolicy,
  );

  return Object.freeze({
    async evaluate(input: BeadSetQualityEvaluationInput, signal: AbortSignal) {
      validateInput(input, processingPolicy);
      throwIfAborted(signal);
      const client = dependencies.createWorkerClient();
      try {
        const normalized = await pipeline.decode(
          input.file,
          {
            targetWidth: input.width,
            targetHeight: input.height,
            preserveAspectRatio: true,
            fit: "contain",
            background: input.background,
            allowUpscale: processingPolicy.imageNormalization.allowUpscale,
          },
          signal,
        );
        const quantizationImage =
          input.background === "transparent"
            ? applyTransparentAlphaOccupancy(
                excludeEdgeConnectedLightBackground(normalized.image),
                processingPolicy.imageNormalization
                  .transparentOccupancyThresholdByte,
              )
            : normalized.image;
        const quantized = await client.quantize(
          quantizationImage,
          {
            maxColors: input.maxColors,
            alphaThreshold: processingPolicy.quantization.alphaThresholdByte,
          },
          signal,
        );
        throwIfAborted(signal);
        return evaluateBeadSetCandidateQuality(quantized, palette, colorSets);
      } finally {
        client.dispose();
      }
    },
  });
}

function validateInput(
  input: BeadSetQualityEvaluationInput,
  processingPolicy: ProcessingPolicySnapshot,
): void {
  const supportedSize = PATTERN_SIZE_PRESETS.some(
    (preset) => preset.size === input.width,
  );
  if (
    !(input.file instanceof Blob) ||
    !supportedSize ||
    input.width !== input.height ||
    !Number.isSafeInteger(input.maxColors) ||
    input.maxColors < processingPolicy.quantization.maxColors.minimum ||
    input.maxColors > processingPolicy.quantization.maxColors.maximum ||
    (input.background !== "white" && input.background !== "transparent")
  ) {
    throw new TypeError("Bead Set quality evaluation input is invalid.");
  }
}
