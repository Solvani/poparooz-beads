import type { RgbaImage } from "../image/image.types";
import {
  buildQuantizationClusters,
  type QuantizationCluster,
} from "./cluster-representative";
import { buildColorHistogram, rgbToKey } from "./color-histogram";
import { weightedMedianCut } from "./median-cut";
import { QuantizationError } from "./quantization-errors";
import {
  TRANSPARENT_COLOR_INDEX,
  validateQuantizationImage,
  validateQuantizationOptions,
} from "./quantization-options";
import type {
  QuantizationOptions,
  QuantizedColor,
  QuantizedImage,
} from "./quantization.types";

function buildEntryToClusterIndex(
  clusters: readonly QuantizationCluster[],
): ReadonlyMap<number, number> {
  const mapping = new Map<number, number>();
  clusters.forEach((cluster, clusterIndex) => {
    for (const entry of cluster.box.entries) {
      if (mapping.has(entry.key)) {
        throw new QuantizationError(
          "INVALID_CLUSTER_RESULT",
          "A histogram color belongs to more than one cluster.",
        );
      }
      mapping.set(entry.key, clusterIndex);
    }
  });
  return mapping;
}

function buildQuantizedColors(
  clusters: readonly QuantizationCluster[],
): readonly QuantizedColor[] {
  return Object.freeze(
    clusters.map((cluster, index) =>
      Object.freeze({
        index,
        rgb: Object.freeze({ ...cluster.representative.rgb }),
        lab: Object.freeze({ ...cluster.representative.lab }),
        pixelCount: cluster.pixelCount,
      }),
    ),
  );
}

function validateQuantizedResult(
  image: RgbaImage,
  options: QuantizationOptions,
  result: QuantizedImage,
): void {
  const totalPixels = image.width * image.height;
  if (
    result.width !== image.width ||
    result.height !== image.height ||
    result.colorIndices.length !== totalPixels ||
    result.colors.length < 1 ||
    result.colors.length > options.maxColors ||
    result.transparentIndex !== TRANSPARENT_COLOR_INDEX ||
    result.opaquePixelCount + result.transparentPixelCount !== totalPixels ||
    result.colors.reduce((sum, color) => sum + color.pixelCount, 0) !==
      result.opaquePixelCount ||
    result.colorIndices.buffer === image.data.buffer
  ) {
    throwInvalidResult();
  }

  const observedCounts = new Uint32Array(result.colors.length);
  let observedTransparent = 0;
  for (const index of result.colorIndices) {
    if (index === TRANSPARENT_COLOR_INDEX) {
      observedTransparent += 1;
    } else if (index < result.colors.length) {
      observedCounts[index] = observedCounts[index]! + 1;
    } else {
      throwInvalidResult();
    }
  }

  if (observedTransparent !== result.transparentPixelCount) {
    throwInvalidResult();
  }
  for (let index = 0; index < result.colors.length; index += 1) {
    const color = result.colors[index]!;
    if (
      color.index !== index ||
      color.pixelCount <= 0 ||
      observedCounts[index] !== color.pixelCount ||
      !Number.isInteger(color.rgb.r) ||
      !Number.isInteger(color.rgb.g) ||
      !Number.isInteger(color.rgb.b) ||
      color.rgb.r < 0 ||
      color.rgb.r > 255 ||
      color.rgb.g < 0 ||
      color.rgb.g > 255 ||
      color.rgb.b < 0 ||
      color.rgb.b > 255 ||
      !Object.values(color.lab).every(Number.isFinite) ||
      Object.values(color.lab).some((value) => Object.is(value, -0))
    ) {
      throwInvalidResult();
    }
  }
}

function throwInvalidResult(): never {
  throw new QuantizationError(
    "INVALID_CLUSTER_RESULT",
    "The quantized image violates an output invariant.",
  );
}

export function quantizeImage(
  image: RgbaImage,
  options: QuantizationOptions,
): QuantizedImage {
  validateQuantizationImage(image);
  validateQuantizationOptions(options);

  try {
    const histogram = buildColorHistogram(image, options.alphaThreshold);
    if (histogram.length === 0) {
      throw new QuantizationError(
        "NO_QUANTIZABLE_PIXELS",
        "The image contains no pixels above the alpha threshold.",
      );
    }

    const boxes = weightedMedianCut(histogram, options.maxColors);
    const clusters = buildQuantizationClusters(boxes);
    const keyToClusterIndex = buildEntryToClusterIndex(clusters);
    const colors = buildQuantizedColors(clusters);
    const colorIndices = new Uint16Array(image.width * image.height);
    let opaquePixelCount = 0;
    let transparentPixelCount = 0;

    for (let pixel = 0; pixel < colorIndices.length; pixel += 1) {
      const offset = pixel * 4;
      if (image.data[offset + 3]! <= options.alphaThreshold) {
        colorIndices[pixel] = TRANSPARENT_COLOR_INDEX;
        transparentPixelCount += 1;
        continue;
      }

      const key = rgbToKey({
        r: image.data[offset]!,
        g: image.data[offset + 1]!,
        b: image.data[offset + 2]!,
      });
      const clusterIndex = keyToClusterIndex.get(key);
      if (clusterIndex === undefined) {
        throwInvalidResult();
      }
      colorIndices[pixel] = clusterIndex;
      opaquePixelCount += 1;
    }

    const result: QuantizedImage = Object.freeze({
      width: image.width,
      height: image.height,
      colors,
      colorIndices,
      transparentIndex: TRANSPARENT_COLOR_INDEX,
      opaquePixelCount,
      transparentPixelCount,
    });
    validateQuantizedResult(image, options, result);
    return result;
  } catch (error) {
    if (error instanceof QuantizationError) {
      throw error;
    }
    throw new QuantizationError(
      "QUANTIZATION_FAILED",
      "Color quantization failed.",
    );
  }
}
