import type {
  OccupancyMetrics,
  OccupiedBoundingBox,
} from "./generator-quality.types.ts";

interface Components {
  readonly labels: Int32Array;
  readonly count: number;
  readonly sizes: readonly number[];
}

export function occupancyMaskFromAlpha(
  alpha: Uint8Array,
  threshold = 16,
): Uint8Array {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) {
    throw new RangeError("Occupancy alpha threshold is invalid.");
  }
  return Uint8Array.from(alpha, (value) => (value > threshold ? 1 : 0));
}

export function alphaChannel(data: Uint8ClampedArray): Uint8Array {
  const alpha = new Uint8Array(data.length / 4);
  for (let pixelIndex = 0; pixelIndex < alpha.length; pixelIndex += 1) {
    alpha[pixelIndex] = data[pixelIndex * 4 + 3]!;
  }
  return alpha;
}

export function computeOccupancyMetrics(
  candidateMask: Uint8Array,
  referenceMask: Uint8Array,
  width: number,
  height: number,
  candidateAlpha: Uint8Array = candidateMask.map((value) => value * 255),
  referenceAlpha: Uint8Array = referenceMask.map((value) => value * 255),
): OccupancyMetrics {
  validateMasks(candidateMask, referenceMask, width, height);
  if (
    candidateAlpha.length !== candidateMask.length ||
    referenceAlpha.length !== referenceMask.length
  ) {
    throw new RangeError("Alpha evidence dimensions do not match the masks.");
  }

  let occupiedTruePositive = 0;
  let falseBackgroundOccupied = 0;
  let lostSubject = 0;
  let candidateOccupiedCount = 0;
  let referenceOccupiedCount = 0;
  let alphaDifference = 0;
  for (let index = 0; index < candidateMask.length; index += 1) {
    const candidate = candidateMask[index] === 1;
    const reference = referenceMask[index] === 1;
    if (candidate) candidateOccupiedCount += 1;
    if (reference) referenceOccupiedCount += 1;
    if (candidate && reference) occupiedTruePositive += 1;
    else if (candidate) falseBackgroundOccupied += 1;
    else if (reference) lostSubject += 1;
    alphaDifference += Math.abs(
      candidateAlpha[index]! - referenceAlpha[index]!,
    );
  }

  const candidateComponents = connectedComponents(candidateMask, width, height);
  const referenceComponents = connectedComponents(referenceMask, width, height);
  const relationships = componentRelationships(
    candidateMask,
    referenceMask,
    candidateComponents,
    referenceComponents,
  );
  const referenceEndpoints = endpointIndices(referenceMask, width, height);
  const retainedEndpointCount = referenceEndpoints.filter(
    (index) => candidateMask[index] === 1,
  ).length;
  const candidateBox = occupiedBoundingBox(candidateMask, width, height);
  const referenceBox = occupiedBoundingBox(referenceMask, width, height);
  const disagreement = falseBackgroundOccupied + lostSubject;

  return Object.freeze({
    occupiedTruePositive,
    falseBackgroundOccupied,
    lostSubject,
    occupancyDisagreementCount: disagreement,
    occupancyDisagreementRate: normalize(disagreement / candidateMask.length),
    candidateOnlyCount: falseBackgroundOccupied,
    referenceOnlyCount: lostSubject,
    candidateOccupiedCount,
    referenceOccupiedCount,
    candidateTransparentCount: candidateMask.length - candidateOccupiedCount,
    occupiedBoundingBox: candidateBox,
    referenceBoundingBox: referenceBox,
    boundingBoxIou:
      candidateBox === null || referenceBox === null
        ? null
        : normalize(boundingBoxIou(candidateBox, referenceBox)),
    occupiedComponentCount: candidateComponents.count,
    referenceComponentCount: referenceComponents.count,
    deletedComponentCount: relationships.deleted,
    splitComponentCount: relationships.split,
    mergedComponentCount: relationships.merged,
    singletonCount: candidateComponents.sizes.filter((size) => size === 1)
      .length,
    smallIslandCount: candidateComponents.sizes.filter((size) => size <= 2)
      .length,
    referenceEndpointCount: referenceEndpoints.length,
    retainedEndpointCount,
    endpointLossCount: referenceEndpoints.length - retainedEndpointCount,
    thinFeatureContinuity:
      referenceOccupiedCount === 0
        ? null
        : normalize(occupiedTruePositive / referenceOccupiedCount),
    beadCountDelta: candidateOccupiedCount - referenceOccupiedCount,
    coverageWeightedAlphaAbsoluteDifference: normalize(
      alphaDifference / (candidateMask.length * 255),
    ),
  });
}

