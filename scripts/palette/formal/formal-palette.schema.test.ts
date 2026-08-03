import { describe, expect, it } from "vitest";

import { TEST_ONLY_NON_PRODUCTION_FORMAL_PALETTE_FIXTURE } from "./formal-palette.fixture.ts";
import {
  FormalPaletteManifestSchema,
  NormalizedFormalPaletteColorSchema,
} from "./formal-palette.schema.ts";
import type { NormalizedFormalPalette } from "./formal-palette.types.ts";

const fixture = (): NormalizedFormalPalette =>
  structuredClone(
    TEST_ONLY_NON_PRODUCTION_FORMAL_PALETTE_FIXTURE,
  ) as NormalizedFormalPalette;

describe("FormalPaletteManifestSchema", () => {
  it("accepts the test-only draft manifest without treating it as approved", () => {
    const result = FormalPaletteManifestSchema.parse(fixture().manifest);

    expect(result.status).toBe("draft");
    expect(result).not.toHaveProperty("approvedAt");
    expect(result).not.toHaveProperty("approvedBy");
  });

  it.each([
    ["brand", "Other"],
    ["referenceSystem", "OTHER"],
    ["referenceSystem", "MARD"],
  ] as const)("rejects invalid formal identity %s=%s", (field, value) => {
    const manifest = fixture().manifest as Record<string, unknown>;
    manifest[field] = value;

    expect(FormalPaletteManifestSchema.safeParse(manifest).success).toBe(false);
  });

  it.each(["ABC", "A".repeat(64), ` ${"a".repeat(64)}`])(
    "rejects invalid source hashes: %s",
    (hash) => {
      const manifest = fixture().manifest;
      manifest.sourceFileSha256 = hash;

      const result = FormalPaletteManifestSchema.safeParse(manifest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          "[INVALID_SOURCE_HASH]",
        );
      }
    },
  );

  it("rejects duplicate series", () => {
    const manifest = fixture().manifest;
    manifest.seriesOrder[1] = "A";

    const result = FormalPaletteManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContainEqual(
        expect.stringContaining("[DUPLICATE_SERIES]"),
      );
    }
  });

  it("requires approval identity and time for approved manifests", () => {
    const manifest = { ...fixture().manifest, status: "approved" };

    const result = FormalPaletteManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("[INVALID_MANIFEST]");
    }
  });

  it("rejects approval fields on a draft manifest", () => {
    const manifest = {
      ...fixture().manifest,
      approvedAt: "2026-08-03T01:00:00Z",
      approvedBy: "Test Approver",
    };

    expect(FormalPaletteManifestSchema.safeParse(manifest).success).toBe(false);
  });
});

describe("NormalizedFormalPaletteColorSchema", () => {
  it("accepts A1 with an absent name in the not_provided state", () => {
    expect(
      NormalizedFormalPaletteColorSchema.safeParse(fixture().colors[0]).success,
    ).toBe(true);
  });

  it("rejects a code that disagrees with series and seriesNumber", () => {
    const color = { ...fixture().colors[0], seriesNumber: 2 };

    expect(NormalizedFormalPaletteColorSchema.safeParse(color).success).toBe(
      false,
    );
  });

  it.each(["a1", "A01", "A0", "A-1", "A 1", "AA1", "1A"])(
    "rejects non-canonical code %s",
    (code) => {
      const color = { ...fixture().colors[0], code };
      expect(NormalizedFormalPaletteColorSchema.safeParse(color).success).toBe(
        false,
      );
    },
  );

  it.each(["#abcdef", "ABCDEF", "#ABC", "#ABCDEFFF", " #ABCDEF"])(
    "rejects non-canonical HEX %s",
    (hex) => {
      const color = { ...fixture().colors[0], hex };
      expect(NormalizedFormalPaletteColorSchema.safeParse(color).success).toBe(
        false,
      );
    },
  );

  it("requires a name in the approved state", () => {
    const color = {
      ...fixture().colors[0],
      displayNameStatus: "approved" as const,
    };

    expect(NormalizedFormalPaletteColorSchema.safeParse(color).success).toBe(
      false,
    );
  });

  it("rejects a name in the not_provided state", () => {
    const color = { ...fixture().colors[0], displayName: "Test Red" };

    expect(NormalizedFormalPaletteColorSchema.safeParse(color).success).toBe(
      false,
    );
  });

  it("rejects a whitespace-only display name", () => {
    const color = {
      ...fixture().colors[0],
      displayName: "   ",
      displayNameStatus: "approved" as const,
    };

    expect(NormalizedFormalPaletteColorSchema.safeParse(color).success).toBe(
      false,
    );
  });

  it.each([
    { sheet: "", row: 2, column: 1 },
    { sheet: "MARD colors", row: 2, column: 1 },
    { sheet: "TEST ONLY", row: 0, column: 1 },
    { sheet: "TEST ONLY", row: 2, column: 0 },
  ])("rejects invalid source location $sourceLocation", (sourceLocation) => {
    const color = { ...fixture().colors[0], sourceLocation };
    expect(NormalizedFormalPaletteColorSchema.safeParse(color).success).toBe(
      false,
    );
  });

  it("rejects unsupported digital and physical status claims", () => {
    expect(
      NormalizedFormalPaletteColorSchema.safeParse({
        ...fixture().colors[0],
        digitalColorStatus: "verified",
        physicalColorStatus: "approved",
      }).success,
    ).toBe(false);
  });
});
