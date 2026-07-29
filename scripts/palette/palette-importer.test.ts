import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";

import { importPaletteFromText } from "./palette-importer.ts";

const fixturesDirectory = resolve(process.cwd(), "data-source", "fixtures");
const readFixture = (name: string) =>
  readFileSync(`${fixturesDirectory}/${name}`, "utf8");

const validCsv = readFixture("valid-test-palette.csv");
const validMetadata = JSON.parse(
  readFixture("test-palette-metadata.json"),
) as Record<string, unknown>;

describe("palette CSV parsing", () => {
  it("imports the valid UTF-8 synthetic palette", () => {
    const result = importPaletteFromText(validCsv, validMetadata);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.palette.colorCount).toBe(3);
    expect(result.palette.colors[0]!.referenceCode).toBe("TEST-REF-001");
    expect(result.palette.colors[0]!.displayCode).toBe("POP-TEST-001");
  });

  it("accepts UTF-8 BOM", () => {
    expect(
      importPaletteFromText(`\uFEFF${validCsv}`, validMetadata).success,
    ).toBe(true);
  });

  it("accepts CRLF", () => {
    expect(
      importPaletteFromText(validCsv.replace(/\n/g, "\r\n"), validMetadata)
        .success,
    ).toBe(true);
  });

  it("parses commas inside standard CSV quotes", () => {
    const result = importPaletteFromText(validCsv, validMetadata);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.palette.colors[0]!.referenceName).toBe("Internal, Scarlet");
    }
  });

  it("skips completely empty lines", () => {
    const lines = validCsv.split("\n");
    lines.splice(2, 0, "");
    expect(importPaletteFromText(lines.join("\n"), validMetadata).success).toBe(
      true,
    );
  });

  it("treats whitespace-only lines as invalid data rows", () => {
    const lines = validCsv.split("\n");
    lines.splice(2, 0, "   ");
    const result = importPaletteFromText(lines.join("\n"), validMetadata);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "CSV_PARSE_ERROR", row: 3 }),
      );
    }
  });

  it("allows the canonical headers in another order", () => {
    const records = parse(validCsv, { bom: true }) as string[][];
    const reordered = records.map((record) => [
      record.at(-1)!,
      ...record.slice(0, -1),
    ]);

    expect(importPaletteFromText(toCsv(reordered), validMetadata).success).toBe(
      true,
    );
  });

  it("rejects a missing header", () => {
    const result = importPaletteFromText(
      validCsv.replace("reference_name,", ""),
      validMetadata,
    );
    expectIssue(result, "MISSING_HEADER", "reference_name");
  });

  it("rejects an unknown header", () => {
    const result = importPaletteFromText(
      validCsv.replace("reference_name", "unexpected_name"),
      validMetadata,
    );
    expectIssue(result, "UNKNOWN_HEADER", "unexpected_name");
  });

  it("rejects a duplicate header", () => {
    const [header, ...rows] = validCsv.trimEnd().split("\n");
    const csv = [
      `${header},reference_code`,
      ...rows.map((row) => `${row},copy`),
    ].join("\n");
    expectIssue(importPaletteFromText(csv, validMetadata), "DUPLICATE_HEADER");
  });

  it("treats header names as case-sensitive", () => {
    const result = importPaletteFromText(
      validCsv.replace("reference_code", "Reference_Code"),
      validMetadata,
    );
    expectIssue(result, "UNKNOWN_HEADER", "Reference_Code");
    expectIssue(result, "MISSING_HEADER", "reference_code");
  });

  it("reports malformed CSV syntax without echoing the document", () => {
    const result = importPaletteFromText(
      `${validCsv}\n"unterminated`,
      validMetadata,
    );
    expectIssue(result, "CSV_PARSE_ERROR");
    expect(JSON.stringify(result)).not.toContain("Internal, Scarlet");
  });
});

