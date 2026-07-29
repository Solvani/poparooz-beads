import { ImagePipelineError } from "../../domain/image/image-errors";
import { validateImageDimensions } from "../../domain/image/image-limits";
import type { RgbaImage } from "../../domain/image/image.types";
import type { BrowserRasterSource } from "./browser-image-decoder";

export interface CanvasLike {
  width: number;
  height: number;
  getContext(
    contextId: "2d",
    options: { willReadFrequently: true },
  ): CanvasContextLike | null;
}

export interface CanvasContextLike {
  drawImage(source: never, x: number, y: number): void;
  getImageData(x: number, y: number, width: number, height: number): ImageData;
}

export interface CanvasRasterizerDependencies {
  createCanvas(): CanvasLike;
}

export async function rasterizeBrowserImage(
  decoded: BrowserRasterSource,
  dependencies: CanvasRasterizerDependencies = defaultDependencies(),
): Promise<RgbaImage> {
  validateImageDimensions(decoded.width, decoded.height);
  let canvas: CanvasLike;
  try {
    canvas = dependencies.createCanvas();
  } catch {
    throw new ImagePipelineError(
      "CANVAS_UNAVAILABLE",
      "A temporary browser raster surface is unavailable.",
    );
  }

  try {
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) {
      throw new ImagePipelineError(
        "CANVAS_UNAVAILABLE",
        "A temporary browser raster surface is unavailable.",
      );
    }
    context.drawImage(decoded.source as never, 0, 0);
    const pixels = context.getImageData(0, 0, decoded.width, decoded.height);
    return {
      width: decoded.width,
      height: decoded.height,
      data: new Uint8ClampedArray(pixels.data),
    };
  } catch (error) {
    if (error instanceof ImagePipelineError) throw error;
    throw new ImagePipelineError(
      "PIXEL_READ_FAILED",
      "Decoded image pixels could not be read safely.",
    );
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function defaultDependencies(): CanvasRasterizerDependencies {
  return { createCanvas: () => document.createElement("canvas") };
}
