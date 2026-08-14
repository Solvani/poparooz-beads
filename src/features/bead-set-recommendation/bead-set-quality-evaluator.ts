import { MATCH_DISTANCE_EPSILON } from "../../domain/color/generation-color-matching";
import { buildPatternPaletteMapping } from "../../domain/pattern/pattern-palette-mapping";
import type { QuantizedImage } from "../../domain/quantization/quantization.types";
import type { GenerationColorSetSnapshot } from "../../runtime/generation-color-set/generation-color-set.types";
import { projectGenerationPaletteForColorSet } from "../../runtime/generation-color-set/generation-palette-projection";
import type { GenerationPaletteSnapshot } from "../../runtime/generation-palette/generation-palette.types";
import type {
  BeadSetCandidateQuality,
  BeadSetQualityEvaluation,
  BeadSetQualityProfileSize,
} from "./bead-set-quality.types";

const EXPECTED_PROFILES = Object.freeze([
  Object.freeze({ profileId: "poparooz-set-24", size: 24 }),
  Object.freeze({ profileId: "poparooz-set-48", size: 48 }),
  Object.freeze({ profileId: "poparooz-set-72", size: 72 }),
  Object.freeze({ profileId: "poparooz-set-120", size: 120 }),
  Object.freeze({ profileId: "poparooz-set-168", size: 168 }),
  Object.freeze({ profileId: "poparooz-set-221", size: 221 }),
] as const);

interface WeightedValue {
  readonly value: number;
  readonly weight: number;
  readonly order: number;
}

interface AbsoluteCandidateQuality {
  readonly profileId: BeadSetCandidateQuality["profileId"];
  readonly profileSize: BeadSetQualityProfileSize;
  readonly usedColorCount: number;
  readonly totalWeightedPixelCount: number;
  readonly weightedMeanPaletteDeltaE00: number;
  readonly weightedP95PaletteDeltaE00: number;
  readonly maximumPaletteDeltaE00: number;
}

/**
 * Returns the nearest-rank weighted percentile. Values are ordered by numeric
 * value and then by the caller-provided stable order. The percentile boundary
 * belongs to the first value whose cumulative weight reaches the rank.
 */
export function weightedPercentile(
  values: readonly WeightedValue[],
  percentile: number,
): number {
  if (
    values.length === 0 ||
    !Number.isFinite(percentile) ||
    percentile <= 0 ||
    percentile > 1
  ) {
    throw new RangeError("Weighted percentile input is invalid.");
  }
  let totalWeight = 0;
  for (const item of values) {
    if (
      !Number.isFinite(item.value) ||
      item.value < 0 ||
      !Number.isSafeInteger(item.weight) ||
      item.weight <= 0 ||
      !Number.isSafeInteger(item.order) ||
      item.order < 0
    ) {
      throw new RangeError("Weighted percentile input is invalid.");
    }
    totalWeight += item.weight;
    if (!Number.isSafeInteger(totalWeight)) {
      throw new RangeError("Weighted percentile weight is too large.");
    }
  }
  const rank = Math.ceil(totalWeight * percentile);
  const ordered = [...values].sort(
    (left, right) => left.value - right.value || left.order - right.order,
  );
  let cumulativeWeight = 0;
  for (const item of ordered) {
    cumulativeWeight += item.weight;
    if (cumulativeWeight >= rank) return normalizeZero(item.value);
  }
  throw new RangeError("Weighted percentile could not be calculated.");
}

/**
 * Measures candidate-specific Palette matching loss after one shared
 * production quantization. It does not claim to measure total photographic
 * reconstruction fidelity and does not select or recommend a profile.
 */
export function evaluateBeadSetCandidateQuality(
  quantizedImage: QuantizedImage,
  palette: GenerationPaletteSnapshot,
  colorSets: GenerationColorSetSnapshot,
): BeadSetQualityEvaluation {
  const profiles = [...colorSets.profiles].sort(
    (left, right) => left.size - right.size,
  );
  assertApprovedProfiles(profiles);

  const absolute = profiles.map((profile): AbsoluteCandidateQuality => {
    const paletteColors = projectGenerationPaletteForColorSet(palette, profile);
    const mapping = buildPatternPaletteMapping(quantizedImage, paletteColors);
    const weightedValues = mapping.colors.flatMap((color) =>
      color.sourceMappings.map((source) => ({
        value: source.distance,
        weight: source.pixelCount,
        order: source.quantizedColorIndex,
      })),
    );
    const totalWeightedPixelCount = weightedValues.reduce(
      (total, item) => total + item.weight,
      0,
    );
    if (
      totalWeightedPixelCount !== quantizedImage.opaquePixelCount ||
      totalWeightedPixelCount <= 0
    ) {
      throw new Error(
        "Candidate quality weights do not match occupied pixels.",
      );
    }
    const weightedDistance = weightedValues.reduce(
      (total, item) => total + item.value * item.weight,
      0,
    );
    const weightedMeanPaletteDeltaE00 =
      weightedDistance / totalWeightedPixelCount;
    const maximumPaletteDeltaE00 = Math.max(
      ...weightedValues.map((item) => item.value),
    );
    if (
      !Number.isFinite(weightedMeanPaletteDeltaE00) ||
      !Number.isFinite(maximumPaletteDeltaE00)
    ) {
      throw new Error("Candidate quality metrics are invalid.");
    }
    return Object.freeze({
      profileId: profile.profileId,
      profileSize: profile.size,
      usedColorCount: mapping.colors.length,
      totalWeightedPixelCount,
      weightedMeanPaletteDeltaE00: normalizeZero(weightedMeanPaletteDeltaE00),
      weightedP95PaletteDeltaE00: weightedPercentile(weightedValues, 0.95),
      maximumPaletteDeltaE00: normalizeZero(maximumPaletteDeltaE00),
    });
  });

  const reference = absolute.find((candidate) => candidate.profileSize === 221);
  if (reference === undefined) {
    throw new Error("The approved 221-color comparison reference is missing.");
  }
  const candidates = Object.freeze(
    absolute.map((candidate): BeadSetCandidateQuality =>
      Object.freeze({
        ...candidate,
        meanDeltaVs221: relativeDelta(
          candidate.weightedMeanPaletteDeltaE00,
          reference.weightedMeanPaletteDeltaE00,
        ),
        p95DeltaVs221: relativeDelta(
          candidate.weightedP95PaletteDeltaE00,
          reference.weightedP95PaletteDeltaE00,
        ),
      }),
    ),
  );
  return Object.freeze({
    width: quantizedImage.width,
    height: quantizedImage.height,
    quantizedColorCount: quantizedImage.colors.length,
    occupiedPixelCount: quantizedImage.opaquePixelCount,
    transparentPixelCount: quantizedImage.transparentPixelCount,
    candidates,
  });
}

function assertApprovedProfiles(
  profiles: GenerationColorSetSnapshot["profiles"],
): void {
  if (
    profiles.length !== EXPECTED_PROFILES.length ||
    profiles.some(
      (profile, index) =>
        profile.profileId !== EXPECTED_PROFILES[index]!.profileId ||
        profile.size !== EXPECTED_PROFILES[index]!.size,
    )
  ) {
    throw new Error("The approved candidate profile set is invalid.");
  }
}

function relativeDelta(value: number, reference: number): number {
  const difference = value - reference;
  return Math.abs(difference) <= MATCH_DISTANCE_EPSILON
    ? 0
    : normalizeZero(difference);
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}
