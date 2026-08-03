import type { z } from "zod";

import {
  PaletteColorSchema,
  PaletteDefinitionSchema,
} from "../../src/domain/palette/palette.schema.ts";
import type {
  PaletteColor,
  PaletteDefinition,
} from "../../src/domain/palette/palette.types.ts";
import {
  PALETTE_DOMAIN_TO_CSV_COLUMN,
  PaletteImportMetadataSchema,
  type PaletteCsvColumn,
} from "./palette-csv.schema.ts";
import {
  parsePaletteCsv,
  type ParsedPaletteCsvRow,
} from "./palette-csv.parser.ts";
import type { PaletteImportIssue } from "./palette-import-errors.ts";

export type PaletteImportResult =
  | { success: true; palette: PaletteDefinition; issues: [] }
  | { success: false; issues: PaletteImportIssue[] };

export function importPaletteFromText(
  csvText: string,
  metadataInput: unknown,
): PaletteImportResult {
  const parsedCsv = parsePaletteCsv(csvText);
  const issues = [...parsedCsv.issues];
  const metadataResult = PaletteImportMetadataSchema.safeParse(metadataInput);

  if (!metadataResult.success) {
    for (const issue of metadataResult.error.issues) {
      issues.push({
        code: "METADATA_VALIDATION_ERROR",
        column: issue.path.map(String).join(".") || undefined,
        message: issue.message,
      });
    }
  }

  const colors: PaletteColor[] = [];
  const colorRows: number[] = [];
  for (const row of parsedCsv.rows) {
    const result = convertPaletteRow(row);
    issues.push(...result.issues);
    if (result.color !== undefined) {
      colors.push(result.color);
      colorRows.push(row.row);
    }
  }

  if (!metadataResult.success || colors.length !== parsedCsv.rows.length) {
    return { success: false, issues };
  }

  const definitionResult = PaletteDefinitionSchema.safeParse({
    ...metadataResult.data,
    colorCount: colors.length,
    colors,
  });

  if (!definitionResult.success) {
    issues.push(
      ...mapDefinitionIssues(definitionResult.error.issues, colors, colorRows),
    );
  }

  if (issues.length > 0 || !definitionResult.success) {
    return { success: false, issues };
  }

  return { success: true, palette: definitionResult.data, issues: [] };
}

function convertPaletteRow(row: ParsedPaletteCsvRow): {
  color?: PaletteColor;
  issues: PaletteImportIssue[];
} {
  const issues: PaletteImportIssue[] = [];
  const values = row.values;

  const candidate = {
    referenceSystem: requiredString(
      values.reference_system,
      row,
      "reference_system",
      issues,
    ),
    referenceCode: requiredString(
      values.reference_code,
      row,
      "reference_code",
      issues,
    ),
    referenceName: optionalString(values.reference_name),
    referenceSeries: optionalString(values.reference_series),
    displayCode: requiredString(
      values.display_code,
      row,
      "display_code",
      issues,
    ),
    displayName: optionalString(values.display_name),
    hex: requiredString(values.hex, row, "hex", issues),
    rgb: [
      requiredInteger(values.rgb_r, row, "rgb_r", issues),
      requiredInteger(values.rgb_g, row, "rgb_g", issues),
      requiredInteger(values.rgb_b, row, "rgb_b", issues),
    ],
    lab: [
      requiredDecimal(values.lab_l, row, "lab_l", issues),
      requiredDecimal(values.lab_a, row, "lab_a", issues),
      requiredDecimal(values.lab_b, row, "lab_b", issues),
    ],
    isActive: requiredBoolean(values.is_active, row, "is_active", issues),
    isSellable: requiredBoolean(values.is_sellable, row, "is_sellable", issues),
    isSpecialFinish: requiredBoolean(
      values.is_special_finish,
      row,
      "is_special_finish",
      issues,
    ),
    finishType: optionalString(values.finish_type),
    isAutoMatchEnabled: requiredBoolean(
      values.is_auto_match_enabled,
      row,
      "is_auto_match_enabled",
      issues,
    ),
    productHandle: optionalString(values.product_handle),
    variantId: optionalString(values.variant_id),
    packSize: optionalInteger(values.pack_size, row, "pack_size", issues),
    sortOrder: requiredInteger(values.sort_order, row, "sort_order", issues),
    sourceVersion: requiredString(
      values.source_version,
      row,
      "source_version",
      issues,
    ),
    verifiedAt: optionalString(values.verified_at),
  };

  const parsed = PaletteColorSchema.safeParse(candidate);
  if (!parsed.success) {
    const conversionColumns = new Set(issues.map((issue) => issue.column));
    for (const issue of parsed.error.issues) {
      const column = colorIssueColumn(issue.path);
      if (column !== undefined && conversionColumns.has(column)) {
        continue;
      }
      issues.push({
        code: "DOMAIN_VALIDATION_ERROR",
        row: row.row,
        column,
        message: issue.message,
      });
    }
  }

  return parsed.success ? { color: parsed.data, issues } : { issues };
}

