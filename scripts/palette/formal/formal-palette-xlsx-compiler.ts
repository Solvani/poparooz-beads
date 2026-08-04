import ExcelJS, { type Worksheet } from "exceljs";

import { POPAROOZ_COLOR_CODE_PATTERN } from "../../../src/domain/color/poparooz-color-code.ts";
import { compileFormalPaletteColors } from "./formal-palette-color-compiler.ts";
import {
  hashCanonicalFormalPaletteRecords,
  hashSourceFileBytes,
  serializeCanonicalFormalPaletteRecords,
} from "./formal-palette-canonical.ts";
import {
  createFormalColorDerivationAudit,
  FORMAL_COLOR_DERIVATION_ALGORITHM,
  FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION,
  hashFormalColorDerivationAuditBytes,
  serializeFormalColorDerivationAudit,
  type FormalColorDerivationAudit,
} from "./formal-palette-derivation-audit.ts";
import {
  FormalPaletteCompilationError,
  type FormalPaletteCompilationErrorCode,
} from "./formal-palette-errors.ts";
import { FORMAL_PALETTE_SERIES } from "./formal-palette.schema.ts";
import {
  hashCanonicalFormalSubstituteRecords,
  serializeCanonicalFormalSubstituteRecords,
  type FormalSubstituteLevel,
  type NormalizedFormalSubstituteDataset,
  type NormalizedFormalSubstituteRelation,
} from "./formal-palette-substitutes.ts";
import type {
  FormalPaletteManifest,
  NormalizedFormalPalette,
  NormalizedFormalPaletteColor,
} from "./formal-palette.types.ts";
import { validateNormalizedFormalPalette } from "./formal-palette.validation.ts";

export const FORMAL_PALETTE_SOURCE_SHA256 =
  "5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e";
export const FORMAL_PALETTE_SOURCE_FILE_NAME = "Poparooz色卡.xlsx";
export const FORMAL_PALETTE_APPROVED_AT = "2026-08-03T00:00:00.000Z";

export const FORMAL_PALETTE_SERIES_COUNTS = {
  A: 26,
  B: 32,
  C: 29,
  D: 26,
  E: 24,
  F: 25,
  G: 21,
  H: 23,
  M: 15,
} as const;

export const FORMAL_SUBSTITUTE_LEVEL_COUNTS = {
  high: 9,
  regular: 22,
  small_area_only: 36,
} as const;

const PALETTE_SHEET_NAME = "Sheet1";
const SUBSTITUTE_SHEET_NAME = "替代色参考";
const PALETTE_TITLE = "Poparooz色卡";
const PALETTE_NOTE = "替代色关系已整理在工作表「替代色参考」中。";
const SUBSTITUTE_TITLE = "Poparooz 221 色替代参考";
const SUBSTITUTE_NOTE =
  "替代关系为双向；依据色卡 HEX 值使用 CIEDE2000 色差计算。实物可能受透明度、批次、熨烫及光线影响。";

const SERIES_LAYOUT = [
  { series: "A", codeColumn: 1, hexColumn: 2, swatchColumn: 3 },
  { series: "B", codeColumn: 4, hexColumn: 5, swatchColumn: 6 },
  { series: "C", codeColumn: 7, hexColumn: 8, swatchColumn: 9 },
  { series: "D", codeColumn: 10, hexColumn: 11, swatchColumn: 12 },
  { series: "E", codeColumn: 13, hexColumn: 14, swatchColumn: 15 },
  { series: "F", codeColumn: 16, hexColumn: 17, swatchColumn: 18 },
  { series: "G", codeColumn: 19, hexColumn: 20, swatchColumn: 21 },
  { series: "H", codeColumn: 22, hexColumn: 23, swatchColumn: 24 },
  { series: "M", codeColumn: 25, hexColumn: 26, swatchColumn: 27 },
] as const;

const SUBSTITUTE_HEADERS = [
  "序号",
  "色号 1",
  "HEX 1",
  "色块 1",
  "色号 2",
  "HEX 2",
  "色块 2",
  "替代等级",
  "ΔE00",
  "使用建议",
] as const;

