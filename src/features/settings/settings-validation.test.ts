import { describe, expect, it } from "vitest";

import { EMPTY_PATTERN_SETTINGS } from "./settings.types";
import type { PatternSettingsDraft } from "./settings.types";
import { validatePatternSettings } from "./settings-validation";

const COLOR_SET_PROFILES = [
  { profileId: "poparooz-set-24", size: 24 },
  { profileId: "poparooz-set-48", size: 48 },
  { profileId: "poparooz-set-72", size: 72 },
  { profileId: "poparooz-set-120", size: 120 },
  { profileId: "poparooz-set-168", size: 168 },
  { profileId: "poparooz-set-221", size: 221 },
] as const;

describe("pattern settings validation", () => {
  it("starts with the approved 80 by 80 default but requires a background", () => {
    expect(
      validatePatternSettings(EMPTY_PATTERN_SETTINGS, COLOR_SET_PROFILES),
    ).toMatchObject({
      valid: false,
    });
  });

  it.each(["40", "60", "80", "104"])(
    "accepts the approved %s by %s preset",
    (size) => {
      expect(
        validatePatternSettings(
          {
            width: size,
            height: size,
            maxColors: "2",
            background: "white",
            selectedColorSetProfileId: "poparooz-set-24",
          },
          COLOR_SET_PROFILES,
        ),
      ).toEqual({
        valid: true,
        value: {
          width: Number(size),
          height: Number(size),
          maxColors: 2,
          background: "white",
          selectedColorSetProfileId: "poparooz-set-24",
        },
      });
    },
  );

  it.each(["41", "72", "100", "4096", "NaN", "1.5"])(
    "rejects unsupported Pattern Size %s",
    (width) => {
      expect(
        validatePatternSettings(
          {
            width,
            height: width,
            maxColors: "2",
            background: "white",
            selectedColorSetProfileId: "poparooz-set-221",
          },
          COLOR_SET_PROFILES,
        ),
      ).toMatchObject({
        valid: false,
        errors: { dimensions: expect.any(String) },
      });
    },
  );

  it("rejects unequal width and height", () => {
    expect(
      validatePatternSettings(
        {
          width: "80",
          height: "104",
          maxColors: "32",
          background: "white",
          selectedColorSetProfileId: "poparooz-set-221",
        },
        COLOR_SET_PROFILES,
      ),
    ).toMatchObject({ valid: false });
  });

  it.each(["0", "1", "65", "512", "1.5", "Infinity", "NaN", "-1"])(
    "rejects invalid maximum color input %s",
    (maxColors) => {
      expect(
        validatePatternSettings(
          {
            width: "80",
            height: "80",
            maxColors,
            background: "white",
            selectedColorSetProfileId: "poparooz-set-221",
          },
          COLOR_SET_PROFILES,
        ),
      ).toMatchObject({
        valid: false,
        errors: { maxColors: expect.any(String) },
      });
    },
  );

  it.each([
    "",
    "poparooz-set-96",
    "poparooz-set-144",
    "poparooz-set-192",
    "unknown",
  ])("rejects unavailable Color Set %s", (selectedColorSetProfileId) => {
    expect(
      validatePatternSettings(
        {
          width: "80",
          height: "80",
          maxColors: "32",
          background: "white",
          selectedColorSetProfileId:
            selectedColorSetProfileId as PatternSettingsDraft["selectedColorSetProfileId"],
        },
        COLOR_SET_PROFILES,
      ),
    ).toMatchObject({
      valid: false,
      errors: { selectedColorSetProfileId: expect.any(String) },
    });
  });
});
