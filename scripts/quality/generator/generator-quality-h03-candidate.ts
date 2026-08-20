import type { RgbaImage } from "../../../src/domain/image/image.types.ts";

const EXCLUDED_ALPHA_MAXIMUM = 32;
const CANDIDATE_ALPHA_MINIMUM = 33;
const CANDIDATE_ALPHA_MAXIMUM = 63;
const CHANNEL_SPREAD_MAXIMUM = 2;
const MINIMUM_OCCUPIED_NEIGHBORS = 2;

export interface H03CandidateDiagnostics {
  readonly activated: boolean;
  readonly bypassReason: "not-transparent" | "explicit-alpha-source" | "none";
  readonly candidateCount: number;
  readonly removedCount: number;
  readonly topologyGuardRejected: boolean;
  readonly componentCountBefore: number;
  readonly componentCountAfter: number;
}

export function applyH03D02NormalizedFringeCandidate(
  image: RgbaImage,
  context: Readonly<{
    background: "white" | "transparent";
    sourceHasAlpha: boolean;
  }>,
): Readonly<{ image: RgbaImage; diagnostics: H03CandidateDiagnostics }> {
  if (context.background !== "transparent") {
    return bypass(image, "not-transparent");
  }
  if (context.sourceHasAlpha) {
    return bypass(image, "explicit-alpha-source");
  }

  const occupiedBefore = occupancyMask(image);
  const componentsBefore = connectedComponents(
    occupiedBefore,
    image.width,
    image.height,
  );
  const candidateIndices: number[] = [];
  for (let y = 1; y < image.height - 1; y += 1) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const index = y * image.width + x;
      if (isCandidate(image, occupiedBefore, index)) {
        candidateIndices.push(index);
      }
    }
  }

  if (candidateIndices.length === 0) {
    return Object.freeze({
      image,
      diagnostics: Object.freeze({
        activated: true,
        bypassReason: "none",
        candidateCount: 0,
        removedCount: 0,
        topologyGuardRejected: false,
        componentCountBefore: componentsBefore.count,
        componentCountAfter: componentsBefore.count,
      }),
    });
  }

  const occupiedAfter = new Uint8Array(occupiedBefore);
  for (const index of candidateIndices) occupiedAfter[index] = 0;
  const componentsAfter = connectedComponents(
    occupiedAfter,
    image.width,
    image.height,
  );
  const rejected = violatesTopologyGuard(
    occupiedBefore,
    occupiedAfter,
    componentsBefore,
    componentsAfter,
  );
  if (rejected) {
    return Object.freeze({
      image,
      diagnostics: Object.freeze({
        activated: true,
        bypassReason: "none",
        candidateCount: candidateIndices.length,
        removedCount: 0,
        topologyGuardRejected: true,
        componentCountBefore: componentsBefore.count,
        componentCountAfter: componentsAfter.count,
      }),
    });
  }

  const data = new Uint8ClampedArray(image.data);
  for (const index of candidateIndices) {
    data.fill(0, index * 4, index * 4 + 4);
  }
  return Object.freeze({
    image: { width: image.width, height: image.height, data },
    diagnostics: Object.freeze({
      activated: true,
      bypassReason: "none",
      candidateCount: candidateIndices.length,
      removedCount: candidateIndices.length,
      topologyGuardRejected: false,
      componentCountBefore: componentsBefore.count,
      componentCountAfter: componentsAfter.count,
    }),
  });
}

interface Components {
  readonly labels: Int32Array;
  readonly count: number;
}

function bypass(
  image: RgbaImage,
  reason: H03CandidateDiagnostics["bypassReason"],
) {
  const count = connectedComponents(
    occupancyMask(image),
    image.width,
    image.height,
  ).count;
  return Object.freeze({
    image,
    diagnostics: Object.freeze({
      activated: false,
      bypassReason: reason,
      candidateCount: 0,
      removedCount: 0,
      topologyGuardRejected: false,
      componentCountBefore: count,
      componentCountAfter: count,
    }),
  });
}

function isCandidate(
  image: RgbaImage,
  occupied: Uint8Array,
  index: number,
): boolean {
  const offset = index * 4;
  const alpha = image.data[offset + 3]!;
  if (alpha < CANDIDATE_ALPHA_MINIMUM || alpha > CANDIDATE_ALPHA_MAXIMUM) {
    return false;
  }
  const red = image.data[offset]!;
  const green = image.data[offset + 1]!;
  const blue = image.data[offset + 2]!;
  if (
    Math.max(red, green, blue) - Math.min(red, green, blue) >
    CHANNEL_SPREAD_MAXIMUM
  ) {
    return false;
  }
  const adjacent = neighbors(index, image.width, image.height);
  const hasExcludedNeighbor = adjacent.some(
    (neighbor) => image.data[neighbor * 4 + 3]! <= EXCLUDED_ALPHA_MAXIMUM,
  );
  const occupiedNeighborCount = adjacent.filter(
    (neighbor) => occupied[neighbor] === 1,
  ).length;
  return (
    hasExcludedNeighbor && occupiedNeighborCount >= MINIMUM_OCCUPIED_NEIGHBORS
  );
}

function occupancyMask(image: RgbaImage): Uint8Array {
  const result = new Uint8Array(image.width * image.height);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = image.data[index * 4 + 3]! > EXCLUDED_ALPHA_MAXIMUM ? 1 : 0;
  }
  return result;
}

function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
): Components {
  const labels = new Int32Array(mask.length);
  labels.fill(-1);
  const queue = new Uint32Array(mask.length);
  let count = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1 || labels[start] !== -1) continue;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    labels[start] = count;
    while (head < tail) {
      const index = queue[head++]!;
      for (const neighbor of neighbors(index, width, height)) {
        if (mask[neighbor] === 1 && labels[neighbor] === -1) {
          labels[neighbor] = count;
          queue[tail++] = neighbor;
        }
      }
    }
    count += 1;
  }
  return { labels, count };
}

function violatesTopologyGuard(
  beforeMask: Uint8Array,
  afterMask: Uint8Array,
  before: Components,
  after: Components,
): boolean {
  if (after.count > before.count) return true;
  const descendants = Array.from(
    { length: before.count },
    () => new Set<number>(),
  );
  for (let index = 0; index < beforeMask.length; index += 1) {
    if (beforeMask[index] !== 1 || afterMask[index] !== 1) continue;
    descendants[before.labels[index]!]!.add(after.labels[index]!);
  }
  return descendants.some((labels) => labels.size === 0 || labels.size > 1);
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
