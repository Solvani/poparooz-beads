import { describe, expect, it } from "vitest";

import { deltaE2000, rgb8ToLab, type LabColor, type Rgb8 } from "../color";
import type { RgbaImage } from "../image";
import {
  buildQuantizationClusters,
  calculateWeightedLabCentroid,
  selectClusterRepresentative,
} from "./cluster-representative";
import { buildColorHistogram, rgbToKey } from "./color-histogram";
import {
  createQuantizationBox,
  selectBoxToSplit,
  selectSplitAxis,
  splitQuantizationBox,
  weightedMedianCut,
} from "./median-cut";
import {
  MAX_QUANTIZATION_COLORS,
  TRANSPARENT_COLOR_INDEX,
  QuantizationError,
  quantizeImage,
  type QuantizationErrorCode,
} from ".";
import type { HistogramEntry } from "./quantization.types";

type Pixel = readonly [number, number, number, number];

function image(
  width: number,
  height: number,
  pixels: readonly Pixel[],
): RgbaImage {
  return {
    width,
    height,
    data: new Uint8ClampedArray(pixels.flat()),
  };
}

function solidImage(width: number, height: number, pixel: Pixel): RgbaImage {
  return image(
    width,
    height,
    Array.from({ length: width * height }, () => pixel),
  );
}

function histogramEntry(rgb: Rgb8, lab: LabColor, count = 1): HistogramEntry {
  return Object.freeze({
    key: rgbToKey(rgb),
    rgb: Object.freeze({ ...rgb }),
    lab: Object.freeze({ ...lab }),
    count,
  });
}

function expectQuantizationError(
  callback: () => unknown,
  code: QuantizationErrorCode,
): void {
  try {
    callback();
    throw new Error("Expected a quantization error.");
  } catch (error) {
    expect(error).toBeInstanceOf(QuantizationError);
    expect((error as QuantizationError).code).toBe(code);
  }
}

describe("quantization input and options", () => {
  const valid = solidImage(1, 1, [1, 2, 3, 255]);

  it.each([
    null,
    { width: 0, height: 1, data: new Uint8ClampedArray(0) },
    { width: 1.5, height: 1, data: new Uint8ClampedArray(4) },
    { width: 1, height: -1, data: new Uint8ClampedArray(4) },
    { width: 1, height: 1, data: new Uint8ClampedArray(3) },
    { width: 1, height: 1, data: new Uint8Array(4) },
  ])("rejects invalid RGBA image %#", (value) => {
    expectQuantizationError(
      () =>
        quantizeImage(value as unknown as RgbaImage, {
          maxColors: 1,
          alphaThreshold: 0,
        }),
      "INVALID_RGBA_IMAGE",
    );
  });

  it.each([0, -1, 1.5, 513, Number.NaN, Number.POSITIVE_INFINITY, "2"])(
    "rejects invalid maxColors %#",
    (maxColors) => {
      expectQuantizationError(
        () =>
          quantizeImage(valid, {
            maxColors: maxColors as number,
            alphaThreshold: 0,
          }),
        "INVALID_MAX_COLORS",
      );
    },
  );

  it.each([-1, 256, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "0"])(
    "rejects invalid alphaThreshold %#",
    (alphaThreshold) => {
      expectQuantizationError(
        () =>
          quantizeImage(valid, {
            maxColors: 1,
            alphaThreshold: alphaThreshold as number,
          }),
        "INVALID_ALPHA_THRESHOLD",
      );
    },
  );

  it("accepts the engineering maximum without creating empty clusters", () => {
    const result = quantizeImage(valid, {
      maxColors: MAX_QUANTIZATION_COLORS,
      alphaThreshold: 0,
    });
    expect(result.colors).toHaveLength(1);
  });
});

