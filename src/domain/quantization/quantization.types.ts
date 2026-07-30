import type { LabColor, Rgb8 } from "../color/color.types";

export interface QuantizationOptions {
  readonly maxColors: number;
  readonly alphaThreshold: number;
}

export interface QuantizedColor {
  readonly index: number;
  readonly rgb: Rgb8;
  readonly lab: LabColor;
  readonly pixelCount: number;
}

export interface QuantizedImage {
  readonly width: number;
  readonly height: number;
  readonly colors: readonly QuantizedColor[];
  readonly colorIndices: Uint16Array;
  readonly transparentIndex: number;
  readonly opaquePixelCount: number;
  readonly transparentPixelCount: number;
}

export interface HistogramEntry {
  readonly key: number;
  readonly rgb: Rgb8;
  readonly lab: LabColor;
  readonly count: number;
}

export type LabAxis = "l" | "a" | "b";
