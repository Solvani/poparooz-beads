import { ImagePipelineError } from "../../domain/image/image-errors";
import {
  validateFileSize,
  validateImageDimensions,
  validateNormalizeOptions,
} from "../../domain/image/image-limits";
import {
  detectImageFormat,
  validateImageMime,
} from "../../domain/image/image-signature";
import { readExifOrientation } from "../../domain/image/exif-orientation";
import {
  canonicalizeStrictEdgeConnectedLightBackgroundToWhite,
  excludeStrictEdgeConnectedLightBackground,
} from "../../domain/image/edge-connected-light-background";
import { refineOpaqueSourceMatteBackground } from "../../domain/image/opaque-source-matte-background";
import { normalizeRgbaImage } from "../../domain/image/normalize-rgba";
import type {
  ImageErrorDetails,
  ImagePipelineError as ImagePipelineErrorType,
} from "../../domain/image/image-errors";
import type {
  ImageSourceMetadata,
  NormalizedImageResult,
  NormalizeImageOptions,
  RgbaImage,
} from "../../domain/image/image.types";
import { awaitWithAbort, throwIfAborted } from "./abortable";
import {
  decodeBrowserImage,
  type BrowserRasterSource,
} from "./browser-image-decoder";
import { rasterizeBrowserImage } from "./canvas-rasterizer";

export interface ImagePipelineDiagnostic {
  code: "INVALID_EXIF_DATA";
  message: string;
  details?: ImageErrorDetails;
}

export interface BrowserImageNormalizerDependencies {
  readBytes(input: Blob): Promise<ArrayBuffer>;
  decode(input: Blob, signal?: AbortSignal): Promise<BrowserRasterSource>;
  rasterize(decoded: BrowserRasterSource): Promise<RgbaImage>;
  onDiagnostic?(diagnostic: ImagePipelineDiagnostic): void;
}

export async function decodeAndNormalizeImage(
  input: Blob,
  options: NormalizeImageOptions,
  signal?: AbortSignal,
  dependencies: BrowserImageNormalizerDependencies = defaultDependencies(),
): Promise<NormalizedImageResult> {
  validateNormalizeOptions(options);
  validateFileSize(input.size);
  throwIfAborted(signal);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(
      await awaitWithAbort(dependencies.readBytes(input), signal),
    );
  } catch (error) {
    throw safePipelineError(
      error,
      "IMAGE_DECODE_FAILED",
      "The image bytes could not be read.",
    );
  }
  throwIfAborted(signal);

  const format = detectImageFormat(bytes);
  validateImageMime(format, input.type);
  const exif = readExifOrientation(bytes);
  if (exif.status === "invalid") {
    dependencies.onDiagnostic?.({
      code: "INVALID_EXIF_DATA",
      message:
        "Image orientation metadata was invalid; orientation 1 was used.",
    });
  }

  let decoded: BrowserRasterSource;
  try {
    decoded = await awaitWithAbort(
      dependencies.decode(input, signal),
      signal,
      (lateDecoded) => lateDecoded.release(),
    );
  } catch (error) {
    throw safePipelineError(
      error,
      "IMAGE_DECODE_FAILED",
      "The browser could not decode the image content.",
    );
  }

  try {
    throwIfAborted(signal);
    validateImageDimensions(decoded.width, decoded.height);
    let pixels: RgbaImage;
    try {
      pixels = await awaitWithAbort(dependencies.rasterize(decoded), signal);
    } catch (error) {
      throw safePipelineError(
        error,
        "PIXEL_READ_FAILED",
        "Decoded image pixels could not be read safely.",
      );
    }
    throwIfAborted(signal);

    const swapsDimensions = exif.orientation >= 5;
    const source: ImageSourceMetadata = {
      format,
      originalWidth: swapsDimensions ? decoded.height : decoded.width,
      originalHeight: swapsDimensions ? decoded.width : decoded.height,
      orientedWidth: decoded.width,
      orientedHeight: decoded.height,
      exifOrientation: exif.orientation,
      hasAlpha: containsAlpha(pixels.data),
    };
    const strictSource =
      options.background === "transparent"
        ? excludeStrictEdgeConnectedLightBackground(pixels)
        : options.background === "white" && !source.hasAlpha
          ? canonicalizeStrictEdgeConnectedLightBackgroundToWhite(pixels)
          : pixels;
    const normalizationSource =
      options.background === "transparent" &&
      !source.hasAlpha &&
      strictSource !== pixels
        ? refineOpaqueSourceMatteBackground(pixels, strictSource)
        : strictSource;
    const result = normalizeRgbaImage(normalizationSource, source, options);
    throwIfAborted(signal);
    return result;
  } finally {
    decoded.release();
  }
}

function containsAlpha(data: Uint8ClampedArray): boolean {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 255) return true;
  }
  return false;
}

function safePipelineError(
  error: unknown,
  code: ImagePipelineErrorType["code"],
  message: string,
): ImagePipelineError {
  return error instanceof ImagePipelineError
    ? error
    : new ImagePipelineError(code, message);
}

function defaultDependencies(): BrowserImageNormalizerDependencies {
  return {
    readBytes: (input) => input.arrayBuffer(),
    decode: (input, signal) => decodeBrowserImage(input, signal),
    rasterize: (decoded) => rasterizeBrowserImage(decoded),
  };
}
