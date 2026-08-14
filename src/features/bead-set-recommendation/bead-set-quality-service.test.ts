import { describe, expect, it, vi } from "vitest";

import type {
  NormalizedImageResult,
  RgbaImage,
} from "../../domain/image/image.types";
import { quantizeImage } from "../../domain/quantization/quantize-image";
import { createApprovedColorSetProvider } from "../../runtime/color-set/approved-color-set";
import { adaptColorSetToGeneration } from "../../runtime/generation-color-set/color-set-to-generation.adapter";
import { adaptRuntimePaletteToGeneration } from "../../runtime/generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../../runtime/palette/approved-runtime-palette";
import { createApprovedProcessingPolicyProvider } from "../../runtime/processing-policy/approved-processing-policy";
import {
  createBeadSetQualityService,
  type BeadSetQualityWorkerClient,
} from "./bead-set-quality-service";

const PALETTE = adaptRuntimePaletteToGeneration(
  createApprovedRuntimePaletteProvider().getSnapshot(),
);
const COLOR_SETS = adaptColorSetToGeneration(
  createApprovedColorSetProvider().getSnapshot(),
);
const PROCESSING_POLICY =
  createApprovedProcessingPolicyProvider().getSnapshot();

function normalized(image: RgbaImage): NormalizedImageResult {
  return {
    source: {
      format: "png",
      originalWidth: image.width,
      originalHeight: image.height,
      orientedWidth: image.width,
      orientedHeight: image.height,
      exifOrientation: 1,
      hasAlpha: image.data.some(
        (value, index) => index % 4 === 3 && value !== 255,
      ),
    },
    target: {
      width: image.width,
      height: image.height,
      fit: "contain",
      drawX: 0,
      drawY: 0,
      drawWidth: image.width,
      drawHeight: image.height,
    },
    image,
  };
}

function twoColorImage(): RgbaImage {
  const data = new Uint8ClampedArray(40 * 40 * 4);
  for (let pixel = 0; pixel < 40 * 40; pixel += 1) {
    const offset = pixel * 4;
    data[offset] = pixel % 2 === 0 ? 255 : 0;
    data[offset + 1] = pixel % 2 === 0 ? 0 : 128;
    data[offset + 2] = 0;
    data[offset + 3] = 255;
  }
  return { width: 40, height: 40, data };
}

function setup(image = twoColorImage()) {
  const quantize = vi.fn(async (input, options) =>
    quantizeImage(input, options),
  );
  const dispose = vi.fn();
  const worker: BeadSetQualityWorkerClient = { quantize, dispose };
  const createWorkerClient = vi.fn(() => worker);
  const decode = vi.fn(async () => normalized(image));
  const service = createBeadSetQualityService(
    {
      palette: PALETTE,
      colorSets: COLOR_SETS,
      processingPolicy: PROCESSING_POLICY,
      createWorkerClient,
    },
    { decode },
  );
  return { service, decode, quantize, dispose, createWorkerClient };
}

describe("createBeadSetQualityService", () => {
  it("performs one decode, one isolated quantization, and six-profile evaluation", async () => {
    const context = setup();
    const controller = new AbortController();
    const result = await context.service.evaluate(
      {
        file: new Blob(["image"], { type: "image/png" }),
        width: 40,
        height: 40,
        maxColors: 32,
        background: "white",
      },
      controller.signal,
    );

    expect(context.createWorkerClient).toHaveBeenCalledOnce();
    expect(context.decode).toHaveBeenCalledOnce();
    expect(context.quantize).toHaveBeenCalledOnce();
    expect(context.dispose).toHaveBeenCalledOnce();
    expect(result.candidates).toHaveLength(6);
    expect(result.candidates.map((candidate) => candidate.profileSize)).toEqual(
      [24, 48, 72, 120, 168, 221],
    );
  });

  it("passes current size, Maximum Colors, Background, policy, and signal", async () => {
    const context = setup();
    const controller = new AbortController();
    await context.service.evaluate(
      {
        file: new Blob(["image"], { type: "image/png" }),
        width: 40,
        height: 40,
        maxColors: 17,
        background: "white",
      },
      controller.signal,
    );
    expect(context.decode).toHaveBeenCalledWith(
      expect.any(Blob),
      {
        targetWidth: 40,
        targetHeight: 40,
        preserveAspectRatio: true,
        fit: "contain",
        background: "white",
        allowUpscale: false,
      },
      controller.signal,
    );
    expect(context.quantize).toHaveBeenCalledWith(
      expect.any(Object),
      { maxColors: 17, alphaThreshold: 16 },
      controller.signal,
    );
  });

  it("reuses production transparent occupancy and excludes unoccupied pixels", async () => {
    const data = new Uint8ClampedArray(40 * 40 * 4);
    data.set([255, 0, 0, 33], 0);
    data.set([0, 0, 255, 32], 4);
    const context = setup({ width: 40, height: 40, data });
    const result = await context.service.evaluate(
      {
        file: new Blob(["image"], { type: "image/png" }),
        width: 40,
        height: 40,
        maxColors: 32,
        background: "transparent",
      },
      new AbortController().signal,
    );
    expect(context.quantize).toHaveBeenCalledOnce();
    const workerImage = context.quantize.mock.calls[0]![0];
    expect([...workerImage.data.slice(0, 8)]).toEqual([
      255, 0, 0, 255, 0, 0, 0, 0,
    ]);
    expect(result.occupiedPixelCount).toBe(1);
    expect(result.transparentPixelCount).toBe(1599);
    expect(
      result.candidates.every(
        (candidate) => candidate.totalWeightedPixelCount === 1,
      ),
    ).toBe(true);
  });

  it("does not depend on an extra manual Color Set selection field", async () => {
    const context = setup();
    const base = {
      file: new Blob(["image"], { type: "image/png" }),
      width: 40,
      height: 40,
      maxColors: 32,
      background: "white" as const,
    };
    const withManual24Selection = {
      ...base,
      selectedColorSetProfileId: "poparooz-set-24",
    };
    const withManual221Selection = {
      ...base,
      selectedColorSetProfileId: "poparooz-set-221",
    };
    const first = await context.service.evaluate(
      withManual24Selection,
      new AbortController().signal,
    );
    const second = await context.service.evaluate(
      withManual221Selection,
      new AbortController().signal,
    );
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("rejects incomplete or unsupported inputs before creating a Worker", async () => {
    const context = setup();
    await expect(
      context.service.evaluate(
        {
          file: new Blob(["image"]),
          width: 0,
          height: 0,
          maxColors: 32,
          background: "white",
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow(TypeError);
    expect(context.createWorkerClient).not.toHaveBeenCalled();
  });

  it("always disposes its isolated Worker client after a failure", async () => {
    const context = setup();
    context.quantize.mockRejectedValueOnce(new Error("worker failed"));
    await expect(
      context.service.evaluate(
        {
          file: new Blob(["image"]),
          width: 40,
          height: 40,
          maxColors: 32,
          background: "white",
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow("worker failed");
    expect(context.dispose).toHaveBeenCalledOnce();
  });

  it("does not publish an evaluation after the request becomes stale", async () => {
    const context = setup();
    const controller = new AbortController();
    context.quantize.mockImplementationOnce(async (input, options) => {
      const result = quantizeImage(input, options);
      controller.abort();
      return result;
    });

    await expect(
      context.service.evaluate(
        {
          file: new Blob(["image"]),
          width: 40,
          height: 40,
          maxColors: 32,
          background: "white",
        },
        controller.signal,
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(context.dispose).toHaveBeenCalledOnce();
  });
});
