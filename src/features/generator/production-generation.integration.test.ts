import { describe, expect, it, vi } from "vitest";

import type { NormalizedImageResult } from "../../domain/image/image.types";
import { assemblePattern } from "../../domain/pattern/pattern-assembler";
import { toPublicPatternResult } from "../../domain/pattern/public-pattern.mapper";
import { quantizeImage } from "../../domain/quantization/quantize-image";
import { createApprovedBoardProfileProvider } from "../../runtime/board-profile/approved-board-profile";
import { createApprovedColorSetProvider } from "../../runtime/color-set/approved-color-set";
import type { PublishedColorSetProfileId } from "../../runtime/color-set/color-set.types";
import { adaptBoardProfileToGeneration } from "../../runtime/generation-board-profile/board-profile-to-generation.adapter";
import { adaptColorSetToGeneration } from "../../runtime/generation-color-set/color-set-to-generation.adapter";
import { adaptRuntimePaletteToGeneration } from "../../runtime/generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../../runtime/palette/approved-runtime-palette";
import { createApprovedProcessingPolicyProvider } from "../../runtime/processing-policy/approved-processing-policy";
import {
  createGenerationService,
  type GenerationPipeline,
} from "./generation-service";
import type { GenerationInputSnapshot } from "./generation.types";

const imageData = new Uint8ClampedArray(
  Array.from({ length: 64 }, (_, index) => [
    (index * 37) % 256,
    (index * 73) % 256,
    (index * 109) % 256,
    255,
  ]).flat(),
);

const NORMALIZED: NormalizedImageResult = {
  source: {
    format: "png",
    originalWidth: 8,
    originalHeight: 8,
    orientedWidth: 8,
    orientedHeight: 8,
    exifOrientation: 1,
    hasAlpha: false,
  },
  target: {
    width: 8,
    height: 8,
    fit: "contain",
    drawX: 0,
    drawY: 0,
    drawWidth: 8,
    drawHeight: 8,
  },
  image: { width: 8, height: 8, data: imageData },
};

function input(
  selectedColorSetProfileId: PublishedColorSetProfileId,
  maxColors: number,
  background: "transparent" | "white" = "white",
): GenerationInputSnapshot {
  return Object.freeze({
    jobId: 1,
    file: new File(["controlled image"], "controlled.png", {
      type: "image/png",
    }),
    imageVersion: 1,
    settings: Object.freeze({
      width: 8,
      height: 8,
      maxColors,
      background,
      selectedColorSetProfileId,
    }),
    inputKey: `1:8:8:${maxColors}:${background}:${selectedColorSetProfileId}`,
  });
}

