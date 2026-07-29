import { ImagePipelineError } from "../../domain/image/image-errors";
import { awaitWithAbort } from "./abortable";

export interface BrowserRasterSource {
  readonly source: unknown;
  readonly width: number;
  readonly height: number;
  release(): void;
}

export interface BitmapLike {
  readonly width: number;
  readonly height: number;
  close(): void;
}

export interface ImageElementLike {
  decoding: "async" | "auto" | "sync";
  naturalWidth: number;
  naturalHeight: number;
  src: string;
  decode(): Promise<void>;
}

export interface BrowserImageDecoderDependencies {
  createBitmap?: (
    input: Blob,
    options: ImageBitmapOptions,
  ) => Promise<BitmapLike>;
  createImageElement(): ImageElementLike;
  createObjectUrl(input: Blob): string;
  revokeObjectUrl(url: string): void;
}

export async function decodeBrowserImage(
  input: Blob,
  signal?: AbortSignal,
  dependencies: BrowserImageDecoderDependencies = defaultDependencies(),
): Promise<BrowserRasterSource> {
  if (dependencies.createBitmap !== undefined) {
    try {
      const bitmap = await awaitWithAbort(
        dependencies.createBitmap(input, {
          colorSpaceConversion: "none",
          imageOrientation: "from-image",
          premultiplyAlpha: "none",
        }),
        signal,
        (lateBitmap) => lateBitmap.close(),
      );
      return releasable(bitmap, bitmap.width, bitmap.height, () =>
        bitmap.close(),
      );
    } catch (error) {
      if (error instanceof ImagePipelineError) throw error;
      throw new ImagePipelineError(
        "IMAGE_DECODE_FAILED",
        "The browser could not decode the image content.",
      );
    }
  }

  return decodeWithObjectUrl(input, signal, dependencies);
}

async function decodeWithObjectUrl(
  input: Blob,
  signal: AbortSignal | undefined,
  dependencies: BrowserImageDecoderDependencies,
): Promise<BrowserRasterSource> {
  let objectUrl: string;
  try {
    objectUrl = dependencies.createObjectUrl(input);
  } catch {
    throw new ImagePipelineError(
      "IMAGE_DECODE_FAILED",
      "The browser could not prepare the image for decoding.",
    );
  }

  const image = dependencies.createImageElement();
  image.decoding = "async";
  image.src = objectUrl;
  try {
    await awaitWithAbort(image.decode(), signal);
    return releasable(image, image.naturalWidth, image.naturalHeight, () => {
      image.src = "";
    });
  } catch (error) {
    image.src = "";
    if (error instanceof ImagePipelineError) throw error;
    throw new ImagePipelineError(
      "IMAGE_DECODE_FAILED",
      "The browser could not decode the image content.",
    );
  } finally {
    dependencies.revokeObjectUrl(objectUrl);
  }
}

function releasable(
  source: unknown,
  width: number,
  height: number,
  cleanup: () => void,
): BrowserRasterSource {
  let released = false;
  return {
    source,
    width,
    height,
    release: () => {
      if (released) return;
      released = true;
      cleanup();
    },
  };
}

function defaultDependencies(): BrowserImageDecoderDependencies {
  const createBitmap = globalThis.createImageBitmap?.bind(globalThis);
  return {
    createBitmap:
      createBitmap === undefined
        ? undefined
        : (input, options) => createBitmap(input, options),
    createImageElement: () => document.createElement("img"),
    createObjectUrl: (input) => URL.createObjectURL(input),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  };
}
