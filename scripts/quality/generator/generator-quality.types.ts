import type { RgbaImage } from "../../../src/domain/image/image.types.ts";
import type { DominantSamplingDiagnostics } from "./generator-quality-dominant-sampling.ts";
import type { ObservedSamplingDiagnostics } from "./generator-quality-observed-sampling.ts";

export const GENERATOR_QUALITY_CATEGORIES = [
  "simple-graphic",
  "flat-illustration",
  "white-background-product",
  "pale-subject-light-background",
  "dark-subject-background",
  "portrait",
  "pet-fur",
  "complex-photo",
  "high-saturation",
  "low-contrast",
  "gradient",
  "fine-line",
  "soft-antialiased-edge",
  "transparent-png",
  "opaque-background-removal",
] as const;

export const GENERATOR_QUALITY_TAGS = [
  "opaque",
  "binary-alpha",
  "partial-alpha",
  "white-matte",
  "tinted-matte",
  "thin-feature",
  "soft-shadow",
  "trusted-pair",
  "protected-component",
  "synthetic",
  "external-curated",
  "horizontal-non-square",
  "vertical-non-square",
  "portrait-subject",
  "pet-fur",
  "complex-scene",
  "gradient-shading",
  "fine-detail",
  "high-saturation",
  "low-contrast",
  "opaque-background-input",
  "transparent-reference",
] as const;

export const GENERATOR_QUALITY_SIZES = [40, 60, 80, 104] as const;
export const GENERATOR_QUALITY_BACKGROUNDS = ["white", "transparent"] as const;
export const GENERATOR_QUALITY_PROFILE_SIZES = [
  24, 48, 72, 120, 168, 221,
] as const;

export type GeneratorQualityCategory =
  (typeof GENERATOR_QUALITY_CATEGORIES)[number];
export type GeneratorQualityTag = (typeof GENERATOR_QUALITY_TAGS)[number];
export type GeneratorQualitySize = (typeof GENERATOR_QUALITY_SIZES)[number];
export type GeneratorQualityBackground =
  (typeof GENERATOR_QUALITY_BACKGROUNDS)[number];

export interface GeneratorQualityInputDeclaration {
  readonly logicalId: string;
  readonly sha256: string;
  readonly dimensions?: Readonly<{ width: number; height: number }>;
  readonly alphaClassification:
    "opaque" | "binary-alpha" | "partial-alpha" | "unknown";
}

export interface GeneratorQualityCaseDeclaration {
  readonly id: string;
  readonly primaryCategory: GeneratorQualityCategory;
  readonly tags: readonly GeneratorQualityTag[];
  readonly sourceKind: "synthetic" | "external-curated" | "repository-approved";
  readonly input: GeneratorQualityInputDeclaration;
  readonly reference:
    | Readonly<{ type: "synthetic-mask" }>
    | Readonly<{
        type: "trusted-alpha-pair";
        input: GeneratorQualityInputDeclaration;
        confidence: "exact" | "strong";
        provenance: "user-approved-curated-pair";
      }>
    | Readonly<{ type: "none" }>;
  readonly supportedBackgrounds: readonly GeneratorQualityBackground[];
  readonly supportedPatternSizes: readonly GeneratorQualitySize[];
  readonly protectedFeatures?: Readonly<{
    preserveComponents?: boolean;
    preserveThinFeature?: boolean;
    preserveEndpoints?: boolean;
  }>;
  readonly authorization: Readonly<{
    storage:
      | "synthetic-in-repository"
      | "external-local-only"
      | "approved-in-repository";
    status: "approved" | "pending";
  }>;
}

export interface GeneratorQualityCorpusManifest {
  readonly schemaVersion: "1.0.0";
  readonly corpusVersion: string;
  readonly corpusStatus: "development" | "complete";
  readonly cases: readonly GeneratorQualityCaseDeclaration[];
}

export interface SyntheticGeneratorQualityFixture {
  readonly id: string;
  readonly source: RgbaImage;
  readonly referenceOccupancy: Uint8Array;
}

export interface OccupiedBoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

export interface OccupancyMetrics {
  readonly occupiedTruePositive: number;
  readonly falseBackgroundOccupied: number;
  readonly lostSubject: number;
  readonly occupancyDisagreementCount: number;
  readonly occupancyDisagreementRate: number;
  readonly candidateOnlyCount: number;
  readonly referenceOnlyCount: number;
  readonly candidateOccupiedCount: number;
  readonly referenceOccupiedCount: number;
  readonly candidateTransparentCount: number;
  readonly occupiedBoundingBox: OccupiedBoundingBox | null;
  readonly referenceBoundingBox: OccupiedBoundingBox | null;
  readonly boundingBoxIou: number | null;
  readonly occupiedComponentCount: number;
  readonly referenceComponentCount: number;
  readonly deletedComponentCount: number;
  readonly splitComponentCount: number;
  readonly mergedComponentCount: number;
  readonly singletonCount: number;
  readonly smallIslandCount: number;
  readonly referenceEndpointCount: number;
  readonly retainedEndpointCount: number;
  readonly endpointLossCount: number;
  readonly thinFeatureContinuity: number | null;
  readonly beadCountDelta: number;
  readonly coverageWeightedAlphaAbsoluteDifference: number;
}

