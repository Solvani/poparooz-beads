import { parse } from "csv-parse/sync";

import type { PaletteImportIssue } from "./palette-import-errors.ts";
import {
  PALETTE_CSV_COLUMNS,
  PALETTE_CSV_COLUMN_SET,
  type PaletteCsvColumn,
} from "./palette-csv.schema.ts";

interface CsvRecordWithInfo {
  info: { lines: number };
  record: string[];
}

export interface ParsedPaletteCsvRow {
  row: number;
  values: Record<PaletteCsvColumn, string>;
}

export interface ParsedPaletteCsv {
  issues: PaletteImportIssue[];
  rows: ParsedPaletteCsvRow[];
}

export function parsePaletteCsv(csvText: string): ParsedPaletteCsv {
  let records: CsvRecordWithInfo[];

  try {
    records = parse(csvText, {
      bom: true,
      info: true,
      relax_column_count: true,
      skip_empty_lines: true,
    }) as unknown as CsvRecordWithInfo[];
  } catch (error) {
    const parseError = error as Error & { lines?: number };
    return {
      rows: [],
      issues: [
        {
          code: "CSV_PARSE_ERROR",
          row: parseError.lines,
          message: `CSV syntax could not be parsed: ${parseError.message}`,
        },
      ],
    };
  }

  if (records.length === 0) {
    return {
      rows: [],
      issues: [
        {
          code: "MISSING_HEADER",
          message: "CSV must contain the canonical palette header.",
        },
      ],
    };
  }

  const header = records[0]!.record;
  const issues = validateHeader(header);

  if (issues.length > 0) {
    return { rows: [], issues };
  }

  const rows: ParsedPaletteCsvRow[] = [];
  for (const parsed of records.slice(1)) {
    if (parsed.record.length !== header.length) {
      issues.push({
        code: "CSV_PARSE_ERROR",
        row: parsed.info.lines,
        message: `CSV row has ${parsed.record.length} fields; expected ${header.length}.`,
      });
      continue;
    }

    const values = Object.fromEntries(
      header.map((column, index) => [column, parsed.record[index]]),
    ) as Record<PaletteCsvColumn, string>;
    rows.push({ row: parsed.info.lines, values });
  }

  return { rows, issues };
}

function validateHeader(header: string[]): PaletteImportIssue[] {
  const issues: PaletteImportIssue[] = [];
  const seen = new Set<string>();

  for (const column of header) {
    if (seen.has(column)) {
      issues.push({
        code: "DUPLICATE_HEADER",
        column,
        message: `CSV header contains duplicate column "${column}".`,
      });
    }
    seen.add(column);

    if (!PALETTE_CSV_COLUMN_SET.has(column)) {
      issues.push({
        code: "UNKNOWN_HEADER",
        column,
        message: `CSV header contains unknown or incorrectly cased column "${column}".`,
      });
    }
  }

  for (const requiredColumn of PALETTE_CSV_COLUMNS) {
    if (!seen.has(requiredColumn)) {
      issues.push({
        code: "MISSING_HEADER",
        column: requiredColumn,
        message: `CSV header is missing required column "${requiredColumn}".`,
      });
    }
  }

  return issues;
}
