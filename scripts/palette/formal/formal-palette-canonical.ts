import { createHash } from "node:crypto";

import type { NormalizedFormalPaletteColor } from "./formal-palette.types.ts";

export function serializeCanonicalFormalPaletteRecords(
  colors: readonly NormalizedFormalPaletteColor[],
): string {
  const canonicalRecords = [...colors]
    .sort(
      (left, right) => left.canonicalSourceIndex - right.canonicalSourceIndex,
    )
    .map((color) => ({
      code: color.code,
      series: color.series,
      seriesNumber: color.seriesNumber,
      seriesRank: color.seriesRank,
      canonicalSourceIndex: color.canonicalSourceIndex,
      hex: color.hex,
      ...(color.displayName === undefined
        ? {}
        : { displayName: color.displayName }),
      displayNameStatus: color.displayNameStatus,
      digitalColorStatus: color.digitalColorStatus,
      physicalColorStatus: color.physicalColorStatus,
      sourceLocation: {
        sheet: color.sourceLocation.sheet,
        row: color.sourceLocation.row,
        column: color.sourceLocation.column,
      },
    }));

  return `${JSON.stringify(canonicalRecords, null, 2)}\n`;
}

export function hashCanonicalFormalPaletteRecords(
  colors: readonly NormalizedFormalPaletteColor[],
): string {
  return sha256(serializeCanonicalFormalPaletteRecords(colors));
}

export function hashSourceFileBytes(bytes: Uint8Array): string {
  return sha256(bytes);
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
