import { deltaE2000 } from "../../../src/domain/color/color-distance.ts";
import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";
import type { GenerationPaletteColor } from "../../../src/runtime/generation-palette/generation-palette.types.ts";

export interface PatternColorComponentDiagnostic {
  readonly code: string;
  readonly size: number;
  readonly neighboringCodeFrequencies: readonly Readonly<{
    code: string;
    boundaryCount: number;
  }>[];
  readonly dominantNeighborCode: string | null;
  readonly deltaE00ToDominantNeighbor: number | null;
  readonly minimumAdjacentCode: string | null;
  readonly minimumAdjacentDeltaE00: number | null;
}

export interface PatternColorPurityDiagnostics {
  readonly codeFrequencies: readonly Readonly<{
    code: string;
    beadCount: number;
  }>[];
  readonly componentBuckets: Readonly<{
    size1: number;
    size2: number;
    size3To4: number;
    size5Plus: number;
  }>;
  readonly totalComponentCount: number;
  readonly tinyComponents: readonly PatternColorComponentDiagnostic[];
}

export interface PatternMatrixComparison {
  readonly occupancyIdentical: boolean;
  readonly changedCodePositions: number;
  readonly totalPositions: number;
}

export function analyzePatternColorPurity(
  pattern: PublicPatternResult,
  palette: readonly GenerationPaletteColor[],
): PatternColorPurityDiagnostics {
  const codeByIndex = new Map(
    pattern.colors.map((item) => [item.index, item.color.code] as const),
  );
  const labByCode = new Map(
    palette.map(
      (item) =>
        [
          item.code,
          { l: item.lab[0], a: item.lab[1], b: item.lab[2] },
        ] as const,
    ),
  );
  const visited = new Uint8Array(pattern.matrix.colorIndices.length);
  const buckets = { size1: 0, size2: 0, size3To4: 0, size5Plus: 0 };
  const tinyComponents: PatternColorComponentDiagnostic[] = [];
  let totalComponentCount = 0;

  for (let start = 0; start < visited.length; start += 1) {
    const colorIndex = pattern.matrix.colorIndices[start]!;
    if (
      visited[start] === 1 ||
      colorIndex === pattern.matrix.transparentIndex
    ) {
      continue;
    }
    const code = codeByIndex.get(colorIndex);
    if (code === undefined) throw new Error("Pattern color index has no code.");
    const component = collectComponent(pattern, start, colorIndex, visited);
    totalComponentCount += 1;
    if (component.cells.length === 1) buckets.size1 += 1;
    else if (component.cells.length === 2) buckets.size2 += 1;
    else if (component.cells.length <= 4) buckets.size3To4 += 1;
    else buckets.size5Plus += 1;

    if (component.cells.length <= 4) {
      tinyComponents.push(
        componentDiagnostic(
          pattern,
          component.cells,
          code,
          colorIndex,
          codeByIndex,
          labByCode,
        ),
      );
    }
  }

  return Object.freeze({
    codeFrequencies: Object.freeze(
      pattern.colors
        .map((item) =>
          Object.freeze({ code: item.color.code, beadCount: item.beadCount }),
        )
        .sort((left, right) => left.code.localeCompare(right.code)),
    ),
    componentBuckets: Object.freeze(buckets),
    totalComponentCount,
    tinyComponents: Object.freeze(
      tinyComponents.sort(
        (left, right) =>
          left.size - right.size || left.code.localeCompare(right.code),
      ),
    ),
  });
}

export function comparePatternMatrices(
  baseline: PublicPatternResult,
  candidate: PublicPatternResult,
): PatternMatrixComparison {
  if (
    baseline.matrix.width !== candidate.matrix.width ||
    baseline.matrix.height !== candidate.matrix.height
  ) {
    throw new Error("Pattern dimensions differ.");
  }
  const baselineCodes = codeByPosition(baseline);
  const candidateCodes = codeByPosition(candidate);
  let occupancyIdentical = true;
  let changedCodePositions = 0;
  for (let index = 0; index < baselineCodes.length; index += 1) {
    const baselineCode = baselineCodes[index];
    const candidateCode = candidateCodes[index];
    if ((baselineCode === null) !== (candidateCode === null)) {
      occupancyIdentical = false;
    }
    if (baselineCode !== candidateCode) changedCodePositions += 1;
  }
  return Object.freeze({
    occupancyIdentical,
    changedCodePositions,
    totalPositions: baselineCodes.length,
  });
}

