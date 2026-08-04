import { describe, expect, it } from "vitest";

import type { GenerationPaletteColor } from "../../runtime/generation-palette/generation-palette.types";
import { publicPalette } from "../palette";
import {
  TEST_PALETTE_DEFINITION,
  TEST_PLAIN_PALETTE_COLOR,
} from "../palette/palette.fixture";
import type { PaletteColor, PaletteDefinition } from "../palette/palette.types";
import {
  MATCH_DISTANCE_EPSILON,
  ColorMatchingError,
  deltaE2000,
  matchNearestColor,
  matchNearestPaletteColor,
  prepareColorMatchCandidates,
  preparePaletteCandidates,
  isPoparoozColorCode,
  type ColorMatchCandidate,
  type ColorMatchingErrorCode,
  type MatchableColor,
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

let nextLegacyDisplayCode = 1;

function makeColor(
  suffix: string,
  overrides: Partial<PaletteColor> = {},
): PaletteColor {
  return {
    ...TEST_PLAIN_PALETTE_COLOR,
    rgb: [...TEST_PLAIN_PALETTE_COLOR.rgb],
    lab: [...TEST_PLAIN_PALETTE_COLOR.lab],
    referenceCode: `TEST-REF-${suffix}`,
    displayCode: `A${nextLegacyDisplayCode++}`,
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

interface TestMatchableColor extends MatchableColor {
  readonly marker: string;
}

function matchableColor(
  code: string,
  overrides: Partial<TestMatchableColor> = {},
): TestMatchableColor {
  return {
    code,
    lab: [50, 0, 0],
    sortOrder: 0,
    active: true,
    autoMatchEligible: true,
    marker: `marker-${code}`,
    ...overrides,
  };
}

function coreCandidate<TColor extends MatchableColor>(
  color: TColor,
): ColorMatchCandidate<TColor> {
  return { color };
}

describe("generation-safe matcher core", () => {
  it("uses the shared Poparooz customer color-code grammar", () => {
    for (const code of ["A1", "B10", "M221"]) {
      expect(isPoparoozColorCode(code)).toBe(true);
      expect(prepareColorMatchCandidates([matchableColor(code)])).toHaveLength(
        1,
      );
    }

    for (const code of ["a1", "A0", "A01", "OTHER", "A 1", "", "!"]) {
      expect(isPoparoozColorCode(code)).toBe(false);
      expectMatchingError(
        () => prepareColorMatchCandidates([matchableColor(code)]),
        "INVALID_PALETTE_CANDIDATE",
      );
    }
  });

  it("keeps the shared color-code predicate stateless and deterministic", () => {
    for (let iteration = 0; iteration < 20; iteration += 1) {
      for (const code of ["A1", "M221"]) {
        expect(isPoparoozColorCode(code)).toBe(true);
      }
      for (const code of ["a1", "A0", "A01", "OTHER"]) {
        expect(isPoparoozColorCode(code)).toBe(false);
      }
    }
  });

  it("covers all active and autoMatchEligible combinations", () => {
    const inactiveManual = matchableColor("A1", {
      active: false,
      autoMatchEligible: false,
    });
    const inactiveEligible = matchableColor("B1", {
      active: false,
      autoMatchEligible: true,
    });
    const activeManual = matchableColor("C1", {
      autoMatchEligible: false,
    });
    const activeEligible = matchableColor("D1");

    const candidates = prepareColorMatchCandidates([
      inactiveManual,
      inactiveEligible,
      activeManual,
      activeEligible,
    ]);

    expect(candidates.map(({ color }) => color.code)).toEqual(["D1"]);
    expect(activeEligible).not.toHaveProperty("isSellable");
    expect(activeEligible).not.toHaveProperty("finish");
    expect(activeEligible).not.toHaveProperty("packSize");
  });

  it("does not read commerce, finish, pack, or inventory fields", () => {
    const forbidden = new Set([
      "isSellable",
      "referenceCode",
      "displayCode",
      "finish",
      "isSpecialFinish",
      "finishType",
      "packSize",
      "packsRequired",
      "inventory",
      "supplier",
      "productHandle",
      "variantId",
      "substitutes",
    ]);
    const guarded = new Proxy(matchableColor("A1"), {
      get(target, property, receiver) {
        if (typeof property === "string" && forbidden.has(property)) {
          throw new Error(`Unexpected field read: ${property}`);
        }
        return Reflect.get(target, property, receiver);
      },
      ownKeys() {
        throw new Error("Unexpected candidate field enumeration.");
      },
    });

    const candidates = prepareColorMatchCandidates([guarded]);
    expect(
      matchNearestColor({ l: 50, a: 0, b: 0 }, candidates).color.code,
    ).toBe("A1");
  });

  it("preserves the caller type and accepts GenerationPaletteColor structurally", () => {
    const generationColor: GenerationPaletteColor = {
      code: "A1",
      hex: "#000000",
      rgb: [0, 0, 0],
      lab: [0, 0, 0],
      sortOrder: 0,
      active: true,
      autoMatchEligible: true,
    };
    const generationResult = matchNearestColor(
      { l: 0, a: 0, b: 0 },
      prepareColorMatchCandidates([generationColor]),
    );
    const typedGenerationColor: GenerationPaletteColor = generationResult.color;

    const custom = matchableColor("A2", { marker: "preserved" });
    const customResult = matchNearestColor(
      { l: 50, a: 0, b: 0 },
      prepareColorMatchCandidates([custom]),
    );

    expect(typedGenerationColor).toBe(generationColor);
    expect(customResult.color.marker).toBe("preserved");
  });

  it("returns the nearest Lab color and its unchanged CIEDE2000 distance", () => {
    const nearer = matchableColor("A1", { lab: [51, 0, 0] });
    const farther = matchableColor("B1", { lab: [80, 0, 0] });
    const target = { l: 50, a: 0, b: 0 };
    const result = matchNearestColor(
      target,
      prepareColorMatchCandidates([farther, nearer]),
    );

    expect(result.color).toBe(nearer);
    expect(result.distance).toBe(deltaE2000(target, { l: 51, a: 0, b: 0 }));
  });

  it("lets distance win before sortOrder and code", () => {
    const exact = matchableColor("B1", {
      lab: [50, 0, 0],
      sortOrder: 99,
    });
    const farther = matchableColor("A1", {
      lab: [50, 1e-9, 0],
      sortOrder: 0,
    });

    expect(
      matchNearestColor({ l: 50, a: 0, b: 0 }, [
        coreCandidate(farther),
        coreCandidate(exact),
      ]).color.code,
    ).toBe("B1");
  });

  it("uses sortOrder for distances within the fixed epsilon", () => {
    const later = matchableColor("B1", {
      lab: [50, 0, 0],
      sortOrder: 5,
    });
    const earlier = matchableColor("A1", {
      lab: [50, MATCH_DISTANCE_EPSILON / 4, 0],
      sortOrder: 1,
    });

    expect(
      matchNearestColor({ l: 50, a: 0, b: 0 }, [
        coreCandidate(later),
        coreCandidate(earlier),
      ]).color.code,
    ).toBe("A1");
  });

  it("uses exact binary code order independently of input order", () => {
    const alpha = matchableColor("A2", { sortOrder: 1 });
    const beta = matchableColor("B1", { sortOrder: 1 });
    const forward = [coreCandidate(beta), coreCandidate(alpha)];
    const reverse = [...forward].reverse();

    const first = matchNearestColor({ l: 50, a: 0, b: 0 }, forward);
    const second = matchNearestColor({ l: 50, a: 0, b: 0 }, reverse);

    expect(first.color.code).toBe("A2");
    expect(second).toEqual(first);
    for (let index = 0; index < 20; index += 1) {
      expect(matchNearestColor({ l: 50, a: 0, b: 0 }, reverse)).toEqual(first);
    }
  });

  it("rejects duplicate codes before matching", () => {
    const first = matchableColor("A1", { sortOrder: 0 });
    const second = matchableColor("A1", { sortOrder: 1 });

    expectMatchingError(
      () => prepareColorMatchCandidates([first, second]),
      "INVALID_PALETTE_CANDIDATE",
    );
    expectMatchingError(
      () =>
        matchNearestColor({ l: 50, a: 0, b: 0 }, [
          coreCandidate(first),
          coreCandidate(second),
        ]),
      "INVALID_PALETTE_CANDIDATE",
    );
  });

  it("distinguishes empty input from no eligible colors", () => {
    expectMatchingError(() => prepareColorMatchCandidates([]), "EMPTY_PALETTE");
    expectMatchingError(
      () =>
        prepareColorMatchCandidates([
          matchableColor("A1", { autoMatchEligible: false }),
        ]),
      "NO_ELIGIBLE_PALETTE_COLORS",
    );
    expectMatchingError(
      () => matchNearestColor({ l: 50, a: 0, b: 0 }, []),
      "EMPTY_PALETTE",
    );
  });

  it("rejects invalid target and candidate Lab values", () => {
    expectMatchingError(
      () =>
        matchNearestColor({ l: Number.NaN, a: 0, b: 0 }, [
          coreCandidate(matchableColor("A1")),
        ]),
      "INVALID_LAB_COLOR",
    );
    expectMatchingError(
      () =>
        prepareColorMatchCandidates([
          matchableColor("B1", {
            lab: [50, Number.POSITIVE_INFINITY, 0],
          }),
        ]),
      "INVALID_PALETTE_CANDIDATE",
    );
    expectMatchingError(
      () =>
        prepareColorMatchCandidates([
          matchableColor("C1", {
            lab: [50, 0] as unknown as readonly [number, number, number],
          }),
        ]),
      "INVALID_PALETTE_CANDIDATE",
    );
  });

  it.each(["", " A1", "A1 ", "A 1"])("rejects invalid code %j", (code) => {
    expectMatchingError(
      () => prepareColorMatchCandidates([matchableColor(code)]),
      "INVALID_PALETTE_CANDIDATE",
    );
  });

  it("fails safely when CIEDE2000 cannot produce a finite distance", () => {
    expectMatchingError(
      () =>
        matchNearestColor({ l: 50, a: 0, b: 0 }, [
          coreCandidate(
            matchableColor("A1", {
              lab: [50, Number.MAX_VALUE, Number.MAX_VALUE],
            }),
          ),
        ]),
      "NON_FINITE_COLOR_DISTANCE",
    );
  });

  it.each([-1, 0.5])("rejects invalid sortOrder %s", (sortOrder) => {
    expectMatchingError(
      () => prepareColorMatchCandidates([matchableColor("A1", { sortOrder })]),
      "INVALID_PALETTE_CANDIDATE",
    );
  });

  it("does not mutate source arrays, colors, Lab tuples, or candidates", () => {
    const color = matchableColor("A1", { lab: [51, 2, -3] });
    const colors = [color];
    const beforeColors = structuredClone(colors);
    const candidates = prepareColorMatchCandidates(colors);
    const beforeCandidates = structuredClone(candidates);

    matchNearestColor({ l: 50, a: 0, b: 0 }, candidates);

    expect(colors).toEqual(beforeColors);
    expect(color.lab).toEqual(beforeColors[0]!.lab);
    expect(candidates).toEqual(beforeCandidates);
  });
});

describe("legacy PaletteDefinition compatibility wrapper", () => {
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
  it("preserves exact shared-core distance and restores the Legacy color", () => {
    const legacyColor = makeColor("PARITY", {
      displayCode: "A1",
      lab: [52, 4, -7],
      sortOrder: 7,
    });
    const target = { l: 50, a: 0, b: 0 };
    const narrowColor = matchableColor(legacyColor.displayCode, {
      lab: legacyColor.lab,
      sortOrder: legacyColor.sortOrder,
      active: legacyColor.isActive,
      autoMatchEligible: legacyColor.isAutoMatchEnabled,
    });

    const coreResult = matchNearestColor(target, [coreCandidate(narrowColor)]);
    const legacyResult = matchNearestPaletteColor(target, [
      candidate(legacyColor),
    ]);

    expect(legacyResult.distance).toBe(coreResult.distance);
    expect(legacyResult.color).toEqual(legacyColor);
    expect(legacyResult.color.referenceCode).toBe(legacyColor.referenceCode);
  });

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
    const zulu = makeColor("ZULU", {
      displayCode: "B1",
      lab: [50, 0, 0],
      sortOrder: 1,
    });
    const alpha = makeColor("ALPHA", {
      displayCode: "A1",
      lab: [50, 0, 0],
      sortOrder: 1,
    });
    expect(
      matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
        candidate(zulu),
        candidate(alpha),
      ]).color.displayCode,
    ).toBe(alpha.displayCode);
  });

  it("rejects duplicate displayCode instead of using referenceCode as a tertiary tie-break", () => {
    const later = makeColor("LATER-REF", {
      referenceCode: "TEST-REF-Z",
      displayCode: "A1",
      lab: [50, 0, 0],
      sortOrder: 1,
    });
    const earlier = makeColor("EARLIER-REF", {
      referenceCode: "TEST-REF-A",
      displayCode: "A1",
      lab: [50, 0, 0],
      sortOrder: 1,
    });
    expectMatchingError(
      () =>
        matchNearestPaletteColor({ l: 50, a: 0, b: 0 }, [
          candidate(later),
          candidate(earlier),
        ]),
      "INVALID_PALETTE_CANDIDATE",
    );
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
