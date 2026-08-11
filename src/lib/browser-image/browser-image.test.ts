import { describe, expect, it, vi } from "vitest";

import { MAX_FILE_BYTES } from "../../domain/image/image-limits";
import {
  createExifJpeg,
  MINIMAL_PNG_BYTES,
} from "../../domain/image/image-test.fixture";
import {
  prepareColorMatchCandidates,
  matchNearestColor,
} from "../../domain/color/generation-color-matching";
import { quantizeImage } from "../../domain/quantization/quantize-image";
import { adaptRuntimePaletteToGeneration } from "../../runtime/generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../../runtime/palette/approved-runtime-palette";
import type {
  NormalizeImageOptions,
  RgbaImage,
} from "../../domain/image/image.types";
import {
  decodeAndNormalizeImage,
  type BrowserImageNormalizerDependencies,
} from "./browser-image-normalizer";
import {
  decodeBrowserImage,
  type BitmapLike,
  type BrowserImageDecoderDependencies,
  type BrowserRasterSource,
  type ImageElementLike,
} from "./browser-image-decoder";
import {
  rasterizeBrowserImage,
  type CanvasContextLike,
  type CanvasLike,
} from "./canvas-rasterizer";

const options: NormalizeImageOptions = {
  targetWidth: 2,
  targetHeight: 1,
  preserveAspectRatio: true,
  fit: "contain",
  background: "transparent",
  allowUpscale: false,
};

