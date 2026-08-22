import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";

import { performance } from "node:perf_hooks";

export interface PatternStructuralMetrics {
  readonly occupiedCellCount: number;
  readonly usedColorCount: number;
  readonly totalColorComponents: number;
  readonly singletonComponentCount: number;
  readonly twoToThreeCellComponentCount: number;
  readonly smallRegionCellPercentage: number;
  readonly colorBoundaryEdgeCount: number;
  readonly occupiedAdjacencyEdgeCount: number;
  readonly normalizedBoundaryLength: number;
  readonly meanLocalColorSwitches: number;
  readonly highSwitchCellPercentage: number;
  readonly thinCellCount: number;
  readonly thinSameColorContinuity: number;
  readonly dominantColorAreaPercentage: number;
  readonly dominantColorComponentCount: number;
  readonly dominantColorLargestComponentCoverage: number;
  readonly componentsPerColor: readonly Readonly<{
    code: string;
    cellCount: number;
    componentCount: number;
    largestComponent: number;
  }>[];
}

export interface StructuralTransitionMetrics {
  readonly totalColorComponentsDelta: number;
  readonly singletonComponentDelta: number;
  readonly twoToThreeCellComponentDelta: number;
  readonly smallRegionCellPercentageDelta: number;
  readonly normalizedBoundaryLengthDelta: number;
  readonly meanLocalColorSwitchesDelta: number;
  readonly highSwitchCellPercentageDelta: number;
  readonly thinSameColorContinuityDelta: number;
  readonly dominantColorComponentDelta: number;
  readonly dominantColorLargestComponentCoverageDelta: number;
  readonly additionalUsedColors: number;
  readonly meanDeltaE00GainPerAdditionalColor: number | null;
}

export interface PatternStructuralTiming {
  readonly componentTraversalMs: number;
  readonly boundaryAndLocalSwitchingMs: number;
  readonly thinContinuityMs: number;
  readonly aggregationMs: number;
  readonly totalMs: number;
}

export function measurePatternStructureWithTiming(
  pattern: PublicPatternResult,
): Readonly<{
  metrics: PatternStructuralMetrics;
  timing: PatternStructuralTiming;
}> {
  return measure(pattern);
}

export function measurePatternStructure(
  pattern: PublicPatternResult,
): PatternStructuralMetrics {
  return measure(pattern).metrics;
}

function measure(pattern: PublicPatternResult): Readonly<{
  metrics: PatternStructuralMetrics;
  timing: PatternStructuralTiming;
}> {
  const totalStarted = performance.now();
  const codes = patternCodes(pattern);
  const width = pattern.matrix.width;
  const height = pattern.matrix.height;
  const byCode = new Map<string, number[]>();
  codes.forEach((code, index) => {
    if (code === null) return;
    const indexes = byCode.get(code);
    if (indexes === undefined) byCode.set(code, [index]);
    else indexes.push(index);
  });
  const componentStarted = performance.now();
  const componentsPerColor = [...byCode.entries()]
    .map(([code, indexes]) => {
      const sizes = sameCodeComponents(codes, width, height, code, indexes);
      return Object.freeze({
        code,
        cellCount: indexes.length,
        componentCount: sizes.length,
        largestComponent: Math.max(...sizes),
        sizes,
      });
    })
    .sort((left, right) => left.code.localeCompare(right.code));
  const allComponentSizes = componentsPerColor.flatMap((item) => item.sizes);
  const componentTraversalMs = performance.now() - componentStarted;
  const occupiedCellCount = pattern.totals.totalBeads;
  let occupiedAdjacencyEdgeCount = 0;
  let colorBoundaryEdgeCount = 0;
  let localSwitchTotal = 0;
  let highSwitchCells = 0;
  let thinCellCount = 0;
  let thinEdges = 0;
  let thinSameColorEdges = 0;
  const thinMask = new Uint8Array(codes.length);

  const boundaryStarted = performance.now();
  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];
    if (code === null) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    const cardinal = cardinalNeighbors(index, x, y, width, height).filter(
      (neighbor) => codes[neighbor] !== null,
    );
    if (cardinal.length <= 2) {
      thinMask[index] = 1;
      thinCellCount += 1;
    }
    for (const neighbor of [
      x + 1 < width ? index + 1 : -1,
      y + 1 < height ? index + width : -1,
    ]) {
      if (neighbor < 0 || codes[neighbor] === null) continue;
      occupiedAdjacencyEdgeCount += 1;
      if (codes[neighbor] !== code) colorBoundaryEdgeCount += 1;
    }
    const localCodes = new Set<string>();
    for (
      let localY = Math.max(0, y - 1);
      localY <= Math.min(height - 1, y + 1);
      localY += 1
    ) {
      for (
        let localX = Math.max(0, x - 1);
        localX <= Math.min(width - 1, x + 1);
        localX += 1
      ) {
        const localCode = codes[localY * width + localX];
        if (localCode !== null && localCode !== code) localCodes.add(localCode);
      }
    }
    localSwitchTotal += localCodes.size;
    if (localCodes.size >= 3) highSwitchCells += 1;
  }
  const boundaryAndLocalSwitchingMs = performance.now() - boundaryStarted;
  const thinStarted = performance.now();
  for (let index = 0; index < codes.length; index += 1) {
    if (thinMask[index] === 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    for (const neighbor of [
      x + 1 < width ? index + 1 : -1,
      y + 1 < height ? index + width : -1,
    ]) {
      if (neighbor < 0 || thinMask[neighbor] === 0) continue;
      thinEdges += 1;
      if (codes[neighbor] === codes[index]) thinSameColorEdges += 1;
    }
  }
  const thinContinuityMs = performance.now() - thinStarted;
  const aggregationStarted = performance.now();
  const dominant = [...componentsPerColor].sort(
    (left, right) =>
      right.cellCount - left.cellCount || left.code.localeCompare(right.code),
  )[0];
  if (dominant === undefined || occupiedCellCount === 0) {
    throw new Error("Structural metrics require an occupied Pattern.");
  }
  const metrics = Object.freeze({
    occupiedCellCount,
    usedColorCount: pattern.totals.colorCount,
    totalColorComponents: allComponentSizes.length,
    singletonComponentCount: allComponentSizes.filter((size) => size === 1)
      .length,
    twoToThreeCellComponentCount: allComponentSizes.filter(
      (size) => size >= 2 && size <= 3,
    ).length,
    smallRegionCellPercentage:
      (allComponentSizes
        .filter((size) => size <= 4)
        .reduce((total, size) => total + size, 0) /
        occupiedCellCount) *
      100,
    colorBoundaryEdgeCount,
    occupiedAdjacencyEdgeCount,
    normalizedBoundaryLength:
      occupiedAdjacencyEdgeCount === 0
        ? 0
        : colorBoundaryEdgeCount / occupiedAdjacencyEdgeCount,
    meanLocalColorSwitches: localSwitchTotal / occupiedCellCount,
    highSwitchCellPercentage: (highSwitchCells / occupiedCellCount) * 100,
    thinCellCount,
    thinSameColorContinuity:
      thinEdges === 0 ? 1 : thinSameColorEdges / thinEdges,
    dominantColorAreaPercentage: (dominant.cellCount / occupiedCellCount) * 100,
    dominantColorComponentCount: dominant.componentCount,
    dominantColorLargestComponentCoverage:
      dominant.largestComponent / dominant.cellCount,
    componentsPerColor: Object.freeze(
      componentsPerColor.map((item) =>
        Object.freeze({
          code: item.code,
          cellCount: item.cellCount,
          componentCount: item.componentCount,
          largestComponent: item.largestComponent,
        }),
      ),
    ),
  });
  const aggregationMs = performance.now() - aggregationStarted;
  return Object.freeze({
    metrics,
    timing: Object.freeze({
      componentTraversalMs,
      boundaryAndLocalSwitchingMs,
      thinContinuityMs,
      aggregationMs,
      totalMs: performance.now() - totalStarted,
    }),
  });
}

