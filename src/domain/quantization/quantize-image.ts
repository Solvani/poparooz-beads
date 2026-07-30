import type { RgbaImage } from "../image/image.types";
import {
  buildQuantizationClusters,
  type QuantizationCluster,
} from "./cluster-representative";
import { buildColorHistogram, rgbToKey } from "./color-histogram";
import { weightedMedianCut } from "./median-cut";
import { QuantizationError } from "./quantization-errors";
import { validateQuantizedResult } from "./quantized-result-validation";
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
