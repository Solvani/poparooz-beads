import { describe, expect, it, vi } from "vitest";

import { TEST_BOARD_PROFILE } from "../../domain/board/board-profile.fixture";
import type { NormalizedImageResult } from "../../domain/image/image.types";
import { PatternAssemblyError } from "../../domain/pattern/pattern-errors";
import type { PatternAssemblyResult } from "../../domain/pattern/pattern.types";
import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import type { QuantizedImage } from "../../domain/quantization/quantization.types";
import { QuantizationWorkerError } from "../../lib/quantization-worker/quantization-worker.errors";
import { GenerationPaletteAdapterError } from "../../runtime/generation-palette/generation-palette.errors";
import { adaptRuntimePaletteToGeneration } from "../../runtime/generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../../runtime/palette/approved-runtime-palette";
import {
  createGenerationRuntime,
  createGenerationService,
  type GenerationPipeline,
} from "./generation-service";
import type {
  GenerationDependencies,
  GenerationInputSnapshot,
  GenerationWorkerClient,
} from "./generation.types";

const NORMALIZED: NormalizedImageResult = {
  source: {
    format: "png",
    originalWidth: 1,
    originalHeight: 1,
    orientedWidth: 1,
    orientedHeight: 1,
    exifOrientation: 1,
    hasAlpha: false,
  },
  target: {
    width: 1,
    height: 1,
    fit: "contain",
    drawX: 0,
    drawY: 0,
    drawWidth: 1,
    drawHeight: 1,
  },
  image: {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([255, 255, 255, 255]),
  },
};

const QUANTIZED: QuantizedImage = {
  width: 1,
  height: 1,
  colors: [],
  colorIndices: new Uint16Array([0]),
  transparentIndex: 65535,
  opaquePixelCount: 1,
  transparentPixelCount: 0,
};

const INTERNAL = {} as PatternAssemblyResult;
const PUBLIC = { marker: "public-only" } as unknown as PublicPatternResult;
const GENERATION_PALETTE = adaptRuntimePaletteToGeneration(
  createApprovedRuntimePaletteProvider().getSnapshot(),
);

function snapshot(maxColors = 512): GenerationInputSnapshot {
  return Object.freeze({
    jobId: 7,
    file: new File(["image"], "photo.png", { type: "image/png" }),
    imageVersion: 3,
    settings: Object.freeze({
      width: 40,
      height: 30,
      maxColors,
      background: "transparent" as const,
    }),
    inputKey: `3:40:30:${maxColors}:transparent`,
  });
}

function setup() {
  const order: string[] = [];
  const worker: GenerationWorkerClient = {
    quantize: vi.fn(async () => {
      order.push("quantize");
      return QUANTIZED;
    }),
    dispose: vi.fn(() => void order.push("dispose")),
  };
  const pipeline: GenerationPipeline = {
    decode: vi.fn(async () => {
      order.push("decode");
      return NORMALIZED;
    }),
    assemble: vi.fn(() => {
      order.push("assemble");
      return INTERNAL;
    }),
    toPublic: vi.fn(() => {
      order.push("public");
      return PUBLIC;
    }),
  };
  const dependencies: GenerationDependencies = {
    palette: GENERATION_PALETTE,
    boardProfile: TEST_BOARD_PROFILE,
    processingPolicy: { allowUpscale: false, alphaThreshold: 0 },
    createWorkerClient: vi.fn(() => worker),
  };
  return { order, worker, pipeline, dependencies };
}