export function comparePatternStructure(
  smaller: PatternStructuralMetrics,
  larger: PatternStructuralMetrics,
  meanDeltaE00Gain: number,
): StructuralTransitionMetrics {
  if (smaller.occupiedCellCount !== larger.occupiedCellCount) {
    throw new Error("Structural comparison occupancy differs.");
  }
  const additionalUsedColors = larger.usedColorCount - smaller.usedColorCount;
  return Object.freeze({
    totalColorComponentsDelta:
      larger.totalColorComponents - smaller.totalColorComponents,
    singletonComponentDelta:
      larger.singletonComponentCount - smaller.singletonComponentCount,
    twoToThreeCellComponentDelta:
      larger.twoToThreeCellComponentCount -
      smaller.twoToThreeCellComponentCount,
    smallRegionCellPercentageDelta:
      larger.smallRegionCellPercentage - smaller.smallRegionCellPercentage,
    normalizedBoundaryLengthDelta:
      larger.normalizedBoundaryLength - smaller.normalizedBoundaryLength,
    meanLocalColorSwitchesDelta:
      larger.meanLocalColorSwitches - smaller.meanLocalColorSwitches,
    highSwitchCellPercentageDelta:
      larger.highSwitchCellPercentage - smaller.highSwitchCellPercentage,
    thinSameColorContinuityDelta:
      larger.thinSameColorContinuity - smaller.thinSameColorContinuity,
    dominantColorComponentDelta:
      larger.dominantColorComponentCount - smaller.dominantColorComponentCount,
    dominantColorLargestComponentCoverageDelta:
      larger.dominantColorLargestComponentCoverage -
      smaller.dominantColorLargestComponentCoverage,
    additionalUsedColors,
    meanDeltaE00GainPerAdditionalColor:
      additionalUsedColors <= 0
        ? null
        : meanDeltaE00Gain / additionalUsedColors,
  });
}

function patternCodes(
  pattern: PublicPatternResult,
): readonly (string | null)[] {
  const byIndex = new Map(
    pattern.colors.map((item) => [item.index, item.color.code] as const),
  );
  return Array.from(pattern.matrix.colorIndices, (index) => {
    if (index === pattern.matrix.transparentIndex) return null;
    const code = byIndex.get(index);
    if (code === undefined) throw new Error("Pattern color index is invalid.");
    return code;
  });
}

function sameCodeComponents(
  codes: readonly (string | null)[],
  width: number,
  height: number,
  code: string,
  indexes: readonly number[],
): readonly number[] {
  const pending = new Set(indexes);
  const sizes: number[] = [];
  for (const start of indexes) {
    if (!pending.delete(start)) continue;
    const queue = [start];
    let size = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]!;
      size += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (const neighbor of cardinalNeighbors(current, x, y, width, height)) {
        if (codes[neighbor] === code && pending.delete(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    sizes.push(size);
  }
  return sizes.sort((left, right) => left - right);
}

function cardinalNeighbors(
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
): readonly number[] {
  return [
    x > 0 ? index - 1 : -1,
    x + 1 < width ? index + 1 : -1,
    y > 0 ? index - width : -1,
    y + 1 < height ? index + width : -1,
  ].filter((neighbor) => neighbor >= 0);
}
