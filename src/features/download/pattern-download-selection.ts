import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { PatternEditorCustomerResult } from "../pattern-editor/pattern-customer-result";
import type { PatternExportInput } from "./pattern-export";

export const EMPTY_EDITED_PATTERN_DOWNLOAD_MESSAGE =
  "Add at least one bead to download this edited pattern.";

export type PatternDownloadSelection =
  | Readonly<{
      kind: "ready";
      source: "original" | "edited";
      identity: string;
      input: PatternExportInput;
    }>
  | Readonly<{
      kind: "unavailable";
      source: "empty-edited";
      identity: string;
      message: typeof EMPTY_EDITED_PATTERN_DOWNLOAD_MESSAGE;
    }>;

export interface PatternDownloadSelectionInput {
  readonly generationIdentity: number;
  readonly originalPattern: PublicPatternResult;
  readonly customerResult: PatternEditorCustomerResult | null;
  readonly selectedColorSetLabel: string;
}

export function selectPatternDownload(
  selection: PatternDownloadSelectionInput,
): PatternDownloadSelection {
  if (selection.customerResult?.kind === "empty-edited") {
    const empty = selection.customerResult.empty;
    return Object.freeze({
      kind: "unavailable",
      source: "empty-edited",
      identity: JSON.stringify([
        "poparooz-pattern-download-v1",
        selection.generationIdentity,
        "empty-edited",
        selection.selectedColorSetLabel,
        empty.width,
        empty.height,
        empty.totalPositions,
      ]),
      message: EMPTY_EDITED_PATTERN_DOWNLOAD_MESSAGE,
    });
  }

  const source =
    selection.customerResult?.kind === "edited" ? "edited" : "original";
  const pattern =
    selection.customerResult?.kind === "edited"
      ? selection.customerResult.pattern
      : selection.originalPattern;
  const input = Object.freeze({
    pattern,
    selectedColorSetLabel: selection.selectedColorSetLabel,
  });
  return Object.freeze({
    kind: "ready",
    source,
    identity: createPatternDownloadIdentity(
      selection.generationIdentity,
      source,
      input,
    ),
    input,
  });
}

function createPatternDownloadIdentity(
  generationIdentity: number,
  source: "original" | "edited",
  input: PatternExportInput,
): string {
  const pattern = input.pattern;
  return JSON.stringify([
    "poparooz-pattern-download-v1",
    generationIdentity,
    source,
    input.selectedColorSetLabel,
    [
      pattern.matrix.width,
      pattern.matrix.height,
      pattern.matrix.transparentIndex,
      Array.from(pattern.matrix.colorIndices),
    ],
    pattern.colors.map((entry) => [
      entry.index,
      entry.color.brand,
      entry.color.code,
      entry.color.hex,
      entry.color.name ?? null,
      entry.beadCount,
    ]),
    pattern.materials.map((entry) => [
      entry.patternColorIndex,
      entry.color.brand,
      entry.color.code,
      entry.color.hex,
      entry.color.name ?? null,
      entry.beadCount,
    ]),
    [
      pattern.totals.width,
      pattern.totals.height,
      pattern.totals.totalPositions,
      pattern.totals.totalBeads,
      pattern.totals.transparentPositions,
      pattern.totals.colorCount,
    ],
    [
      pattern.boardLayout.boardColumns,
      pattern.boardLayout.boardRows,
      pattern.boardLayout.boardCount,
      pattern.boardLayout.boardWidthInBeads,
      pattern.boardLayout.boardHeightInBeads,
      pattern.boardLayout.totalPegCapacity,
      pattern.boardLayout.usedBeadCount,
      pattern.boardLayout.transparentPatternPositions,
      pattern.boardLayout.outsidePatternPegCount,
      pattern.boardLayout.unusedPegCount,
      pattern.boardLayout.tiles.map((tile) => [
        tile.index,
        tile.row,
        tile.column,
        tile.originX,
        tile.originY,
        tile.coveredWidth,
        tile.coveredHeight,
        tile.beadCount,
        tile.transparentPatternPositions,
        tile.outsidePatternPegCount,
      ]),
    ],
  ]);
}
