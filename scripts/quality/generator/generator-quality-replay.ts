import { readFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  canonicalizeStrictEdgeConnectedLightBackgroundToWhite,
  excludeEdgeConnectedLightBackground,
  excludeStrictEdgeConnectedLightBackground,
} from "../../../src/domain/image/edge-connected-light-background.ts";
import { normalizeRgbaImage } from "../../../src/domain/image/normalize-rgba.ts";
import { refineOpaqueSourceMatteBackground } from "../../../src/domain/image/opaque-source-matte-background.ts";
import { applyTransparentAlphaOccupancy } from "../../../src/domain/image/transparent-alpha-occupancy.ts";
import type {
  ImageSourceMetadata,
  RgbaImage,
} from "../../../src/domain/image/image.types.ts";
import { assemblePattern } from "../../../src/domain/pattern/pattern-assembler.ts";
import { toPublicPatternResult } from "../../../src/domain/pattern/public-pattern.mapper.ts";
import { quantizeImage } from "../../../src/domain/quantization/quantize-image.ts";
import { createApprovedBoardProfileProviderFromArtifact } from "../../../src/runtime/board-profile/board-profile.provider.ts";
import { createColorSetProvider } from "../../../src/runtime/color-set/color-set.provider.ts";
import { adaptBoardProfileToGeneration } from "../../../src/runtime/generation-board-profile/board-profile-to-generation.adapter.ts";
import { adaptColorSetToGeneration } from "../../../src/runtime/generation-color-set/color-set-to-generation.adapter.ts";
import { projectGenerationPaletteForColorSet } from "../../../src/runtime/generation-color-set/generation-palette-projection.ts";
import { adaptRuntimePaletteToGeneration } from "../../../src/runtime/generation-palette/runtime-to-generation-palette.adapter.ts";
import { createRuntimePaletteProvider } from "../../../src/runtime/palette/runtime-palette.provider.ts";
import { createApprovedProcessingPolicyProvider } from "../../../src/runtime/processing-policy/approved-processing-policy.ts";
import { evaluateBeadSetCandidateQuality } from "../../../src/features/bead-set-recommendation/bead-set-quality-evaluator.ts";
import {
  alphaChannel,
  computeOccupancyMetrics,
  occupancyMaskFromAlpha,
} from "./generator-quality-metrics.ts";
import {
  exactByteIdentityGate,
  exactValueGate,
} from "./generator-quality-gates.ts";
import type {
  GeneratorQualityBackground,
  GeneratorQualityCaseDeclaration,
  GeneratorQualityCaseResult,
  GeneratorQualitySize,
  SyntheticGeneratorQualityFixture,
} from "./generator-quality.types.ts";

export interface GeneratorQualityPerformanceSample {
  readonly caseId: string;
  readonly background: GeneratorQualityBackground;
  readonly size: GeneratorQualitySize;
  readonly sourcePreprocessingMs: number;
  readonly normalizationAndResizeMs: number;
  readonly postResizeCleanupMs: number;
  readonly occupancyMs: number;
  readonly quantizationMs: number;
  readonly paletteEvaluationMs: number;
  readonly patternAssemblyMs: number;
  readonly totalMs: number;
}

interface QualityDependencies {
  readonly palette: ReturnType<typeof adaptRuntimePaletteToGeneration>;
  readonly colorSets: ReturnType<typeof adaptColorSetToGeneration>;
  readonly boardProfile: ReturnType<typeof adaptBoardProfileToGeneration>;
  readonly processingPolicy: ReturnType<
    typeof createApprovedProcessingPolicyProvider
  > extends { getSnapshot(): infer Snapshot }
    ? Snapshot
    : never;
}

export function loadGeneratorQualityDependencies(
  repositoryRoot: string,
): QualityDependencies {
  const runtimePalette = readJson(
    repositoryRoot,
    "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
  );
  const colorSets = readJson(
    repositoryRoot,
    "src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json",
  );
  const boardProfile = readJson(
    repositoryRoot,
    "src/runtime/board-profile/artifacts/poparooz-board-104/1.0.0/board-profile.json",
  );
  return Object.freeze({
    palette: adaptRuntimePaletteToGeneration(
      createRuntimePaletteProvider(runtimePalette).getSnapshot(),
    ),
    colorSets: adaptColorSetToGeneration(
      createColorSetProvider(colorSets).getSnapshot(),
    ),
    boardProfile: adaptBoardProfileToGeneration(
      createApprovedBoardProfileProviderFromArtifact(
        boardProfile,
      ).getSnapshot(),
    ),
    processingPolicy: createApprovedProcessingPolicyProvider().getSnapshot(),
  });
}

export function replaySyntheticQualityCase(
  declaration: GeneratorQualityCaseDeclaration,
  fixture: SyntheticGeneratorQualityFixture,
  background: GeneratorQualityBackground,
  size: GeneratorQualitySize,
  dependencies: QualityDependencies,
): Readonly<{
  result: GeneratorQualityCaseResult;
  performance: GeneratorQualityPerformanceSample;
}> {
  return replayQualityCase(
    declaration,
    fixture.source,
    syntheticReferenceSource(fixture),
    background,
    size,
    dependencies,
  );
}

