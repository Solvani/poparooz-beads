import { ImagePipelineError } from "../../domain/image/image-errors";
import { PatternAssemblyError } from "../../domain/pattern/pattern-errors";
import { QuantizationWorkerError } from "../../lib/quantization-worker/quantization-worker.errors";
import { GenerationColorSetError } from "../../runtime/generation-color-set/generation-color-set.errors";

export class GenerationRequestError extends Error {
  constructor() {
    super("The generation request is invalid.");
    this.name = "GenerationRequestError";
  }
}

export type SafeGenerationErrorCode =
  | "unsupported-image"
  | "image-too-large"
  | "decode-failed"
  | "invalid-settings"
  | "generation-unavailable"
  | "worker-failed"
  | "pattern-failed"
  | "unknown";

export interface SafeGenerationError {
  readonly code: SafeGenerationErrorCode;
  readonly message: string;
}

export function isGenerationCancellation(error: unknown): boolean {
  return (
    (error instanceof ImagePipelineError && error.code === "ABORTED") ||
    (error instanceof QuantizationWorkerError &&
      (error.code === "ABORTED" ||
        error.code === "SUPERSEDED" ||
        error.code === "CLIENT_DISPOSED")) ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

export function toSafeGenerationError(error: unknown): SafeGenerationError {
  if (error instanceof ImagePipelineError) {
    if (
      error.code === "UNSUPPORTED_IMAGE_FORMAT" ||
      error.code === "MIME_SIGNATURE_MISMATCH"
    ) {
      return safe(
        "unsupported-image",
        "This image could not be read as a supported JPEG, PNG, or WebP file.",
      );
    }
    if (error.code === "FILE_TOO_LARGE") {
      return safe(
        "image-too-large",
        "This image exceeds the supported size limit.",
      );
    }
    if (
      error.code === "INVALID_TARGET_DIMENSIONS" ||
      error.code === "UPSCALE_NOT_ALLOWED"
    ) {
      return safe(
        "invalid-settings",
        "These pattern settings cannot be applied to this image.",
      );
    }
    return safe(
      "decode-failed",
      "This image could not be prepared for pattern generation.",
    );
  }
  if (error instanceof QuantizationWorkerError) {
    return safe(
      "worker-failed",
      "The pattern processor could not complete this request.",
    );
  }
  if (
    error instanceof GenerationRequestError ||
    error instanceof GenerationColorSetError
  ) {
    return safe(
      "invalid-settings",
      "These pattern settings cannot be applied to this image.",
    );
  }
  if (error instanceof PatternAssemblyError) {
    return safe(
      "pattern-failed",
      "The pattern data could not be completed safely.",
    );
  }
  return safe(
    "unknown",
    "We couldn’t create this pattern. Your image and settings are still available.",
  );
}

export const GENERATION_UNAVAILABLE_ERROR: SafeGenerationError = Object.freeze({
  code: "generation-unavailable",
  message: "Pattern generation is not available in this preview.",
});

function safe(
  code: SafeGenerationErrorCode,
  message: string,
): SafeGenerationError {
  return Object.freeze({ code, message });
}