export interface GeneratorQualityGateResult {
  readonly id: string;
  readonly status: "passed" | "failed";
  readonly actual: number | string;
  readonly expected: number | string;
}

export interface GeneratorQualityCaseResult {
  readonly id: string;
  readonly category: GeneratorQualityCategory;
  readonly tags: readonly GeneratorQualityTag[];
  readonly sourceKind: GeneratorQualityCaseDeclaration["sourceKind"];
  readonly referenceType: GeneratorQualityCaseDeclaration["reference"]["type"];
  readonly settings: Readonly<{
    background: GeneratorQualityBackground;
    size: GeneratorQualitySize;
    maxColors: 32;
    colorSetProfileId: "poparooz-set-221";
  }>;
  readonly metrics: GeneratorQualityCaseMetrics;
  readonly baselineMetrics?: GeneratorQualityCaseMetrics;
  readonly delta?: Readonly<{
    falseBackgroundOccupied: number;
    lostSubject: number;
    occupancyDisagreementCount: number;
    singletonCount: number;
    totalBeads: number;
  }>;
  readonly comparisonStatus:
    "not-compared" | "improved" | "regressed" | "unchanged";
  readonly hardGates: readonly GeneratorQualityGateResult[];
  readonly improvementMetrics: Readonly<{
    falseBackgroundOccupied: number;
    lostSubject: number;
    occupancyDisagreementCount: number;
    singletonCount: number;
  }>;
  readonly diagnostics: Readonly<{
    normalizedDrawWidth: number;
    normalizedDrawHeight: number;
    quantizedColorCount: number;
    sourceHasAlpha?: boolean;
    h03Candidate?: Readonly<{
      activated: boolean;
      bypassReason: "not-transparent" | "explicit-alpha-source" | "none";
      candidateCount: number;
      removedCount: number;
      topologyGuardRejected: boolean;
      componentCountBefore: number;
      componentCountAfter: number;
    }>;
    q02Candidate?: DominantSamplingDiagnostics;
    q02A03Candidate?: ObservedSamplingDiagnostics;
  }>;
}

export interface GeneratorQualityCaseMetrics {
  readonly background: OccupancyMetrics;
  readonly pattern: Readonly<{
    totalPositions: number;
    totalBeads: number;
    transparentPositions: number;
    colorCount: number;
  }>;
  readonly color: readonly Readonly<{
    profileSize: number;
    usedColorCount: number;
    totalWeightedPixelCount: number;
    weightedMeanPaletteDeltaE00: number;
    weightedP95PaletteDeltaE00: number;
    maximumPaletteDeltaE00: number;
    meanDeltaVs221: number;
    p95DeltaVs221: number;
  }>[];
}

export interface GeneratorQualityBaselineIdentity {
  readonly baselineId: "poparooz-generation-quality-baseline";
  readonly baselineVersion: string;
  readonly gitCommit: string;
  readonly processingPolicy: Readonly<{
    id: "poparooz-processing-policy";
    version: "1.1.0";
  }>;
  readonly runtimePaletteArtifactSha256: string;
  readonly runtimePaletteLockSha256: string;
  readonly colorSetArtifactSha256: string;
  readonly colorSetLockSha256: string;
  readonly corpusManifestVersion: string;
  readonly corpusManifestSha256: string;
  readonly metricImplementationVersion: "1.1.0";
  readonly scorecardSchemaVersion: "1.0.0";
}

export interface GeneratorQualityScorecard {
  readonly schemaVersion: "1.0.0";
  readonly corpusMode: "synthetic" | "external";
  readonly baselineIdentity: GeneratorQualityBaselineIdentity;
  readonly authoritativeBaseline: boolean;
  readonly cases: readonly GeneratorQualityCaseResult[];
  readonly categorySummary: readonly Readonly<{
    category: GeneratorQualityCategory;
    caseCount: number;
    passedGateCount: number;
    failedGateCount: number;
  }>[];
  readonly overallSummary: Readonly<{
    caseCount: number;
    passedGateCount: number;
    failedGateCount: number;
    improvedCaseCount: number;
    regressedCaseCount: number;
  }>;
  readonly canonicalScorecardSha256: string;
}
