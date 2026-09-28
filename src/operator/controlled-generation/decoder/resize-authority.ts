import { normalizeRgbaImage } from "../../../domain/image/normalize-rgba";
import type {
  ImageSourceMetadata,
  NormalizedImageResult,
  RgbaImage,
} from "../../../domain/image/image.types";

export const CONTROLLED_RESIZE_IMPLEMENTATION_ID =
  "poparooz-controlled-rgba-resize" as const;
export const CONTROLLED_RESIZE_IMPLEMENTATION_VERSION = "1.0.0" as const;

export function controlledContainResize(
  orientedImage: RgbaImage,
  source: ImageSourceMetadata,
  target: {
    readonly width: number;
    readonly height: number;
    readonly background: "transparent" | "white";
  },
): NormalizedImageResult {
  return normalizeRgbaImage(orientedImage, source, {
    targetWidth: target.width,
    targetHeight: target.height,
    preserveAspectRatio: true,
    fit: "contain",
    background: target.background,
    allowUpscale: false,
  });
}
