import { describe, expect, it, vi } from "vitest";

import { excludeStrictEdgeConnectedLightBackground } from "../../domain/image/edge-connected-light-background";
import type { NormalizedImageResult } from "../../domain/image/image.types";
import { refineOpaqueSourceMatteBackground } from "../../domain/image/opaque-source-matte-background";
import { resizeRgbaImage } from "../../domain/image/rgba-resize";
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

  it("removes an H02 fringe from Pattern and material counts while retaining cream", async () => {
    const normalized: NormalizedImageResult = {
      ...NORMALIZED,
      target: {
        ...NORMALIZED.target,
        width: 4,
        height: 1,
        drawWidth: 4,
        drawHeight: 1,
      },
      image: {
        width: 4,
        height: 1,
        data: new Uint8ClampedArray([
          255, 255, 255, 255, 235, 235, 235, 255, 30, 30, 30, 255, 255, 255,
          213, 255,
        ]),
      },
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
      {
        decode: vi.fn(async () => normalized),
        assemble: assemblePattern,
        toPublic: toPublicPatternResult,
      },
    );

    const result = await service.generate(
      input("poparooz-set-221", 2, "transparent"),
      new AbortController().signal,
    );
    const creamColor = result.colors.find(({ color }) => color.code === "A2");

    expect(result.totals).toMatchObject({
      totalPositions: 4,
      totalBeads: 2,
      transparentPositions: 2,
    });
    expect([...result.matrix.colorIndices.slice(0, 2)]).toEqual([
      result.matrix.transparentIndex,
      result.matrix.transparentIndex,
    ]);
    expect(creamColor?.beadCount).toBe(1);
    expect(
      result.materials.find(({ color }) => color.code === "A2")?.beadCount,
    ).toBe(1);
    expect(result.colors.reduce((sum, color) => sum + color.beadCount, 0)).toBe(
      result.totals.totalBeads,
    );
    expect(
      result.materials.reduce((sum, material) => sum + material.beadCount, 0),
    ).toBe(result.totals.totalBeads);
  });

  it("keeps source-masked green free of a synthetic white-blend Palette code", async () => {
    const source = {
      width: 6,
      height: 1,
      data: new Uint8ClampedArray([
        255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 20, 180, 80,
        255, 20, 180, 80, 255, 20, 180, 80, 255,
      ]),
    };
    const resized = resizeRgbaImage(
      excludeStrictEdgeConnectedLightBackground(source),
      3,
      1,
    );
    const normalized: NormalizedImageResult = {
      ...NORMALIZED,
      target: {
        ...NORMALIZED.target,
        width: 3,
        height: 1,
        drawWidth: 3,
        drawHeight: 1,
      },
      image: resized,
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
      {
        decode: vi.fn(async () => normalized),
        assemble: assemblePattern,
        toPublic: toPublicPatternResult,
      },
    );

    const result = await service.generate(
      input("poparooz-set-221", 2, "transparent"),
      new AbortController().signal,
    );

    expect([...resized.data]).toEqual([
      0, 0, 0, 0, 20, 180, 80, 128, 20, 180, 80, 255,
    ]);
    expect(result.totals).toMatchObject({
      totalPositions: 3,
      totalBeads: 2,
      transparentPositions: 1,
      colorCount: 1,
    });
    expect(result.colors.map(({ color }) => color.code)).toEqual(["B8"]);
    expect(result.colors.some(({ color }) => color.code === "B28")).toBe(false);
    expect(result.colors[0]?.beadCount).toBe(2);
    expect(result.materials[0]?.color.code).toBe("B8");
    expect(result.materials[0]?.beadCount).toBe(2);
    expect(result.colors.reduce((sum, color) => sum + color.beadCount, 0)).toBe(
      result.totals.totalBeads,
    );
    expect(
      result.materials.reduce((sum, material) => sum + material.beadCount, 0),
    ).toBe(result.totals.totalBeads);
  });

  it("excludes refined source matte from Pattern and material quantities", async () => {
    const source = {
      width: 8,
      height: 1,
      data: new Uint8ClampedArray([
        255, 255, 255, 255, 247, 247, 247, 255, 246, 246, 246, 255, 245, 245,
        245, 255, 244, 244, 244, 255, 243, 243, 243, 255, 242, 242, 242, 255,
        20, 20, 20, 255,
      ]),
    };
    const strict = excludeStrictEdgeConnectedLightBackground(source);
    const resized = resizeRgbaImage(
      refineOpaqueSourceMatteBackground(source, strict),
      4,
      1,
    );
    const normalized: NormalizedImageResult = {
      ...NORMALIZED,
      target: {
        ...NORMALIZED.target,
        width: 4,
        height: 1,
        drawWidth: 4,
        drawHeight: 1,
      },
      image: resized,
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
      {
        decode: vi.fn(async () => normalized),
        assemble: assemblePattern,
        toPublic: toPublicPatternResult,
      },
    );

    const result = await service.generate(
      input("poparooz-set-221", 2, "transparent"),
      new AbortController().signal,
    );

    expect([...resized.data]).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 20, 20, 128,
    ]);
    expect(result.totals).toMatchObject({
      totalPositions: 4,
      totalBeads: 1,
      transparentPositions: 3,
      colorCount: 1,
    });
    expect(result.colors).toHaveLength(1);
    expect(result.colors[0]?.beadCount).toBe(1);
    expect(result.materials).toHaveLength(1);
    expect(result.materials[0]?.beadCount).toBe(1);
    expect(result.colors.reduce((sum, color) => sum + color.beadCount, 0)).toBe(
      result.totals.totalBeads,
    );
    expect(
      result.materials.reduce((sum, material) => sum + material.beadCount, 0),
    ).toBe(result.totals.totalBeads);
  });

  it("turns alpha occupancy into exact Pattern and material quantities", async () => {
    const normalized: NormalizedImageResult = {
      ...NORMALIZED,
      target: {
        ...NORMALIZED.target,
        width: 3,
        height: 1,
        drawWidth: 3,
        drawHeight: 1,
      },
      image: {
        width: 3,
        height: 1,
        data: new Uint8ClampedArray([
          20, 180, 80, 17, 20, 180, 80, 33, 20, 180, 80, 255,
        ]),
      },
    };
    const quantize = vi.fn(async (image, options) =>
      quantizeImage(image, options),
    );
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
      {
        decode: vi.fn(async () => normalized),
        assemble: assemblePattern,
        toPublic: toPublicPatternResult,
      },
    );

    const result = await service.generate(
      input("poparooz-set-221", 2, "transparent"),
      new AbortController().signal,
    );
    const workerImage = quantize.mock.calls[0]![0];

    expect(quantize).toHaveBeenCalledOnce();
    expect(quantize.mock.calls[0]![1]).toEqual({
      maxColors: 2,
      alphaThreshold: 16,
    });
    expect([...workerImage.data]).toEqual([
      0, 0, 0, 0, 20, 180, 80, 255, 20, 180, 80, 255,
    ]);
    expect([...result.matrix.colorIndices]).toEqual([
      result.matrix.transparentIndex,
      result.colors[0]!.index,
      result.colors[0]!.index,
    ]);
    expect(result.totals).toMatchObject({
      totalPositions: 3,
      totalBeads: 2,
      transparentPositions: 1,
    });
    expect(result.colors[0]?.beadCount).toBe(2);
    expect(result.materials[0]?.beadCount).toBe(2);
    expect(result.colors.reduce((sum, color) => sum + color.beadCount, 0)).toBe(
      result.totals.totalBeads,
    );
    expect(
      result.materials.reduce((sum, material) => sum + material.beadCount, 0),
    ).toBe(result.totals.totalBeads);
  });

  it("fails closed when transparent occupancy excludes every position", async () => {
    const normalized: NormalizedImageResult = {
      ...NORMALIZED,
      target: {
        ...NORMALIZED.target,
        width: 2,
        height: 1,
        drawWidth: 2,
        drawHeight: 1,
      },
      image: {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([20, 180, 80, 17, 20, 180, 80, 32]),
      },
    };
    const quantize = vi.fn(async (image, options) =>
      quantizeImage(image, options),
    );
    const dispose = vi.fn();
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
        createWorkerClient: () => ({ quantize, dispose }),
      },
      {
        decode: vi.fn(async () => normalized),
        assemble: assemblePattern,
        toPublic: toPublicPatternResult,
      },
    );

    await expect(
      service.generate(
        input("poparooz-set-221", 2, "transparent"),
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "NO_QUANTIZABLE_PIXELS" });
    expect(quantize).toHaveBeenCalledOnce();
    expect([...quantize.mock.calls[0]![0].data]).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(dispose).toHaveBeenCalledOnce();
  });
});
