import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { BoardProfile } from "../board/board-profile.types";
import { deltaE2000 } from "../color";
import { TRANSPARENT_COLOR_INDEX } from "../quantization/quantization-options";
import type {
  QuantizedColor,
  QuantizedImage,
} from "../quantization/quantization.types";
import {
  MAX_PATTERN_COLORS,
  PATTERN_ASSEMBLY_ERROR_CODES,
  PATTERN_TRANSPARENT_INDEX,
  PatternAssemblyError,
  assemblePattern,
  toPublicPatternResult,
  validatePatternAssemblyResult,
  type PatternAssemblyErrorCode,
  type PatternAssemblyResult,
} from ".";
import type { GenerationPaletteColor } from "../../runtime/generation-palette/generation-palette.types";

function color(
  code: string,
  overrides: Partial<GenerationPaletteColor> = {},
): GenerationPaletteColor {
  return {
    code,
    hex: "#112233",
    rgb: [17, 34, 51],
    lab: [50, 0, 0],
    active: true,
    autoMatchEligible: true,
    sortOrder: 1,
    ...overrides,
  };
}

const COLOR_A = color("A1", {
  lab: [20, 0, 0],
  sortOrder: 20,
});
const COLOR_B = color("B1", { lab: [80, 0, 0], sortOrder: 10 });
const INACTIVE = color("C1", {
  active: false,
  autoMatchEligible: false,
  sortOrder: 2,
});
const MANUAL = color("D1", {
  autoMatchEligible: false,
  sortOrder: 3,
});

function paletteColors(
  colors: readonly GenerationPaletteColor[] = [
    COLOR_A,
    INACTIVE,
    COLOR_B,
    MANUAL,
  ],
): readonly GenerationPaletteColor[] {
  return colors;
}

const BOARD: BoardProfile = {
  id: "test-pattern-board-not-production",
  name: "Non-Production Internal Test Board",
  columns: 2,
  rows: 2,
  beadSizeMm: 5,
  isDefault: false,
  isActive: true,
};

function quantizedColor(
  index: number,
  pixelCount: number,
  l: number,
): QuantizedColor {
  return {
    index,
    rgb: { r: index + 1, g: index + 2, b: index + 3 },
    lab: { l, a: 0, b: 0 },
    pixelCount,
  };
}

function quantizedFixture(
  colors: readonly QuantizedColor[] = [
    quantizedColor(0, 2, 20),
    quantizedColor(1, 1, 21),
    quantizedColor(2, 2, 80),
  ],
): QuantizedImage {
  return {
    width: 3,
    height: 2,
    colors,
    colorIndices: new Uint16Array([0, 1, 2, TRANSPARENT_COLOR_INDEX, 2, 0]),
    transparentIndex: TRANSPARENT_COLOR_INDEX,
    opaquePixelCount: 5,
    transparentPixelCount: 1,
  };
}

function solidQuantized(
  width: number,
  height: number,
  transparentPositions: readonly number[] = [],
): QuantizedImage {
  const indices = new Uint16Array(width * height);
  for (const position of transparentPositions) {
    indices[position] = TRANSPARENT_COLOR_INDEX;
  }
  const transparentPixelCount = transparentPositions.length;
  const opaquePixelCount = indices.length - transparentPixelCount;
  return {
    width,
    height,
    colors: [quantizedColor(0, opaquePixelCount, 20)],
    colorIndices: indices,
    transparentIndex: TRANSPARENT_COLOR_INDEX,
    opaquePixelCount,
    transparentPixelCount,
  };
}

function expectPatternError(
  callback: () => unknown,
  code: PatternAssemblyErrorCode,
): void {
  try {
    callback();
    throw new Error("Expected a pattern assembly error.");
  } catch (error) {
    expect(error).toBeInstanceOf(PatternAssemblyError);
    expect((error as PatternAssemblyError).code).toBe(code);
  }
}