describe("alpha and exact RGB histogram", () => {
  it("quantizes exact opaque white as a valid endpoint color", () => {
    const result = quantizeImage(solidImage(2, 2, [255, 255, 255, 255]), {
      maxColors: 32,
      alphaThreshold: 16,
    });

    expect(result.colors).toHaveLength(1);
    expect(result.colors[0]).toMatchObject({
      rgb: { r: 255, g: 255, b: 255 },
      lab: { l: 100 },
      pixelCount: 4,
    });
    expect(result.opaquePixelCount).toBe(4);
    expect(result.transparentPixelCount).toBe(0);
  });

  it("treats alpha equal to the threshold as transparent", () => {
    const result = quantizeImage(
      image(2, 1, [
        [255, 0, 0, 127],
        [0, 255, 0, 128],
      ]),
      { maxColors: 2, alphaThreshold: 127 },
    );
    expect(Array.from(result.colorIndices)).toEqual([
      TRANSPARENT_COLOR_INDEX,
      0,
    ]);
    expect(result.transparentPixelCount).toBe(1);
    expect(result.opaquePixelCount).toBe(1);
  });

  it("rejects an image with no pixels above the alpha threshold", () => {
    expectQuantizationError(
      () =>
        quantizeImage(
          image(2, 1, [
            [0, 0, 0, 0],
            [255, 255, 255, 100],
          ]),
          { maxColors: 2, alphaThreshold: 100 },
        ),
      "NO_QUANTIZABLE_PIXELS",
    );
  });

  it("merges identical RGB with different participating alpha values", () => {
    const source = image(3, 1, [
      [10, 20, 30, 1],
      [10, 20, 30, 128],
      [10, 20, 30, 255],
    ]);
    const histogram = buildColorHistogram(source, 0);
    expect(histogram).toHaveLength(1);
    expect(histogram[0]).toMatchObject({
      key: rgbToKey({ r: 10, g: 20, b: 30 }),
      rgb: { r: 10, g: 20, b: 30 },
      count: 3,
    });
  });

  it("excludes transparent RGB values and counts every opaque pixel once", () => {
    const source = image(4, 1, [
      [250, 1, 2, 0],
      [0, 0, 255, 255],
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ]);
    const histogram = buildColorHistogram(source, 0);
    expect(histogram.map(({ key }) => key)).toEqual([
      rgbToKey({ r: 0, g: 0, b: 255 }),
      rgbToKey({ r: 255, g: 0, b: 0 }),
    ]);
    expect(histogram.map(({ count }) => count)).toEqual([2, 1]);
    expect(histogram.some(({ rgb }) => rgb.r === 250)).toBe(false);
  });

  it("derives Lab through the accepted RGB8 conversion", () => {
    const histogram = buildColorHistogram(
      solidImage(1, 1, [51, 102, 153, 255]),
      0,
    );
    expect(histogram[0]?.lab).toEqual(rgb8ToLab({ r: 51, g: 102, b: 153 }));
  });

  it("builds the same sorted histogram for different pixel arrangements", () => {
    const first = buildColorHistogram(
      image(4, 1, [
        [255, 0, 0, 255],
        [0, 0, 255, 255],
        [255, 0, 0, 255],
        [0, 255, 0, 255],
      ]),
      0,
    );
    const second = buildColorHistogram(
      image(4, 1, [
        [0, 255, 0, 255],
        [255, 0, 0, 255],
        [0, 0, 255, 255],
        [255, 0, 0, 255],
      ]),
      0,
    );
    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
  });
});