const SUBSTITUTE_LEVEL_MAP = new Map<string, FormalSubstituteLevel>([
  ["高替代", "high"],
  ["常规替代", "regular"],
  ["小面积替代", "small_area_only"],
]);

export const FORMAL_PALETTE_ARTIFACT_NAMES = [
  "manifest.json",
  "normalized-palette.json",
  "canonical-palette-records.txt",
  "color-derivation-audit.json",
  "palette-validation-report.json",
  "normalized-substitutes.json",
  "canonical-substitute-records.txt",
  "substitute-validation-report.json",
] as const;

export type FormalPaletteArtifactName =
  (typeof FORMAL_PALETTE_ARTIFACT_NAMES)[number];

export interface FormalPaletteValidationReport {
  readonly schemaVersion: "1.0.0";
  readonly paletteId: "poparooz-standard";
  readonly paletteVersion: "1.0.0";
  readonly sourceFileSha256: string;
  readonly canonicalRecordsSha256: string;
  readonly recordCount: number;
  readonly seriesCounts: typeof FORMAL_PALETTE_SERIES_COUNTS;
  readonly duplicateCodeCount: 0;
  readonly duplicateHexCount: 0;
  readonly missingHexCount: 0;
  readonly invalidHexCount: 0;
  readonly invalidCodeCount: 0;
  readonly nonContiguousSeriesCount: 0;
  readonly derivationFailureCount: 0;
  readonly derivationAuditRecordCount: 221;
  readonly derivationAuditSha256: string;
  readonly derivationAlgorithm: typeof FORMAL_COLOR_DERIVATION_ALGORITHM;
  readonly derivationDecimalPrecision: typeof FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION;
  readonly result: "passed";
  readonly issues: readonly [];
}

export interface FormalSubstituteValidationReport {
  readonly schemaVersion: "1.0.0";
  readonly substituteDatasetId: "poparooz-substitute-reference";
  readonly substituteDatasetVersion: "1.0.0";
  readonly sourceFileSha256: string;
  readonly canonicalRecordsSha256: string;
  readonly relationCount: number;
  readonly levelCounts: typeof FORMAL_SUBSTITUTE_LEVEL_COUNTS;
  readonly missingPaletteCodeCount: 0;
  readonly hexMismatchCount: 0;
  readonly selfRelationCount: 0;
  readonly duplicateRelationCount: 0;
  readonly invalidDeltaECount: 0;
  readonly invalidLevelCount: 0;
  readonly result: "passed";
  readonly issues: readonly [];
}

export interface FormalPaletteCompilation {
  readonly normalizedPalette: NormalizedFormalPalette;
  readonly normalizedSubstitutes: NormalizedFormalSubstituteDataset;
  readonly colorDerivationAudit: FormalColorDerivationAudit;
  readonly paletteValidationReport: FormalPaletteValidationReport;
  readonly substituteValidationReport: FormalSubstituteValidationReport;
  readonly artifacts: Readonly<Record<FormalPaletteArtifactName, string>>;
}