function collectComponent(
  pattern: PublicPatternResult,
  start: number,
  colorIndex: number,
  visited: Uint8Array,
): { readonly cells: readonly number[] } {
  const cells: number[] = [];
  const stack = [start];
  visited[start] = 1;
  while (stack.length > 0) {
    const current = stack.pop()!;
    cells.push(current);
    for (const neighbor of neighbors(
      current,
      pattern.matrix.width,
      pattern.matrix.height,
    )) {
      if (
        visited[neighbor] === 0 &&
        pattern.matrix.colorIndices[neighbor] === colorIndex
      ) {
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }
  }
  return { cells };
}

function componentDiagnostic(
  pattern: PublicPatternResult,
  cells: readonly number[],
  code: string,
  colorIndex: number,
  codeByIndex: ReadonlyMap<number, string>,
  labByCode: ReadonlyMap<string, Readonly<{ l: number; a: number; b: number }>>,
): PatternColorComponentDiagnostic {
  const neighboring = new Map<string, number>();
  for (const cell of cells) {
    for (const neighbor of neighbors(
      cell,
      pattern.matrix.width,
      pattern.matrix.height,
    )) {
      const neighborIndex = pattern.matrix.colorIndices[neighbor]!;
      if (
        neighborIndex === colorIndex ||
        neighborIndex === pattern.matrix.transparentIndex
      ) {
        continue;
      }
      const neighborCode = codeByIndex.get(neighborIndex);
      if (neighborCode === undefined) {
        throw new Error("Neighboring Pattern color index has no code.");
      }
      neighboring.set(neighborCode, (neighboring.get(neighborCode) ?? 0) + 1);
    }
  }
  const frequencies = [...neighboring]
    .map(([neighborCode, boundaryCount]) => ({
      code: neighborCode,
      boundaryCount,
    }))
    .sort(
      (left, right) =>
        right.boundaryCount - left.boundaryCount ||
        left.code.localeCompare(right.code),
    );
  const dominantNeighborCode = frequencies[0]?.code ?? null;
  const sourceLab = labByCode.get(code);
  if (sourceLab === undefined)
    throw new Error("Pattern code is not in palette.");
  const adjacentDistances = frequencies
    .map(({ code: adjacentCode }) => {
      const adjacentLab = labByCode.get(adjacentCode);
      if (adjacentLab === undefined) {
        throw new Error("Adjacent Pattern code is not in palette.");
      }
      return {
        code: adjacentCode,
        deltaE00: deltaE2000(sourceLab, adjacentLab),
      };
    })
    .sort(
      (left, right) =>
        left.deltaE00 - right.deltaE00 || left.code.localeCompare(right.code),
    );
  const dominantLab =
    dominantNeighborCode === null
      ? undefined
      : labByCode.get(dominantNeighborCode);
  return Object.freeze({
    code,
    size: cells.length,
    neighboringCodeFrequencies: Object.freeze(
      frequencies.map((item) => Object.freeze(item)),
    ),
    dominantNeighborCode,
    deltaE00ToDominantNeighbor:
      dominantLab === undefined ? null : deltaE2000(sourceLab, dominantLab),
    minimumAdjacentCode: adjacentDistances[0]?.code ?? null,
    minimumAdjacentDeltaE00: adjacentDistances[0]?.deltaE00 ?? null,
  });
}

function codeByPosition(
  pattern: PublicPatternResult,
): readonly (string | null)[] {
  const codeByIndex = new Map(
    pattern.colors.map((item) => [item.index, item.color.code] as const),
  );
  return Array.from(pattern.matrix.colorIndices, (index) => {
    if (index === pattern.matrix.transparentIndex) return null;
    const code = codeByIndex.get(index);
    if (code === undefined) throw new Error("Pattern color index has no code.");
    return code;
  });
}

function neighbors(
  index: number,
  width: number,
  height: number,
): readonly number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  const result: number[] = [];
  if (x > 0) result.push(index - 1);
  if (x + 1 < width) result.push(index + 1);
  if (y > 0) result.push(index - width);
  if (y + 1 < height) result.push(index + width);
  return result;
}