describe("pattern palette mapping and merging", () => {
  it("maps eligible colors with CIEDE2000 and merges identical palette matches", () => {
    const result = assemblePattern({
      quantizedImage: quantizedFixture(),
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });

    expect(result.colors).toHaveLength(2);
    expect(result.colors.map(({ color: item }) => item.code)).toEqual([
      "B1",
      "A1",
    ]);
    expect(result.colors[0]).toMatchObject({ index: 0, beadCount: 2 });
    expect(result.colors[1]).toMatchObject({ index: 1, beadCount: 3 });
    expect(result.colors[1]!.sourceMappings).toEqual([
      {
        quantizedColorIndex: 0,
        paletteCode: "A1",
        distance: 0,
        pixelCount: 2,
      },
      {
        quantizedColorIndex: 1,
        paletteCode: "A1",
        distance: expect.any(Number),
        pixelCount: 1,
      },
    ]);
    expect(Object.keys(result.colors[1]!.sourceMappings[0]!).sort()).toEqual([
      "distance",
      "paletteCode",
      "pixelCount",
      "quantizedColorIndex",
    ]);
    const distance = deltaE2000({ l: 21, a: 0, b: 0 }, { l: 20, a: 0, b: 0 });
    expect(result.colors[1]!.weightedAverageDistance).toBe(distance / 3);
    expect(result.colors[1]!.maximumDistance).toBe(distance);
  });

  it("excludes inactive and manual candidates", () => {
    const result = assemblePattern({
      quantizedImage: solidQuantized(1, 1),
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });
    expect(result.colors).toHaveLength(1);
    expect(result.colors[0]!.color.code).toBe("A1");
  });

  it("uses the accepted tie-breaker instead of palette order", () => {
    const later = color("A8", { lab: [20, 0, 0], sortOrder: 8 });
    const winner = color("A2", { lab: [20, 0, 0], sortOrder: 2 });
    const result = assemblePattern({
      quantizedImage: solidQuantized(1, 1),
      paletteColors: paletteColors([later, winner]),
      boardProfile: BOARD,
    });
    expect(result.colors[0]!.color.code).toBe("A2");
  });

  it("uses Palette Lab rather than RGB or HEX for matching", () => {
    const misleadingRgb = color("A3", {
      rgb: [255, 0, 0],
      hex: "#FF0000",
      lab: [90, 0, 0],
      sortOrder: 1,
    });
    const labWinner = color("A4", {
      rgb: [0, 255, 0],
      hex: "#00FF00",
      lab: [20, 0, 0],
      sortOrder: 2,
    });
    const result = assemblePattern({
      quantizedImage: solidQuantized(1, 1),
      paletteColors: paletteColors([misleadingRgb, labWinner]),
      boardProfile: BOARD,
    });
    expect(result.colors[0]!.color.code).toBe("A4");
  });

  it("sorts final colors by sortOrder then binary code", () => {
    const zColor = color("B2", {
      lab: [20, 0, 0],
      sortOrder: 5,
    });
    const aColor = color("A2", {
      lab: [80, 0, 0],
      sortOrder: 5,
    });
    const result = assemblePattern({
      quantizedImage: quantizedFixture(),
      paletteColors: paletteColors([zColor, aColor]),
      boardProfile: BOARD,
    });
    expect(result.colors.map(({ color: item }) => item.code)).toEqual([
      "A2",
      "B2",
    ]);
    expect(result.colors.map(({ index }) => index)).toEqual([0, 1]);
  });

  it("distinguishes invalid palettes from palettes with no eligible colors", () => {
    expectPatternError(
      () =>
        assemblePattern({
          quantizedImage: solidQuantized(1, 1),
          paletteColors: [],
          boardProfile: BOARD,
        }),
      "INVALID_PALETTE",
    );
    expectPatternError(
      () =>
        assemblePattern({
          quantizedImage: solidQuantized(1, 1),
          paletteColors: paletteColors([INACTIVE, MANUAL]),
          boardProfile: BOARD,
        }),
      "NO_ELIGIBLE_PALETTE_COLORS",
    );
  });

  it("rejects duplicate official codes without a fallback identity", () => {
    expectPatternError(
      () =>
        assemblePattern({
          quantizedImage: solidQuantized(1, 1),
          paletteColors: [COLOR_A, { ...COLOR_B, code: COLOR_A.code }],
          boardProfile: BOARD,
        }),
      "INVALID_PALETTE",
    );
  });
});

