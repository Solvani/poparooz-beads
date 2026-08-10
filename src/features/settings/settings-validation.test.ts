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
  it("starts without invented valid defaults", () => {
    expect(
      validatePatternSettings(EMPTY_PATTERN_SETTINGS, COLOR_SET_PROFILES),
    ).toMatchObject({
      valid: false,
    });
  });

  it("accepts the formal dimension, color, and background boundaries", () => {
    expect(
      validatePatternSettings(
        {
          width: "1",
          height: "1",
          maxColors: "2",
          background: "white",
          selectedColorSetProfileId: "poparooz-set-24",
        },
        COLOR_SET_PROFILES,
      ),
    ).toEqual({
      valid: true,
      value: {
        width: 1,
        height: 1,
        maxColors: 2,
        background: "white",
        selectedColorSetProfileId: "poparooz-set-24",
      },
    });
    expect(
      validatePatternSettings(
        {
          width: "4096",
          height: "4096",
          maxColors: "64",
          background: "transparent",
          selectedColorSetProfileId: "poparooz-set-221",
        },
        COLOR_SET_PROFILES,
      ),
    ).toMatchObject({ valid: true });
  });

  it.each(["NaN", "Infinity", "-1", "1.5", "0", "4097"])(
    "rejects invalid dimension input %s",
    (width) => {
      expect(
        validatePatternSettings(
          {
            width,
            height: "1",
            maxColors: "2",
            background: "white",
            selectedColorSetProfileId: "poparooz-set-221",
          },
          COLOR_SET_PROFILES,
        ),
      ).toMatchObject({ valid: false, errors: { width: expect.any(String) } });
    },
  );

  it("rejects dimensions above the formal total-pixel boundary", () => {
    expect(
      validatePatternSettings(
        {
          width: "4096",
          height: "4097",
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
            width: "1",
            height: "1",
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
          width: "1",
          height: "1",
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
