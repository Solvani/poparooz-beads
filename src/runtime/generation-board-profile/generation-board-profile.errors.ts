export const GENERATION_BOARD_PROFILE_ERROR_CODES = [
  "GENERATION_BOARD_PROFILE_INPUT_INVALID",
  "GENERATION_BOARD_PROFILE_IDENTITY_MISMATCH",
  "GENERATION_BOARD_PROFILE_OUTPUT_INVALID",
] as const;

export type GenerationBoardProfileErrorCode =
  (typeof GENERATION_BOARD_PROFILE_ERROR_CODES)[number];

const SAFE_MESSAGES: Readonly<Record<GenerationBoardProfileErrorCode, string>> =
  Object.freeze({
    GENERATION_BOARD_PROFILE_INPUT_INVALID:
      "The BoardProfile input is invalid for generation.",
    GENERATION_BOARD_PROFILE_IDENTITY_MISMATCH:
      "The BoardProfile identity is invalid for generation.",
    GENERATION_BOARD_PROFILE_OUTPUT_INVALID:
      "The Generation BoardProfile output is invalid.",
  });

export class GenerationBoardProfileError extends Error {
  readonly code: GenerationBoardProfileErrorCode;

  constructor(code: GenerationBoardProfileErrorCode) {
    super(SAFE_MESSAGES[code]);
    this.name = "GenerationBoardProfileError";
    this.code = code;
  }
}
