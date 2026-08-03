import type { z } from "zod";

import {
  FORMAL_PALETTE_ISSUE_CODES,
  type FormalPaletteIssue,
  type FormalPaletteIssueCode,
  type FormalPaletteValidationResult,
} from "./formal-palette-errors.ts";
import { NormalizedFormalPaletteSchema } from "./formal-palette.schema.ts";
import type { NormalizedFormalPalette } from "./formal-palette.types.ts";

const issueCodeSet = new Set<string>(FORMAL_PALETTE_ISSUE_CODES);
const taggedIssuePattern = /^\[([A-Z_]+)\]\s*/;

export function validateNormalizedFormalPalette(
  input: unknown,
): FormalPaletteValidationResult<NormalizedFormalPalette> {
  const result = NormalizedFormalPaletteSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const issues = result.error.issues.map((issue) =>
    normalizeIssue(issue, input),
  );
  issues.sort(compareIssues);
  return { success: false, issues };
}

function normalizeIssue(
  issue: z.core.$ZodIssue,
  input: unknown,
): FormalPaletteIssue {
  const taggedCode = issue.message.match(taggedIssuePattern)?.[1];
  const code =
    taggedCode !== undefined && issueCodeSet.has(taggedCode)
      ? (taggedCode as FormalPaletteIssueCode)
      : fallbackIssueCode(issue.path);
  const recordIndex =
    issue.path[0] === "colors" && typeof issue.path[1] === "number"
      ? issue.path[1]
      : undefined;
  const colorCode = readColorCode(input, recordIndex);

  return {
    code,
    message: issue.message.replace(taggedIssuePattern, ""),
    path: issue.path.map((part) =>
      typeof part === "symbol" ? (part.description ?? "symbol") : part,
    ),
    ...(recordIndex === undefined ? {} : { recordIndex }),
    ...(colorCode === undefined ? {} : { colorCode }),
  };
}

function fallbackIssueCode(
  path: readonly PropertyKey[],
): FormalPaletteIssueCode {
  if (path[0] === "manifest") {
    if (
      path[1] === "sourceFileSha256" ||
      path[1] === "canonicalRecordsSha256"
    ) {
      return "INVALID_SOURCE_HASH";
    }
    if (path[1] === "seriesOrder") return "UNKNOWN_SERIES";
    return "INVALID_MANIFEST";
  }
  if (path.at(-1) === "hex") return "INVALID_HEX";
  if (path.at(-1) === "series") return "UNKNOWN_SERIES";
  if (path.at(-1) === "displayNameStatus" || path.at(-1) === "displayName") {
    return "INVALID_DISPLAY_NAME_STATE";
  }
  if (path.at(-1) === "digitalColorStatus") {
    return "INVALID_DIGITAL_COLOR_STATUS";
  }
  if (path.at(-1) === "physicalColorStatus") {
    return "INVALID_PHYSICAL_COLOR_STATUS";
  }
  return "INVALID_NORMALIZED_RECORD";
}

function readColorCode(
  input: unknown,
  index: number | undefined,
): string | undefined {
  if (
    index === undefined ||
    typeof input !== "object" ||
    input === null ||
    !("colors" in input) ||
    !Array.isArray(input.colors)
  ) {
    return undefined;
  }
  const record: unknown = input.colors[index];
  if (
    typeof record !== "object" ||
    record === null ||
    !("code" in record) ||
    typeof record.code !== "string"
  ) {
    return undefined;
  }
  return record.code;
}

function compareIssues(
  left: FormalPaletteIssue,
  right: FormalPaletteIssue,
): number {
  const leftPath = left.path.map(String).join(".");
  const rightPath = right.path.map(String).join(".");
  return (
    compareText(leftPath, rightPath) ||
    compareText(left.code, right.code) ||
    compareText(left.message, right.message)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
