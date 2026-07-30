import { deltaE2000 } from "../color/color-distance";
import type { LabColor } from "../color/color.types";
import type { QuantizationBox } from "./median-cut";
import { QuantizationError } from "./quantization-errors";
import type { HistogramEntry } from "./quantization.types";

export interface QuantizationCluster {
  readonly box: QuantizationBox;
  readonly representative: HistogramEntry;
  readonly pixelCount: number;
  readonly minKey: number;
}

export function calculateWeightedLabCentroid(box: QuantizationBox): LabColor {
  let l = 0;
  let a = 0;
  let b = 0;
  for (const entry of box.entries) {
    l += entry.lab.l * entry.count;
    a += entry.lab.a * entry.count;
    b += entry.lab.b * entry.count;
  }
  const centroid = {
    l: l / box.totalWeight,
    a: a / box.totalWeight,
    b: b / box.totalWeight,
  };
  if (!Object.values(centroid).every(Number.isFinite)) {
    throw new QuantizationError(
      "INVALID_CLUSTER_RESULT",
      "The cluster centroid is invalid.",
    );
  }
  return Object.freeze(centroid);
}

export function selectClusterRepresentative(
  box: QuantizationBox,
): HistogramEntry {
  const centroid = calculateWeightedLabCentroid(box);
  let selected: HistogramEntry | undefined;
  let selectedDistance = Infinity;

  for (const entry of box.entries) {
    const distance = deltaE2000(entry.lab, centroid);
    if (
      selected === undefined ||
      distance < selectedDistance ||
      (distance === selectedDistance && entry.count > selected.count) ||
      (distance === selectedDistance &&
        entry.count === selected.count &&
        entry.key < selected.key)
    ) {
      selected = entry;
      selectedDistance = distance;
    }
  }

  if (selected === undefined || !Number.isFinite(selectedDistance)) {
    throw new QuantizationError(
      "INVALID_CLUSTER_RESULT",
      "The cluster representative is invalid.",
    );
  }
  return selected;
}

export function buildQuantizationClusters(
  boxes: readonly QuantizationBox[],
): readonly QuantizationCluster[] {
  const clusters = boxes.map((box) =>
    Object.freeze({
      box,
      representative: selectClusterRepresentative(box),
      pixelCount: box.totalWeight,
      minKey: box.minKey,
    }),
  );
  clusters.sort(
    (left, right) =>
      left.representative.key - right.representative.key ||
      right.pixelCount - left.pixelCount ||
      left.minKey - right.minKey,
  );
  return Object.freeze(clusters);
}
