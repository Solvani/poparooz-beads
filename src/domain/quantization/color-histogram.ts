import { rgb8ToLab } from "../color/color-conversion";
import type { Rgb8 } from "../color/color.types";
import type { RgbaImage } from "../image/image.types";
import type { HistogramEntry } from "./quantization.types";

interface MutableHistogramEntry {
  readonly key: number;
  readonly rgb: Rgb8;
  count: number;
}

export function rgbToKey(rgb: Rgb8): number {
  return rgb.r * 65536 + rgb.g * 256 + rgb.b;
}

export function buildColorHistogram(
  image: RgbaImage,
  alphaThreshold: number,
): readonly HistogramEntry[] {
  const byKey = new Map<number, MutableHistogramEntry>();

  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (image.data[offset + 3]! <= alphaThreshold) {
      continue;
    }

    const rgb = {
      r: image.data[offset]!,
      g: image.data[offset + 1]!,
      b: image.data[offset + 2]!,
    };
    const key = rgbToKey(rgb);
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, { key, rgb, count: 1 });
    } else {
      existing.count += 1;
    }
  }

  return Object.freeze(
    [...byKey.values()]
      .sort((left, right) => left.key - right.key)
      .map(({ key, rgb, count }) =>
        Object.freeze({
          key,
          rgb: Object.freeze({ ...rgb }),
          lab: Object.freeze(rgb8ToLab(rgb)),
          count,
        }),
      ),
  );
}