export async function compileFormalPaletteWorkbookBytes(
  sourceBytes: Uint8Array,
  expectedSourceSha256 = FORMAL_PALETTE_SOURCE_SHA256,
): Promise<FormalPaletteCompilation> {
  const sourceFileSha256 = hashSourceFileBytes(sourceBytes);
  assertCompilation(
    sourceFileSha256 === expectedSourceSha256,
    "SOURCE_HASH_MISMATCH",
    `Source SHA-256 ${sourceFileSha256} does not equal ${expectedSourceSha256}.`,
  );

  const workbook = new ExcelJS.Workbook();
  const workbookBytes = Buffer.from(sourceBytes) as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0];
  try {
    await workbook.xlsx.load(workbookBytes);
  } catch (error) {
    throw new FormalPaletteCompilationError(
      "WORKBOOK_PARSE_FAILED",
      "The formal Palette workbook could not be parsed.",
      { cause: error },
    );
  }
  const colors = withCompilationBoundary(
    "WORKBOOK_LAYOUT_INVALID",
    "The formal Palette workbook layout is invalid.",
    () => {
      assertWorkbookSheets(workbook);
      return parsePaletteSheet(requireWorksheet(workbook, PALETTE_SHEET_NAME));
    },
  );
  const canonicalRecordsSha256 = hashCanonicalFormalPaletteRecords(colors);
  const manifest = createManifest(sourceFileSha256, canonicalRecordsSha256);
  const candidatePalette = { manifest, colors };
  const validation = validateNormalizedFormalPalette(candidatePalette);
  if (!validation.success) {
    const issue = validation.issues[0];
    throw new FormalPaletteCompilationError(
      "PALETTE_VALIDATION_FAILED",
      "Formal Palette validation failed.",
      {
        cause: new FormalPaletteCompilationError(
          issue?.code ?? "INVALID_NORMALIZED_RECORD",
          issue?.message ?? "A normalized Palette record is invalid.",
        ),
      },
    );
  }
  withCompilationBoundary(
    "PALETTE_VALIDATION_FAILED",
    "Formal Palette validation failed.",
    () => assertSeriesContinuity(validation.data.colors),
  );

  const compiledColors = compileFormalPaletteColors(validation.data);
  assertCompilation(
    compiledColors.length === 221 &&
      compiledColors.every(
        ({ rgb, lab }) =>
          rgb.every(Number.isFinite) && lab.every(Number.isFinite),
      ),
    "COLOR_DERIVATION_FAILED",
    "HEX to RGB8 to Lab derivation did not produce 221 finite records.",
  );
  const colorDerivationAudit = createFormalColorDerivationAudit(
    validation.data,
    compiledColors,
  );
  const serializedDerivationAudit =
    serializeFormalColorDerivationAudit(colorDerivationAudit);
  const derivationAuditSha256 = hashFormalColorDerivationAuditBytes(
    serializedDerivationAudit,
  );

  const relations = withCompilationBoundary(
    "SUBSTITUTE_VALIDATION_FAILED",
    "Formal substitute reference validation failed.",
    () =>
      parseSubstituteSheet(
        requireWorksheet(workbook, SUBSTITUTE_SHEET_NAME),
        validation.data,
      ),
  );
  const substituteCanonicalRecordsSha256 =
    hashCanonicalFormalSubstituteRecords(relations);
  const normalizedSubstitutes = createSubstituteDataset(
    sourceFileSha256,
    substituteCanonicalRecordsSha256,
    relations,
  );

  const paletteValidationReport = createPaletteValidationReport(
    sourceFileSha256,
    canonicalRecordsSha256,
    derivationAuditSha256,
  );
  const substituteValidationReport = createSubstituteValidationReport(
    sourceFileSha256,
    substituteCanonicalRecordsSha256,
  );
  const canonicalPaletteRecords = serializeCanonicalFormalPaletteRecords(
    validation.data.colors,
  );
  const canonicalSubstituteRecords =
    serializeCanonicalFormalSubstituteRecords(relations);

  const artifacts = {
    "manifest.json": stableJson(validation.data.manifest),
    "normalized-palette.json": stableJson(validation.data),
    "canonical-palette-records.txt": canonicalPaletteRecords,
    "color-derivation-audit.json": serializedDerivationAudit,
    "palette-validation-report.json": stableJson(paletteValidationReport),
    "normalized-substitutes.json": stableJson(normalizedSubstitutes),
    "canonical-substitute-records.txt": canonicalSubstituteRecords,
    "substitute-validation-report.json": stableJson(substituteValidationReport),
  } satisfies Record<FormalPaletteArtifactName, string>;

  return {
    normalizedPalette: validation.data,
    normalizedSubstitutes,
    colorDerivationAudit,
    paletteValidationReport,
    substituteValidationReport,
    artifacts,
  };
}

function assertWorkbookSheets(workbook: ExcelJS.Workbook): void {
  const names = workbook.worksheets.map(({ name }) => name);
  const expected = [PALETTE_SHEET_NAME, SUBSTITUTE_SHEET_NAME];
  assertCompilation(
    names.length === expected.length &&
      names.every((name, index) => name === expected[index]),
    "INVALID_WORKSHEETS",
    `Workbook sheets must be exactly ${expected.join(", ")} in that order.`,
  );
}

function requireWorksheet(workbook: ExcelJS.Workbook, name: string): Worksheet {
  const worksheet = workbook.getWorksheet(name);
  assertCompilation(
    worksheet !== undefined,
    "MISSING_WORKSHEET",
    `Required worksheet ${name} is missing.`,
  );
  return worksheet;
}

