import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import {
  deriveMaterialRequirementsV1,
  type DerivedMaterialRequirementV1,
} from "../materials/derived-material-requirements";
import { toBoardLayoutView } from "./board-layout-view";
import type { ColorRowView, PatternResultViewResult } from "./result.types";

export const MAX_RESULT_COLORS = 512;

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

export function toPatternResultView(
  pattern: PublicPatternResult,
): PatternResultViewResult {
  const totals = pattern.totals;
  const { width, height, colorIndices, transparentIndex } = pattern.matrix;
  if (
    !positiveInteger(width) ||
    !positiveInteger(height) ||
    !(colorIndices instanceof Uint16Array) ||
    colorIndices.length !== width * height ||
    !nonNegativeInteger(transparentIndex) ||
    totals.width !== width ||
    totals.height !== height ||
    totals.totalPositions !== width * height ||
    !nonNegativeInteger(totals.totalBeads) ||
    !nonNegativeInteger(totals.transparentPositions) ||
    totals.totalBeads + totals.transparentPositions !== totals.totalPositions ||
    totals.colorCount !== pattern.colors.length ||
    totals.colorCount !== pattern.materials.length ||
    pattern.materials.length > MAX_RESULT_COLORS
  ) {
    return { ok: false };
  }

  let materials: readonly DerivedMaterialRequirementV1[];
  try {
    materials = deriveMaterialRequirementsV1(pattern.materials);
  } catch {
    return { ok: false };
  }
  const colors = toColorRows(materials);
  if (colors === null) return { ok: false };
  const colorTotal = colors.reduce((sum, row) => sum + row.beadCount, 0);
  if (colorTotal !== totals.totalBeads) return { ok: false };
  if (!materialsMatchPatternColors(pattern, materials)) return { ok: false };
  if (
    import.meta.env.DEV &&
    !matrixUsesOnlyPublicMaterials(pattern, materials)
  ) {
    return { ok: false };
  }

  const boardLayout = toBoardLayoutView(pattern);
  if (boardLayout === null) return { ok: false };
  const transparentPositionsLabel =
    totals.transparentPositions === 0
      ? null
      : `${formatNumber(totals.transparentPositions)} transparent ${
          totals.transparentPositions === 1 ? "position" : "positions"
        }`;
  return {
    ok: true,
    view: Object.freeze({
      summary: Object.freeze({
        width,
        height,
        patternSize: `${formatNumber(width)} × ${formatNumber(height)}`,
        actualColors: totals.colorCount,
        actualColorsLabel: formatNumber(totals.colorCount),
        totalBeads: totals.totalBeads,
        totalBeadsLabel: formatNumber(totals.totalBeads),
        boardsLabel: boardLayout.boardCountLabel,
        transparentPositions: totals.transparentPositions,
        transparentPositionsLabel,
      }),
      colors,
      materials,
      boardLayout,
    }),
  };
}

export function toColorRows(
  materials: readonly DerivedMaterialRequirementV1[],
): readonly ColorRowView[] | null {
  const indexes = new Set<number>();
  const rows: ColorRowView[] = [];
  for (const entry of materials) {
    if (
      !nonNegativeInteger(entry.patternColorIndex) ||
      indexes.has(entry.patternColorIndex) ||
      !positiveInteger(entry.beadCount) ||
      entry.color.brand !== "Poparooz" ||
      !validLabel(entry.color.code) ||
      (entry.color.name !== undefined && !validLabel(entry.color.name)) ||
      !/^#[0-9A-F]{6}$/.test(entry.color.hex)
    ) {
      return null;
    }
    indexes.add(entry.patternColorIndex);
    rows.push(
      Object.freeze({
        index: entry.patternColorIndex,
        code: entry.color.code,
        ...(entry.color.name === undefined ? {} : { name: entry.color.name }),
        hex: entry.color.hex,
        beadCount: entry.beadCount,
        beadCountLabel: `${formatNumber(entry.beadCount)} ${
          entry.beadCount === 1 ? "bead" : "beads"
        }`,
      }),
    );
  }
  rows.sort(compareColorRows);
  return Object.freeze(rows);
}

function materialsMatchPatternColors(
  pattern: PublicPatternResult,
  materials: readonly DerivedMaterialRequirementV1[],
): boolean {
  const materialByIndex = new Map(
    materials.map((material) => [material.patternColorIndex, material]),
  );
  const indexes = new Set<number>();
  for (const entry of pattern.colors) {
    if (!nonNegativeInteger(entry.index) || indexes.has(entry.index)) {
      return false;
    }
    indexes.add(entry.index);
    const material = materialByIndex.get(entry.index);
    if (
      material === undefined ||
      material.color.brand !== entry.color.brand ||
      material.color.code !== entry.color.code ||
      material.color.hex !== entry.color.hex ||
      material.color.name !== entry.color.name
    ) {
      return false;
    }
  }
  return indexes.size === materials.length;
}

function matrixUsesOnlyPublicMaterials(
  pattern: PublicPatternResult,
  materials: readonly DerivedMaterialRequirementV1[],
): boolean {
  const indexes = new Set(materials.map((entry) => entry.patternColorIndex));
  for (const index of pattern.matrix.colorIndices) {
    if (index !== pattern.matrix.transparentIndex && !indexes.has(index))
      return false;
  }
  return true;
}

function compareColorRows(left: ColorRowView, right: ColorRowView): number {
  if (left.beadCount !== right.beadCount)
    return right.beadCount - left.beadCount;
  if (left.index !== right.index) return left.index - right.index;
  return left.code < right.code ? -1 : left.code > right.code ? 1 : 0;
}

function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

function validLabel(value: string): boolean {
  return value.trim().length > 0 && value === value.trim();
}

function positiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
