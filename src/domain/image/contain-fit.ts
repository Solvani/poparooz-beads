import { ImagePipelineError } from "./image-errors";
import {
  validateImageDimensions,
  validateNormalizeOptions,
} from "./image-limits";
import type { ContainFitResult, NormalizeImageOptions } from "./image.types";

export function calculateContainFit(
  sourceWidth: number,
  sourceHeight: number,
  options: NormalizeImageOptions,
): ContainFitResult {
  validateImageDimensions(sourceWidth, sourceHeight);
  validateNormalizeOptions(options);

  const scale = Math.min(
    options.targetWidth / sourceWidth,
    options.targetHeight / sourceHeight,
  );
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new ImagePipelineError(
      "INVALID_TARGET_DIMENSIONS",
      "Contain scaling could not produce a finite positive result.",
    );
  }
  if (scale > 1 && !options.allowUpscale) {
    throw new ImagePipelineError(
      "UPSCALE_NOT_ALLOWED",
      "The target requires enlarging the source image.",
    );
  }

  const drawWidth = Math.min(
    options.targetWidth,
    Math.max(1, Math.round(sourceWidth * scale)),
  );
  const drawHeight = Math.min(
    options.targetHeight,
    Math.max(1, Math.round(sourceHeight * scale)),
  );
  const drawX = Math.floor((options.targetWidth - drawWidth) / 2);
  const drawY = Math.floor((options.targetHeight - drawHeight) / 2);

  return {
    width: options.targetWidth,
    height: options.targetHeight,
    fit: "contain",
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  };
}
