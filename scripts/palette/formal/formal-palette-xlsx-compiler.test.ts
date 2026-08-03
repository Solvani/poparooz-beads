import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { compileFormalPaletteColors } from "./formal-palette-color-compiler.ts";
import { hashSourceFileBytes } from "./formal-palette-canonical.ts";
import {
  FormalPaletteCompilationError,
  formatFormalPaletteCliError,
} from "./formal-palette-errors.ts";
import {
  compileFormalPaletteWorkbookBytes,
  FORMAL_PALETTE_APPROVED_AT,
  FORMAL_PALETTE_SERIES_COUNTS,
  FORMAL_PALETTE_SOURCE_FILE_NAME,
  FORMAL_PALETTE_SOURCE_SHA256,
  FORMAL_SUBSTITUTE_LEVEL_COUNTS,
  type FormalPaletteCompilation,
} from "./formal-palette-xlsx-compiler.ts";
import { publishFormalPaletteCompilation } from "./formal-palette-publication.ts";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const sourceCandidates = [
  path.join(
    repositoryRoot,
    "data-source",
    "incoming",
    FORMAL_PALETTE_SOURCE_FILE_NAME,
  ),
  path.join(
    repositoryRoot,
    "data-source",
    "palettes",
    "poparooz-standard",
    "1.0.0",
    "source",
    FORMAL_PALETTE_SOURCE_FILE_NAME,
  ),
];
const publishedRoot = path.join(
  repositoryRoot,
  "data-source",
  "palettes",
  "poparooz-standard",
  "1.0.0",
);

let sourceBytes: Buffer;
let compilation: FormalPaletteCompilation;