export function replayExternalQualityCase(
  declaration: GeneratorQualityCaseDeclaration,
  source: RgbaImage,
  reference: RgbaImage | undefined,
  background: GeneratorQualityBackground,
  size: GeneratorQualitySize,
  dependencies: QualityDependencies,
): Readonly<{
  result: GeneratorQualityCaseResult;
  performance: GeneratorQualityPerformanceSample;
}> {
  if (background === "transparent" && reference === undefined) {
    throw new Error(
      "Transparent external quality replay requires a trusted alpha reference.",
    );
  }
  return replayQualityCase(
    declaration,
    source,
    reference,
    background,
    size,
    dependencies,
  );
}

function replayQualityCase(
  declaration: GeneratorQualityCaseDeclaration,
  source: RgbaImage,
  referenceSource: RgbaImage | undefined,
  background: GeneratorQualityBackground,
  size: GeneratorQualitySize,
  dependencies: QualityDependencies,
): Readonly<{
  result: GeneratorQualityCaseResult;
  performance: GeneratorQualityPerformanceSample;
}> {
  const totalStarted = performance.now();
  const originalSourceBytes = new Uint8ClampedArray(source.data);
  const sourceMetadata = metadataFor(source);

  const sourceStarted = performance.now();
  const strictSource =
    background === "transparent"
      ? excludeStrictEdgeConnectedLightBackground(source)
      : background === "white" && !sourceMetadata.hasAlpha
        ? canonicalizeStrictEdgeConnectedLightBackgroundToWhite(source)
        : source;
  const normalizationSource =
    background === "transparent" &&
    !sourceMetadata.hasAlpha &&
    strictSource !== source
      ? refineOpaqueSourceMatteBackground(source, strictSource)
      : strictSource;
  const sourcePreprocessingMs = performance.now() - sourceStarted;

  const normalizationStarted = performance.now();
  const normalized = normalizeRgbaImage(
    normalizationSource,
    sourceMetadata,
    normalizationOptions(
      size,
      background,
      dependencies.processingPolicy.imageNormalization.allowUpscale,
    ),
  );
  const normalizationAndResizeMs = performance.now() - normalizationStarted;

  const cleanupStarted = performance.now();
  const cleaned =
    background === "transparent"
      ? excludeEdgeConnectedLightBackground(normalized.image)
      : normalized.image;
  const postResizeCleanupMs = performance.now() - cleanupStarted;

  const occupancyStarted = performance.now();
  const quantizationImage =
    background === "transparent"
      ? applyTransparentAlphaOccupancy(
          cleaned,
          dependencies.processingPolicy.imageNormalization
            .transparentOccupancyThresholdByte,
        )
      : cleaned;
  const occupancyMs = performance.now() - occupancyStarted;

  const quantizationStarted = performance.now();
  const quantized = quantizeImage(quantizationImage, {
    maxColors: 32,
    alphaThreshold:
      dependencies.processingPolicy.quantization.alphaThresholdByte,
  });
  const quantizationMs = performance.now() - quantizationStarted;

  const evaluationStarted = performance.now();
  const colorQuality = evaluateBeadSetCandidateQuality(
    quantized,
    dependencies.palette,
    dependencies.colorSets,
  );
  const paletteEvaluationMs = performance.now() - evaluationStarted;

  const assemblyStarted = performance.now();
  const profile = dependencies.colorSets.profiles.find(
    (item) => item.profileId === "poparooz-set-221",
  );
  if (profile === undefined)
    throw new Error("The approved 221 profile is missing.");
  const paletteColors = projectGenerationPaletteForColorSet(
    dependencies.palette,
    profile,
  );
  const publicPattern = toPublicPatternResult(
    assemblePattern({
      quantizedImage: quantized,
      paletteColors,
      boardProfile: dependencies.boardProfile,
    }),
  );
  const patternAssemblyMs = performance.now() - assemblyStarted;

  const candidateAlpha = alphaChannel(quantizationImage.data);
  const candidateMask = occupancyMaskFromAlpha(
    candidateAlpha,
    dependencies.processingPolicy.quantization.alphaThresholdByte,
  );
  const referenceImage = normalizedReference(
    referenceSource,
    size,
    background,
    dependencies.processingPolicy.imageNormalization.allowUpscale,
  );
  const referenceAlpha = alphaChannel(referenceImage.data);
  const referenceMask = occupancyMaskFromAlpha(
    referenceAlpha,
    dependencies.processingPolicy.imageNormalization
      .transparentOccupancyThresholdByte,
  );
  const backgroundMetrics = computeOccupancyMetrics(
    candidateMask,
    referenceMask,
    size,
    size,
    candidateAlpha,
    referenceAlpha,
  );

  const hardGates = Object.freeze([
    exactValueGate(
      "pattern-total-consistency",
      publicPattern.totals.totalBeads,
      candidateMask.reduce((sum, value) => sum + value, 0),
    ),
    exactValueGate(
      "protected-component-deletion",
      backgroundMetrics.deletedComponentCount,
      declaration.protectedFeatures?.preserveComponents
        ? 0
        : backgroundMetrics.deletedComponentCount,
    ),
    exactValueGate(
      "protected-component-split",
      backgroundMetrics.splitComponentCount,
      declaration.protectedFeatures?.preserveComponents
        ? 0
        : backgroundMetrics.splitComponentCount,
    ),
    exactValueGate(
      "protected-endpoint-loss",
      backgroundMetrics.endpointLossCount,
      declaration.protectedFeatures?.preserveEndpoints
        ? 0
        : backgroundMetrics.endpointLossCount,
    ),
    exactByteIdentityGate(
      "source-input-immutability",
      originalSourceBytes,
      source.data,
    ),
  ]);

  const result: GeneratorQualityCaseResult = Object.freeze({
    id: `${declaration.id}:${background}:${size}`,
    category: declaration.primaryCategory,
    tags: Object.freeze([...declaration.tags].sort()),
    sourceKind: declaration.sourceKind,
    referenceType: declaration.reference.type,
    settings: Object.freeze({
      background,
      size,
      maxColors: 32 as const,
      colorSetProfileId: "poparooz-set-221" as const,
    }),
    metrics: Object.freeze({
      background: backgroundMetrics,
      pattern: Object.freeze({
        totalPositions: publicPattern.totals.totalPositions,
        totalBeads: publicPattern.totals.totalBeads,
        transparentPositions: publicPattern.totals.transparentPositions,
        colorCount: publicPattern.totals.colorCount,
      }),
      color: Object.freeze(
        colorQuality.candidates.map((candidate) =>
          Object.freeze({ ...candidate }),
        ),
      ),
    }),
    comparisonStatus: "not-compared",
    hardGates,
    improvementMetrics: Object.freeze({
      falseBackgroundOccupied: backgroundMetrics.falseBackgroundOccupied,
      lostSubject: backgroundMetrics.lostSubject,
      occupancyDisagreementCount: backgroundMetrics.occupancyDisagreementCount,
      singletonCount: backgroundMetrics.singletonCount,
    }),
    diagnostics: Object.freeze({
      normalizedDrawWidth: normalized.target.drawWidth,
      normalizedDrawHeight: normalized.target.drawHeight,
      quantizedColorCount: quantized.colors.length,
    }),
  });

  return Object.freeze({
    result,
    performance: Object.freeze({
      caseId: result.id,
      background,
      size,
      sourcePreprocessingMs,
      normalizationAndResizeMs,
      postResizeCleanupMs,
      occupancyMs,
      quantizationMs,
      paletteEvaluationMs,
      patternAssemblyMs,
      totalMs: performance.now() - totalStarted,
    }),
  });
}

