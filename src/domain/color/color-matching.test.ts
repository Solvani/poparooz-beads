import { describe, expect, it } from "vitest";

import { publicPalette } from "../palette";
import {
  TEST_PALETTE_DEFINITION,
  TEST_PLAIN_PALETTE_COLOR,
} from "../palette/palette.fixture";
import type { PaletteColor, PaletteDefinition } from "../palette/palette.types";
import {
  MATCH_DISTANCE_EPSILON,
  ColorMatchingError,
  matchNearestPaletteColor,
  preparePaletteCandidates,
  type ColorMatchingErrorCode,
  type PaletteMatchCandidate,
} from ".";

function expectMatchingError(
  callback: () => unknown,
  code: ColorMatchingErrorCode,
): void {
  try {
    callback();
    throw new Error("Expected a color matching error.");
  } catch (error) {
    expect(error).toBeInstanceOf(ColorMatchingError);
    expect((error as ColorMatchingError).code).toBe(code);
  }
}

function makeColor(
  suffix: string,
  overrides: Partial<PaletteColor> = {},
): PaletteColor {
  return {
    ...TEST_PLAIN_PALETTE_COLOR,
    rgb: [...TEST_PLAIN_PALETTE_COLOR.rgb],
    lab: [...TEST_PLAIN_PALETTE_COLOR.lab],
    referenceCode: `TEST-REF-${suffix}`,
    displayCode: `POP-TEST-${suffix}`,
    displayName: `Test ${suffix} Color`,
    ...overrides,
  };
}

function makePalette(colors: PaletteColor[]): PaletteDefinition {
  return {
    ...TEST_PALETTE_DEFINITION,
    colorCount: colors.length,
    colors,
  };
}

function candidate(color: PaletteColor): PaletteMatchCandidate {
  return { color };
}

