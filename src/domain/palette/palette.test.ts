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
  it("parses separated internal and display fields and normalizes them", () => {
    const color = parsePaletteColor({
      ...TEST_PLAIN_PALETTE_COLOR,
      referenceCode: " test-ref-plain ",
      referenceName: " Fixture Internal Plain Name ",
      displayCode: " pop-test-plain ",
      displayName: " Test Plain Color ",
    });

    expect(color.referenceCode).toBe("TEST-REF-PLAIN");
    expect(color.referenceName).toBe("Fixture Internal Plain Name");
    expect(color.displayCode).toBe("POP-TEST-PLAIN");
    expect(color.displayName).toBe("Test Plain Color");
  });

  it.each(["brand", "code", "name", "series"] as const)(
    "strictly rejects the removed %s field",
    (field) => {
      expectIssue(
        safeParsePaletteColor({
          ...TEST_PLAIN_PALETTE_COLOR,
          [field]: "legacy-value",
        }),
        [],
        field,
      );
    },
  );

  it("accepts a color without displayName", () => {
    expect(
      parsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        displayName: undefined,
      }).displayName,
    ).toBeUndefined();
  });

  it.each(["", "   "])("rejects invalid displayName %j", (displayName) => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        displayName,
      }),
      ["displayName"],
      "must not be empty",
    );
  });

  it("accepts POPAROOZ as the formal palette reference system", () => {
    expect(
      parsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        referenceSystem: "POPAROOZ",
        referenceCode: "A1",
        displayCode: "A1",
        displayName: undefined,
      }).referenceSystem,
    ).toBe("POPAROOZ");
  });

  it.each(["OTHER", "poparooz", " POPAROOZ "])(
    "rejects unsupported reference system %j",
    (referenceSystem) => {
      expectIssue(
        safeParsePaletteColor({
          ...TEST_PLAIN_PALETTE_COLOR,
          referenceSystem,
        }),
        ["referenceSystem"],
        "POPAROOZ",
      );
    },
  );

  it.each([
    ["displayCode", "MARDTEST001"],
    ["displayName", "MARD Test Color"],
  ] as const)("rejects internal reference branding in %s", (field, value) => {
    expectIssue(
      safeParsePaletteColor({
        ...TEST_PLAIN_PALETTE_COLOR,
        [field]: value,
      }),
      [field],
      "internal reference-system name",
    );
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
  it("parses the valid internal and public field combination", () => {
    expect(parsePaletteDefinition(TEST_PALETTE_DEFINITION)).toEqual(
      TEST_PALETTE_DEFINITION,
    );
  });

  it("keeps the historical MARD reference system compatible", () => {
    expect(
      parsePaletteDefinition(TEST_PALETTE_DEFINITION).referenceSystem,
    ).toBe("MARD");
  });

  it("accepts a consistent POPAROOZ PaletteDefinition", () => {
    const palette = parsePaletteDefinition({
      ...TEST_PALETTE_DEFINITION,
      referenceSystem: "POPAROOZ",
      colors: TEST_PALETTE_DEFINITION.colors.map((color) => ({
        ...color,
        referenceSystem: "POPAROOZ",
      })),
    });

    expect(palette.referenceSystem).toBe("POPAROOZ");
    expect(
      palette.colors.every(
        (color) => color.referenceSystem === palette.referenceSystem,
      ),
    ).toBe(true);
  });

  it.each(["OTHER", "poparooz", " POPAROOZ "])(
    "rejects unsupported PaletteDefinition reference system %j",
    (referenceSystem) => {
      expectIssue(
        safeParsePaletteDefinition({
          ...TEST_PALETTE_DEFINITION,
          referenceSystem,
        }),
        ["referenceSystem"],
        "POPAROOZ",
      );
    },
  );

  it("rejects a PaletteDefinition and color reference-system mismatch", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        referenceSystem: "POPAROOZ",
      }),
      ["colors", 0, "referenceSystem"],
      "must match",
    );
  });

  it("accepts only Poparooz as displayBrand", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        displayBrand: "MARD",
      }),
      ["displayBrand"],
      "Poparooz",
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

  it("rejects duplicate normalized internal referenceCode values", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        colorCount: 2,
        colors: [
          TEST_PLAIN_PALETTE_COLOR,
          {
            ...TEST_PLAIN_PALETTE_COLOR,
            referenceCode: " test-ref-plain ",
            displayCode: "POP-TEST-SECOND",
            sortOrder: 2,
          },
        ],
      }),
      ["colors", 1, "referenceCode"],
      "internal referenceCode",
    );
  });

  it("rejects duplicate normalized Poparooz displayCode values", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        colorCount: 2,
        colors: [
          TEST_PLAIN_PALETTE_COLOR,
          {
            ...TEST_PLAIN_PALETTE_COLOR,
            referenceCode: "TEST-REF-SECOND",
            displayCode: " pop-test-plain ",
            sortOrder: 2,
          },
        ],
      }),
      ["colors", 1, "displayCode"],
      "Poparooz displayCode",
    );
  });

  it("rejects a color referenceSystem outside the palette contract", () => {
    expectIssue(
      safeParsePaletteDefinition({
        ...TEST_PALETTE_DEFINITION,
        colorCount: 1,
        colors: [
          {
            ...TEST_PLAIN_PALETTE_COLOR,
            referenceSystem: "OTHER",
          },
        ],
      }),
      ["colors", 0, "referenceSystem"],
      "POPAROOZ",
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
