export type ColorSetBrowserErrorCode =
  | "COLOR_SET_SCHEMA_INVALID"
  | "COLOR_SET_PROFILE_UNSUPPORTED"
  | "COLOR_SET_PROVIDER_INITIALIZATION_FAILED";
export class ColorSetBrowserError extends Error {
  readonly code: ColorSetBrowserErrorCode;
  constructor(code: ColorSetBrowserErrorCode) {
    super(code);
    this.name = "ColorSetBrowserError";
    this.code = code;
  }
}
