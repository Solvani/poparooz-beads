import { createHash } from "node:crypto";

import { evaluateBeadSetCandidateQuality } from "../../../src/features/bead-set-recommendation/bead-set-quality-evaluator.ts";
import { assemblePattern } from "../../../src/domain/pattern/pattern-assembler.ts";
import { toPublicPatternResult } from "../../../src/domain/pattern/public-pattern.mapper.ts";
import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";
import type { QuantizedImage } from "../../../src/domain/quantization/quantization.types.ts";
import { projectGenerationPaletteForColorSet } from "../../../src/runtime/generation-color-set/generation-palette-projection.ts";
import type { QualityDependencies } from "./generator-quality-replay.ts";

export const D04_PROFILE_SIZES = Object.freeze([
  24, 48, 72, 120, 168, 221,
] as const);
export type D04ProfileSize = (typeof D04_PROFILE_SIZES)[number];

export interface D04ProfilePatternEvidence {
  readonly profileId: `poparooz-set-${D04ProfileSize}`;
  readonly profileSize: D04ProfileSize;
  readonly matrixSha256: string;
  readonly occupiedBeadCount: number;
  readonly transparentPositionCount: number;
  readonly usedColorCount: number;
  readonly perColorCounts: readonly Readonly<{
    code: string;
    beadCount: number;
  }>[];
  readonly weightedMeanPaletteDeltaE00: number;
  readonly weightedP95PaletteDeltaE00: number;
  readonly maximumPaletteDeltaE00: number;
}

export interface D04SpatialComparison {
  readonly fromProfileSize: D04ProfileSize;
  readonly toProfileSize: D04ProfileSize;
  readonly changedCellCount: number;
  readonly changedCellPercentage: number;
  readonly changedRegionCount: number;
  readonly singletonRegionCount: number;
  readonly twoCellRegionCount: number;
  readonly threeToFourCellRegionCount: number;
  readonly fivePlusCellRegionCount: number;
  readonly largestChangedRegion: number;
  readonly mergedReferenceCodeGroupCount: number;
  readonly splitReferenceCodeCount: number;
  readonly changedCodePairCount: number;
}

export interface D04SixProfileEvaluation {
  readonly profiles: readonly D04ProfilePatternEvidence[];
  readonly adjacentComparisons: readonly D04SpatialComparison[];
  readonly relativeTo221: readonly D04SpatialComparison[];
  readonly patterns: ReadonlyMap<D04ProfileSize, PublicPatternResult>;
}

export function evaluateSixProfilePatterns(
  quantized: QuantizedImage,
  dependencies: QualityDependencies,
): D04SixProfileEvaluation {
  const quality = evaluateBeadSetCandidateQuality(
    quantized,
    dependencies.palette,
    dependencies.colorSets,
  );
  const patterns = new Map<D04ProfileSize, PublicPatternResult>();
  const profiles = D04_PROFILE_SIZES.map((profileSize) => {
    const profile = dependencies.colorSets.profiles.find(
      (item) => item.size === profileSize,
    );
    const candidate = quality.candidates.find(
      (item) => item.profileSize === profileSize,
    );
    if (profile === undefined || candidate === undefined) {
      throw new Error(`Approved profile ${profileSize} is missing.`);
    }
    const pattern = toPublicPatternResult(
      assemblePattern({
        quantizedImage: quantized,
        paletteColors: projectGenerationPaletteForColorSet(
          dependencies.palette,
          profile,
        ),
        boardProfile: dependencies.boardProfile,
      }),
    );
    patterns.set(profileSize, pattern);
    return Object.freeze({
      profileId: profile.profileId,
      profileSize,
      matrixSha256: patternMatrixSha256(pattern),
      occupiedBeadCount: pattern.totals.totalBeads,
      transparentPositionCount: pattern.totals.transparentPositions,
      usedColorCount: pattern.totals.colorCount,
      perColorCounts: Object.freeze(
        pattern.colors
          .map((item) =>
            Object.freeze({
              code: item.color.code,
              beadCount: item.beadCount,
            }),
          )
          .sort((left, right) => left.code.localeCompare(right.code)),
      ),
      weightedMeanPaletteDeltaE00: candidate.weightedMeanPaletteDeltaE00,
      weightedP95PaletteDeltaE00: candidate.weightedP95PaletteDeltaE00,
      maximumPaletteDeltaE00: candidate.maximumPaletteDeltaE00,
    } satisfies D04ProfilePatternEvidence);
  });
  const adjacentComparisons = D04_PROFILE_SIZES.slice(0, -1).map(
    (from, index) =>
      compareProfilePatterns(
        from,
        pattern(patterns, from),
        D04_PROFILE_SIZES[index + 1]!,
        pattern(patterns, D04_PROFILE_SIZES[index + 1]!),
      ),
  );
  const reference = pattern(patterns, 221);
  const relativeTo221 = D04_PROFILE_SIZES.slice(0, -1).map((from) =>
    compareProfilePatterns(from, pattern(patterns, from), 221, reference),
  );
  return Object.freeze({
    profiles: Object.freeze(profiles),
    adjacentComparisons: Object.freeze(adjacentComparisons),
    relativeTo221: Object.freeze(relativeTo221),
    patterns,
  });
}