function parsePaletteSheet(
  worksheet: Worksheet,
): readonly NormalizedFormalPaletteColor[] {
  assertCompilation(
    worksheet.rowCount === 35 && worksheet.columnCount === 27,
    "INVALID_PALETTE_LAYOUT",
    "Sheet1 used range must be exactly A1:AA35.",
  );

  assertMergedRow(worksheet, 1, 1, 27, PALETTE_TITLE);
  for (const layout of SERIES_LAYOUT) {
    assertMergedRow(
      worksheet,
      2,
      layout.codeColumn,
      layout.swatchColumn,
      layout.series,
    );
  }

  const colors: NormalizedFormalPaletteColor[] = [];
  for (let row = 3; row <= 34; row += 1) {
    for (const [seriesRank, layout] of SERIES_LAYOUT.entries()) {
      const expectedCount = FORMAL_PALETTE_SERIES_COUNTS[layout.series];
      const seriesOffset = row - 3;
      const codeText = worksheet.getCell(row, layout.codeColumn).text;
      const hexText = worksheet.getCell(row, layout.hexColumn).text;
      const swatchText = worksheet.getCell(row, layout.swatchColumn).text;
      assertCompilation(
        swatchText === "",
        "UNEXPECTED_PALETTE_CONTENT",
        `Color swatch cell ${worksheet.getCell(row, layout.swatchColumn).address} must not contain text.`,
      );

      if (seriesOffset >= expectedCount) {
        assertCompilation(
          codeText === "" && hexText === "",
          "UNEXPECTED_PALETTE_CONTENT",
          `Unexpected Palette content at row ${row}, series ${layout.series}.`,
        );
        continue;
      }

      assertCompilation(
        codeText !== "",
        "MISSING_CODE",
        `Missing code at ${worksheet.getCell(row, layout.codeColumn).address}.`,
      );
      assertCompilation(
        hexText !== "",
        "MISSING_HEX",
        `Missing HEX for ${codeText} at ${worksheet.getCell(row, layout.hexColumn).address}.`,
      );
      const codeMatch = POPAROOZ_COLOR_CODE_PATTERN.exec(codeText);
      assertCompilation(
        codeMatch !== null && codeMatch[1] === layout.series,
        "INVALID_CODE",
        `Invalid code ${codeText} at ${worksheet.getCell(row, layout.codeColumn).address}.`,
      );
      assertCompilation(
        /^#[0-9A-F]{6}$/.test(hexText),
        "INVALID_HEX",
        `Invalid HEX ${hexText} for ${codeText}.`,
      );

      colors.push({
        code: codeText,
        series: layout.series,
        seriesNumber: Number(codeText.slice(1)),
        seriesRank,
        canonicalSourceIndex: colors.length,
        hex: hexText,
        displayNameStatus: "not_provided",
        digitalColorStatus: "source_declared",
        physicalColorStatus: "unverified",
        sourceLocation: {
          sheet: PALETTE_SHEET_NAME,
          row,
          column: layout.codeColumn,
        },
      });
    }
  }

  assertMergedRow(worksheet, 35, 1, 26, PALETTE_NOTE);
  assertCompilation(
    worksheet.getCell(35, 27).text === "",
    "UNEXPECTED_PALETTE_CONTENT",
    "AA35 must be empty.",
  );
  assertCompilation(
    colors.length === 221,
    "RECORD_COUNT_MISMATCH",
    `Expected 221 colors, received ${colors.length}.`,
  );
  return colors;
}

function assertSeriesContinuity(
  colors: readonly NormalizedFormalPaletteColor[],
): void {
  for (const series of FORMAL_PALETTE_SERIES) {
    const numbers = colors
      .filter((color) => color.series === series)
      .map((color) => color.seriesNumber)
      .sort((left, right) => left - right);
    const expectedCount = FORMAL_PALETTE_SERIES_COUNTS[series];
    const isContinuous =
      numbers.length === expectedCount &&
      numbers.every((number, index) => number === index + 1);
    assertCompilation(
      isContinuous,
      "NON_CONTIGUOUS_SERIES",
      `Series ${series} must contain exactly ${series}1-${series}${expectedCount}.`,
    );
  }
}