function normalizedReference(
  referenceSource: RgbaImage | undefined,
  size: GeneratorQualitySize,
  background: GeneratorQualityBackground,
  allowUpscale: boolean,
): RgbaImage {
  if (background === "white") {
    const data = new Uint8ClampedArray(size * size * 4);
    data.fill(255);
    return { width: size, height: size, data };
  }
  if (referenceSource === undefined) {
    throw new Error("Transparent quality replay has no reference image.");
  }
  return normalizeRgbaImage(
    referenceSource,
    metadataFor(referenceSource),
    normalizationOptions(size, "transparent", allowUpscale),
  ).image;
}

function syntheticReferenceSource(
  fixture: SyntheticGeneratorQualityFixture,
): RgbaImage {
  const data = new Uint8ClampedArray(fixture.referenceOccupancy.length * 4);
  for (let index = 0; index < fixture.referenceOccupancy.length; index += 1) {
    if (fixture.referenceOccupancy[index] === 1) {
      data.set([0, 0, 0, 255], index * 4);
    }
  }
  return {
    width: fixture.source.width,
    height: fixture.source.height,
    data,
  };
}

function metadataFor(image: RgbaImage): ImageSourceMetadata {
  return {
    format: "png",
    originalWidth: image.width,
    originalHeight: image.height,
    orientedWidth: image.width,
    orientedHeight: image.height,
    exifOrientation: 1,
    hasAlpha: alphaChannel(image.data).some((value) => value !== 255),
  };
}

function normalizationOptions(
  size: GeneratorQualitySize,
  background: GeneratorQualityBackground,
  allowUpscale: boolean,
) {
  return {
    targetWidth: size,
    targetHeight: size,
    preserveAspectRatio: true as const,
    fit: "contain" as const,
    background,
    allowUpscale,
  };
}

function readJson(repositoryRoot: string, relativePath: string): unknown {
  return JSON.parse(
    readFileSync(path.join(repositoryRoot, relativePath), "utf8"),
  );
}
