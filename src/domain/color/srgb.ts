import { SRGB_LINEAR_DIVISOR, SRGB_LINEAR_THRESHOLD } from "./color-constants";
import {
  normalizeNegativeZero,
  validateNormalizedSrgb,
  validateNormalizedSrgbChannel,
  validateRgb8,
} from "./color-validation";
import type { LinearRgb, Rgb8, SrgbNormalized } from "./color.types";

export function rgb8ToNormalizedSrgb(rgb: Rgb8): SrgbNormalized {
  validateRgb8(rgb);
  return {
    r: normalizeNegativeZero(rgb.r / 255),
    g: normalizeNegativeZero(rgb.g / 255),
    b: normalizeNegativeZero(rgb.b / 255),
  };
}

export function srgbChannelToLinear(channel: number): number {
  validateNormalizedSrgbChannel(channel);
  const linear =
    channel <= SRGB_LINEAR_THRESHOLD
      ? channel / SRGB_LINEAR_DIVISOR
      : ((channel + 0.055) / 1.055) ** 2.4;
  return normalizeNegativeZero(linear);
}

export function normalizedSrgbToLinearRgb(rgb: SrgbNormalized): LinearRgb {
  validateNormalizedSrgb(rgb);
  return {
    r: srgbChannelToLinear(rgb.r),
    g: srgbChannelToLinear(rgb.g),
    b: srgbChannelToLinear(rgb.b),
  };
}

export function rgb8ToLinearRgb(rgb: Rgb8): LinearRgb {
  return normalizedSrgbToLinearRgb(rgb8ToNormalizedSrgb(rgb));
}
