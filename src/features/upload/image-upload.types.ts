export type ImageUploadErrorCode =
  | "MULTIPLE_FILES"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "PREVIEW_UNAVAILABLE";

export interface ImageUploadError {
  readonly code: ImageUploadErrorCode;
  readonly message: string;
}

export interface ImageSource {
  readonly file: File;
  readonly objectUrl: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
}

export type ImageSelectionResult =
  | { readonly status: "selected" }
  | { readonly status: "cancelled" }
  | { readonly status: "rejected"; readonly error: ImageUploadError };