export function patternMatrixSha256(pattern: PublicPatternResult): string {
  return sha256(
    JSON.stringify({
      width: pattern.matrix.width,
      height: pattern.matrix.height,
      codes: patternCodeGrid(pattern),
    }),
  );
}

export function patternsExactlyEquivalent(
  left: PublicPatternResult,
  right: PublicPatternResult,
): boolean {
  return (
    left.matrix.width === right.matrix.width &&
    left.matrix.height === right.matrix.height &&
    left.totals.totalBeads === right.totals.totalBeads &&
    left.totals.transparentPositions === right.totals.transparentPositions &&
    patternMatrixSha256(left) === patternMatrixSha256(right) &&
    JSON.stringify(sortedColorCounts(left)) ===
      JSON.stringify(sortedColorCounts(right))
  );
}

export function calibrationSplit(caseId: string): "calibration" | "validation" {
  const digest = createHash("sha256")
    .update(`p3-a03-e05-d04-a01:${caseId}`)
    .digest();
  return digest[0]! % 5 < 2 ? "validation" : "calibration";
}

function compareProfilePatterns(
  fromProfileSize: D04ProfileSize,
  from: PublicPatternResult,
  toProfileSize: D04ProfileSize,
  to: PublicPatternResult,
): D04SpatialComparison {
  if (
    from.matrix.width !== to.matrix.width ||
    from.matrix.height !== to.matrix.height ||
    from.matrix.transparentIndex !== to.matrix.transparentIndex
  ) {
    throw new Error("Profile Pattern dimensions or transparency differ.");
  }
  const fromCodes = patternCodeGrid(from);
  const toCodes = patternCodeGrid(to);
  const changedMask = new Uint8Array(fromCodes.length);
  let changedCellCount = 0;
  const toFromRelations = new Map<string, Set<string>>();
  const fromToRelations = new Map<string, Set<string>>();
  const changedPairs = new Set<string>();
  for (let index = 0; index < fromCodes.length; index += 1) {
    const fromCode = fromCodes[index]!;
    const toCode = toCodes[index]!;
    if ((fromCode === null) !== (toCode === null)) {
      throw new Error("Profile Pattern occupancy differs.");
    }
    if (fromCode === null || toCode === null) continue;
    relation(toFromRelations, toCode, fromCode);
    relation(fromToRelations, fromCode, toCode);
    if (fromCode !== toCode) {
      changedMask[index] = 1;
      changedCellCount += 1;
      changedPairs.add(`${fromCode}->${toCode}`);
    }
  }
  const components = changedComponents(
    changedMask,
    from.matrix.width,
    from.matrix.height,
  );
  return Object.freeze({
    fromProfileSize,
    toProfileSize,
    changedCellCount,
    changedCellPercentage:
      from.totals.totalBeads === 0
        ? 0
        : (changedCellCount / from.totals.totalBeads) * 100,
    changedRegionCount: components.length,
    singletonRegionCount: components.filter((size) => size === 1).length,
    twoCellRegionCount: components.filter((size) => size === 2).length,
    threeToFourCellRegionCount: components.filter(
      (size) => size >= 3 && size <= 4,
    ).length,
    fivePlusCellRegionCount: components.filter((size) => size >= 5).length,
    largestChangedRegion: Math.max(0, ...components),
    mergedReferenceCodeGroupCount: [...toFromRelations.values()].filter(
      (codes) => codes.size > 1,
    ).length,
    splitReferenceCodeCount: [...fromToRelations.values()].filter(
      (codes) => codes.size > 1,
    ).length,
    changedCodePairCount: changedPairs.size,
  });
}

function patternCodeGrid(
  pattern: PublicPatternResult,
): readonly (string | null)[] {
  const codeByIndex = new Map(
    pattern.colors.map((item) => [item.index, item.color.code] as const),
  );
  return Object.freeze(
    Array.from(pattern.matrix.colorIndices, (colorIndex) => {
      if (colorIndex === pattern.matrix.transparentIndex) return null;
      const code = codeByIndex.get(colorIndex);
      if (code === undefined) throw new Error("Pattern code index is invalid.");
      return code;
    }),
  );
}

function sortedColorCounts(pattern: PublicPatternResult) {
  return pattern.colors
    .map((item) => ({ code: item.color.code, beadCount: item.beadCount }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function changedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
): readonly number[] {
  const visited = new Uint8Array(mask.length);
  const sizes: number[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) continue;
    visited[start] = 1;
    const queue = [start];
    let size = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]!;
      size += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (const neighbor of [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ]) {
        if (neighbor >= 0 && mask[neighbor] === 1 && visited[neighbor] === 0) {
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }
    sizes.push(size);
  }
  return Object.freeze(sizes.sort((left, right) => left - right));
}

function relation(
  target: Map<string, Set<string>>,
  key: string,
  value: string,
): void {
  const values = target.get(key);
  if (values === undefined) target.set(key, new Set([value]));
  else values.add(value);
}

function pattern(
  patterns: ReadonlyMap<D04ProfileSize, PublicPatternResult>,
  size: D04ProfileSize,
): PublicPatternResult {
  const selected = patterns.get(size);
  if (selected === undefined) throw new Error(`Pattern ${size} is missing.`);
  return selected;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