describe("deterministic weighted Median Cut", () => {
  const lLow = histogramEntry({ r: 1, g: 0, b: 0 }, { l: 10, a: 0, b: 0 });
  const lHigh = histogramEntry({ r: 2, g: 0, b: 0 }, { l: 90, a: 0, b: 0 });
  const aHigh = histogramEntry({ r: 3, g: 0, b: 0 }, { l: 50, a: 100, b: 0 });
  const bHigh = histogramEntry({ r: 4, g: 0, b: 0 }, { l: 50, a: 0, b: 120 });

  it("selects the largest Lab range and resolves equal ranges L then a then b", () => {
    expect(selectSplitAxis(createQuantizationBox([lLow, lHigh]))).toBe("l");
    expect(selectSplitAxis(createQuantizationBox([lLow, aHigh]))).toBe("a");
    expect(selectSplitAxis(createQuantizationBox([lLow, bHigh]))).toBe("b");
    expect(
      selectSplitAxis(
        createQuantizationBox([
          histogramEntry({ r: 5, g: 0, b: 0 }, { l: 0, a: 0, b: 0 }),
          histogramEntry({ r: 6, g: 0, b: 0 }, { l: 10, a: 10, b: 10 }),
        ]),
      ),
    ).toBe("l");
  });

  it("sorts by the split axis, remaining axes, then RGB key", () => {
    const entries = [
      histogramEntry({ r: 30, g: 0, b: 0 }, { l: 50, a: 2, b: 3 }),
      histogramEntry({ r: 10, g: 0, b: 0 }, { l: 50, a: 1, b: 4 }),
      histogramEntry({ r: 20, g: 0, b: 0 }, { l: 50, a: 1, b: 2 }),
    ];
    const [left, right] = splitQuantizationBox(createQuantizationBox(entries));
    expect([...left.entries, ...right.entries].map(({ key }) => key)).toEqual([
      entries[2]!.key,
      entries[1]!.key,
      entries[0]!.key,
    ]);
  });

  it("chooses the weighted boundary closest to half and the earlier exact tie", () => {
    const entries = [
      histogramEntry({ r: 1, g: 1, b: 1 }, { l: 1, a: 0, b: 0 }, 1),
      histogramEntry({ r: 2, g: 2, b: 2 }, { l: 2, a: 0, b: 0 }, 1),
      histogramEntry({ r: 3, g: 3, b: 3 }, { l: 3, a: 0, b: 0 }, 1),
    ];
    const [left, right] = splitQuantizationBox(createQuantizationBox(entries));
    expect(left.entries).toHaveLength(1);
    expect(right.entries).toHaveLength(2);
  });

  it("keeps one high-frequency entry intact instead of splitting its weight", () => {
    const entries = [
      histogramEntry({ r: 1, g: 2, b: 3 }, { l: 1, a: 0, b: 0 }, 8),
      histogramEntry({ r: 2, g: 3, b: 4 }, { l: 2, a: 0, b: 0 }, 1),
      histogramEntry({ r: 3, g: 4, b: 5 }, { l: 3, a: 0, b: 0 }, 1),
    ];
    const [left, right] = splitQuantizationBox(createQuantizationBox(entries));
    expect(left.totalWeight).toBe(8);
    expect(right.totalWeight).toBe(2);
  });

  it("selects boxes by range, weight, entry count, then minimum key", () => {
    const smallRange = createQuantizationBox([
      histogramEntry({ r: 1, g: 0, b: 0 }, { l: 0, a: 0, b: 0 }, 20),
      histogramEntry({ r: 2, g: 0, b: 0 }, { l: 1, a: 0, b: 0 }, 20),
    ]);
    const largeRange = createQuantizationBox([
      histogramEntry({ r: 3, g: 0, b: 0 }, { l: 0, a: 0, b: 0 }),
      histogramEntry({ r: 4, g: 0, b: 0 }, { l: 10, a: 0, b: 0 }),
    ]);
    expect(selectBoxToSplit([smallRange, largeRange])).toBe(1);

    const lighter = createQuantizationBox([
      histogramEntry({ r: 5, g: 0, b: 0 }, { l: 0, a: 0, b: 0 }, 1),
      histogramEntry({ r: 6, g: 0, b: 0 }, { l: 10, a: 0, b: 0 }, 1),
    ]);
    const heavier = createQuantizationBox([
      histogramEntry({ r: 7, g: 0, b: 0 }, { l: 0, a: 0, b: 0 }, 2),
      histogramEntry({ r: 8, g: 0, b: 0 }, { l: 10, a: 0, b: 0 }, 2),
    ]);
    expect(selectBoxToSplit([lighter, heavier])).toBe(1);
  });

  it("never creates an empty box and stops when no box is splittable", () => {
    const entries = [lLow, lHigh, aHigh];
    const boxes = weightedMedianCut(entries, 10);
    expect(boxes).toHaveLength(3);
    expect(boxes.every((box) => box.entries.length === 1)).toBe(true);
    expect(boxes.flatMap((box) => box.entries)).toHaveLength(3);
  });

  it("rejects an explicit attempt to split a singleton", () => {
    expectQuantizationError(
      () => splitQuantizationBox(createQuantizationBox([lLow])),
      "UNSPLITTABLE_QUANTIZATION_BOX",
    );
  });

  it("rejects invalid and duplicate histogram entries", () => {
    expectQuantizationError(
      () => createQuantizationBox([{ ...lLow, count: 0 }]),
      "INVALID_HISTOGRAM_ENTRY",
    );
    expectQuantizationError(
      () => weightedMedianCut([lLow, { ...lLow }], 2),
      "INVALID_HISTOGRAM_ENTRY",
    );
    expectQuantizationError(
      () =>
        createQuantizationBox([
          histogramEntry(
            { r: 1, g: 2, b: 3 },
            { l: 50, a: -Number.MAX_VALUE, b: 0 },
          ),
          histogramEntry(
            { r: 4, g: 5, b: 6 },
            { l: 50, a: Number.MAX_VALUE, b: 0 },
          ),
        ]),
      "INVALID_HISTOGRAM_ENTRY",
    );
  });

  it("is independent of histogram entry order", () => {
    const entries = [lLow, lHigh, aHigh, bHigh];
    const normalize = (boxes: ReturnType<typeof weightedMedianCut>) =>
      boxes.map((box) => box.entries.map(({ key }) => key));
    expect(normalize(weightedMedianCut([...entries].reverse(), 3))).toEqual(
      normalize(weightedMedianCut(entries, 3)),
    );
  });
});

