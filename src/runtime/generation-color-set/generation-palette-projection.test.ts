import { describe, expect, it } from "vitest";

import {
  matchNearestColor,
  prepareColorMatchCandidates,
} from "../../domain/color";
import { buildPatternPaletteMapping } from "../../domain/pattern/pattern-palette-mapping";
import type { QuantizedImage } from "../../domain/quantization/quantization.types";
import { createApprovedColorSetProvider } from "../color-set/approved-color-set";
import { adaptRuntimePaletteToGeneration } from "../generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../palette/approved-runtime-palette";
import {
  adaptColorSetToGeneration,
  selectGenerationColorSetProfile,
} from "./color-set-to-generation.adapter";
import { projectGenerationPaletteForColorSet } from "./generation-palette-projection";

describe("Generation Color Set eligibility projection", () => {
  const palette = adaptRuntimePaletteToGeneration(
    createApprovedRuntimePaletteProvider().getSnapshot(),
  );
  const colorSets = adaptColorSetToGeneration(
    createApprovedColorSetProvider().getSnapshot(),
  );

  it.each([
    ["poparooz-set-24", 24],
    ["poparooz-set-48", 48],
    ["poparooz-set-72", 72],
    ["poparooz-set-120", 120],
    ["poparooz-set-168", 168],
    ["poparooz-set-221", 221],
  ] as const)("projects %s to %i eligible candidates", (profileId, count) => {
    const profile = selectGenerationColorSetProfile(colorSets, profileId);
    const projected = projectGenerationPaletteForColorSet(palette, profile);
    expect(projected).toHaveLength(count);
    expect(
      projected.every((color) => color.active && color.autoMatchEligible),
    ).toBe(true);
    expect(projected.map((color) => color.sortOrder)).toEqual(
      [...projected].map((color) => color.sortOrder).sort((a, b) => a - b),
    );
    expect(projected.every((color) => palette.colors.includes(color))).toBe(
      true,
    );
  });

  it("feeds the existing matcher and Pattern mapping without rebuilding colors", () => {
    const projected = projectGenerationPaletteForColorSet(
      palette,
      selectGenerationColorSetProfile(colorSets, "poparooz-set-24"),
    );
    const candidates = prepareColorMatchCandidates(projected);
    const match = matchNearestColor(
      {
        l: projected[0]!.lab[0],
        a: projected[0]!.lab[1],
        b: projected[0]!.lab[2],
      },
      candidates,
    );
    expect(match.color).toBe(projected[0]);
    const quantized: QuantizedImage = {
      width: 1,
      height: 1,
      colors: [
        {
          index: 0,
          rgb: {
            r: projected[0]!.rgb[0],
            g: projected[0]!.rgb[1],
            b: projected[0]!.rgb[2],
          },
          lab: {
            l: projected[0]!.lab[0],
            a: projected[0]!.lab[1],
            b: projected[0]!.lab[2],
          },
          pixelCount: 1,
        },
      ],
      colorIndices: new Uint16Array([0]),
      transparentIndex: 65535,
      opaquePixelCount: 1,
      transparentPixelCount: 0,
    };
    expect(
      buildPatternPaletteMapping(quantized, projected).colors[0]?.color,
    ).toBe(projected[0]);
  });

  it("enforces active and auto-match eligibility independently of membership", () => {
    const profile = selectGenerationColorSetProfile(
      colorSets,
      "poparooz-set-24",
    );
    const excludedCodes = new Set(profile.memberCodes.slice(0, 2));
    const inactiveCode = profile.memberCodes[0];
    const modifiedPalette = {
      ...palette,
      colors: palette.colors.map((color) =>
        excludedCodes.has(color.code)
          ? {
              ...color,
              active: color.code === inactiveCode ? false : color.active,
              autoMatchEligible: false,
            }
          : color,
      ),
    };
    const projected = projectGenerationPaletteForColorSet(
      modifiedPalette,
      profile,
    );
    expect(projected).toHaveLength(22);
    expect(projected.some((color) => excludedCodes.has(color.code))).toBe(
      false,
    );
  });
});
