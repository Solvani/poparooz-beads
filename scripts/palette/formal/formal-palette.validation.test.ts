import { describe, expect, it } from "vitest";

import { TEST_ONLY_NON_PRODUCTION_FORMAL_PALETTE_FIXTURE } from "./formal-palette.fixture.ts";
import type { NormalizedFormalPalette } from "./formal-palette.types.ts";
import { validateNormalizedFormalPalette } from "./formal-palette.validation.ts";

const fixture = (): NormalizedFormalPalette =>
  structuredClone(
    TEST_ONLY_NON_PRODUCTION_FORMAL_PALETTE_FIXTURE,
  ) as NormalizedFormalPalette;

function issueCodes(input: unknown): readonly string[] {
  const result = validateNormalizedFormalPalette(input);
  expect(result.success).toBe(false);
  return result.success ? [] : result.issues.map((issue) => issue.code);
}

describe("validateNormalizedFormalPalette", () => {
  it("accepts the complete test-only normalized Palette", () => {
    expect(validateNormalizedFormalPalette(fixture()).success).toBe(true);
  });

  it("reports recordCount mismatch", () => {
    const palette = fixture();
    palette.manifest.recordCount = 3;

    expect(issueCodes(palette)).toContain("RECORD_COUNT_MISMATCH");
  });

  it("reports duplicate code with record location", () => {
    const palette = fixture();
    palette.colors[1] = {
      ...palette.colors[1]!,
      code: "A1",
      seriesNumber: 1,
    };

    const result = validateNormalizedFormalPalette(palette);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "DUPLICATE_CODE",
          recordIndex: 1,
          colorCode: "A1",
        }),
      );
    }
  });

  it("reports duplicate HEX with both conflicting codes", () => {
    const palette = fixture();
    palette.colors[1]!.hex = palette.colors[0]!.hex;

    const result = validateNormalizedFormalPalette(palette);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find(({ code }) => code === "DUPLICATE_HEX");
      expect(issue).toMatchObject({ recordIndex: 1, colorCode: "A2" });
      expect(issue?.message).toContain("A2");
      expect(issue?.message).toContain("A1");
    }
  });

  it("reports duplicate canonical source index", () => {
    const palette = fixture();
    palette.colors[1]!.canonicalSourceIndex = 0;

    expect(issueCodes(palette)).toContain("DUPLICATE_CANONICAL_INDEX");
  });

  it("reports non-contiguous zero-based canonical source indexes", () => {
    const palette = fixture();
    palette.colors[3]!.canonicalSourceIndex = 4;

    expect(issueCodes(palette)).toContain("NON_CONTIGUOUS_CANONICAL_INDEX");
  });

  it("reports series rank mismatch against the manifest order", () => {
    const palette = fixture();
    palette.colors[2]!.seriesRank = 2;

    expect(issueCodes(palette)).toContain("SERIES_RANK_MISMATCH");
  });

  it("aggregates multiple issues in stable order without echoing records", () => {
    const palette = fixture();
    palette.manifest.recordCount = 3;
    palette.colors[1]!.hex = palette.colors[0]!.hex;
    palette.colors[2]!.canonicalSourceIndex = 4;

    const first = validateNormalizedFormalPalette(palette);
    const second = validateNormalizedFormalPalette(palette);
    expect(first).toEqual(second);
    expect(first.success).toBe(false);
    if (!first.success) {
      expect(first.issues.map(({ code }) => code)).toEqual([
        "NON_CONTIGUOUS_CANONICAL_INDEX",
        "DUPLICATE_HEX",
        "RECORD_COUNT_MISMATCH",
      ]);
      expect(JSON.stringify(first.issues)).not.toContain("sourceLocation");
    }
  });

  it.each([
    ["hex", "#abcdef", "INVALID_HEX"],
    ["digitalColorStatus", "verified", "INVALID_DIGITAL_COLOR_STATUS"],
    ["physicalColorStatus", "approved", "INVALID_PHYSICAL_COLOR_STATUS"],
  ] as const)("maps invalid %s to stable error code", (field, value, code) => {
    const palette = fixture();
    (palette.colors[0]! as Record<string, unknown>)[field] = value;

    expect(issueCodes(palette)).toContain(code);
  });
});
