import { xyzD65ToLab } from "./lab";
import { rgb8ToLinearRgb } from "./srgb";
import type { LabColor, Rgb8, XyzD65 } from "./color.types";
import { linearRgbToXyzD65 } from "./xyz";

export function rgb8ToXyzD65(rgb: Rgb8): XyzD65 {
  return linearRgbToXyzD65(rgb8ToLinearRgb(rgb));
}

export function rgb8ToLab(rgb: Rgb8): LabColor {
  return xyzD65ToLab(rgb8ToXyzD65(rgb));
}