function parseSubstituteSheet(
  worksheet: Worksheet,
  palette: NormalizedFormalPalette,
): readonly NormalizedFormalSubstituteRelation[] {
  assertCompilation(
    worksheet.rowCount === 72 && worksheet.columnCount === 10,
    "INVALID_SUBSTITUTE_LAYOUT",
    "Substitute worksheet used range must be exactly A1:J72.",
  );
  assertMergedRow(worksheet, 1, 1, 10, SUBSTITUTE_TITLE);
  assertMergedRow(worksheet, 2, 1, 10, SUBSTITUTE_NOTE);
  const summaryValues = ["高替代", "9", "常规替代", "22", "小面积替代", "36"];
  summaryValues.forEach((value, index) => {
    assertCellText(worksheet, 3, index + 1, value, "INVALID_LEVEL_SUMMARY");
  });
  for (let column = 7; column <= 10; column += 1) {
    assertCellText(worksheet, 3, column, "", "INVALID_LEVEL_SUMMARY");
  }
  for (let column = 1; column <= 10; column += 1) {
    assertCellText(worksheet, 4, column, "", "INVALID_SUBSTITUTE_LAYOUT");
    assertCellText(
      worksheet,
      5,
      column,
      SUBSTITUTE_HEADERS[column - 1]!,
      "INVALID_SUBSTITUTE_HEADER",
    );
  }

  const paletteByCode = new Map(
    palette.colors.map((color) => [color.code, color] as const),
  );
  const businessIndex = new Map(
    compileFormalPaletteColors(palette).map((color) => [
      color.code,
      color.sortOrder,
    ]),
  );
  const relations: NormalizedFormalSubstituteRelation[] = [];
  const relationIds = new Set<string>();

  for (let row = 6; row <= 72; row += 1) {
    const serial = worksheet.getCell(row, 1).value;
    assertCompilation(
      serial === row - 5,
      "INVALID_SUBSTITUTE_SERIAL",
      `Expected serial ${row - 5} at A${row}.`,
    );
    assertCellText(worksheet, row, 4, "", "INVALID_SUBSTITUTE_LAYOUT");
    assertCellText(worksheet, row, 7, "", "INVALID_SUBSTITUTE_LAYOUT");

    const worksheetCodeA = requireTextCell(worksheet, row, 2, "code A");
    const worksheetHexA = requireTextCell(worksheet, row, 3, "HEX A");
    const worksheetCodeB = requireTextCell(worksheet, row, 5, "code B");
    const worksheetHexB = requireTextCell(worksheet, row, 6, "HEX B");
    const levelText = requireTextCell(worksheet, row, 8, "level");
    const guidanceZh = requireTextCell(worksheet, row, 10, "guidance");
    const deltaE00 = worksheet.getCell(row, 9).value;
    assertCompilation(
      typeof deltaE00 === "number" &&
        Number.isFinite(deltaE00) &&
        deltaE00 >= 0,
      "INVALID_DELTA_E",
      `Invalid ΔE00 at I${row}.`,
    );
    const level = SUBSTITUTE_LEVEL_MAP.get(levelText);
    assertCompilation(
      level !== undefined,
      "INVALID_SUBSTITUTE_LEVEL",
      `Unsupported substitute level ${levelText} at H${row}.`,
    );
    assertCompilation(
      worksheetCodeA !== worksheetCodeB,
      "SELF_RELATION",
      `Self relation ${worksheetCodeA} at row ${row} is forbidden.`,
    );

    const paletteA = paletteByCode.get(worksheetCodeA);
    const paletteB = paletteByCode.get(worksheetCodeB);
    assertCompilation(
      paletteA !== undefined && paletteB !== undefined,
      "MISSING_PALETTE_CODE",
      `Substitute row ${row} references a code absent from the formal Palette.`,
    );
    assertCompilation(
      paletteA.hex === worksheetHexA && paletteB.hex === worksheetHexB,
      "SUBSTITUTE_HEX_MISMATCH",
      `Substitute row ${row} HEX values do not match the formal Palette.`,
    );

    const indexA = businessIndex.get(worksheetCodeA);
    const indexB = businessIndex.get(worksheetCodeB);
    assertCompilation(
      indexA !== undefined && indexB !== undefined,
      "MISSING_BUSINESS_ORDER",
      `Substitute row ${row} cannot resolve business order.`,
    );
    const shouldSwap = indexA > indexB;
    const codeA = shouldSwap ? worksheetCodeB : worksheetCodeA;
    const hexA = shouldSwap ? worksheetHexB : worksheetHexA;
    const codeB = shouldSwap ? worksheetCodeA : worksheetCodeB;
    const hexB = shouldSwap ? worksheetHexA : worksheetHexB;
    const relationId = `${codeA}--${codeB}`;
    assertCompilation(
      !relationIds.has(relationId),
      "DUPLICATE_RELATION",
      `Duplicate or reverse duplicate relation ${relationId}.`,
    );
    relationIds.add(relationId);
    relations.push({
      relationId,
      codeA,
      hexA,
      codeB,
      hexB,
      deltaE00,
      level,
      guidanceZh,
      bidirectional: true,
      sourceLocation: { sheet: SUBSTITUTE_SHEET_NAME, row },
    });
  }

  relations.sort(
    (left, right) =>
      requireMapValue(businessIndex, left.codeA) -
        requireMapValue(businessIndex, right.codeA) ||
      requireMapValue(businessIndex, left.codeB) -
        requireMapValue(businessIndex, right.codeB),
  );
  assertCompilation(
    relations.length === 67,
    "RELATION_COUNT_MISMATCH",
    `Expected 67 substitute relations, received ${relations.length}.`,
  );
  for (const [level, expectedCount] of Object.entries(
    FORMAL_SUBSTITUTE_LEVEL_COUNTS,
  )) {
    const actualCount = relations.filter(
      (relation) => relation.level === level,
    ).length;
    assertCompilation(
      actualCount === expectedCount,
      "SUBSTITUTE_LEVEL_COUNT_MISMATCH",
      `${level} must contain ${expectedCount} relations, received ${actualCount}.`,
    );
  }
  return relations;
}