export function occupiedBoundingBox(
  mask: Uint8Array,
  width: number,
  height: number,
): OccupiedBoundingBox | null {
  validateMask(mask, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] !== 1) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX < 0) return null;
  return Object.freeze({
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  });
}

function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
): Components {
  validateMask(mask, width, height);
  const labels = new Int32Array(mask.length);
  labels.fill(-1);
  const queue = new Uint32Array(mask.length);
  const sizes: number[] = [];
  let count = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1 || labels[start] !== -1) continue;
    let head = 0;
    let tail = 1;
    let size = 0;
    queue[0] = start;
    labels[start] = count;
    while (head < tail) {
      const index = queue[head++]!;
      size += 1;
      for (const neighbor of neighbors(index, width, height)) {
        if (mask[neighbor] === 1 && labels[neighbor] === -1) {
          labels[neighbor] = count;
          queue[tail++] = neighbor;
        }
      }
    }
    sizes.push(size);
    count += 1;
  }
  return { labels, count, sizes };
}

function componentRelationships(
  candidateMask: Uint8Array,
  referenceMask: Uint8Array,
  candidate: Components,
  reference: Components,
): Readonly<{ deleted: number; split: number; merged: number }> {
  const referenceToCandidate = Array.from(
    { length: reference.count },
    () => new Set<number>(),
  );
  const candidateToReference = Array.from(
    { length: candidate.count },
    () => new Set<number>(),
  );
  for (let index = 0; index < candidateMask.length; index += 1) {
    if (candidateMask[index] !== 1 || referenceMask[index] !== 1) continue;
    const candidateLabel = candidate.labels[index]!;
    const referenceLabel = reference.labels[index]!;
    referenceToCandidate[referenceLabel]!.add(candidateLabel);
    candidateToReference[candidateLabel]!.add(referenceLabel);
  }
  return {
    deleted: referenceToCandidate.filter((items) => items.size === 0).length,
    split: referenceToCandidate.filter((items) => items.size > 1).length,
    merged: candidateToReference.filter((items) => items.size > 1).length,
  };
}

function endpointIndices(
  mask: Uint8Array,
  width: number,
  height: number,
): number[] {
  const result: number[] = [];
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] !== 1) continue;
    const occupiedNeighbors = neighbors(index, width, height).filter(
      (neighbor) => mask[neighbor] === 1,
    ).length;
    if (occupiedNeighbors === 1) result.push(index);
  }
  return result;
}

function neighbors(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const result: number[] = [];
  if (x > 0) result.push(index - 1);
  if (x + 1 < width) result.push(index + 1);
  if (y > 0) result.push(index - width);
  if (y + 1 < height) result.push(index + width);
  return result;
}

function boundingBoxIou(
  left: OccupiedBoundingBox,
  right: OccupiedBoundingBox,
): number {
  const intersectionWidth = Math.max(
    0,
    Math.min(left.maxX, right.maxX) - Math.max(left.minX, right.minX) + 1,
  );
  const intersectionHeight = Math.max(
    0,
    Math.min(left.maxY, right.maxY) - Math.max(left.minY, right.minY) + 1,
  );
  const intersection = intersectionWidth * intersectionHeight;
  const leftArea = left.width * left.height;
  const rightArea = right.width * right.height;
  return intersection / (leftArea + rightArea - intersection);
}

function validateMasks(
  candidate: Uint8Array,
  reference: Uint8Array,
  width: number,
  height: number,
): void {
  validateMask(candidate, width, height);
  validateMask(reference, width, height);
}

function validateMask(mask: Uint8Array, width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    mask.length !== width * height ||
    mask.some((value) => value !== 0 && value !== 1)
  ) {
    throw new RangeError("Occupancy mask is invalid.");
  }
}

function normalize(value: number): number {
  const rounded = Number(value.toFixed(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}
