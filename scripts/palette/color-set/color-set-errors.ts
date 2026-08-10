export type ColorSetErrorCode =
  | "COLOR_SET_SOURCE_INVALID"
  | "COLOR_SET_INPUT_INVALID"
  | "COLOR_SET_ARTIFACT_INVALID"
  | "COLOR_SET_LOCK_INVALID"
  | "COLOR_SET_PRODUCTION_GATE_FAILED"
  | "COLOR_SET_PUBLICATION_CONFLICT"
  | "COLOR_SET_PUBLICATION_FAILED";

export class ColorSetCompilationError extends Error {
  readonly code: ColorSetErrorCode;

  constructor(
    code: ColorSetErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(
      `[${code}] ${message.replace(/[\r\n\t]+/g, " ").slice(0, 500)}`,
      options,
    );
    this.name = "ColorSetCompilationError";
    this.code = code;
  }
}

export function formatColorSetCliError(error: unknown): string {
  return error instanceof ColorSetCompilationError
    ? error.message
    : "[COLOR_SET_INPUT_INVALID] Color Set processing failed unexpectedly.";
}
