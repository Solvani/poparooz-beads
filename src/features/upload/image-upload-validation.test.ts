import { describe, expect, it } from "vitest";

import { MAX_FILE_BYTES } from "../../domain/image";
import { validateSelectedImageFiles } from "./image-upload-validation";

describe("image upload validation", () => {
  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.jpeg", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.webp", "image/webp"],
  ])("accepts one supported %s image", (name, type) => {
    expect(
      validateSelectedImageFiles([new File(["image"], name, { type })]),
    ).toMatchObject({ status: "valid" });
  });

  it("rejects unsupported or mismatched file types", () => {
    expect(
      validateSelectedImageFiles([
        new File(["image"], "photo.gif", { type: "image/gif" }),
      ]),
    ).toMatchObject({
      status: "invalid",
      error: { code: "UNSUPPORTED_FILE_TYPE" },
    });
    expect(
      validateSelectedImageFiles([
        new File(["image"], "photo.png", { type: "image/jpeg" }),
      ]),
    ).toMatchObject({
      status: "invalid",
      error: { code: "UNSUPPORTED_FILE_TYPE" },
    });
  });

  it("rejects multiple and empty files but treats no selection as cancellation", () => {
    const image = new File(["image"], "photo.png", { type: "image/png" });
    expect(validateSelectedImageFiles([image, image])).toMatchObject({
      status: "invalid",
      error: { code: "MULTIPLE_FILES" },
    });
    expect(
      validateSelectedImageFiles([
        new File([], "empty.png", { type: "image/png" }),
      ]),
    ).toMatchObject({ status: "invalid", error: { code: "EMPTY_FILE" } });
    expect(validateSelectedImageFiles([])).toEqual({ status: "cancelled" });
  });

  it("uses the formal Phase 1 file-size limit", () => {
    const file = new File(["image"], "photo.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: MAX_FILE_BYTES + 1 });

    expect(validateSelectedImageFiles([file])).toMatchObject({
      status: "invalid",
      error: { code: "FILE_TOO_LARGE" },
    });
  });
});
