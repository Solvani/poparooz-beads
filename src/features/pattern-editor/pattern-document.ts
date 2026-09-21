import { buildPatternBoardLayout } from "../../domain/pattern/board-layout";
import type { PatternTotals } from "../../domain/pattern/pattern.types";
import type {
  PublicPatternBoardLayout,
  PublicPatternResult,
} from "../../domain/pattern/public-pattern.types";
import { parseGenerationBoardProfileSnapshot } from "../../runtime/generation-board-profile/generation-board-profile.schema";
import type { GenerationBoardProfileSnapshot } from "../../runtime/generation-board-profile/generation-board-profile.types";
import { createApprovedRuntimePaletteProvider } from "../../runtime/palette/approved-runtime-palette";
import type { RuntimePaletteSnapshot } from "../../runtime/palette/runtime-palette.types";
import {
  PATTERN_DOCUMENT_EMPTY_CELL,
  PatternEditorError,
  type PatternDocument,
} from "./pattern-editor.types";

const paletteProvider = createApprovedRuntimePaletteProvider();
const palette = paletteProvider.getSnapshot();
const boardProfile = parseGenerationBoardProfileSnapshot({
  id: "poparooz-board-104",
  version: "1.0.0",
  shape: "square",
  pegGrid: { columns: 104, rows: 104 },
  tiling: { supported: true, sharedEdgePegs: false },
});

export function getPatternEditorPalette(): RuntimePaletteSnapshot {
  return palette;
}

export function getPatternEditorBoardProfile(): GenerationBoardProfileSnapshot {
  return boardProfile;
}

export function createPatternDocument(
  source: PublicPatternResult,
): PatternDocument {
  validateGeneratedResult(source);

  const localToPaletteOrdinal = new Uint16Array(source.colors.length);
  let previousOrdinal = -1;
  source.colors.forEach((entry, localIndex) => {
    const canonical = paletteProvider.getColorByCode(entry.color.code);
    if (
      canonical === undefined ||
      entry.color.brand !== "Poparooz" ||
      entry.color.hex !== canonical.hex ||
      canonical.sortOrder <= previousOrdinal
    ) {
      throw new PatternEditorError(
        "UNRESOLVABLE_PALETTE_COLOR",
        "A generated color does not resolve uniquely through the approved Poparooz palette.",
      );
    }
    previousOrdinal = canonical.sortOrder;
    localToPaletteOrdinal[localIndex] = canonical.sortOrder;
  });

  const cells = new Uint16Array(source.matrix.colorIndices.length);
  source.matrix.colorIndices.forEach((localIndex, position) => {
    cells[position] =
      localIndex === PATTERN_DOCUMENT_EMPTY_CELL
        ? PATTERN_DOCUMENT_EMPTY_CELL
        : localToPaletteOrdinal[localIndex]!;
  });

  return makeDocument(source.matrix.width, source.matrix.height, cells);
}

export function copyPatternDocument(
  document: PatternDocument,
): PatternDocument {
  validatePatternDocument(document);
  return makeDocument(document.width, document.height, document.cells);
}

export function validatePatternDocument(document: PatternDocument): void {
  if (
    typeof document !== "object" ||
    document === null ||
    !Number.isSafeInteger(document.width) ||
    document.width <= 0 ||
    !Number.isSafeInteger(document.height) ||
    document.height <= 0 ||
    document.width > Math.floor(Number.MAX_SAFE_INTEGER / document.height) ||
    !(document.cells instanceof Uint16Array) ||
    document.cells.length !== document.width * document.height ||
    document.palette?.paletteId !== palette.paletteId ||
    document.palette.paletteVersion !== palette.paletteVersion ||
    document.boardProfile?.id !== boardProfile.id ||
    document.boardProfile.version !== boardProfile.version
  ) {
    invalidDocument();
  }
  for (const cell of document.cells) {
    if (cell !== PATTERN_DOCUMENT_EMPTY_CELL && cell >= palette.colors.length) {
      invalidDocument();
    }
  }
}

export function patternDocumentsEqual(
  left: PatternDocument,
  right: PatternDocument,
): boolean {
  if (
    left.width !== right.width ||
    left.height !== right.height ||
    left.palette.paletteId !== right.palette.paletteId ||
    left.palette.paletteVersion !== right.palette.paletteVersion ||
    left.boardProfile.id !== right.boardProfile.id ||
    left.boardProfile.version !== right.boardProfile.version ||
    left.cells.length !== right.cells.length
  ) {
    return false;
  }
  for (let index = 0; index < left.cells.length; index += 1) {
    if (left.cells[index] !== right.cells[index]) return false;
  }
  return true;
}

function makeDocument(
  width: number,
  height: number,
  cells: Uint16Array,
): PatternDocument {
  return Object.freeze({
    width,
    height,
    cells: new Uint16Array(cells),
    palette: Object.freeze({
      paletteId: palette.paletteId,
      paletteVersion: palette.paletteVersion,
    }),
    boardProfile: Object.freeze({
      id: boardProfile.id,
      version: boardProfile.version,
    }),
  });
}