describe("palette field conversion and domain integration", () => {
  it("trims required strings and converts empty optional fields to undefined", () => {
    const csv = validCsv.replace("MARD,TEST-REF-001", " MARD , TEST-REF-001 ");
    const result = importPaletteFromText(csv, validMetadata);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.palette.colors[0]).toMatchObject({
        referenceSystem: "MARD",
        referenceCode: "TEST-REF-001",
        productHandle: undefined,
        variantId: undefined,
        packSize: undefined,
        verifiedAt: undefined,
      });
    }
  });

  it("accepts true and false without case sensitivity", () => {
    const csv = validCsv.replace(
      "true,true,false,,true",
      "TRUE,True,FALSE,,tRuE",
    );
    expect(importPaletteFromText(csv, validMetadata).success).toBe(true);
  });

  it("rejects ambiguous boolean spellings", () => {
    expectIssue(
      importPaletteFromText(
        validCsv.replace(",true,true,false,", ",yes,true,false,"),
        validMetadata,
      ),
      "INVALID_BOOLEAN",
      "is_active",
    );
  });

  it("rejects fractional integers", () => {
    expectIssue(
      importPaletteFromText(
        validCsv.replace(",255,0,0,", ",255.5,0,0,"),
        validMetadata,
      ),
      "INVALID_NUMBER",
      "rgb_r",
    );
  });

  it("does not turn an empty numeric field into zero", () => {
    expectIssue(
      importPaletteFromText(
        validCsv.replace(",255,0,0,", ",,0,0,"),
        validMetadata,
      ),
      "INVALID_NUMBER",
      "rgb_r",
    );
  });

  it("rejects non-finite and scientific Lab notation", () => {
    const csv = validCsv.replace(",53.24,80.09,67.20,", ",Infinity,8e1,67.20,");
    const result = importPaletteFromText(csv, validMetadata);
    expectIssue(result, "INVALID_NUMBER", "lab_l");
    expectIssue(result, "INVALID_NUMBER", "lab_a");
  });

  it("rejects empty required strings", () => {
    expectIssue(
      importPaletteFromText(
        validCsv.replace(",Bright Red,", ",   ,"),
        validMetadata,
      ),
      "EMPTY_REQUIRED_FIELD",
      "display_name",
    );
  });

  it("rejects HEX and RGB disagreement through the domain schema", () => {
    expectIssue(
      importPaletteFromText(
        validCsv.replace("#FF0000", "#FE0000"),
        validMetadata,
      ),
      "DOMAIN_VALIDATION_ERROR",
      "hex",
    );
  });

  it("rejects automatic matching for an unsellable color", () => {
    const result = importPaletteFromText(
      validCsv.replace("true,false,false,,false", "true,false,false,,true"),
      validMetadata,
    );
    expectIssue(result, "DOMAIN_VALIDATION_ERROR", "is_auto_match_enabled");
  });

  it("rejects a special finish without finishType", () => {
    const result = importPaletteFromText(
      validCsv.replace(
        "true,true,true,metallic,false",
        "true,true,true,,false",
      ),
      validMetadata,
    );
    expectIssue(result, "DOMAIN_VALIDATION_ERROR", "finish_type");
  });

  it("rejects color sourceVersion that differs from metadata", () => {
    const result = importPaletteFromText(
      validCsv.replace("0,test-v1,", "0,wrong-version,"),
      validMetadata,
    );
    expectIssue(result, "DOMAIN_VALIDATION_ERROR", "source_version");
  });

  it("rejects public brands other than Poparooz", () => {
    expectIssue(
      importPaletteFromText(validCsv, {
        ...validMetadata,
        displayBrand: "Other",
      }),
      "METADATA_VALIDATION_ERROR",
      "displayBrand",
    );
  });

  it("rejects reference systems outside the internal domain allowlist", () => {
    expectIssue(
      importPaletteFromText(validCsv.replace("MARD,", "OTHER,"), validMetadata),
      "DOMAIN_VALIDATION_ERROR",
      "reference_system",
    );
  });

  it("requires verifiedAt when metadata claims verified provenance", () => {
    expectIssue(
      importPaletteFromText(validCsv, {
        ...validMetadata,
        sourceType: "verified",
      }),
      "METADATA_VALIDATION_ERROR",
      "verifiedAt",
    );
  });

  it("rejects unknown metadata properties", () => {
    expectIssue(
      importPaletteFromText(validCsv, { ...validMetadata, colorCount: 3 }),
      "METADATA_VALIDATION_ERROR",
    );
  });
});

describe("palette uniqueness and error reporting", () => {
  it("reports the conflicting rows for normalized referenceCode duplicates", () => {
    const result = importPaletteFromText(
      readFixture("invalid-test-duplicate-reference-code.csv"),
      validMetadata,
    );
    expectIssue(result, "DUPLICATE_REFERENCE_CODE", "reference_code", 3);
    if (!result.success) expect(result.issues[0]!.message).toContain("row 2");
  });

  it("reports the conflicting rows for normalized displayCode duplicates", () => {
    const result = importPaletteFromText(
      readFixture("invalid-test-duplicate-display-code.csv"),
      validMetadata,
    );
    expectIssue(result, "DUPLICATE_DISPLAY_CODE", "display_code", 3);
    if (!result.success) expect(result.issues[0]!.message).toContain("row 2");
  });

  it("distinguishes reference and display duplicate issue codes", () => {
    const referenceResult = importPaletteFromText(
      readFixture("invalid-test-duplicate-reference-code.csv"),
      validMetadata,
    );
    const displayResult = importPaletteFromText(
      readFixture("invalid-test-duplicate-display-code.csv"),
      validMetadata,
    );
    expectIssue(referenceResult, "DUPLICATE_REFERENCE_CODE");
    expectIssue(displayResult, "DUPLICATE_DISPLAY_CODE");
  });

  it("aggregates multiple issues with exact row and column locations", () => {
    const result = importPaletteFromText(
      readFixture("invalid-test-color-values.csv"),
      validMetadata,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThanOrEqual(4);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ row: 2, column: "rgb_r" }),
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({ row: 4, column: "finish_type" }),
      );
      expect(JSON.stringify(result.issues)).not.toContain("Internal Bad One");
    }
  });

  it("rejects a header-only palette through the final PaletteDefinition schema", () => {
    const result = importPaletteFromText(
      validCsv.split("\n")[0]!,
      validMetadata,
    );
    expectIssue(result, "METADATA_VALIDATION_ERROR", "colors");
  });
});

function expectIssue(
  result: ReturnType<typeof importPaletteFromText>,
  code: string,
  column?: string,
  row?: number,
): void {
  expect(result.success).toBe(false);
  if (result.success) return;
  expect(result.issues).toContainEqual(
    expect.objectContaining({
      code,
      ...(column === undefined ? {} : { column }),
      ...(row === undefined ? {} : { row }),
    }),
  );
}

function toCsv(records: string[][]): string {
  return records
    .map((record) =>
      record
        .map((value) =>
          /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value,
        )
        .join(","),
    )
    .join("\n");
}
