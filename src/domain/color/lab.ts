import {
  CIELAB_EPSILON,
  CIELAB_KAPPA,
  D65_2_DEGREE_WHITE_POINT,
} from "./color-constants";
import { normalizeNegativeZero, validateXyzD65 } from "./color-validation";
import type { LabColor, XyzD65 } from "./color.types";

function labTransform(value: number): number {
  return value > CIELAB_EPSILON
    ? Math.cbrt(value)
    : (CIELAB_KAPPA * value + 16) / 116;
}

export function xyzD65ToLab(xyz: XyzD65): LabColor {
  validateXyzD65(xyz);

  const fx = labTransform(xyz.x / D65_2_DEGREE_WHITE_POINT.x);
  const fy = labTransform(xyz.y / D65_2_DEGREE_WHITE_POINT.y);
  const fz = labTransform(xyz.z / D65_2_DEGREE_WHITE_POINT.z);

  return {
    l: normalizeNegativeZero(116 * fy - 16),
    a: normalizeNegativeZero(500 * (fx - fy)),
    b: normalizeNegativeZero(200 * (fy - fz)),
  };
}
