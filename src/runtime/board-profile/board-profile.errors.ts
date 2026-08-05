export const BOARD_PROFILE_BROWSER_ERROR_CODES = [
  "BOARD_PROFILE_SCHEMA_INVALID",
  "BOARD_PROFILE_IDENTITY_MISMATCH",
  "BOARD_PROFILE_VALUE_MISMATCH",
  "BOARD_PROFILE_PROVIDER_INITIALIZATION_FAILED",
] as const;

export type BoardProfileBrowserErrorCode =
  (typeof BOARD_PROFILE_BROWSER_ERROR_CODES)[number];

const SAFE_MESSAGES: Readonly<Record<BoardProfileBrowserErrorCode, string>> =
  Object.freeze({
    BOARD_PROFILE_SCHEMA_INVALID: "The BoardProfile format is invalid.",
    BOARD_PROFILE_IDENTITY_MISMATCH: "The BoardProfile identity is invalid.",
    BOARD_PROFILE_VALUE_MISMATCH: "The BoardProfile values are invalid.",
    BOARD_PROFILE_PROVIDER_INITIALIZATION_FAILED:
      "The BoardProfile is unavailable.",
  });

export class BoardProfileBrowserError extends Error {
  readonly code: BoardProfileBrowserErrorCode;

  constructor(code: BoardProfileBrowserErrorCode) {
    super(SAFE_MESSAGES[code]);
    this.name = "BoardProfileBrowserError";
    this.code = code;
  }
}
