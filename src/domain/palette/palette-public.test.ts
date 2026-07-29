import { describe, expect, it } from "vitest";

import { internalPalette, publicPalette } from "./index";
import { TEST_PLAIN_PALETTE_COLOR } from "./palette.fixture";
import { PUBLIC_BRAND, toPublicPaletteColor } from "./palette-public.mapper";
import { PublicPaletteColorSchema } from "./palette-public.schema";
import { parsePaletteColor } from "./palette.validation";

describe("toPublicPaletteColor", () => {
  it("exposes separate internal and public API namespaces", () => {
    expect(publicPalette.PUBLIC_BRAND).toBe("Poparooz");
    expect(Object.hasOwn(publicPalette, "PaletteColorSchema")).toBe(false);
    expect(Object.hasOwn(publicPalette, "TEST_PLAIN_PALETTE_COLOR")).toBe(
      false,
    );
    expect(Object.hasOwn(internalPalette, "PaletteColorSchema")).toBe(true);
    expect(Object.hasOwn(internalPalette, "toPublicPaletteColor")).toBe(false);
  });

  it("maps only the explicit customer-visible field allowlist", () => {
    expect(toPublicPaletteColor(TEST_PLAIN_PALETTE_COLOR)).toEqual({
      brand: "Poparooz",
      code: "POP-TEST-PLAIN",
      name: "Test Plain Color",
      hex: "#336699",
      isSpecialFinish: false,
    });
  });

  it("always emits the fixed Poparooz public brand", () => {
    expect(PUBLIC_BRAND).toBe("Poparooz");
    expect(toPublicPaletteColor(TEST_PLAIN_PALETTE_COLOR).brand).toBe(
      "Poparooz",
    );
  });

  it("uses displayCode even when referenceCode differs", () => {
    const result = toPublicPaletteColor(TEST_PLAIN_PALETTE_COLOR);

    expect(result.code).toBe(TEST_PLAIN_PALETTE_COLOR.displayCode);
    expect(result.code).not.toBe(TEST_PLAIN_PALETTE_COLOR.referenceCode);
  });

  it("uses displayName even when referenceName differs", () => {
    const result = toPublicPaletteColor(TEST_PLAIN_PALETTE_COLOR);

    expect(result.name).toBe(TEST_PLAIN_PALETTE_COLOR.displayName);
    expect(result.name).not.toBe(TEST_PLAIN_PALETTE_COLOR.referenceName);
  });

  it.each([
    "referenceSystem",
    "referenceCode",
    "referenceName",
    "referenceSeries",
    "sourceVersion",
    "productHandle",
    "variantId",
  ] as const)("does not expose internal field %s", (field) => {
    const internalColor = parsePaletteColor({
      ...TEST_PLAIN_PALETTE_COLOR,
      productHandle: "test-fixture-handle",
      variantId: "TEST-FIXTURE-VARIANT",
    });
    const result = toPublicPaletteColor(internalColor);

    expect(Object.hasOwn(result, field)).toBe(false);
  });

  it("serializes without the internal reference-system name", () => {
    expect(
      JSON.stringify(toPublicPaletteColor(TEST_PLAIN_PALETTE_COLOR)),
    ).not.toContain("MARD");
  });

  it("cannot have its public brand overridden by internal data", () => {
    const result = toPublicPaletteColor(TEST_PLAIN_PALETTE_COLOR);

    expect(result.brand).toBe("Poparooz");
    expect(result).not.toHaveProperty("displayBrand");
  });
});

describe("PublicPaletteColorSchema", () => {
  it("strictly rejects internal reference fields", () => {
    const result = PublicPaletteColorSchema.safeParse({
      ...toPublicPaletteColor(TEST_PLAIN_PALETTE_COLOR),
      referenceSystem: "MARD",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected strict public schema validation to fail.");
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          message: expect.stringContaining("referenceSystem"),
        }),
      ]),
    );
  });

  it("rejects any non-Poparooz public brand", () => {
    const result = PublicPaletteColorSchema.safeParse({
      ...toPublicPaletteColor(TEST_PLAIN_PALETTE_COLOR),
      brand: "MARD",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["brand"]);
      expect(result.error.issues[0]?.message).toContain("Poparooz");
    }
  });
});
