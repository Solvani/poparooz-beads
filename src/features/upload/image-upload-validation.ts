import { ImagePipelineError, validateFileSize } from "../../domain/image";
import type { ImageUploadError } from "./image-upload.types";

const SUPPORTED_TYPES = new Map<string, readonly string[]>([
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
  ["image/webp", ["webp"]],
]);

export const IMAGE_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export type ImageFileValidation =
  | { readonly status: "valid"; readonly file: File }
  | { readonly status: "cancelled" }
  | { readonly status: "invalid"; readonly error: ImageUploadError };

export function validateSelectedImageFiles(
  input: FileList | readonly File[],
): ImageFileValidation {
  const files = Array.from(input);
  if (files.length === 0) return { status: "cancelled" };
  if (files.length !== 1) {
    return invalid("MULTIPLE_FILES", "Choose one image at a time.");
  }

  const file = files[0]!;
  try {
    validateFileSize(file.size);
  } catch (error) {
    if (error instanceof ImagePipelineError && error.code === "EMPTY_FILE") {
      return invalid("EMPTY_FILE", "The image file is empty.");
    }
    return invalid(
      "FILE_TOO_LARGE",
      "This image exceeds the supported 20 MB file-size limit.",
    );
  }

  const supportedExtensions = SUPPORTED_TYPES.get(file.type.toLowerCase());
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (
    supportedExtensions === undefined ||
    !supportedExtensions.includes(extension)
  ) {
    return invalid(
      "UNSUPPORTED_FILE_TYPE",
      "This file type is not supported. Choose a JPEG, PNG, or WebP image.",
    );
  }

  return { status: "valid", file };
}

function invalid(
  code: ImageUploadError["code"],
  message: string,
): ImageFileValidation {
  return { status: "invalid", error: { code, message } };
}
