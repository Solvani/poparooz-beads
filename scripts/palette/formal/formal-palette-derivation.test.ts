import { describe, expect, it } from "vitest";

import { rgb8ToLab } from "../../../src/domain/color/color-conversion.ts";
import {
  hashCanonicalFormalPaletteRecords,
  hashSourceFileBytes,
  serializeCanonicalFormalPaletteRecords,
} from "./formal-palette-canonical.ts";
import {
  compileFormalPaletteColors,
  hexToRgb8Tuple,
} from "./formal-palette-color-compiler.ts";
import { TEST_ONLY_NON_PRODUCTION_FORMAL_PALETTE_FIXTURE } from "./formal-palette.fixture.ts";
import type {
  NormalizedFormalPalette,
  NormalizedFormalPaletteColor,
} from "./formal-palette.types.ts";

const fixture = (): NormalizedFormalPalette =>
  structuredClone(TEST_ONLY_NON_PRODUCTION_FORMAL_PALETTE_FIXTURE);

describe("formal Palette color derivation", () => {
  it("derives RGB8 deterministically from strict HEX", () => {
    expect(hexToRgb8Tuple("#12ABF0")).toEqual([18, 171, 240]);
  });

  it("derives Lab by calling the frozen rgb8ToLab behavior", () => {
    const [compiled] = compileFormalPaletteColors(fixture());
    const expected = rgb8ToLab({ r: 255, g: 0, b: 0 });

    expect(compiled?.lab).toEqual([expected.l, expected.a, expected.b]);
  });

  it("maps customer codes exactly and does not generate missing names", () => {
    const [compiled] = compileFormalPaletteColors(fixture());

    expect(compiled).toMatchObject({
      code: "A1",
      referenceSystem: "POPAROOZ",
      referenceCode: "A1",
      displayCode: "A1",
    });
    expect(compiled).not.toHaveProperty("displayName");
  });

  it("generates stable business sort order independent of input order", () => {
    const palette = fixture();
    palette.colors = [
      palette.colors[3]!,
      palette.colors[1]!,
      palette.colors[2]!,
      palette.colors[0]!,
    ];

    expect(
      compileFormalPaletteColors(palette).map(({ code, sortOrder }) => ({
        code,
        sortOrder,
      })),
    ).toEqual([
      { code: "A1", sortOrder: 0 },
      { code: "A2", sortOrder: 1 },
      { code: "B1", sortOrder: 2 },
      { code: "M1", sortOrder: 3 },
    ]);
  });

  it("does not use canonicalSourceIndex as business sortOrder", () => {
    const palette = fixture();
    palette.colors[0]!.canonicalSourceIndex = 1;
    palette.colors[1]!.canonicalSourceIndex = 0;

    const compiled = compileFormalPaletteColors(palette);
    expect(compiled[0]).toMatchObject({ code: "A1", sortOrder: 0 });
    expect(compiled[1]).toMatchObject({ code: "A2", sortOrder: 1 });
  });

  it("keeps source, policy, provenance, and hash fields out of compiled core", () => {
    const [compiled] = compileFormalPaletteColors(fixture());
    expect(Object.keys(compiled ?? {})).toEqual([
      "code",
      "referenceSystem",
      "referenceCode",
      "displayCode",
      "hex",
      "rgb",
      "lab",
      "sortOrder",
    ]);
  });
});

describe("formal Palette canonical serialization and hashing", () => {
  it("is independent of record object key insertion order", () => {
    const palette = fixture();
    const reversedKeys = Object.fromEntries(
      Object.entries(palette.colors[0]!).reverse(),
    ) as unknown as NormalizedFormalPaletteColor;
    const changed = {
      ...palette,
      colors: [reversedKeys, ...palette.colors.slice(1)],
    };

    expect(serializeCanonicalFormalPaletteRecords(changed.colors)).toBe(
      serializeCanonicalFormalPaletteRecords(palette.colors),
    );
  });

  it("sorts records by canonicalSourceIndex independent of input array order", () => {
    const palette = fixture();
    const reversed = [...palette.colors].reverse();

    expect(serializeCanonicalFormalPaletteRecords(reversed)).toBe(
      serializeCanonicalFormalPaletteRecords(palette.colors),
    );
  });

  it("uses LF and exactly one final newline", () => {
    const serialized = serializeCanonicalFormalPaletteRecords(fixture().colors);
    expect(serialized).not.toContain("\r");
    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized.endsWith("\n\n")).toBe(false);
  });

  it("produces stable canonical SHA-256 and changes it when HEX changes", () => {
    const palette = fixture();
    const first = hashCanonicalFormalPaletteRecords(palette.colors);
    const second = hashCanonicalFormalPaletteRecords(palette.colors);
    palette.colors[0]!.hex = "#FE0000";
    const changed = hashCanonicalFormalPaletteRecords(palette.colors);

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
    expect(changed).not.toBe(first);
  });

  it("keeps original-file bytes and canonical-record hashes as separate boundaries", () => {
    const palette = fixture();
    const sourceHash = hashSourceFileBytes(Buffer.from("test source bytes"));
    const canonicalHash = hashCanonicalFormalPaletteRecords(palette.colors);

    expect(sourceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(canonicalHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sourceHash).not.toBe(canonicalHash);
    expect(palette.manifest).toHaveProperty("sourceFileSha256");
    expect(palette.manifest).toHaveProperty("canonicalRecordsSha256");
  });
});