function requiredString(
  value: string,
  row: ParsedPaletteCsvRow,
  column: PaletteCsvColumn,
  issues: PaletteImportIssue[],
): string | undefined {
  const normalized = value.trim();
  if (normalized === "") {
    issues.push({
      code: "EMPTY_REQUIRED_FIELD",
      row: row.row,
      column,
      message: `Required field "${column}" must not be empty.`,
    });
    return undefined;
  }
  return normalized;
}

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}

function requiredBoolean(
  value: string,
  row: ParsedPaletteCsvRow,
  column: PaletteCsvColumn,
  issues: PaletteImportIssue[],
): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  issues.push({
    code: "INVALID_BOOLEAN",
    row: row.row,
    column,
    message: `Field "${column}" accepts only true or false (case-insensitive).`,
  });
  return undefined;
}

const integerPattern = /^[+-]?\d+$/;
const decimalPattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

function requiredInteger(
  value: string,
  row: ParsedPaletteCsvRow,
  column: PaletteCsvColumn,
  issues: PaletteImportIssue[],
): number | undefined {
  return parseInteger(value, row, column, issues, false);
}

function optionalInteger(
  value: string,
  row: ParsedPaletteCsvRow,
  column: PaletteCsvColumn,
  issues: PaletteImportIssue[],
): number | undefined {
  return parseInteger(value, row, column, issues, true);
}

function parseInteger(
  value: string,
  row: ParsedPaletteCsvRow,
  column: PaletteCsvColumn,
  issues: PaletteImportIssue[],
  optional: boolean,
): number | undefined {
  const normalized = value.trim();
  if (optional && normalized === "") return undefined;
  if (!integerPattern.test(normalized)) {
    issues.push(invalidNumberIssue(row.row, column, "a base-10 integer"));
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    issues.push(invalidNumberIssue(row.row, column, "a safe base-10 integer"));
    return undefined;
  }
  return parsed;
}

function requiredDecimal(
  value: string,
  row: ParsedPaletteCsvRow,
  column: PaletteCsvColumn,
  issues: PaletteImportIssue[],
): number | undefined {
  const normalized = value.trim();
  if (!decimalPattern.test(normalized)) {
    issues.push(invalidNumberIssue(row.row, column, "a finite decimal number"));
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    issues.push(invalidNumberIssue(row.row, column, "a finite decimal number"));
    return undefined;
  }
  return parsed;
}

function invalidNumberIssue(
  row: number,
  column: PaletteCsvColumn,
  expected: string,
): PaletteImportIssue {
  return {
    code: "INVALID_NUMBER",
    row,
    column,
    message: `Field "${column}" must be ${expected}; empty values, scientific notation, NaN, and Infinity are not accepted.`,
  };
}

function colorIssueColumn(path: PropertyKey[]): PaletteCsvColumn | undefined {
  const field = path[0];
  if (field === "rgb" && typeof path[1] === "number") {
    return (["rgb_r", "rgb_g", "rgb_b"] as const)[path[1]];
  }
  if (field === "lab" && typeof path[1] === "number") {
    return (["lab_l", "lab_a", "lab_b"] as const)[path[1]];
  }
  if (typeof field !== "string") return undefined;
  return PALETTE_DOMAIN_TO_CSV_COLUMN[
    field as keyof typeof PALETTE_DOMAIN_TO_CSV_COLUMN
  ];
}

function mapDefinitionIssues(
  domainIssues: z.core.$ZodIssue[],
  colors: PaletteColor[],
  colorRows: number[],
): PaletteImportIssue[] {
  const firstReferenceRows = firstRowsByCode(
    colors,
    colorRows,
    "referenceCode",
  );
  const firstDisplayRows = firstRowsByCode(colors, colorRows, "displayCode");

  return domainIssues.map((issue) => {
    if (issue.path[0] === "colors" && typeof issue.path[1] === "number") {
      const colorIndex = issue.path[1];
      const field = issue.path[2];
      const column = colorIssueColumn(field === undefined ? [] : [field]);
      const color = colors[colorIndex]!;

      if (field === "referenceCode") {
        const code = color.referenceCode;
        return {
          code: "DUPLICATE_REFERENCE_CODE",
          row: colorRows[colorIndex],
          column,
          message: `Normalized reference code conflicts with CSV row ${firstReferenceRows.get(code)}.`,
        };
      }
      if (field === "displayCode") {
        const code = color.displayCode;
        return {
          code: "DUPLICATE_DISPLAY_CODE",
          row: colorRows[colorIndex],
          column,
          message: `Normalized display code conflicts with CSV row ${firstDisplayRows.get(code)}.`,
        };
      }

      return {
        code: "DOMAIN_VALIDATION_ERROR",
        row: colorRows[colorIndex],
        column,
        message: issue.message,
      };
    }

    return {
      code: "METADATA_VALIDATION_ERROR",
      column: issue.path.map(String).join(".") || undefined,
      message: issue.message,
    };
  });
}

function firstRowsByCode(
  colors: PaletteColor[],
  colorRows: number[],
  field: "referenceCode" | "displayCode",
): Map<string, number> {
  const rows = new Map<string, number>();
  colors.forEach((color, index) => {
    if (!rows.has(color[field])) rows.set(color[field], colorRows[index]!);
  });
  return rows;
}
