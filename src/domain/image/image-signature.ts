import { ImagePipelineError } from "./image-errors";
import type { ImageFormat } from "./image.types";

const MIME_BY_FORMAT: Readonly<Record<ImageFormat, string>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function detectImageFormat(bytes: Uint8Array): ImageFormat {
  if (isPng(bytes)) return "png";
  if (isWebP(bytes)) return "webp";
  if (isJpeg(bytes)) return "jpeg";
  throw new ImagePipelineError(
    "UNSUPPORTED_IMAGE_FORMAT",
    "The file content is not a supported JPEG, PNG, or WebP image.",
  );
}

export function validateImageMime(format: ImageFormat, mimeType: string): void {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "") return;
  if (normalized !== MIME_BY_FORMAT[format]) {
    throw new ImagePipelineError(
      "MIME_SIGNATURE_MISMATCH",
      "The declared image type does not match the file content.",
      { detectedFormat: format },
    );
  }
}

function isPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((value, index) => bytes[index] === value);
}

function isWebP(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    bytes[3] !== 0x00 &&
    bytes[3] !== 0xff
  );
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