beforeAll(async () => {
  const available: Buffer[] = [];
  for (const candidate of sourceCandidates) {
    try {
      available.push(await readFile(candidate));
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }
  expect(available).toHaveLength(1);
  sourceBytes = available[0]!;
  expect(hashSourceFileBytes(sourceBytes)).toBe(FORMAL_PALETTE_SOURCE_SHA256);
  compilation = await compileFormalPaletteWorkbookBytes(sourceBytes);
});

describe("formal Palette XLSX compilation", () => {
  it("blocks an incorrect source hash before parsing", async () => {
    await expect(
      compileFormalPaletteWorkbookBytes(sourceBytes, "0".repeat(64)),
    ).rejects.toThrow("[SOURCE_HASH_MISMATCH]");
  });

  it("wraps workbook parser failures without exposing parser internals", async () => {
    const invalid = Buffer.from("not an xlsx workbook", "utf8");
    const error = await captureCompilationError(() =>
      compileFormalPaletteWorkbookBytes(invalid, hashSourceFileBytes(invalid)),
    );
    expect(error.code).toBe("WORKBOOK_PARSE_FAILED");
    expect(error.cause).toBeDefined();
    expect(error.message).toBe(
      "[WORKBOOK_PARSE_FAILED] The formal Palette workbook could not be parsed.",
    );
  });

  it("uses typed stable errors and removes absolute paths from messages", () => {
    const error = new FormalPaletteCompilationError(
      "PUBLICATION_FAILED",
      "Could not publish C:\\Users\\PaletteOwner\\secret.xlsx",
      { cause: new Error("internal") },
    );
    expect(error.code).toBe("PUBLICATION_FAILED");
    expect(error.message).toBe("[PUBLICATION_FAILED] Could not publish <path>");
    expect(error.cause).toBeInstanceOf(Error);
    expect(formatFormalPaletteCliError(new Error("secret stack"))).toBe(
      "[INTERNAL_ERROR] Formal Palette compilation failed unexpectedly.",
    );
    expect(formatFormalPaletteCliError(error)).toBe(error.message);
  });

  it("blocks missing or incorrectly named worksheets", async () => {
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          const sheet = workbook.getWorksheet("替代色参考");
          if (sheet !== undefined) workbook.removeWorksheet(sheet.id);
        }),
      ["WORKBOOK_LAYOUT_INVALID", "INVALID_WORKSHEETS"],
    );
  });

  it("blocks fixed-layout and header changes", async () => {
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("替代色参考")!.getCell("A5").value = "编号";
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "INVALID_SUBSTITUTE_HEADER"],
    );
  });

  it("blocks changed fixed notes and broken Palette merge structure", async () => {
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.getCell("A35").value = "changed";
        }),
      ["WORKBOOK_LAYOUT_INVALID", "INVALID_FIXED_LAYOUT"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.unMergeCells("A1:AA1");
        }),
      ["WORKBOOK_LAYOUT_INVALID", "INVALID_FIXED_LAYOUT"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.unMergeCells("A2:C2");
        }),
      ["WORKBOOK_LAYOUT_INVALID", "INVALID_FIXED_LAYOUT"],
    );
  });

  it("blocks broken substitute title and note merge structure", async () => {
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("替代色参考")!.unMergeCells("A1:J1");
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "INVALID_FIXED_LAYOUT"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("替代色参考")!.unMergeCells("A2:J2");
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "INVALID_FIXED_LAYOUT"],
    );
  });

  it("compiles exactly 221 colors with frozen series counts", () => {
    expect(compilation.normalizedPalette.colors).toHaveLength(221);
    expect(compilation.paletteValidationReport.seriesCounts).toEqual(
      FORMAL_PALETTE_SERIES_COUNTS,
    );
    expect(compilation.paletteValidationReport).toMatchObject({
      duplicateCodeCount: 0,
      duplicateHexCount: 0,
      missingHexCount: 0,
      invalidHexCount: 0,
      invalidCodeCount: 0,
      nonContiguousSeriesCount: 0,
      result: "passed",
      issues: [],
    });
  });

  it("blocks duplicate codes and duplicate HEX values", async () => {
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.getCell("A4").value = "A1";
        }),
      ["PALETTE_VALIDATION_FAILED", "DUPLICATE_CODE"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.getCell("B4").value = "#FAF4C8";
        }),
      ["PALETTE_VALIDATION_FAILED", "DUPLICATE_HEX"],
    );
  });

  it("blocks missing HEX, invalid HEX, invalid code, and series gaps", async () => {
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.getCell("B3").value = null;
        }),
      ["WORKBOOK_LAYOUT_INVALID", "MISSING_HEX"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.getCell("B3").value = "#abcdef";
        }),
      ["WORKBOOK_LAYOUT_INVALID", "INVALID_HEX"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.getCell("A3").value = "A01";
        }),
      ["WORKBOOK_LAYOUT_INVALID", "INVALID_CODE"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.getCell("A4").value = "A27";
        }),
      ["PALETTE_VALIDATION_FAILED", "NON_CONTIGUOUS_SERIES"],
    );
  });

  it("accepts the fixed A35 note and blocks other unknown text", async () => {
    expect(
      compilation.normalizedPalette.colors.at(-1)?.canonicalSourceIndex,
    ).toBe(220);
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("Sheet1")!.getCell("AA35").value = "unknown";
        }),
      ["WORKBOOK_LAYOUT_INVALID", "UNEXPECTED_PALETTE_CONTENT"],
    );
  });

  it("emits a complete deterministic color derivation audit", () => {
    expect(compilation.colorDerivationAudit.records).toHaveLength(221);
    expect(compilation.colorDerivationAudit).toMatchObject({
      schemaVersion: "1.0.0",
      paletteId: "poparooz-standard",
      paletteVersion: "1.0.0",
      algorithm: "rgb8ToLab-v1",
      decimalPrecision: 12,
      recordCount: 221,
    });
    expect(compilation.paletteValidationReport).toMatchObject({
      derivationAuditRecordCount: 221,
      derivationAuditSha256:
        "f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020",
      derivationAlgorithm: "rgb8ToLab-v1",
      derivationDecimalPrecision: 12,
    });
    expect(
      compilation.colorDerivationAudit.records.filter(({ code }) =>
        ["A1", "B1", "M15"].includes(code),
      ),
    ).toEqual([
      {
        code: "A1",
        hex: "#FAF4C8",
        canonicalSourceIndex: 0,
        sortOrder: 0,
        rgb8: { r: 250, g: 244, b: 200 },
        lab: {
          l: 95.662557954542,
          a: -4.930452709831,
          b: 21.971712486605,
        },
      },
      {
        code: "B1",
        hex: "#E6EE31",
        canonicalSourceIndex: 1,
        sortOrder: 26,
        rgb8: { r: 230, g: 238, b: 49 },
        lab: {
          l: 90.869004590579,
          a: -22.935764775906,
          b: 81.797618544215,
        },
      },
      {
        code: "M15",
        hex: "#757D78",
        canonicalSourceIndex: 134,
        sortOrder: 220,
        rgb8: { r: 117, g: 125, b: 120 },
        lab: {
          l: 51.616079220963,
          a: -4.002128706767,
          b: 1.695662285702,
        },
      },
    ]);
    expect(compilation.normalizedPalette.manifest.canonicalRecordsSha256).toBe(
      "1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4",
    );
  });

  it("keeps source-audit order separate from business order", () => {
    expect(
      compilation.normalizedPalette.colors.slice(0, 4).map(({ code }) => code),
    ).toEqual(["A1", "B1", "C1", "D1"]);
    expect(
      compileFormalPaletteColors(compilation.normalizedPalette)
        .slice(0, 4)
        .map(({ code, sortOrder }) => ({ code, sortOrder })),
    ).toEqual([
      { code: "A1", sortOrder: 0 },
      { code: "A2", sortOrder: 1 },
      { code: "A3", sortOrder: 2 },
      { code: "A4", sortOrder: 3 },
    ]);
  });

  it("compiles 67 bidirectional reference-only relations by level", () => {
    expect(compilation.normalizedSubstitutes.relations).toHaveLength(67);
    expect(compilation.substituteValidationReport.levelCounts).toEqual(
      FORMAL_SUBSTITUTE_LEVEL_COUNTS,
    );
    expect(
      compilation.normalizedSubstitutes.relations.every(
        ({ bidirectional }) => bidirectional,
      ),
    ).toBe(true);
    expect(compilation.normalizedSubstitutes).toMatchObject({
      status: "reference_only",
      physicalValidationStatus: "unverified",
      applicationPolicy: "disabled",
      directionPolicy: "worksheet_declared_bidirectional",
    });
  });

  it("blocks missing endpoints, HEX mismatches, self relations, reverse duplicates, invalid ΔE00, and invalid levels", async () => {
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("替代色参考")!.getCell("B6").value = "A99";
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "MISSING_PALETTE_CODE"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("替代色参考")!.getCell("C6").value = "#000000";
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "SUBSTITUTE_HEX_MISMATCH"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          const sheet = workbook.getWorksheet("替代色参考")!;
          sheet.getCell("E6").value = sheet.getCell("B6").value;
          sheet.getCell("F6").value = sheet.getCell("C6").value;
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "SELF_RELATION"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          const sheet = workbook.getWorksheet("替代色参考")!;
          sheet.getCell("B7").value = sheet.getCell("E6").value;
          sheet.getCell("C7").value = sheet.getCell("F6").value;
          sheet.getCell("E7").value = sheet.getCell("B6").value;
          sheet.getCell("F7").value = sheet.getCell("C6").value;
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "DUPLICATE_RELATION"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("替代色参考")!.getCell("I6").value = -1;
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "INVALID_DELTA_E"],
    );
    await expectCompilationCodes(
      () =>
        compileMutation((workbook) => {
          workbook.getWorksheet("替代色参考")!.getCell("H6").value = "未知";
        }),
      ["SUBSTITUTE_VALIDATION_FAILED", "INVALID_SUBSTITUTE_LEVEL"],
    );
  });

  it("recompiles identical inputs to byte-identical deterministic artifacts", async () => {
    const repeated = await compileFormalPaletteWorkbookBytes(sourceBytes);
    expect(repeated.artifacts).toEqual(compilation.artifacts);
    const serialized = JSON.stringify(compilation.artifacts);
    expect(serialized).not.toContain(repositoryRoot);
    expect(serialized).not.toContain(os.hostname());
    expect(serialized).not.toContain("processId");
    const timestamps = serialized.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
    );
    expect(new Set(timestamps)).toEqual(new Set([FORMAL_PALETTE_APPROVED_AT]));
  });

  it("keeps every published text artifact byte-identical to recompilation", async () => {
    for (const [name, expected] of Object.entries(compilation.artifacts)) {
      expect(await readFile(path.join(publishedRoot, name), "utf8")).toBe(
        expected,
      );
    }
  });

  it("does not emit Runtime Palette policy or catalog fields", () => {
    const serialized = JSON.stringify(compilation.artifacts);
    for (const forbidden of [
      "isActive",
      "isSellable",
      "isAutoMatchEnabled",
      "isSpecialFinish",
      "finishType",
      "packSize",
      "productHandle",
      "variantId",
      "PaletteDefinition",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("copies the sole source workbook without changing or removing incoming", async () => {
    const temporaryRoot = await mkdtemp(
      path.join(os.tmpdir(), "poparooz-formal-palette-"),
    );
    try {
      const incoming = path.join(
        temporaryRoot,
        FORMAL_PALETTE_SOURCE_FILE_NAME,
      );
      const output = path.join(temporaryRoot, "published", "1.0.0");
      await writeFile(incoming, sourceBytes);
      const result = await publishFormalPaletteCompilation(incoming, output);
      expect(result.incomingRetained).toBe(true);
      expect(await readFile(incoming)).toEqual(sourceBytes);
      const copied = await readFile(
        path.join(output, "source", FORMAL_PALETTE_SOURCE_FILE_NAME),
      );
      expect(hashSourceFileBytes(copied)).toBe(FORMAL_PALETTE_SOURCE_SHA256);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});

async function compileMutation(
  mutate: (workbook: ExcelJS.Workbook) => void,
): Promise<FormalPaletteCompilation> {
  const workbook = new ExcelJS.Workbook();
  const bytes = Buffer.from(sourceBytes) as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0];
  await workbook.xlsx.load(bytes);
  mutate(workbook);
  const mutated = new Uint8Array(await workbook.xlsx.writeBuffer());
  return compileFormalPaletteWorkbookBytes(
    mutated,
    hashSourceFileBytes(mutated),
  );
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function captureCompilationError(
  action: () => Promise<unknown>,
): Promise<FormalPaletteCompilationError> {
  try {
    await action();
  } catch (error) {
    expect(error).toBeInstanceOf(FormalPaletteCompilationError);
    return error as FormalPaletteCompilationError;
  }
  throw new Error("Expected compilation to fail.");
}

async function expectCompilationCodes(
  action: () => Promise<unknown>,
  expectedCodes: readonly string[],
): Promise<void> {
  const error = await captureCompilationError(action);
  expect(collectErrorCodes(error)).toEqual(expectedCodes);
}

function collectErrorCodes(error: unknown): string[] {
  if (!(error instanceof FormalPaletteCompilationError)) return [];
  return [error.code, ...collectErrorCodes(error.cause)];
}

afterAll(() => {
  sourceBytes = Buffer.alloc(0);
});