describe("pattern matrix, materials, and totals", () => {
  it.each([
    [1, 1, [] as number[], [0]],
    [2, 2, [1], [0, PATTERN_TRANSPARENT_INDEX, 0, 0]],
  ])(
    "preserves exact %sx%s matrix coordinates",
    (width, height, transparent, expected) => {
      const result = assemblePattern({
        quantizedImage: solidQuantized(width, height, transparent),
        paletteColors: paletteColors([COLOR_A]),
        boardProfile: BOARD,
      });
      expect([...result.matrix.colorIndices]).toEqual(expected);
      expect(result.matrix).toMatchObject({ width, height });
    },
  );

  it("builds an independent untrimmed matrix with merged final indices", () => {
    const input = quantizedFixture();
    const before = input.colorIndices.slice();
    const result = assemblePattern({
      quantizedImage: input,
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });
    expect(result.matrix).toMatchObject({
      width: 3,
      height: 2,
      transparentIndex: PATTERN_TRANSPARENT_INDEX,
    });
    expect([...result.matrix.colorIndices]).toEqual([
      1,
      1,
      0,
      PATTERN_TRANSPARENT_INDEX,
      0,
      1,
    ]);
    expect(result.matrix.colorIndices.buffer).not.toBe(
      input.colorIndices.buffer,
    );
    expect(input.colorIndices).toEqual(before);
  });

  it("calculates exact generation-only materials and totals without waste", () => {
    const result = assemblePattern({
      quantizedImage: quantizedFixture(),
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });
    expect(result.materials).toEqual([
      expect.objectContaining({
        patternColorIndex: 0,
        beadCount: 2,
      }),
      expect.objectContaining({
        patternColorIndex: 1,
        beadCount: 3,
      }),
    ]);
    for (const material of result.materials) {
      expect(Object.keys(material).sort()).toEqual([
        "beadCount",
        "color",
        "patternColorIndex",
      ]);
      expect(material).not.toHaveProperty("packSize");
      expect(material).not.toHaveProperty("packsRequired");
    }
    expect(result.totals).toEqual({
      width: 3,
      height: 2,
      totalPositions: 6,
      totalBeads: 5,
      transparentPositions: 1,
      colorCount: 2,
    });
    expect(
      result.materials.reduce((sum, item) => sum + item.beadCount, 0),
    ).toBe(5);
  });

  it("validates material identity by official code rather than object reference", () => {
    const result = assemblePattern({
      quantizedImage: solidQuantized(2, 1),
      paletteColors: paletteColors([COLOR_A]),
      boardProfile: BOARD,
    });
    expect(() =>
      validatePatternAssemblyResult({
        ...result,
        materials: [
          { ...result.materials[0]!, color: { ...result.materials[0]!.color } },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects invalid official color codes", () => {
    expectPatternError(
      () =>
        assemblePattern({
          quantizedImage: solidQuantized(1, 1),
          paletteColors: paletteColors([{ ...COLOR_A, code: "INVALID" }]),
          boardProfile: BOARD,
        }),
      "INVALID_PALETTE",
    );
  });

  it.each([
    [1, 1, 1, 1, 1],
    [2, 2, 1, 1, 1],
    [3, 2, 2, 1, 2],
    [2, 3, 1, 2, 2],
    [3, 3, 2, 2, 4],
  ])(
    "lays out %sx%s over the complete matrix",
    (width, height, boardColumns, boardRows, boardCount) => {
      const result = assemblePattern({
        quantizedImage: solidQuantized(width, height),
        paletteColors: paletteColors(),
        boardProfile: BOARD,
      });
      expect(result.boardLayout).toMatchObject({
        boardColumns,
        boardRows,
        boardCount,
      });
      expect(result.boardLayout.tiles).toHaveLength(boardCount);
    },
  );
});

describe("board layout statistics", () => {
  it("counts row-major edge tiles, transparent positions, and outside pegs", () => {
    const result = assemblePattern({
      quantizedImage: quantizedFixture(),
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });
    expect(result.boardLayout).toMatchObject({
      boardColumns: 2,
      boardRows: 1,
      boardCount: 2,
      boardWidthInBeads: 2,
      boardHeightInBeads: 2,
      totalPegCapacity: 8,
      usedBeadCount: 5,
      transparentPatternPositions: 1,
      outsidePatternPegCount: 2,
      unusedPegCount: 3,
    });
    expect(result.boardLayout.tiles).toEqual([
      {
        index: 0,
        row: 0,
        column: 0,
        originX: 0,
        originY: 0,
        coveredWidth: 2,
        coveredHeight: 2,
        beadCount: 3,
        transparentPatternPositions: 1,
        outsidePatternPegCount: 0,
      },
      {
        index: 1,
        row: 0,
        column: 1,
        originX: 2,
        originY: 0,
        coveredWidth: 1,
        coveredHeight: 2,
        beadCount: 2,
        transparentPatternPositions: 0,
        outsidePatternPegCount: 2,
      },
    ]);
  });

  it("uses BoardProfile rows/columns and rejects invalid profiles", () => {
    const custom = { ...BOARD, columns: 3, rows: 1 };
    const result = assemblePattern({
      quantizedImage: solidQuantized(3, 2),
      paletteColors: paletteColors(),
      boardProfile: custom,
    });
    expect(result.boardLayout).toMatchObject({
      boardColumns: 1,
      boardRows: 2,
      boardCount: 2,
    });
    expectPatternError(
      () =>
        assemblePattern({
          quantizedImage: solidQuantized(1, 1),
          paletteColors: paletteColors(),
          boardProfile: { ...BOARD, columns: 0 },
        }),
      "INVALID_BOARD_PROFILE",
    );
  });

  it("reconciles every tile and layout total for partial boards", () => {
    const result = assemblePattern({
      quantizedImage: solidQuantized(3, 3, [0, 8]),
      paletteColors: paletteColors([COLOR_A]),
      boardProfile: BOARD,
    });
    expect(result.boardLayout).toMatchObject({
      boardCount: 4,
      totalPegCapacity: 16,
      usedBeadCount: 7,
      transparentPatternPositions: 2,
      outsidePatternPegCount: 7,
      unusedPegCount: 9,
    });
    expect(
      result.boardLayout.tiles.reduce((sum, tile) => sum + tile.beadCount, 0),
    ).toBe(7);
    expect(
      result.boardLayout.tiles.reduce(
        (sum, tile) => sum + tile.transparentPatternPositions,
        0,
      ),
    ).toBe(2);
    expect(
      result.boardLayout.tiles.reduce(
        (sum, tile) => sum + tile.outsidePatternPegCount,
        0,
      ),
    ).toBe(7);
  });
});

describe("public pattern boundary", () => {
  it("constructs an explicit Poparooz-only model with independent matrix ownership", () => {
    const internal = assemblePattern({
      quantizedImage: quantizedFixture(),
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });
    const publicResult = toPublicPatternResult(internal);
    expect(Object.isFrozen(publicResult.colors)).toBe(true);
    expect(Object.isFrozen(publicResult.materials)).toBe(true);
    expect(Object.isFrozen(publicResult.colors[0]!.color)).toBe(true);
    expect(
      publicResult.colors.every(({ color: item }) => item.brand === "Poparooz"),
    ).toBe(true);
    expect(publicResult.colors[0]!.color).toEqual({
      brand: "Poparooz",
      code: "B1",
      hex: "#112233",
    });
    expect(Object.keys(publicResult.colors[0]!.color).sort()).toEqual([
      "brand",
      "code",
      "hex",
    ]);
    expect(publicResult.matrix.colorIndices).toEqual(
      internal.matrix.colorIndices,
    );
    expect(publicResult.matrix.colorIndices.buffer).not.toBe(
      internal.matrix.colorIndices.buffer,
    );
    publicResult.matrix.colorIndices[0] = 44;
    expect(internal.matrix.colorIndices[0]).toBe(1);

    const serialized = JSON.stringify(publicResult);
    for (const forbidden of [
      "MARD",
      "referenceSystem",
      "referenceCode",
      "referenceName",
      "referenceSeries",
      "sourceVersion",
      "verifiedAt",
      "productHandle",
      "variantId",
      "isSellable",
      "isSpecialFinish",
      "finishType",
      "packSize",
      "packsRequired",
      "inventory",
      "rgb",
      "lab",
      "sortOrder",
      "active",
      "autoMatchEligible",
      "sourceMappings",
      "weightedAverageDistance",
      "maximumDistance",
      BOARD.id,
      BOARD.name,
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("omits an unavailable color name while preserving the Poparooz code", () => {
    const unnamed = color("A1");
    const publicResult = toPublicPatternResult(
      assemblePattern({
        quantizedImage: solidQuantized(2, 1),
        paletteColors: paletteColors([unnamed]),
        boardProfile: BOARD,
      }),
    );

    expect(publicResult.colors[0]!.color).toEqual({
      brand: "Poparooz",
      code: "A1",
      hex: "#112233",
    });
    expect(Object.hasOwn(publicResult.colors[0]!.color, "name")).toBe(false);
    expect(JSON.stringify(publicResult)).not.toContain("Unknown Color");
    expect(JSON.stringify(publicResult)).not.toContain("undefined");
  });

  it("wraps invalid internal results in a public mapping error", () => {
    const internal = assemblePattern({
      quantizedImage: solidQuantized(1, 1),
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });
    expectPatternError(
      () =>
        toPublicPatternResult({
          ...internal,
          totals: { ...internal.totals, totalBeads: 0 },
        }),
      "PUBLIC_PATTERN_MAPPING_FAILED",
    );
  });

  it("uses public color fields consistently for materials", () => {
    const publicResult = toPublicPatternResult(
      assemblePattern({
        quantizedImage: solidQuantized(2, 1),
        paletteColors: paletteColors([COLOR_A]),
        boardProfile: BOARD,
      }),
    );
    expect(publicResult.materials[0]).toEqual({
      patternColorIndex: 0,
      color: {
        brand: "Poparooz",
        code: "A1",
        hex: "#112233",
      },
      beadCount: 2,
    });
    expect(Object.keys(publicResult.materials[0]!).sort()).toEqual([
      "beadCount",
      "color",
      "patternColorIndex",
    ]);
  });
});

describe("input validation and result invariants", () => {
  it("freezes the Uint16 capacity and stable error categories", () => {
    expect(PATTERN_TRANSPARENT_INDEX).toBe(65535);
    expect(MAX_PATTERN_COLORS).toBe(65535);
    expect(PATTERN_ASSEMBLY_ERROR_CODES).toEqual([
      "INVALID_QUANTIZED_IMAGE",
      "INVALID_PALETTE",
      "NO_ELIGIBLE_PALETTE_COLORS",
      "INVALID_BOARD_PROFILE",
      "INVALID_QUANTIZED_COLOR_INDEX",
      "MISSING_QUANTIZED_COLOR_MAPPING",
      "INVALID_PATTERN_COLOR_INDEX",
      "PATTERN_COLOR_CAPACITY_EXCEEDED",
      "INVALID_PATTERN_MATRIX",
      "INVALID_MATERIAL_REQUIREMENT",
      "INVALID_BOARD_LAYOUT",
      "INVALID_PATTERN_RESULT",
      "PUBLIC_PATTERN_MAPPING_FAILED",
    ]);
  });

  it.each([
    [
      "matrix length",
      { ...quantizedFixture(), colorIndices: new Uint16Array([0]) },
    ],
    ["sentinel", { ...quantizedFixture(), transparentIndex: 123 }],
    [
      "duplicate color index",
      quantizedFixture([
        quantizedColor(0, 2, 20),
        quantizedColor(0, 1, 21),
        quantizedColor(2, 2, 80),
      ]),
    ],
    [
      "missing referenced color",
      {
        ...quantizedFixture(),
        colorIndices: new Uint16Array([0, 1, 8, 65535, 2, 0]),
      },
    ],
    [
      "invalid Lab lightness",
      quantizedFixture([
        quantizedColor(0, 2, 120),
        quantizedColor(1, 1, 21),
        quantizedColor(2, 2, 80),
      ]),
    ],
  ])("rejects an invalid quantized image: %s", (_label, quantizedImage) => {
    expectPatternError(
      () =>
        assemblePattern({
          quantizedImage,
          paletteColors: paletteColors(),
          boardProfile: BOARD,
        }),
      "INVALID_QUANTIZED_IMAGE",
    );
  });

  it("detects matrix, material, board, and aggregate result corruption", () => {
    const valid = assemblePattern({
      quantizedImage: quantizedFixture(),
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          matrix: {
            ...valid.matrix,
            colorIndices: new Uint16Array([99, 1, 0, 65535, 0, 1]),
          },
        }),
      "INVALID_PATTERN_MATRIX",
    );
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          materials: [
            { ...valid.materials[0]!, beadCount: 99 },
            valid.materials[1]!,
          ],
        }),
      "INVALID_MATERIAL_REQUIREMENT",
    );
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          materials: [
            {
              ...valid.materials[0]!,
              color: { ...valid.materials[0]!.color, code: "H99" },
            },
            valid.materials[1]!,
          ],
        }),
      "INVALID_MATERIAL_REQUIREMENT",
    );
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          materials: [valid.materials[0]!],
        }),
      "INVALID_MATERIAL_REQUIREMENT",
    );
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          materials: [valid.materials[0]!, valid.materials[0]!],
        }),
      "INVALID_MATERIAL_REQUIREMENT",
    );
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          colors: [
            valid.colors[0]!,
            {
              ...valid.colors[1]!,
              color: {
                ...valid.colors[1]!.color,
                code: valid.colors[0]!.color.code,
              },
            },
          ],
        }),
      "INVALID_PATTERN_RESULT",
    );
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          boardLayout: { ...valid.boardLayout, unusedPegCount: 99 },
        }),
      "INVALID_BOARD_LAYOUT",
    );
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          totals: { ...valid.totals, colorCount: 99 },
        }),
      "INVALID_PATTERN_RESULT",
    );
  });

  it("turns malformed nested result objects into stable errors", () => {
    const valid = assemblePattern({
      quantizedImage: solidQuantized(1, 1),
      paletteColors: paletteColors([COLOR_A]),
      boardProfile: BOARD,
    });
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          colors: [null],
        } as unknown as PatternAssemblyResult),
      "INVALID_PATTERN_RESULT",
    );
    expectPatternError(
      () =>
        validatePatternAssemblyResult({
          ...valid,
          boardLayout: { ...valid.boardLayout, tiles: [null] },
        } as unknown as PatternAssemblyResult),
      "INVALID_BOARD_LAYOUT",
    );
  });
});