describe("Generation Service", () => {
  it("runs decode, quantize, assembly, and public mapping in order", async () => {
    const context = setup();
    const result = await createGenerationService(
      context.dependencies,
      context.pipeline,
    ).generate(snapshot(), new AbortController().signal);

    expect(result).toBe(PUBLIC);
    expect(context.order).toEqual([
      "decode",
      "quantize",
      "assemble",
      "public",
      "dispose",
    ]);
    expect(result).not.toHaveProperty("palette");
  });

  it("passes the immutable size, background, color, and processing policies", async () => {
    const context = setup();
    const input = snapshot(512);
    const signal = new AbortController().signal;
    await createGenerationService(
      context.dependencies,
      context.pipeline,
    ).generate(input, signal);

    expect(context.pipeline.decode).toHaveBeenCalledWith(
      input.file,
      expect.objectContaining({
        targetWidth: 40,
        targetHeight: 30,
        background: "transparent",
        allowUpscale: false,
      }),
      signal,
    );
    expect(context.worker.quantize).toHaveBeenCalledWith(
      NORMALIZED.image,
      { maxColors: 512, alphaThreshold: 0 },
      signal,
    );
    expect(context.pipeline.assemble).toHaveBeenCalledWith({
      quantizedImage: QUANTIZED,
      paletteColors: GENERATION_PALETTE.colors,
      boardProfile: TEST_BOARD_PROFILE,
    });
    expect(Object.isFrozen(GENERATION_PALETTE)).toBe(true);
    expect(Object.isFrozen(GENERATION_PALETTE.colors)).toBe(true);
  });

  it("allows maxColors above the palette length without clipping", async () => {
    const context = setup();
    expect(GENERATION_PALETTE.colors.length).toBeLessThan(512);
    await createGenerationService(
      context.dependencies,
      context.pipeline,
    ).generate(snapshot(512), new AbortController().signal);
    expect(context.worker.quantize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxColors: 512 }),
      expect.any(AbortSignal),
    );
  });

  it("propagates decode, worker, and assembly failures and always disposes the worker", async () => {
    const decodeContext = setup();
    vi.mocked(decodeContext.pipeline.decode).mockRejectedValueOnce(
      new Error("decode"),
    );
    await expect(
      createGenerationService(
        decodeContext.dependencies,
        decodeContext.pipeline,
      ).generate(snapshot(), new AbortController().signal),
    ).rejects.toThrow("decode");
    expect(decodeContext.worker.dispose).toHaveBeenCalledOnce();

    const workerContext = setup();
    vi.mocked(workerContext.worker.quantize).mockRejectedValueOnce(
      new QuantizationWorkerError("ABORTED", "cancelled"),
    );
    await expect(
      createGenerationService(
        workerContext.dependencies,
        workerContext.pipeline,
      ).generate(snapshot(), new AbortController().signal),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(workerContext.worker.dispose).toHaveBeenCalledOnce();

    const assemblyContext = setup();
    vi.mocked(assemblyContext.pipeline.assemble).mockImplementationOnce(() => {
      throw new PatternAssemblyError("INVALID_PATTERN_RESULT", "assembly");
    });
    await expect(
      createGenerationService(
        assemblyContext.dependencies,
        assemblyContext.pipeline,
      ).generate(snapshot(), new AbortController().signal),
    ).rejects.toMatchObject({ code: "INVALID_PATTERN_RESULT" });
    expect(assemblyContext.worker.dispose).toHaveBeenCalledOnce();
  });

  it("gates missing runtime resources before a service can be called", () => {
    expect(createGenerationRuntime({}).availability).toEqual({
      available: false,
      reason: "palette-unavailable",
    });
    expect(
      createGenerationRuntime({ palette: GENERATION_PALETTE }).availability,
    ).toEqual({ available: false, reason: "board-profile-unavailable" });
  });

  it("fails closed on an invalid Generation Palette before creating a Worker", () => {
    const context = setup();
    const invalidPalette = {
      ...GENERATION_PALETTE,
      colors: [],
    } as unknown as GenerationDependencies["palette"];

    expect(() =>
      createGenerationService({
        ...context.dependencies,
        palette: invalidPalette,
      }),
    ).toThrow(GenerationPaletteAdapterError);
    expect(
      createGenerationRuntime({
        ...context.dependencies,
        palette: invalidPalette,
      }).availability,
    ).toEqual({ available: false, reason: "palette-unavailable" });
    expect(context.dependencies.createWorkerClient).not.toHaveBeenCalled();
  });
});
