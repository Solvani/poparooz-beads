export type GenerationColorSetErrorCode =
  | "GENERATION_COLOR_SET_INPUT_INVALID"
  | "GENERATION_COLOR_SET_OUTPUT_INVALID"
  | "GENERATION_COLOR_SET_PROFILE_INVALID"
  | "GENERATION_COLOR_SET_PROJECTION_INVALID";
export class GenerationColorSetError extends Error {
  readonly code: GenerationColorSetErrorCode;
  constructor(code: GenerationColorSetErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "GenerationColorSetError";
    this.code = code;
  }
}
