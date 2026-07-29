import { describe, expect, it } from "vitest";

import {
  MINIMAL_JPEG_BYTES,
  MINIMAL_PNG_BYTES,
  MINIMAL_WEBP_BYTES,
} from "./image-test.fixture";
import { detectImageFormat, validateImageMime } from "./image-signature";

describe("image content signatures", () => {
  it.each([
    [MINIMAL_JPEG_BYTES, "jpeg"],
    [MINIMAL_PNG_BYTES, "png"],
    [MINIMAL_WEBP_BYTES, "webp"],
  ] as const)("detects a supported signature", (bytes, format) => {
    expect(detectImageFormat(bytes)).toBe(format);
  });

  it("rejects an empty byte array", () => {
    expectCode(
      () => detectImageFormat(new Uint8Array()),
      "UNSUPPORTED_IMAGE_FORMAT",
    );
  });

  it("rejects a JPEG SOI without a basic marker", () => {
    expectCode(
      () => detectImageFormat(new Uint8Array([0xff, 0xd8, 0x00, 0x00])),
      "UNSUPPORTED_IMAGE_FORMAT",
    );
  });

  it("rejects RIFF content without the WEBP identifier", () => {
    const bytes = new Uint8Array(MINIMAL_WEBP_BYTES);
    bytes.set([0x4e, 0x4f, 0x50, 0x45], 8);
    expectCode(() => detectImageFormat(bytes), "UNSUPPORTED_IMAGE_FORMAT");
  });

  it("accepts an empty MIME when the signature is valid", () => {
    expect(() => validateImageMime("png", "")).not.toThrow();
  });

  it.each([
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
  ] as const)("accepts the matching MIME", (format, mime) => {
    expect(() => validateImageMime(format, mime)).not.toThrow();
  });

  it("rejects a MIME/signature conflict", () => {
    expectCode(
      () => validateImageMime("png", "image/jpeg"),
      "MIME_SIGNATURE_MISMATCH",
    );
  });

  it("does not put a file name or file bytes in an error", () => {
    try {
      detectImageFormat(new Uint8Array([1, 2, 3, 4]));
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain("upload.png");
      expect(JSON.stringify(error)).not.toContain("1,2,3,4");
    }
  });
});

function expectCode(operation: () => unknown, code: string): void {
  expect(operation).toThrow(expect.objectContaining({ code }));
}
