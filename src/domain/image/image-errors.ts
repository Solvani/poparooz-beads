export const IMAGE_ERROR_CODES = [
  "EMPTY_FILE",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_IMAGE_FORMAT",
  "MIME_SIGNATURE_MISMATCH",
  "IMAGE_DECODE_FAILED",
  "INVALID_IMAGE_DIMENSIONS",
  "DECODED_PIXEL_LIMIT_EXCEEDED",
  "INVALID_TARGET_DIMENSIONS",
  "UPSCALE_NOT_ALLOWED",
  "INVALID_EXIF_DATA",
  "CANVAS_UNAVAILABLE",
  "PIXEL_READ_FAILED",
  "ABORTED",
] as const;

export type ImageErrorCode = (typeof IMAGE_ERROR_CODES)[number];
export type ImageErrorDetails = Readonly<
  Record<string, string | number | boolean>
>;

export class ImagePipelineError extends Error {
  readonly code: ImageErrorCode;
  readonly details?: ImageErrorDetails;

  constructor(
    code: ImageErrorCode,
    message: string,
    details?: ImageErrorDetails,
  ) {
    super(message);
    this.name = "ImagePipelineError";
    this.code = code;
    this.details = details;
  }
}
