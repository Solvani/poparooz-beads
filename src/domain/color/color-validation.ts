import { ColorConversionError } from "./color-errors";
import type { LinearRgb, Rgb8, SrgbNormalized, XyzD65 } from "./color.types";

type ChannelName = "r" | "g" | "b";
type XyzChannelName = "x" | "y" | "z";

function readChannel(
  value: unknown,
  channel: ChannelName | XyzChannelName,
  invalidCode:
    | "INVALID_RGB_CHANNEL"
    | "INVALID_NORMALIZED_CHANNEL"
    | "INVALID_LINEAR_RGB"
    | "INVALID_XYZ",
): number {
  if (typeof value !== "object" || value === null || !(channel in value)) {
    throw new ColorConversionError(
      invalidCode,
      "The color contains an invalid channel.",
    );
  }

  const channelValue = (value as Record<string, unknown>)[channel];
  if (typeof channelValue !== "number") {
    throw new ColorConversionError(
      invalidCode,
      "The color contains an invalid channel.",
    );
  }
  if (!Number.isFinite(channelValue)) {
    throw new ColorConversionError(
      "NON_FINITE_COLOR_VALUE",
      "Color channels must be finite numbers.",
    );
  }
  return channelValue;
}

export function validateRgb8(rgb: Rgb8): void {
  for (const channel of ["r", "g", "b"] as const) {
    const value = readChannel(rgb, channel, "INVALID_RGB_CHANNEL");
    if (!Number.isInteger(value)) {
      throw new ColorConversionError(
        "INVALID_RGB_CHANNEL",
        "RGB8 channels must be integers.",
      );
    }
    if (value < 0 || value > 255) {
      throw new ColorConversionError(
        "RGB_CHANNEL_OUT_OF_RANGE",
        "RGB8 channels must be between 0 and 255.",
      );
    }
  }
}

export function validateNormalizedSrgb(rgb: SrgbNormalized): void {
  for (const channel of ["r", "g", "b"] as const) {
    const value = readChannel(rgb, channel, "INVALID_NORMALIZED_CHANNEL");
    if (value < 0 || value > 1) {
      throw new ColorConversionError(
        "INVALID_NORMALIZED_CHANNEL",
        "Normalized sRGB channels must be between 0 and 1.",
      );
    }
  }
}

export function validateNormalizedSrgbChannel(channel: number): void {
  if (typeof channel !== "number") {
    throw new ColorConversionError(
      "INVALID_NORMALIZED_CHANNEL",
      "A normalized sRGB channel must be a number.",
    );
  }
  if (!Number.isFinite(channel)) {
    throw new ColorConversionError(
      "NON_FINITE_COLOR_VALUE",
      "Color channels must be finite numbers.",
    );
  }
  if (channel < 0 || channel > 1) {
    throw new ColorConversionError(
      "INVALID_NORMALIZED_CHANNEL",
      "A normalized sRGB channel must be between 0 and 1.",
    );
  }
}

export function validateLinearRgb(rgb: LinearRgb): void {
  for (const channel of ["r", "g", "b"] as const) {
    const value = readChannel(rgb, channel, "INVALID_LINEAR_RGB");
    if (value < 0 || value > 1) {
      throw new ColorConversionError(
        "INVALID_LINEAR_RGB",
        "Linear RGB channels must be between 0 and 1.",
      );
    }
  }
}

export function validateXyzD65(xyz: XyzD65): void {
  for (const channel of ["x", "y", "z"] as const) {
    const value = readChannel(xyz, channel, "INVALID_XYZ");
    if (value < 0) {
      throw new ColorConversionError(
        "INVALID_XYZ",
        "XYZ D65 channels must be non-negative.",
      );
    }
  }
}

export function normalizeNegativeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}
