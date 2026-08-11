import { xyzD65ToLab } from "./lab";
import { rgb8ToLinearRgb } from "./srgb";
import type { LabColor, Rgb8, XyzD65 } from "./color.types";
import { linearRgbToXyzD65 } from "./xyz";

const LAB_LIGHTNESS_ENDPOINT_TOLERANCE = 1e-5;

export function rgb8ToXyzD65(rgb: Rgb8): XyzD65 {
  return linearRgbToXyzD65(rgb8ToLinearRgb(rgb));
}

export function rgb8ToLab(rgb: Rgb8): LabColor {
  const lab = xyzD65ToLab(rgb8ToXyzD65(rgb));
  const l = normalizeLightnessEndpoint(lab.l);
  return l === lab.l ? lab : { ...lab, l };
}

function normalizeLightnessEndpoint(value: number): number {
  if (value < 0 && value >= -LAB_LIGHTNESS_ENDPOINT_TOLERANCE) return 0;
  if (value > 100 && value <= 100 + LAB_LIGHTNESS_ENDPOINT_TOLERANCE)
    return 100;
  return value;
}