describe("actual-entry medoid representatives", () => {
  it("calculates a pixel-weighted Lab centroid", () => {
    const box = createQuantizationBox([
      histogramEntry({ r: 1, g: 0, b: 0 }, { l: 10, a: 5, b: -5 }, 1),
      histogramEntry({ r: 2, g: 0, b: 0 }, { l: 40, a: 20, b: 10 }, 3),
    ]);
    expect(calculateWeightedLabCentroid(box)).toEqual({
      l: 32.5,
      a: 16.25,
      b: 6.25,
    });
  });

  it("selects the actual entry nearest the weighted centroid by CIEDE2000", () => {
    const entries = [
      histogramEntry({ r: 10, g: 0, b: 0 }, { l: 10, a: 20, b: 30 }, 1),
      histogramEntry({ r: 20, g: 0, b: 0 }, { l: 50, a: 0, b: 0 }, 4),
      histogramEntry({ r: 30, g: 0, b: 0 }, { l: 90, a: -20, b: -30 }, 1),
    ];
    const box = createQuantizationBox(entries);
    const centroid = calculateWeightedLabCentroid(box);
    const representative = selectClusterRepresentative(box);
    expect(representative).toBe(entries[1]);
    expect(deltaE2000(representative.lab, centroid)).toBe(
      Math.min(...entries.map((entry) => deltaE2000(entry.lab, centroid))),
    );
  });

  it("uses higher count then lower RGB key for exact distance ties", () => {
    const sharedLab = { l: 50, a: 1, b: -2 };
    const highCount = histogramEntry({ r: 200, g: 0, b: 0 }, sharedLab, 3);
    const lowCount = histogramEntry({ r: 10, g: 0, b: 0 }, sharedLab, 1);
    expect(
      selectClusterRepresentative(createQuantizationBox([lowCount, highCount])),
    ).toBe(highCount);

    const lowerKey = histogramEntry({ r: 1, g: 0, b: 0 }, sharedLab, 1);
    const higherKey = histogramEntry({ r: 2, g: 0, b: 0 }, sharedLab, 1);
    expect(
      selectClusterRepresentative(createQuantizationBox([higherKey, lowerKey])),
    ).toBe(lowerKey);
  });

  it("keeps representative RGB and Lab from the same real entry", () => {
    const entries = [
      histogramEntry({ r: 11, g: 22, b: 33 }, { l: 20, a: 3, b: 4 }, 2),
      histogramEntry({ r: 44, g: 55, b: 66 }, { l: 70, a: -3, b: -4 }, 1),
    ];
    const cluster = buildQuantizationClusters([
      createQuantizationBox(entries),
    ])[0]!;
    expect(entries).toContain(cluster.representative);
    expect(cluster.representative.rgb).toBe(
      entries.find(({ key }) => key === cluster.representative.key)?.rgb,
    );
    expect(cluster.representative.lab).toBe(
      entries.find(({ key }) => key === cluster.representative.key)?.lab,
    );
  });
});