function createManifest(
  sourceFileSha256: string,
  canonicalRecordsSha256: string,
): FormalPaletteManifest {
  return {
    schemaVersion: "1.0.0",
    paletteId: "poparooz-standard",
    paletteVersion: "1.0.0",
    brand: "Poparooz",
    referenceSystem: "POPAROOZ",
    recordCount: 221,
    seriesOrder: [...FORMAL_PALETTE_SERIES],
    sourceFileName: FORMAL_PALETTE_SOURCE_FILE_NAME,
    sourceFileSha256,
    canonicalRecordsSha256,
    digitalColorPolicy: "source_declared",
    physicalColorPolicy: "unverified",
    displayNamePolicy: "optional_approved_only",
    status: "approved",
    createdAt: FORMAL_PALETTE_APPROVED_AT,
    approvedAt: FORMAL_PALETTE_APPROVED_AT,
    approvedBy: "poparooz-project-owner",
  };
}

function createSubstituteDataset(
  sourceFileSha256: string,
  canonicalRecordsSha256: string,
  relations: readonly NormalizedFormalSubstituteRelation[],
): NormalizedFormalSubstituteDataset {
  return {
    schemaVersion: "1.0.0",
    substituteDatasetId: "poparooz-substitute-reference",
    substituteDatasetVersion: "1.0.0",
    relationCount: 67,
    status: "reference_only",
    physicalValidationStatus: "unverified",
    applicationPolicy: "disabled",
    directionPolicy: "worksheet_declared_bidirectional",
    sourceFileName: FORMAL_PALETTE_SOURCE_FILE_NAME,
    sourceFileSha256,
    canonicalRecordsSha256,
    relations,
  };
}