describe("production generation composition", () => {
  it.each([
    ["poparooz-set-24", 24],
    ["poparooz-set-72", 72],
    ["poparooz-set-221", 221],
  ] as const)(
    "uses the full %s candidate domain and publishes a real public Pattern",
    async (profileId, expectedCandidateCount) => {
      const candidateCounts: number[] = [];
      const quantize = vi.fn(async (image, options) =>
        quantizeImage(image, options),
      );
      const pipeline: GenerationPipeline = {
        decode: vi.fn(async () => NORMALIZED),
        assemble: vi.fn((assemblyInput) => {
          candidateCounts.push(assemblyInput.paletteColors.length);
          return assemblePattern(assemblyInput);
        }),
        toPublic: toPublicPatternResult,
      };
      const service = createGenerationService(
        {
          palette: adaptRuntimePaletteToGeneration(
            createApprovedRuntimePaletteProvider().getSnapshot(),
          ),
          colorSets: adaptColorSetToGeneration(
            createApprovedColorSetProvider().getSnapshot(),
          ),
          boardProfile: adaptBoardProfileToGeneration(
            createApprovedBoardProfileProvider().getSnapshot(),
          ),
          processingPolicy:
            createApprovedProcessingPolicyProvider().getSnapshot(),
          createWorkerClient: () => ({ quantize, dispose: vi.fn() }),
        },
        pipeline,
      );

      const result = await service.generate(
        input(profileId, profileId === "poparooz-set-72" ? 24 : 32),
        new AbortController().signal,
      );
      const approvedProfile = createApprovedColorSetProvider()
        .getSnapshot()
        .profiles.find((profile) => profile.profileId === profileId)!;

      expect(candidateCounts).toEqual([expectedCandidateCount]);
      expect(result.totals.colorCount).toBeLessThanOrEqual(
        profileId === "poparooz-set-72" ? 24 : 32,
      );
      expect(
        result.colors.every(({ color }) =>
          approvedProfile.memberCodes.includes(color.code),
        ),
      ).toBe(true);
      expect(
        result.colors.every(({ color }) => color.brand === "Poparooz"),
      ).toBe(true);
      expect(
        result.colors.reduce((sum, color) => sum + color.beadCount, 0),
      ).toBe(result.totals.totalBeads);
      expect(quantize).toHaveBeenCalledWith(
        NORMALIZED.image,
        expect.objectContaining({
          maxColors: profileId === "poparooz-set-72" ? 24 : 32,
          alphaThreshold: 16,
        }),
        expect.any(AbortSignal),
      );
    },
  );

  it("excludes outer white canvas pixels while retaining enclosed white bead detail", async () => {
    const white = [254, 255, 255, 255];
    const red = [210, 20, 30, 255];
    const normalized: NormalizedImageResult = {
      ...NORMALIZED,
      target: {
        ...NORMALIZED.target,
        width: 5,
        height: 5,
        drawWidth: 5,
        drawHeight: 5,
      },
      image: {
        width: 5,
        height: 5,
        data: new Uint8ClampedArray(
          [
            white,
            white,
            white,
            white,
            white,
            white,
            red,
            red,
            red,
            white,
            white,
            red,
            white,
            red,
            white,
            white,
            red,
            red,
            red,
            white,
            white,
            white,
            white,
            white,
            white,
          ].flat(),
        ),
      },
    };
    const pipeline: GenerationPipeline = {
      decode: vi.fn(async () => normalized),
      assemble: assemblePattern,
      toPublic: toPublicPatternResult,
    };
    const service = createGenerationService(
      {
        palette: adaptRuntimePaletteToGeneration(
          createApprovedRuntimePaletteProvider().getSnapshot(),
        ),
        colorSets: adaptColorSetToGeneration(
          createApprovedColorSetProvider().getSnapshot(),
        ),
        boardProfile: adaptBoardProfileToGeneration(
          createApprovedBoardProfileProvider().getSnapshot(),
        ),
        processingPolicy:
          createApprovedProcessingPolicyProvider().getSnapshot(),
        createWorkerClient: () => ({
          quantize: async (image, options) => quantizeImage(image, options),
          dispose: vi.fn(),
        }),
      },
      pipeline,
    );

    const result = await service.generate(
      input("poparooz-set-221", 2, "transparent"),
      new AbortController().signal,
    );
    const whiteColor = result.colors.find(({ color }) => color.code === "H2");

    expect(result.totals).toMatchObject({
      totalPositions: 25,
      totalBeads: 9,
      transparentPositions: 16,
    });
    expect(result.matrix.colorIndices[0]).toBe(result.matrix.transparentIndex);
    expect(result.matrix.colorIndices[12]).not.toBe(
      result.matrix.transparentIndex,
    );
    expect(whiteColor?.beadCount).toBe(1);
    expect(
      result.materials.find(({ color }) => color.code === "H2")?.beadCount,
    ).toBe(1);
    expect(result.colors.reduce((sum, color) => sum + color.beadCount, 0)).toBe(
      result.totals.totalBeads,
    );
    expect(
      result.materials.reduce((sum, material) => sum + material.beadCount, 0),
    ).toBe(result.totals.totalBeads);
  });
});