describe("determinism and domain boundary", () => {
  it("is stable across palette and QuantizedColor array order", () => {
    const input = quantizedFixture();
    const first = assemblePattern({
      quantizedImage: input,
      paletteColors: paletteColors(),
      boardProfile: BOARD,
    });
    const second = assemblePattern({
      quantizedImage: quantizedFixture([
        input.colors[2]!,
        input.colors[0]!,
        input.colors[1]!,
      ]),
      paletteColors: paletteColors([...paletteColors()].reverse()),
      boardProfile: BOARD,
    });
    expect(second).toEqual(first);
    expect(
      assemblePattern({
        quantizedImage: input,
        paletteColors: paletteColors(),
        boardProfile: BOARD,
      }),
    ).toEqual(first);
  });

  it("accepts deeply frozen inputs without retaining or modifying them", () => {
    const image = quantizedFixture();
    Object.freeze(image.colors);
    image.colors.forEach((item) => {
      Object.freeze(item.rgb);
      Object.freeze(item.lab);
      Object.freeze(item);
    });
    Object.freeze(image);
    const sourcePalette = paletteColors();
    sourcePalette.forEach((item) => {
      Object.freeze(item.rgb);
      Object.freeze(item.lab);
      Object.freeze(item);
    });
    Object.freeze(sourcePalette);
    const board = Object.freeze({ ...BOARD });
    const result = assemblePattern({
      quantizedImage: image,
      paletteColors: sourcePalette,
      boardProfile: board,
    });
    expect(result.colors[0]!.color).toBe(sourcePalette[2]);
    expect(result.boardLayout.boardProfileId).toBe(board.id);
  });

  it("contains no forbidden platform, locale, random, or Worker dependencies", () => {
    const directory = resolve(process.cwd(), "src/domain/pattern");
    const productionFiles = [
      "pattern-assembler.ts",
      "pattern-palette-mapping.ts",
      "pattern-matrix.ts",
      "material-requirements.ts",
      "board-layout.ts",
      "pattern-result-validation.ts",
      "public-pattern.mapper.ts",
    ];
    const source = productionFiles
      .map((file) => readFileSync(resolve(directory, file), "utf8"))
      .join("\n");
    for (const forbidden of [
      "localeCompare",
      "Math.random",
      "Date(",
      "Worker",
      "postMessage",
      "Canvas",
      "fetch(",
      "XMLHttpRequest",
      "localStorage",
      "indexedDB",
      "Shopify",
      "import.meta.env",
      "PaletteDefinition",
      "referenceCode",
      "paletteReferenceCode",
      "displayCode",
      "isSellable",
      "isSpecialFinish",
      "finishType",
      "packSize",
      "packsRequired",
      "productHandle",
      "variantId",
      "toPublicPaletteColor",
      "preparePaletteCandidates",
      "matchNearestPaletteColor",
    ]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).toContain("prepareColorMatchCandidates");
    expect(source).toContain("matchNearestColor");
  });
});
