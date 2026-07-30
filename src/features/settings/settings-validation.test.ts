import { describe, expect, it } from "vitest";

import { EMPTY_PATTERN_SETTINGS } from "./settings.types";
import { validatePatternSettings } from "./settings-validation";

describe("pattern settings validation", () => {
  it("starts without invented valid defaults", () => {
    expect(validatePatternSettings(EMPTY_PATTERN_SETTINGS)).toMatchObject({
      valid: false,
    });
  });

  it("accepts the formal dimension, color, and background boundaries", () => {
    expect(
      validatePatternSettings({
        width: "1",
        height: "1",
        maxColors: "1",
        background: "white",
      }),
    ).toEqual({
      valid: true,
      value: { width: 1, height: 1, maxColors: 1, background: "white" },
    });
    expect(
      validatePatternSettings({
        width: "4096",
        height: "4096",
        maxColors: "512",
        background: "transparent",
      }),
    ).toMatchObject({ valid: true });
  });

  it.each(["NaN", "Infinity", "-1", "1.5", "0", "4097"])(
    "rejects invalid dimension input %s",
    (width) => {
      expect(
        validatePatternSettings({
          width,
          height: "1",
          maxColors: "1",
          background: "white",
        }),
      ).toMatchObject({ valid: false, errors: { width: expect.any(String) } });
    },
  );

  it("rejects dimensions above the formal total-pixel boundary", () => {
    expect(
      validatePatternSettings({
        width: "4096",
        height: "4097",
        maxColors: "32",
        background: "white",
      }),
    ).toMatchObject({ valid: false });
  });

  it.each(["0", "513", "1.5", "Infinity"])(
    "rejects invalid maximum color input %s",
    (maxColors) => {
      expect(
        validatePatternSettings({
          width: "1",
          height: "1",
          maxColors,
          background: "white",
        }),
      ).toMatchObject({
        valid: false,
        errors: { maxColors: expect.any(String) },
      });
    },
  );
});