describe("browser decoder resources", () => {
  it("requests browser-applied EXIF orientation and closes ImageBitmap once", async () => {
    const close = vi.fn();
    const createBitmap = vi.fn(
      async (_input: Blob, bitmapOptions: ImageBitmapOptions) => {
        expect(bitmapOptions).toMatchObject({
          imageOrientation: "from-image",
          premultiplyAlpha: "none",
          colorSpaceConversion: "none",
        });
        return { width: 2, height: 1, close };
      },
    );
    const decoded = await decodeBrowserImage(blob(), undefined, {
      ...unusedUrlDependencies(),
      createBitmap,
    });

    decoded.release();
    decoded.release();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes a bitmap that resolves after cancellation", async () => {
    const close = vi.fn();
    let resolveBitmap!: (bitmap: BitmapLike) => void;
    const bitmapPromise = new Promise<BitmapLike>((resolve) => {
      resolveBitmap = resolve;
    });
    const controller = new AbortController();
    const pending = decodeBrowserImage(blob(), controller.signal, {
      ...unusedUrlDependencies(),
      createBitmap: () => bitmapPromise,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
    resolveBitmap({ width: 1, height: 1, close });
    await Promise.resolve();
    expect(close).toHaveBeenCalledOnce();
  });

  it("maps raw decoder failures to a safe code", async () => {
    await expect(
      decodeBrowserImage(blob(), undefined, {
        ...unusedUrlDependencies(),
        createBitmap: () => Promise.reject(new Error("secret-name.png")),
      }),
    ).rejects.toMatchObject({
      code: "IMAGE_DECODE_FAILED",
      message: "The browser could not decode the image content.",
    });
  });

  it("revokes an Object URL after fallback success and releases the image", async () => {
    const image = fakeImageElement();
    const revokeObjectUrl = vi.fn();
    const decoded = await decodeBrowserImage(blob(), undefined, {
      createBitmap: undefined,
      createImageElement: () => image,
      createObjectUrl: () => "blob:test-only",
      revokeObjectUrl,
    });

    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:test-only");
    decoded.release();
    expect(image.src).toBe("");
  });

  it("revokes an Object URL after fallback failure", async () => {
    const image = fakeImageElement(() => Promise.reject(new Error("decode")));
    const revokeObjectUrl = vi.fn();
    await expect(
      decodeBrowserImage(blob(), undefined, {
        createBitmap: undefined,
        createImageElement: () => image,
        createObjectUrl: () => "blob:test-only",
        revokeObjectUrl,
      }),
    ).rejects.toMatchObject({ code: "IMAGE_DECODE_FAILED" });
    expect(revokeObjectUrl).toHaveBeenCalledOnce();
    expect(image.src).toBe("");
  });
});

describe("temporary Canvas rasterizer", () => {
  it("copies unpremultiplied RGBA data and releases the temporary surface", async () => {
    const pixels = new Uint8ClampedArray([1, 2, 3, 4]);
    const { canvas, context } = fakeCanvas(pixels);
    const result = await rasterizeBrowserImage(decodedSource(), {
      createCanvas: () => canvas,
    });

    expect(result.data).toEqual(pixels);
    expect(result.data).not.toBe(pixels);
    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("reports an unavailable context and still releases the surface", async () => {
    const canvas: CanvasLike = { width: 9, height: 9, getContext: () => null };
    await expect(
      rasterizeBrowserImage(decodedSource(), { createCanvas: () => canvas }),
    ).rejects.toMatchObject({ code: "CANVAS_UNAVAILABLE" });
    expect(canvas).toMatchObject({ width: 0, height: 0 });
  });

  it("maps pixel-read failures and still releases the surface", async () => {
    const { canvas, context } = fakeCanvas(new Uint8ClampedArray(4));
    vi.mocked(context.getImageData).mockImplementation(() => {
      throw new Error("tainted path and file.png");
    });
    await expect(
      rasterizeBrowserImage(decodedSource(), { createCanvas: () => canvas }),
    ).rejects.toMatchObject({
      code: "PIXEL_READ_FAILED",
      message: "Decoded image pixels could not be read safely.",
    });
    expect(canvas).toMatchObject({ width: 0, height: 0 });
  });
});

describe("decodeAndNormalizeImage service", () => {
  it("returns safe metadata and normalized pixels", async () => {
    const release = vi.fn();
    const result = await decodeAndNormalizeImage(
      blob(),
      options,
      undefined,
      normalizerDependencies({ release }),
    );
    expect(result.source).toEqual({
      format: "png",
      originalWidth: 2,
      originalHeight: 1,
      orientedWidth: 2,
      orientedHeight: 1,
      exifOrientation: 1,
      hasAlpha: true,
    });
    expect([...result.image.data]).toEqual([255, 0, 0, 255, 0, 0, 0, 0]);
    expect(JSON.stringify(result)).not.toContain("name");
    expect(release).toHaveBeenCalledOnce();
  });

  it("removes strict source white before resize so a green edge maps only as B8", async () => {
    const source = rgbaImage(6, 1, [
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [20, 180, 80, 255],
      [20, 180, 80, 255],
      [20, 180, 80, 255],
    ]);
    const result = await decodeAndNormalizeImage(
      blob(),
      { ...options, targetWidth: 3 },
      undefined,
      normalizerDependencies({
        decoded: decodedRaster(6, 1),
        rasterize: async () => source,
      }),
    );

    expect(rgbaPixels(result.image)).toEqual([
      [0, 0, 0, 0],
      [20, 180, 80, 128],
      [20, 180, 80, 255],
    ]);
    const quantized = quantizeImage(result.image, {
      maxColors: 32,
      alphaThreshold: 16,
    });
    expect(quantized.colors).toHaveLength(1);
    expect(quantized.colors[0]?.rgb).toEqual({ r: 20, g: 180, b: 80 });
    expect(matchCode(quantized.colors[0]!.lab)).toBe("B8");
  });

  it("eliminates the distinct white-cyan blend before resize", async () => {
    const source = rgbaImage(6, 1, [
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [215, 255, 255, 255],
      [215, 255, 255, 255],
      [215, 255, 255, 255],
    ]);
    const result = await decodeAndNormalizeImage(
      blob(),
      { ...options, targetWidth: 3 },
      undefined,
      normalizerDependencies({
        decoded: decodedRaster(6, 1),
        rasterize: async () => source,
      }),
    );

    expect(rgbaPixels(result.image)).toEqual([
      [0, 0, 0, 0],
      [215, 255, 255, 128],
      [215, 255, 255, 255],
    ]);
    const quantized = quantizeImage(result.image, {
      maxColors: 32,
      alphaThreshold: 16,
    });
    expect(quantized.colors).toHaveLength(1);
    expect(quantized.colors[0]?.rgb).toEqual({ r: 215, g: 255, b: 255 });
    expect(matchCode(quantized.colors[0]!.lab)).toBe("C14");
  });

  it("refines opaque source matte before resize", async () => {
    const source = rgbaImage(8, 1, [
      [255, 255, 255, 255],
      [247, 247, 247, 255],
      [246, 246, 246, 255],
      [245, 245, 245, 255],
      [244, 244, 244, 255],
      [243, 243, 243, 255],
      [242, 242, 242, 255],
      [20, 20, 20, 255],
    ]);
    const before = new Uint8ClampedArray(source.data);
    const result = await decodeAndNormalizeImage(
      blob(),
      { ...options, targetWidth: 4 },
      undefined,
      normalizerDependencies({
        decoded: decodedRaster(8, 1),
        rasterize: async () => source,
      }),
    );

    expect(rgbaPixels(result.image)).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [20, 20, 20, 128],
    ]);
    expect(source.data).toEqual(before);
  });

  it("bypasses opaque matte refinement for sources that already contain alpha", async () => {
    const source = rgbaImage(4, 1, [
      [255, 255, 255, 255],
      [247, 247, 247, 255],
      [242, 242, 242, 255],
      [20, 20, 20, 0],
    ]);
    const result = await decodeAndNormalizeImage(
      blob(),
      { ...options, targetWidth: 4 },
      undefined,
      normalizerDependencies({
        decoded: decodedRaster(4, 1),
        rasterize: async () => source,
      }),
    );

    expect(rgbaPixels(result.image)).toEqual([
      [0, 0, 0, 0],
      [247, 247, 247, 255],
      [242, 242, 242, 255],
      [0, 0, 0, 0],
    ]);
  });

  it("applies opaque source matte semantics deterministically at 40, 80, and 104", async () => {
    for (const size of [40, 80, 104]) {
      const values = Array.from(
        { length: size * size },
        (): [number, number, number, number] => [255, 255, 255, 255],
      );
      const center = Math.floor(size / 2);
      values[center * size + center - 2] = [247, 247, 247, 255];
      values[center * size + center - 1] = [242, 242, 242, 255];
      values[center * size + center] = [20, 20, 20, 255];
      const source = rgbaImage(size, size, values);
      const before = new Uint8ClampedArray(source.data);
      const dependencies = normalizerDependencies({
        decoded: decodedRaster(size, size),
        rasterize: async () => source,
      });

      const first = await decodeAndNormalizeImage(
        blob(),
        { ...options, targetWidth: size, targetHeight: size },
        undefined,
        dependencies,
      );
      const second = await decodeAndNormalizeImage(
        blob(),
        { ...options, targetWidth: size, targetHeight: size },
        undefined,
        dependencies,
      );

      expect(first.image).toMatchObject({ width: size, height: size });
      expect(first.image.data).toEqual(second.image.data);
      expect(source.data).toEqual(before);
    }
  });

  it("canonicalizes strict opaque White-mode source background before resize", async () => {
    const source = rgbaImage(3, 1, [
      [249, 250, 251, 255],
      [210, 20, 30, 255],
      [249, 250, 251, 255],
    ]);
    const before = new Uint8ClampedArray(source.data);
    const result = await decodeAndNormalizeImage(
      blob(),
      {
        ...options,
        targetWidth: 3,
        background: "white",
      },
      undefined,
      normalizerDependencies({
        decoded: decodedRaster(3, 1),
        rasterize: async () => source,
      }),
    );

    expect(rgbaPixels(result.image)).toEqual([
      [255, 255, 255, 255],
      [210, 20, 30, 255],
      [255, 255, 255, 255],
    ]);
    expect(source.data).toEqual(before);
  });

  it("does not apply opaque White-mode source cleanup to an alpha-bearing image", async () => {
    const source = rgbaImage(3, 1, [
      [249, 250, 251, 255],
      [210, 20, 30, 254],
      [249, 250, 251, 255],
    ]);
    const result = await decodeAndNormalizeImage(
      blob(),
      { ...options, targetWidth: 3, background: "white" },
      undefined,
      normalizerDependencies({
        decoded: decodedRaster(3, 1),
        rasterize: async () => source,
      }),
    );

    expect(result.source.hasAlpha).toBe(true);
    expect(pixelAt(result.image, 0, 0)).toEqual([249, 250, 251, 255]);
    expect(pixelAt(result.image, 2, 0)).toEqual([249, 250, 251, 255]);
  });

  it("canonicalizes opaque White-mode source background deterministically at 40, 80, and 104", async () => {
    for (const size of [40, 80, 104]) {
      const values = Array.from(
        { length: size * size },
        (): [number, number, number, number] => [249, 250, 251, 255],
      );
      const center = Math.floor(values.length / 2);
      values[center] = [210, 20, 30, 255];
      const source = rgbaImage(size, size, values);
      const before = new Uint8ClampedArray(source.data);
      const dependencies = normalizerDependencies({
        decoded: decodedRaster(size, size),
        rasterize: async () => source,
      });

      const first = await decodeAndNormalizeImage(
        blob(),
        {
          ...options,
          targetWidth: size,
          targetHeight: size,
          background: "white",
        },
        undefined,
        dependencies,
      );
      const second = await decodeAndNormalizeImage(
        blob(),
        {
          ...options,
          targetWidth: size,
          targetHeight: size,
          background: "white",
        },
        undefined,
        dependencies,
      );

      expect(first.image.data).toEqual(second.image.data);
      expect(pixelAt(first.image, 0, 0)).toEqual([255, 255, 255, 255]);
      expect(
        pixelAt(first.image, center % size, Math.floor(center / size)),
      ).toEqual([210, 20, 30, 255]);
      expect(source.data).toEqual(before);
    }
  });

  it("removes detected production-style background colors before White-mode quantization", async () => {
    const background: [number, number, number, number] = [249, 250, 251, 255];
    const subject: [number, number, number, number] = [20, 180, 80, 255];
    const source = rgbaImage(8, 2, [
      background,
      background,
      background,
      background,
      background,
      background,
      subject,
      subject,
      background,
      background,
      background,
      background,
      background,
      background,
      subject,
      subject,
    ]);
    const result = await decodeAndNormalizeImage(
      blob(),
      {
        ...options,
        targetWidth: 4,
        targetHeight: 1,
        background: "white",
      },
      undefined,
      normalizerDependencies({
        decoded: decodedRaster(8, 2),
        rasterize: async () => source,
      }),
    );
    const quantized = quantizeImage(result.image, {
      maxColors: 2,
      alphaThreshold: 16,
    });

    expect(rgbaPixels(result.image)).toEqual([
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [20, 180, 80, 255],
    ]);
    expect(quantized.colors.map(({ lab }) => matchCode(lab)).sort()).toEqual([
      "B8",
      "H2",
    ]);
  });

  it("creates contain padding after source masking and leaves it transparent", async () => {
    const source = rgbaImage(6, 2, [
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [210, 20, 30, 255],
      [210, 20, 30, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [210, 20, 30, 255],
      [210, 20, 30, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
    ]);
    const result = await decodeAndNormalizeImage(
      blob(),
      { ...options, targetWidth: 3, targetHeight: 3 },
      undefined,
      normalizerDependencies({
        decoded: decodedRaster(6, 2),
        rasterize: async () => source,
      }),
    );

    expect(result.target).toMatchObject({
      drawX: 0,
      drawY: 1,
      drawWidth: 3,
      drawHeight: 1,
    });
    expect(rgbaPixels(result.image).slice(0, 3)).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(rgbaPixels(result.image).slice(6, 9)).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });

  it("allows an empty MIME when the signature is valid", async () => {
    await expect(
      decodeAndNormalizeImage(
        blob(""),
        options,
        undefined,
        normalizerDependencies(),
      ),
    ).resolves.toBeDefined();
  });

  it("rejects a MIME conflict before browser decode", async () => {
    const dependencies = normalizerDependencies();
    await expect(
      decodeAndNormalizeImage(
        blob("image/jpeg"),
        options,
        undefined,
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "MIME_SIGNATURE_MISMATCH" });
    expect(dependencies.decode).not.toHaveBeenCalled();
  });

  it("rejects an empty file before reading", async () => {
    const dependencies = normalizerDependencies();
    await expect(
      decodeAndNormalizeImage(new Blob(), options, undefined, dependencies),
    ).rejects.toMatchObject({ code: "EMPTY_FILE" });
    expect(dependencies.readBytes).not.toHaveBeenCalled();
  });

  it("rejects an oversized file before reading", async () => {
    const dependencies = normalizerDependencies();
    const oversized = { size: MAX_FILE_BYTES + 1, type: "image/png" } as Blob;
    await expect(
      decodeAndNormalizeImage(oversized, options, undefined, dependencies),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(dependencies.readBytes).not.toHaveBeenCalled();
  });

  it("rejects invalid target dimensions before reading", async () => {
    const dependencies = normalizerDependencies();
    await expect(
      decodeAndNormalizeImage(
        blob(),
        { ...options, targetWidth: 0 },
        undefined,
        dependencies,
      ),
    ).rejects.toMatchObject({ code: "INVALID_TARGET_DIMENSIONS" });
    expect(dependencies.readBytes).not.toHaveBeenCalled();
  });

  it("checks decoded pixel limits before rasterization and releases", async () => {
    const release = vi.fn();
    const dependencies = normalizerDependencies({
      decoded: { source: {}, width: 40_000_001, height: 1, release },
    });
    await expect(
      decodeAndNormalizeImage(blob(), options, undefined, dependencies),
    ).rejects.toMatchObject({ code: "DECODED_PIXEL_LIMIT_EXCEEDED" });
    expect(dependencies.rasterize).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledOnce();
  });

  it("falls back from invalid EXIF to 1 with a safe diagnostic", async () => {
    const bytes = createExifJpeg(6).subarray(0, 20);
    const diagnostic = vi.fn();
    const dependencies = normalizerDependencies({
      bytes,
      onDiagnostic: diagnostic,
    });
    await decodeAndNormalizeImage(
      new Blob([copyArrayBuffer(bytes)], { type: "image/jpeg" }),
      options,
      undefined,
      dependencies,
    );
    expect(diagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_EXIF_DATA" }),
    );
  });

  it("rejects cancellation before any work", async () => {
    const controller = new AbortController();
    controller.abort();
    const dependencies = normalizerDependencies();
    await expect(
      decodeAndNormalizeImage(blob(), options, controller.signal, dependencies),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(dependencies.readBytes).not.toHaveBeenCalled();
  });

  it("releases a late decoder result after cancellation", async () => {
    const controller = new AbortController();
    const release = vi.fn();
    let resolveDecoded!: (value: BrowserRasterSource) => void;
    const dependencies = normalizerDependencies({
      decode: () =>
        new Promise((resolve) => {
          resolveDecoded = resolve;
        }),
    });
    const pending = decodeAndNormalizeImage(
      blob(),
      options,
      controller.signal,
      dependencies,
    );
    await vi.waitFor(() => expect(resolveDecoded).toBeTypeOf("function"));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
    resolveDecoded(decodedSource(release));
    await Promise.resolve();
    expect(release).toHaveBeenCalledOnce();
  });

  it("releases decoded resources when rasterization fails", async () => {
    const release = vi.fn();
    const dependencies = normalizerDependencies({
      release,
      rasterize: () => Promise.reject(new Error("private.png")),
    });
    await expect(
      decodeAndNormalizeImage(blob(), options, undefined, dependencies),
    ).rejects.toMatchObject({
      code: "PIXEL_READ_FAILED",
      message: "Decoded image pixels could not be read safely.",
    });
    expect(release).toHaveBeenCalledOnce();
  });

  it("cancels during rasterization without returning a partial result", async () => {
    const controller = new AbortController();
    const release = vi.fn();
    let resolvePixels!: (value: RgbaImage) => void;
    const dependencies = normalizerDependencies({
      release,
      rasterize: () =>
        new Promise((resolve) => {
          resolvePixels = resolve;
        }),
    });
    const pending = decodeAndNormalizeImage(
      blob(),
      options,
      controller.signal,
      dependencies,
    );
    await vi.waitFor(() => expect(resolvePixels).toBeTypeOf("function"));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
    resolvePixels({
      width: 2,
      height: 1,
      data: new Uint8ClampedArray(8),
    });
    await Promise.resolve();
    expect(release).toHaveBeenCalledOnce();
  });

  it("uses browser-oriented pixels for EXIF 6 without rotating twice", async () => {
    const bytes = createExifJpeg(6);
    const dependencies = normalizerDependencies({
      bytes,
      decoded: { source: {}, width: 1, height: 2, release: vi.fn() },
      rasterize: async () => ({
        width: 1,
        height: 2,
        data: new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]),
      }),
    });
    const result = await decodeAndNormalizeImage(
      new Blob([copyArrayBuffer(bytes)], { type: "image/jpeg" }),
      { ...options, targetWidth: 1, targetHeight: 2 },
      undefined,
      dependencies,
    );

    expect(result.source).toMatchObject({
      originalWidth: 2,
      originalHeight: 1,
      orientedWidth: 1,
      orientedHeight: 2,
      exifOrientation: 6,
    });
    expect([...result.image.data]).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
  });

  it("releases decoded resources when upscaling is rejected", async () => {
    const release = vi.fn();
    await expect(
      decodeAndNormalizeImage(
        blob(),
        { ...options, targetWidth: 4, targetHeight: 2 },
        undefined,
        normalizerDependencies({ release }),
      ),
    ).rejects.toMatchObject({ code: "UPSCALE_NOT_ALLOWED" });
    expect(release).toHaveBeenCalledOnce();
  });

  it("does not expose browser exception text through the default service boundary", async () => {
    const dependencies = normalizerDependencies({
      decode: () => Promise.reject(new Error("sensitive-file-name.jpg")),
    });
    await expect(
      decodeAndNormalizeImage(blob(), options, undefined, dependencies),
    ).rejects.toMatchObject({
      code: "IMAGE_DECODE_FAILED",
      message: "The browser could not decode the image content.",
    });
  });
});

function blob(type = "image/png"): Blob {
  return new Blob([copyArrayBuffer(MINIMAL_PNG_BYTES)], { type });
}

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function unusedUrlDependencies(): Omit<
  BrowserImageDecoderDependencies,
  "createBitmap"
> {
  return {
    createImageElement: () => fakeImageElement(),
    createObjectUrl: () => "blob:unused",
    revokeObjectUrl: vi.fn(),
  };
}

function fakeImageElement(
  decode: () => Promise<void> = () => Promise.resolve(),
): ImageElementLike {
  return {
    decoding: "auto",
    naturalWidth: 2,
    naturalHeight: 1,
    src: "",
    decode,
  };
}

function decodedSource(release = vi.fn()): BrowserRasterSource {
  return { source: {}, width: 1, height: 1, release };
}

function decodedRaster(width: number, height: number): BrowserRasterSource {
  return { source: {}, width, height, release: vi.fn() };
}

function rgbaImage(
  width: number,
  height: number,
  pixels: readonly (readonly [number, number, number, number])[],
): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(pixels.flat()) };
}

function rgbaPixels(image: RgbaImage): number[][] {
  return Array.from({ length: image.width * image.height }, (_, index) => [
    ...image.data.slice(index * 4, index * 4 + 4),
  ]);
}

function pixelAt(image: RgbaImage, x: number, y: number): number[] {
  const offset = (y * image.width + x) * 4;
  return [...image.data.slice(offset, offset + 4)];
}

const generationCandidates = prepareColorMatchCandidates(
  adaptRuntimePaletteToGeneration(
    createApprovedRuntimePaletteProvider().getSnapshot(),
  ).colors,
);

function matchCode(lab: {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}): string {
  return matchNearestColor(lab, generationCandidates).color.code;
}

function fakeCanvas(pixels: Uint8ClampedArray): {
  canvas: CanvasLike;
  context: CanvasContextLike;
} {
  const context: CanvasContextLike = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: pixels }) as ImageData),
  };
  return {
    canvas: { width: 9, height: 9, getContext: () => context },
    context,
  };
}

function normalizerDependencies(
  overrides: {
    bytes?: Uint8Array;
    decode?: BrowserImageNormalizerDependencies["decode"];
    decoded?: BrowserRasterSource;
    onDiagnostic?: BrowserImageNormalizerDependencies["onDiagnostic"];
    rasterize?: BrowserImageNormalizerDependencies["rasterize"];
    release?: () => void;
  } = {},
): BrowserImageNormalizerDependencies {
  const decoded = overrides.decoded ?? {
    source: {},
    width: 2,
    height: 1,
    release: overrides.release ?? vi.fn(),
  };
  const pixels: RgbaImage = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255, 9, 8, 7, 0]),
  };
  return {
    readBytes: vi.fn(async () =>
      copyArrayBuffer(overrides.bytes ?? MINIMAL_PNG_BYTES),
    ),
    decode: vi.fn(overrides.decode ?? (async () => decoded)),
    rasterize: vi.fn(overrides.rasterize ?? (async () => pixels)),
    onDiagnostic: overrides.onDiagnostic,
  };
}
