import { describe, expect, it } from "vitest";

import {
  TEST_PALETTE_DEFINITION,
  TEST_PLAIN_PALETTE_COLOR,
} from "./palette.fixture";
import {
  parsePaletteColor,
  parsePaletteDefinition,
  safeParsePaletteColor,
  safeParsePaletteDefinition,
} from "./palette.validation";

interface ValidationResult {
  readonly success: boolean;
  readonly error?: {
    readonly issues: readonly {
      readonly path: readonly PropertyKey[];
      readonly message: string;
    }[];
  };
}

function expectIssue(
  result: ValidationResult,
  expectedPath: readonly PropertyKey[],
  expectedReason: string,
): void {
  expect(result.success).toBe(false);

  if (result.success || result.error === undefined) {
    throw new Error("Expected validation to fail.");
  }

  expect(
    result.error.issues.some(
      (issue) =>
        JSON.stringify(issue.path) === JSON.stringify(expectedPath) &&
        issue.message.includes(expectedReason),
    ),
    JSON.stringify(result.error.issues),
  ).toBe(true);
}

describe("PaletteColor", () => {
  it("parses a valid plain fixture and applies canonical casing", () => {
    const color = parsePaletteColor({
      ...TEST_PLAIN_PALETTE_COLOR,
      code: " fixture-plain ",
      hex: "#336699",
    });

    expect(color.code).toBe("FIXTURE-PLAIN");
    expect(color.hex).toBe("#336699");
  });

  it("rejects an invalid HEX value with a field-specific reason", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        hex: "336699",
      }),
      ["hex"],
      "#RRGGBB",
    );
  });

  it("rejects an out-of-range RGB channel", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        rgb: [256, 102, 153],
      }),
      ["rgb", 0],
      "between 0 and 255",
    );
  });

  it("rejects a non-integer RGB channel", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        rgb: [51.5, 102, 153],
      }),
      ["rgb", 0],
      "integers",
    );
  });

  it("rejects a non-finite Lab channel", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        lab: [42, Number.POSITIVE_INFINITY, -2],
      }),
      ["lab", 1],
      "finite",
    );
  });

  it("rejects Lab L outside 0 through 100", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        lab: [101, 1, -2],
      }),
      ["lab", 0],
      "between 0 and 100",
    );
  });

  it("rejects automatic matching for a non-sellable color", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        isSellable: false,
      }),
      ["isAutoMatchEnabled"],
      "sellable",
    );
  });

  it("rejects automatic matching for an inactive color", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        isActive: false,
      }),
      ["isAutoMatchEnabled"],
      "active",
    );
  });

  it("rejects a special finish without finishType", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        isSpecialFinish: true,
        isAutoMatchEnabled: false,
      }),
      ["finishType"],
      "require a finishType",
    );
  });

  it("rejects finishType on a plain color", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        finishType: "glow",
      }),
      ["finishType"],
      "must not define",
    );
  });

  it("rejects an invalid packSize", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        packSize: 0,
      }),
      ["packSize"],
      "positive integer",
    );
  });

  it("rejects HEX and RGB values that disagree", () => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        hex: "#336698",
      }),
      ["hex"],
      "match the RGB",
    );
  });
});

describe("PaletteDefinition", () => {
  it("parses the valid non-production test fixture", () => {
    expect(parsePaletteDefinition(TEST_PALETTE_DEFINITION)).toEqual(
      TEST_PALETTE_DEFINITION,
    );
  });

  it("rejects colorCount that differs from colors.length", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        colorCount: 2,
      }),
      ["colorCount"],
      "colors.length",
    );
  });

  it("rejects color codes duplicated after trimming and case normalization", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        colorCount: 2,
        colors: [
          TEST_PLAIN_PALETTE_COLOR,
          {
            ...TEST_PLAIN_PALETTE_COLOR,
            code: " fixture-plain ",
            sortOrder: 2,
          },
        ],
      }),
      ["colors", 1, "code"],
      "Duplicate normalized color code",
    );
  });

  it("rejects a color brand outside the MARD palette contract", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        colorCount: 1,
        colors: [
          {
            ...TEST_PLAIN_PALETTE_COLOR,
            brand: "OTHER",
          },
        ],
      }),
      ["colors", 0, "brand"],
      "MARD",
    );
  });

  it("rejects a verified palette without verifiedAt", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        sourceType: "verified",
      }),
      ["verifiedAt"],
      "require verifiedAt",
    );
  });

  it("accepts a verified palette with an ISO verification date", () => {
    expect(
      parsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        sourceType: "verified",
        verifiedAt: "2026-07-29",
      }).verifiedAt,
    ).toBe("2026-07-29");
  });

  it("rejects a non-ISO verifiedAt value", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        verifiedAt: "July 29, 2026",
      }),
      ["verifiedAt"],
      "ISO 8601",
    );
  });

  it("rejects a color sourceVersion different from the palette version", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        colorCount: 1,
        colors: [
          {
            ...TEST_PLAIN_PALETTE_COLOR,
            sourceVersion: "different-fixture-version",
          },
        ],
      }),
      ["colors", 0, "sourceVersion"],
      "equal the palette version",
    );
  });

  it("rejects an empty palette with an explicit reason", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        colorCount: 0,
        colors: [],
      }),
      ["colors"],
      "at least one color",
    );
  });
});