function createPaletteValidationReport(
  sourceFileSha256: string,
  canonicalRecordsSha256: string,
  derivationAuditSha256: string,
): FormalPaletteValidationReport {
  return {
    schemaVersion: "1.0.0",
    paletteId: "poparooz-standard",
    paletteVersion: "1.0.0",
    sourceFileSha256,
    canonicalRecordsSha256,
    recordCount: 221,
    seriesCounts: FORMAL_PALETTE_SERIES_COUNTS,
    duplicateCodeCount: 0,
    duplicateHexCount: 0,
    missingHexCount: 0,
    invalidHexCount: 0,
    invalidCodeCount: 0,
    nonContiguousSeriesCount: 0,
    derivationFailureCount: 0,
    derivationAuditRecordCount: 221,
    derivationAuditSha256,
    derivationAlgorithm: FORMAL_COLOR_DERIVATION_ALGORITHM,
    derivationDecimalPrecision: FORMAL_COLOR_DERIVATION_DECIMAL_PRECISION,
    result: "passed",
    issues: [],
  };
}

function createSubstituteValidationReport(
  sourceFileSha256: string,
  canonicalRecordsSha256: string,
): FormalSubstituteValidationReport {
  return {
    schemaVersion: "1.0.0",
    substituteDatasetId: "poparooz-substitute-reference",
    substituteDatasetVersion: "1.0.0",
    sourceFileSha256,
    canonicalRecordsSha256,
    relationCount: 67,
    levelCounts: FORMAL_SUBSTITUTE_LEVEL_COUNTS,
    missingPaletteCodeCount: 0,
    hexMismatchCount: 0,
    selfRelationCount: 0,
    duplicateRelationCount: 0,
    invalidDeltaECount: 0,
    invalidLevelCount: 0,
    result: "passed",
    issues: [],
  };
}

function assertMergedRow(
  worksheet: Worksheet,
  row: number,
  startColumn: number,
  endColumn: number,
  expectedText: string,
): void {
  const master = worksheet.getCell(row, startColumn);
  assertCompilation(
    master.text === expectedText,
    "INVALID_FIXED_LAYOUT",
    `Expected ${expectedText} at ${master.address}.`,
  );
  for (let column = startColumn; column <= endColumn; column += 1) {
    const cell = worksheet.getCell(row, column);
    assertCompilation(
      cell.master.address === master.address,
      "INVALID_FIXED_LAYOUT",
      `${cell.address} must be merged into ${master.address}.`,
    );
  }
}

function assertCellText(
  worksheet: Worksheet,
  row: number,
  column: number,
  expected: string,
  code: FormalPaletteCompilationErrorCode,
): void {
  const cell = worksheet.getCell(row, column);
  assertCompilation(
    cell.text === expected,
    code,
    `Expected ${JSON.stringify(expected)} at ${cell.address}, received ${JSON.stringify(cell.text)}.`,
  );
}

function requireTextCell(
  worksheet: Worksheet,
  row: number,
  column: number,
  label: string,
): string {
  const cell = worksheet.getCell(row, column);
  const text = cell.text;
  assertCompilation(
    text.trim().length > 0 && text === text.trim(),
    "INVALID_SUBSTITUTE_FIELD",
    `Substitute ${label} at ${cell.address} must be non-empty trimmed text.`,
  );
  return text;
}

function requireMapValue(
  map: ReadonlyMap<string, number>,
  key: string,
): number {
  const value = map.get(key);
  if (value === undefined) {
    throw new FormalPaletteCompilationError(
      "MISSING_BUSINESS_ORDER",
      `Missing business order for ${key}.`,
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2).replace(
    /"seriesOrder": \[\n(?:\s+"[A-Z]",?\n){9}\s+\]/,
    `"seriesOrder": [${FORMAL_PALETTE_SERIES.map((series) => JSON.stringify(series)).join(", ")}]`,
  );
  return `${serialized}\n`;
}

function assertCompilation(
  condition: boolean,
  code: FormalPaletteCompilationErrorCode,
  message: string,
): asserts condition {
  if (!condition) throw new FormalPaletteCompilationError(code, message);
}

function withCompilationBoundary<T>(
  code:
    | "WORKBOOK_LAYOUT_INVALID"
    | "PALETTE_VALIDATION_FAILED"
    | "SUBSTITUTE_VALIDATION_FAILED",
  message: string,
  action: () => T,
): T {
  try {
    return action();
  } catch (error) {
    if (error instanceof FormalPaletteCompilationError && error.code === code) {
      throw error;
    }
    throw new FormalPaletteCompilationError(code, message, { cause: error });
  }
}