describe("quantized image output", () => {
  it("handles generated single-color and two-color 2x2 fixtures", () => {
    const red: Pixel = [255, 0, 0, 255];
    const blue: Pixel = [0, 0, 255, 255];
    const single = quantizeImage(solidImage(2, 2, red), {
      maxColors: 4,
      alphaThreshold: 0,
    });
    expect(single.colors).toHaveLength(1);
    expect(single.colors[0]?.pixelCount).toBe(4);

    const twoColor = quantizeImage(image(2, 2, [red, blue, blue, red]), {
      maxColors: 2,
      alphaThreshold: 0,
    });
    expect(twoColor.colors).toHaveLength(2);
    expect(twoColor.colors.map(({ pixelCount }) => pixelCount)).toEqual([2, 2]);
  });

  it("deterministically reduces a generated multi-color gradient", () => {
    const gradient = image(
      8,
      1,
      Array.from(
        { length: 8 },
        (_, index) => [index * 32, 255 - index * 32, index * 16, 255] as const,
      ),
    );
    const result = quantizeImage(gradient, {
      maxColors: 3,
      alphaThreshold: 0,
    });
    expect(result.colors).toHaveLength(3);
    expect(result.colors.every(({ pixelCount }) => pixelCount > 0)).toBe(true);
    expect(new Set(result.colorIndices).size).toBe(3);
  });

  it("retains a high-frequency dominant color as a real medoid", () => {
    const dominant: Pixel = [100, 110, 120, 255];
    const source = image(10, 1, [
      dominant,
      dominant,
      dominant,
      dominant,
      dominant,
      dominant,
      dominant,
      dominant,
      [255, 0, 0, 255],
      [0, 255, 0, 255],
    ]);
    const result = quantizeImage(source, { maxColors: 1, alphaThreshold: 0 });
    expect(result.colors[0]?.rgb).toEqual({ r: 100, g: 110, b: 120 });
    expect(result.colors[0]?.pixelCount).toBe(10);
  });

  it("preserves all unique colors when no reduction is required", () => {
    const source = image(4, 1, [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 0, 0, 255],
    ]);
    const result = quantizeImage(source, { maxColors: 8, alphaThreshold: 0 });
    expect(result.colors).toHaveLength(3);
    expect(result.colors.map(({ rgb }) => rgb)).toEqual([
      { r: 0, g: 0, b: 255 },
      { r: 0, g: 255, b: 0 },
      { r: 255, g: 0, b: 0 },
    ]);
    expect(result.colors.map(({ pixelCount }) => pixelCount)).toEqual([
      1, 1, 2,
    ]);

    const exactLimit = quantizeImage(source, {
      maxColors: 3,
      alphaThreshold: 0,
    });
    expect(exactLimit.colors).toEqual(result.colors);
    expect(Array.from(exactLimit.colorIndices)).toEqual(
      Array.from(result.colorIndices),
    );
  });

  it("supports maxColors one and reduces a multi-color input", () => {
    const source = image(3, 1, [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ]);
    const result = quantizeImage(source, { maxColors: 1, alphaThreshold: 0 });
    expect(result.colors).toHaveLength(1);
    expect(result.colors[0]?.pixelCount).toBe(3);
    expect(Array.from(result.colorIndices)).toEqual([0, 0, 0]);
  });

  it("emits continuous indices, the unique transparent sentinel, and exact counts", () => {
    const source = image(6, 1, [
      [0, 0, 0, 0],
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 0, 0, 255],
      [255, 255, 255, 10],
    ]);
    const result = quantizeImage(source, { maxColors: 2, alphaThreshold: 10 });
    expect(result.colors.map(({ index }) => index)).toEqual([0, 1]);
    expect(result.colorIndices).toHaveLength(6);
    expect(result.colorIndices[0]).toBe(TRANSPARENT_COLOR_INDEX);
    expect(result.colorIndices[5]).toBe(TRANSPARENT_COLOR_INDEX);
    expect(result.opaquePixelCount).toBe(4);
    expect(result.transparentPixelCount).toBe(2);
    expect(
      result.colors.reduce((sum, color) => sum + color.pixelCount, 0),
    ).toBe(4);
    expect(
      Array.from(result.colorIndices).every(
        (index) =>
          index === TRANSPARENT_COLOR_INDEX || index < result.colors.length,
      ),
    ).toBe(true);
  });

  it("uses real input RGB representatives with finite Lab and no negative zero", () => {
    const pixels: Pixel[] = [
      [12, 34, 56, 255],
      [78, 90, 123, 255],
      [210, 180, 140, 255],
      [240, 10, 70, 255],
    ];
    const result = quantizeImage(image(4, 1, pixels), {
      maxColors: 2,
      alphaThreshold: 0,
    });
    const inputKeys = new Set(pixels.map(([r, g, b]) => rgbToKey({ r, g, b })));
    for (const color of result.colors) {
      expect(inputKeys.has(rgbToKey(color.rgb))).toBe(true);
      expect(Object.values(color.lab).every(Number.isFinite)).toBe(true);
      expect(
        Object.values(color.lab).some((value) => Object.is(value, -0)),
      ).toBe(false);
      expect(color.lab).toEqual(rgb8ToLab(color.rgb));
    }
  });

  it("is byte-for-byte deterministic across repeated runs", () => {
    const source = image(6, 1, [
      [10, 20, 30, 255],
      [40, 50, 60, 255],
      [70, 80, 90, 255],
      [100, 110, 120, 255],
      [130, 140, 150, 255],
      [10, 20, 30, 255],
    ]);
    const first = quantizeImage(source, { maxColors: 3, alphaThreshold: 0 });
    for (let run = 0; run < 20; run += 1) {
      const next = quantizeImage(source, { maxColors: 3, alphaThreshold: 0 });
      expect(next.colors).toEqual(first.colors);
      expect(Array.from(next.colorIndices)).toEqual(
        Array.from(first.colorIndices),
      );
      expect(next.opaquePixelCount).toBe(first.opaquePixelCount);
      expect(next.transparentPixelCount).toBe(first.transparentPixelCount);
    }
  });

  it("produces the same color mapping for checkerboard and grouped layouts", () => {
    const red: Pixel = [255, 0, 0, 255];
    const blue: Pixel = [0, 0, 255, 255];
    const checkerboard = quantizeImage(image(4, 1, [red, blue, red, blue]), {
      maxColors: 2,
      alphaThreshold: 0,
    });
    const grouped = quantizeImage(image(4, 1, [red, red, blue, blue]), {
      maxColors: 2,
      alphaThreshold: 0,
    });
    expect(grouped.colors).toEqual(checkerboard.colors);
    expect(checkerboard.colorIndices[0]).toBe(checkerboard.colorIndices[2]);
    expect(checkerboard.colorIndices[1]).toBe(checkerboard.colorIndices[3]);
    expect(grouped.colorIndices[0]).toBe(grouped.colorIndices[1]);
    expect(grouped.colorIndices[2]).toBe(grouped.colorIndices[3]);
    expect(grouped.colorIndices[0]).toBe(checkerboard.colorIndices[0]);
    expect(grouped.colorIndices[2]).toBe(checkerboard.colorIndices[1]);
  });

  it("does not read neighboring pixels or diffuse error", () => {
    const repeated: Pixel = [80, 90, 100, 255];
    const source = image(5, 1, [
      repeated,
      [255, 0, 0, 255],
      repeated,
      [0, 255, 0, 255],
      repeated,
    ]);
    const result = quantizeImage(source, { maxColors: 2, alphaThreshold: 0 });
    expect(result.colorIndices[0]).toBe(result.colorIndices[2]);
    expect(result.colorIndices[2]).toBe(result.colorIndices[4]);
  });

  it("does not mutate input and does not share a mutable pixel buffer", () => {
    const source = image(3, 1, [
      [1, 2, 3, 255],
      [4, 5, 6, 128],
      [7, 8, 9, 0],
    ]);
    const before = new Uint8ClampedArray(source.data);
    const result = quantizeImage(source, { maxColors: 2, alphaThreshold: 0 });
    expect(source.data).toEqual(before);
    expect(result.colorIndices.buffer).not.toBe(source.data.buffer);

    source.data.fill(255);
    expect(Array.from(result.colorIndices)).toEqual([
      0,
      1,
      TRANSPARENT_COLOR_INDEX,
    ]);
    result.colorIndices[0] = 99;
    expect(source.data[0]).toBe(255);
  });

  it("accepts a frozen image object without relying on object identity", () => {
    const source = Object.freeze(
      image(2, 1, [
        [1, 2, 3, 255],
        [4, 5, 6, 255],
      ]),
    );
    expect(
      quantizeImage(source, { maxColors: 2, alphaThreshold: 0 }).colors,
    ).toHaveLength(2);
  });
});