describe("preparePaletteCandidates", () => {
  it("retains only active, sellable, auto-match-enabled colors", () => {
    const eligible = makeColor("ELIGIBLE", { sortOrder: 4 });
    const inactive = makeColor("INACTIVE", {
      isActive: false,
      isAutoMatchEnabled: false,
      sortOrder: 3,
    });
    const unsellable = makeColor("UNSELLABLE", {
      isSellable: false,
      isAutoMatchEnabled: false,
      sortOrder: 2,
    });
    const manual = makeColor("MANUAL", {
      isAutoMatchEnabled: false,
      sortOrder: 1,
    });

    expect(
      preparePaletteCandidates(
        makePalette([inactive, eligible, manual, unsellable]),
      ).map(({ color }) => color.referenceCode),
    ).toEqual([eligible.referenceCode]);
  });

  it("allows a special finish only when explicitly auto-match enabled", () => {
    const special = makeColor("SPECIAL-ELIGIBLE", {
      isSpecialFinish: true,
      finishType: "glow",
      isAutoMatchEnabled: true,
    });
    expect(preparePaletteCandidates(makePalette([special]))[0]?.color).toEqual(
      special,
    );
  });

  it("returns a deterministic readonly order without mutating the palette", () => {
    const later = makeColor("Z-CODE", { sortOrder: 2 });
    const alpha = makeColor("A-CODE", { sortOrder: 1 });
    const beta = makeColor("B-CODE", { sortOrder: 1 });
    const original = makePalette([later, beta, alpha]);
    const before = structuredClone(original);

    const first = preparePaletteCandidates(original);
    const second = preparePaletteCandidates(makePalette([alpha, later, beta]));

    expect(first.map(({ color }) => color.displayCode)).toEqual([
      alpha.displayCode,
      beta.displayCode,
      later.displayCode,
    ]);
    expect(second.map(({ color }) => color.displayCode)).toEqual(
      first.map(({ color }) => color.displayCode),
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(original).toEqual(before);
  });

  it("accepts deeply frozen valid input", () => {
    const color = Object.freeze(makeColor("FROZEN"));
    const colors = Object.freeze([color]);
    const palette = Object.freeze({
      ...TEST_PALETTE_DEFINITION,
      colorCount: 1,
      colors,
    }) as PaletteDefinition;
    expect(preparePaletteCandidates(palette)).toHaveLength(1);
  });

  it("distinguishes an empty palette from no eligible colors", () => {
    expectMatchingError(
      () =>
        preparePaletteCandidates({
          ...TEST_PALETTE_DEFINITION,
          colorCount: 0,
          colors: [],
        } as unknown as PaletteDefinition),
      "EMPTY_PALETTE",
    );
    expectMatchingError(
      () =>
        preparePaletteCandidates(
          makePalette([
            makeColor("MANUAL-ONLY", { isAutoMatchEnabled: false }),
          ]),
        ),
      "NO_ELIGIBLE_PALETTE_COLORS",
    );
  });

  it("rejects a palette that bypasses its strict schema", () => {
    const invalid = makePalette([makeColor("INVALID")]);
    invalid.colors[0]!.lab[0] = Number.NaN;
    expectMatchingError(
      () => preparePaletteCandidates(invalid),
      "INVALID_PALETTE_CANDIDATE",
    );
  });
});

describe("matchNearestPaletteColor", () => {
  it("returns the only candidate and its actual CIEDE2000 distance", () => {
    const color = makeColor("ONLY", { lab: [52, 4, -7] });
    const result = matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
      candidate(color),
    ]);
    expect(result.color).toEqual(color);
    expect(result.distance).toBeGreaterThan(0);
    expect(Number.isFinite(result.distance)).toBe(true);
  });

  it("returns exact Lab as zero distance without negative zero", () => {
    const color = makeColor("EXACT", { lab: [42, 1, -2] });
    const result = matchNearestPaletteColor({ l: 42, a: 1, b: -2 }, [
      candidate(color),
    ]);
    expect(result.distance).toBe(0);
    expect(Object.is(result.distance, -0)).toBe(false);
  });

  it("selects the genuinely smaller distance beyond epsilon", () => {
    const exact = makeColor("EXACT-BUT-LATER", {
      lab: [50, 0, 0],
      sortOrder: 99,
    });
    const farther = makeColor("FARTHER-BUT-EARLIER", {
      lab: [50, 1e-9, 0],
      sortOrder: 0,
    });
    expect(
      matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
        candidate(farther),
        candidate(exact),
      ]).color.referenceCode,
    ).toBe(exact.referenceCode);
  });

  it("uses sortOrder for distances within the fixed epsilon", () => {
    const exactLater = makeColor("EXACT-LATER", {
      lab: [50, 0, 0],
      sortOrder: 5,
    });
    const nearEarlier = makeColor("NEAR-EARLIER", {
      lab: [50, MATCH_DISTANCE_EPSILON / 4, 0],
      sortOrder: 1,
    });
    expect(
      matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
        candidate(exactLater),
        candidate(nearEarlier),
      ]).color.referenceCode,
    ).toBe(nearEarlier.referenceCode);
  });

  it("uses binary displayCode order after equal sortOrder", () => {
    const zulu = makeColor("ZULU", { lab: [50, 0, 0], sortOrder: 1 });
    const alpha = makeColor("ALPHA", { lab: [50, 0, 0], sortOrder: 1 });
    expect(
      matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
        candidate(zulu),
        candidate(alpha),
      ]).color.displayCode,
    ).toBe(alpha.displayCode);
  });

  it("uses binary referenceCode order when prior tie fields match", () => {
    const later = makeColor("LATER-REF", {
      referenceCode: "TEST-REF-Z",
      displayCode: "POP-TEST-SAME",
      lab: [50, 0, 0],
      sortOrder: 1,
    });
    const earlier = makeColor("EARLIER-REF", {
      referenceCode: "TEST-REF-A",
      displayCode: "POP-TEST-SAME",
      lab: [50, 0, 0],
      sortOrder: 1,
    });
    expect(
      matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
        candidate(later),
        candidate(earlier),
      ]).color.referenceCode,
    ).toBe(earlier.referenceCode);
  });

  it("is independent of candidate input order and system locale", () => {
    const colors = [
      makeColor("THREE", { lab: [50, 0, 0], sortOrder: 3 }),
      makeColor("ONE", { lab: [50, 0, 0], sortOrder: 1 }),
      makeColor("TWO", { lab: [50, 0, 0], sortOrder: 2 }),
    ];
    const forward = matchNearestPaletteColor(
      { l: 50, a: 0, b: 0 },
      colors.map(candidate),
    );
    const reverse = matchNearestPaletteColor(
      { l: 50, a: 0, b: 0 },
      [...colors].reverse().map(candidate),
    );
    expect(reverse).toEqual(forward);
    expect(forward.color.referenceCode).toBe("TEST-REF-ONE");
  });

  it("does not mutate the target, candidates, or colors", () => {
    const target = Object.freeze({ l: 50, a: 2, b: -3 });
    const color = Object.freeze(makeColor("IMMUTABLE", { lab: [51, 3, -4] }));
    const candidates = Object.freeze([Object.freeze(candidate(color))]);
    const before = structuredClone(candidates);
    matchNearestPaletteColor(target, candidates);
    expect(target).toEqual({ l: 50, a: 2, b: -3 });
    expect(candidates).toEqual(before);
  });

  it("rejects empty, invalid, ineligible, and non-finite candidates", () => {
    expectMatchingError(
      () => matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, []),
      "EMPTY_PALETTE",
    );
    expectMatchingError(
      () =>
        matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
          null as unknown as PaletteMatchCandidate,
        ]),
      "INVALID_PALETTE_CANDIDATE",
    );
    expectMatchingError(
      () =>
        matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
          candidate(makeColor("INELIGIBLE", { isAutoMatchEnabled: false })),
        ]),
      "INVALID_PALETTE_CANDIDATE",
    );
    expectMatchingError(
      () =>
        matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
          candidate(
            makeColor("OVERFLOW", {
              lab: [50, Number.MAX_VALUE, Number.MAX_VALUE],
            }),
          ),
        ]),
      "NON_FINITE_COLOR_DISTANCE",
    );
  });
});

describe("internal match and public presentation isolation", () => {
  it("maps an internal winner only through the existing public allowlist", () => {
    const internal = makeColor("PUBLIC-BOUNDARY", {
      productHandle: "test-internal-handle",
      variantId: "TEST-INTERNAL-VARIANT",
    });
    const match = matchNearestPaletteColor({ l: 42, a: 1, b: -2 }, [
      candidate(internal),
    ]);
    const publicColor = publicPalette.toPublicPaletteColor(match.color);
    const serialized = JSON.stringify(publicColor);

    expect(match.color.referenceCode).toBe(internal.referenceCode);
    expect(publicColor.brand).toBe("Poparooz");
    expect(publicColor.code).toBe(internal.displayCode);
    expect(publicColor).not.toHaveProperty("referenceSystem");
    expect(publicColor).not.toHaveProperty("referenceCode");
    expect(publicColor).not.toHaveProperty("productHandle");
    expect(publicColor).not.toHaveProperty("variantId");
    expect(serialized).not.toContain(internal.referenceSystem);
    expect(serialized).not.toContain(internal.referenceCode);
  });
});
