import { SRGB_TO_XYZ_D65_MATRIX } from "./color-constants";
import { normalizeNegativeZero, validateLinearRgb } from "./color-validation";
import type { LinearRgb, XyzD65 } from "./color.types";

export function linearRgbToXyzD65(rgb: LinearRgb): XyzD65 {
  validateLinearRgb(rgb);
  const [xRow, yRow, zRow] = SRGB_TO_XYZ_D65_MATRIX;
  return {
    x: normalizeNegativeZero(
      xRow[0] * rgb.r + xRow[1] * rgb.g + xRow[2] * rgb.b,
    ),
    y: normalizeNegativeZero(
      yRow[0] * rgb.r + yRow[1] * rgb.g + yRow[2] * rgb.b,
    ),
    z: normalizeNegativeZero(
      zRow[0] * rgb.r + zRow[1] * rgb.g + zRow[2] * rgb.b,
    ),
  };
}
