export const POPAROOZ_COLOR_CODE_PATTERN = /^(A|B|C|D|E|F|G|H|M)[1-9][0-9]*$/u;

export function isPoparoozColorCode(value: unknown): value is string {
  return typeof value === "string" && POPAROOZ_COLOR_CODE_PATTERN.test(value);
}
