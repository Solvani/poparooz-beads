import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { sha256Digest, utf8ByteCompare } from "./canonical-json";
import { fail } from "./pattern-costing-error";
import type {
  PatternCostingRuntimeAuthority,
  PerColorBeadCount,
  Sha256Digest,
} from "./pattern-costing.types";

const DOMAIN = new TextEncoder().encode("POPAROOZ-PATTERN-CANONICAL-V1");
const encoder = new TextEncoder();

export interface PatternIntegrityResult {
  readonly patternHash: Sha256Digest;
  readonly totalBeads: number;
  readonly perColorBeadCounts: readonly PerColorBeadCount[];
  readonly canonicalBytes: Uint8Array;
}

export async function validateAndCanonicalizePattern(
  result: PublicPatternResult,
  runtime: PatternCostingRuntimeAuthority,
): Promise<PatternIntegrityResult> {
  const { width, height, colorIndices, transparentIndex } = result.matrix;
  if (
    !isAllowedDimension(width) ||
    height !== width ||
    colorIndices.length !== width * height ||
    result.totals.width !== width ||
    result.totals.height !== height ||
    result.totals.totalPositions !== width * height
  )
    fail("QUARANTINE_COUNT_SEMANTICS_INVALID");
  const colors = new Map<number, string>();
  for (const row of result.colors) {
    if (
      colors.has(row.index) ||
      !/^[A-Z][1-9][0-9]*$/.test(row.color.code) ||
      !runtime.generationColorSetMemberCodes.includes(row.color.code)
    )
      fail("QUARANTINE_COUNT_SEMANTICS_INVALID");
    colors.set(row.index, row.color.code);
  }
  const encodedCells: Uint8Array[] = [];
  const counts = new Map<string, number>();
  let totalBeads = 0;
  for (const cell of colorIndices) {
    if (cell === transparentIndex) {
      encodedCells.push(Uint8Array.of(0));
      continue;
    }
    const colorId = colors.get(cell);
    if (colorId === undefined) fail("QUARANTINE_COUNT_SEMANTICS_INVALID");
    const bytes = encoder.encode(colorId);
    if (bytes.length > 0xffff) fail("QUARANTINE_COUNT_SEMANTICS_INVALID");
    encodedCells.push(
      Uint8Array.of(1, (bytes.length >>> 8) & 0xff, bytes.length & 0xff),
      bytes,
    );
    counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
    totalBeads += 1;
  }
  if (
    totalBeads < 1 ||
    totalBeads > width * height ||
    result.totals.totalBeads !== totalBeads ||
    result.totals.transparentPositions !== width * height - totalBeads ||
    result.totals.colorCount !== counts.size
  )
    fail("QUARANTINE_COUNT_SEMANTICS_INVALID");
  validateBoardIntegrity(result, totalBeads);
  validateColorsAndMaterials(result, counts);
  const perColorBeadCounts = Object.freeze(
    [...counts]
      .sort(([left], [right]) => utf8ByteCompare(left, right))
      .map(([colorId, beadCount]) => Object.freeze({ colorId, beadCount })),
  );
  const dimensions = new Uint8Array(8);
  const view = new DataView(dimensions.buffer);
  view.setUint32(0, width, false);
  view.setUint32(4, height, false);
  const canonicalBytes = concatenate([
    DOMAIN,
    Uint8Array.of(0),
    dimensions,
    ...encodedCells,
  ]);
  return Object.freeze({
    patternHash: await sha256Digest(canonicalBytes),
    totalBeads,
    perColorBeadCounts,
    canonicalBytes,
  });
}

function validateBoardIntegrity(
  result: PublicPatternResult,
  totalBeads: number,
): void {
  const board = result.boardLayout;
  const boardColumns = Math.ceil(result.matrix.width / 104);
  const boardRows = Math.ceil(result.matrix.height / 104);
  const boardCount = boardColumns * boardRows;
  const capacity = boardCount * 104 * 104;
  if (
    board.boardWidthInBeads !== 104 ||
    board.boardHeightInBeads !== 104 ||
    board.boardColumns !== boardColumns ||
    board.boardRows !== boardRows ||
    board.boardCount !== boardCount ||
    board.totalPegCapacity !== capacity ||
    board.usedBeadCount !== totalBeads ||
    board.transparentPatternPositions !==
      result.matrix.width * result.matrix.height - totalBeads ||
    board.outsidePatternPegCount !==
      capacity - result.matrix.width * result.matrix.height ||
    board.unusedPegCount !== capacity - totalBeads
  )
    fail("QUARANTINE_RUNTIME_AUTHORITY_MISMATCH");
}

function validateColorsAndMaterials(
  result: PublicPatternResult,
  counts: ReadonlyMap<string, number>,
): void {
  if (
    result.colors.length !== counts.size ||
    result.materials.length !== counts.size
  )
    fail("QUARANTINE_COUNT_SEMANTICS_INVALID");
  const materialCodes = new Set<string>();
  for (const color of result.colors) {
    if (counts.get(color.color.code) !== color.beadCount)
      fail("QUARANTINE_COUNT_SEMANTICS_INVALID");
  }
  for (const material of result.materials) {
    const color = result.colors.find(
      (candidate) => candidate.index === material.patternColorIndex,
    );
    if (
      color === undefined ||
      material.color.code !== color.color.code ||
      material.beadCount !== counts.get(color.color.code) ||
      materialCodes.has(color.color.code)
    )
      fail("QUARANTINE_COUNT_SEMANTICS_INVALID");
    materialCodes.add(color.color.code);
  }
}

function concatenate(chunks: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function isAllowedDimension(value: number): value is 40 | 60 | 80 | 104 {
  return value === 40 || value === 60 || value === 80 || value === 104;
}