function validateGeneratedResult(source: PublicPatternResult): void {
  const matrix = source?.matrix;
  if (
    typeof source !== "object" ||
    source === null ||
    typeof matrix !== "object" ||
    matrix === null ||
    !Number.isSafeInteger(matrix.width) ||
    matrix.width <= 0 ||
    !Number.isSafeInteger(matrix.height) ||
    matrix.height <= 0 ||
    matrix.width > Math.floor(Number.MAX_SAFE_INTEGER / matrix.height) ||
    !(matrix.colorIndices instanceof Uint16Array) ||
    matrix.colorIndices.length !== matrix.width * matrix.height ||
    matrix.transparentIndex !== PATTERN_DOCUMENT_EMPTY_CELL ||
    !Array.isArray(source.colors) ||
    source.colors.length < 1 ||
    source.colors.length >= PATTERN_DOCUMENT_EMPTY_CELL ||
    !Array.isArray(source.materials) ||
    source.materials.length !== source.colors.length
  ) {
    invalidGeneratedResult();
  }

  const observedCounts = new Uint32Array(source.colors.length);
  let transparentPositions = 0;
  for (const localIndex of matrix.colorIndices) {
    if (localIndex === PATTERN_DOCUMENT_EMPTY_CELL) {
      transparentPositions += 1;
    } else if (localIndex < source.colors.length) {
      observedCounts[localIndex] = observedCounts[localIndex]! + 1;
    } else {
      invalidGeneratedResult();
    }
  }

  let totalBeads = 0;
  const codes = new Set<string>();
  source.colors.forEach((entry, index) => {
    const material = source.materials[index];
    if (
      typeof entry !== "object" ||
      entry === null ||
      entry.index !== index ||
      typeof entry.color !== "object" ||
      entry.color === null ||
      typeof entry.color.code !== "string" ||
      codes.has(entry.color.code) ||
      !Number.isSafeInteger(entry.beadCount) ||
      entry.beadCount <= 0 ||
      entry.beadCount !== observedCounts[index] ||
      typeof material !== "object" ||
      material === null ||
      typeof material.color !== "object" ||
      material.color === null ||
      material.patternColorIndex !== index ||
      material.beadCount !== entry.beadCount ||
      material.color.brand !== entry.color.brand ||
      material.color.code !== entry.color.code ||
      material.color.hex !== entry.color.hex
    ) {
      invalidGeneratedResult();
    }
    codes.add(entry.color.code);
    totalBeads += entry.beadCount;
  });

  const totals = source.totals;
  const totalPositions = matrix.width * matrix.height;
  if (
    typeof totals !== "object" ||
    totals === null ||
    totals.width !== matrix.width ||
    totals.height !== matrix.height ||
    totals.totalPositions !== totalPositions ||
    totals.totalBeads !== totalBeads ||
    totals.transparentPositions !== transparentPositions ||
    totals.totalBeads + totals.transparentPositions !== totalPositions ||
    totals.colorCount !== source.colors.length
  ) {
    invalidGeneratedResult();
  }

  const canonicalLayout = buildPatternBoardLayout(
    matrix,
    totals as PatternTotals,
    boardProfile,
  );
  if (!boardLayoutsEqual(source.boardLayout, canonicalLayout)) {
    invalidGeneratedResult();
  }
}

function boardLayoutsEqual(
  actual: PublicPatternBoardLayout,
  expected: ReturnType<typeof buildPatternBoardLayout>,
): boolean {
  const scalarKeys = [
    "boardColumns",
    "boardRows",
    "boardCount",
    "boardWidthInBeads",
    "boardHeightInBeads",
    "totalPegCapacity",
    "usedBeadCount",
    "transparentPatternPositions",
    "outsidePatternPegCount",
    "unusedPegCount",
  ] as const;
  if (
    typeof actual !== "object" ||
    actual === null ||
    scalarKeys.some((key) => actual[key] !== expected[key]) ||
    !Array.isArray(actual.tiles) ||
    actual.tiles.length !== expected.tiles.length
  ) {
    return false;
  }
  return actual.tiles.every((tile, index) => {
    const expectedTile = expected.tiles[index]!;
    return (
      tile.index === expectedTile.index &&
      tile.row === expectedTile.row &&
      tile.column === expectedTile.column &&
      tile.originX === expectedTile.originX &&
      tile.originY === expectedTile.originY &&
      tile.coveredWidth === expectedTile.coveredWidth &&
      tile.coveredHeight === expectedTile.coveredHeight &&
      tile.beadCount === expectedTile.beadCount &&
      tile.transparentPatternPositions ===
        expectedTile.transparentPatternPositions &&
      tile.outsidePatternPegCount === expectedTile.outsidePatternPegCount
    );
  });
}

function invalidGeneratedResult(): never {
  throw new PatternEditorError(
    "INVALID_GENERATED_RESULT",
    "The generated result is not a valid editor source.",
  );
}

function invalidDocument(): never {
  throw new PatternEditorError(
    "INVALID_PATTERN_DOCUMENT",
    "The pattern document is invalid.",
  );
}
