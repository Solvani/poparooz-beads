import { validateLabColor } from "../color/lab-validation";
import { rgbToKey } from "./color-histogram";
import { QuantizationError } from "./quantization-errors";
import { MAX_QUANTIZATION_COLORS } from "./quantization-options";
import type { HistogramEntry, LabAxis } from "./quantization.types";

export interface QuantizationBox {
  readonly entries: readonly HistogramEntry[];
  readonly totalWeight: number;
  readonly minKey: number;
  readonly ranges: Readonly<Record<LabAxis, number>>;
}

const AXIS_PRIORITY = ["l", "a", "b"] as const;

function validateHistogramEntry(entry: HistogramEntry): void {
  try {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !Number.isSafeInteger(entry.key) ||
      entry.key < 0 ||
      entry.key > 0xffffff ||
      !Number.isSafeInteger(entry.count) ||
      entry.count <= 0 ||
      typeof entry.rgb !== "object" ||
      entry.rgb === null ||
      !Number.isInteger(entry.rgb.r) ||
      !Number.isInteger(entry.rgb.g) ||
      !Number.isInteger(entry.rgb.b) ||
      entry.rgb.r < 0 ||
      entry.rgb.r > 255 ||
      entry.rgb.g < 0 ||
      entry.rgb.g > 255 ||
      entry.rgb.b < 0 ||
      entry.rgb.b > 255 ||
      rgbToKey(entry.rgb) !== entry.key
    ) {
      throw new Error("invalid");
    }
    validateLabColor(entry.lab);
  } catch {
    throw new QuantizationError(
      "INVALID_HISTOGRAM_ENTRY",
      "A color histogram entry is invalid.",
    );
  }
}

export function createQuantizationBox(
  sourceEntries: readonly HistogramEntry[],
): QuantizationBox {
  if (!Array.isArray(sourceEntries) || sourceEntries.length === 0) {
    throw new QuantizationError(
      "INVALID_HISTOGRAM_ENTRY",
      "A quantization box requires at least one histogram entry.",
    );
  }

  const entries = [...sourceEntries].sort(
    (left, right) => left.key - right.key,
  );
  entries.forEach(validateHistogramEntry);

  let totalWeight = 0;
  const minimum = { l: Infinity, a: Infinity, b: Infinity };
  const maximum = { l: -Infinity, a: -Infinity, b: -Infinity };
  for (const entry of entries) {
    totalWeight += entry.count;
    for (const axis of AXIS_PRIORITY) {
      minimum[axis] = Math.min(minimum[axis], entry.lab[axis]);
      maximum[axis] = Math.max(maximum[axis], entry.lab[axis]);
    }
  }

  if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
    throw new QuantizationError(
      "INVALID_HISTOGRAM_ENTRY",
      "Histogram weights must form a positive safe integer.",
    );
  }

  const ranges = {
    l: maximum.l - minimum.l,
    a: maximum.a - minimum.a,
    b: maximum.b - minimum.b,
  };
  if (!Object.values(ranges).every(Number.isFinite)) {
    throw new QuantizationError(
      "INVALID_HISTOGRAM_ENTRY",
      "Histogram Lab ranges must be finite.",
    );
  }

  return Object.freeze({
    entries: Object.freeze(entries),
    totalWeight,
    minKey: entries[0]!.key,
    ranges: Object.freeze(ranges),
  });
}

export function selectSplitAxis(box: QuantizationBox): LabAxis {
  let selected: LabAxis = "l";
  for (const axis of AXIS_PRIORITY.slice(1)) {
    if (box.ranges[axis] > box.ranges[selected]) {
      selected = axis;
    }
  }
  return selected;
}

function maximumRange(box: QuantizationBox): number {
  return Math.max(box.ranges.l, box.ranges.a, box.ranges.b);
}

function compareBoxPriority(
  left: QuantizationBox,
  right: QuantizationBox,
): number {
  const rangeDifference = maximumRange(right) - maximumRange(left);
  if (rangeDifference !== 0) {
    return rangeDifference;
  }
  if (left.totalWeight !== right.totalWeight) {
    return left.totalWeight > right.totalWeight ? -1 : 1;
  }
  if (left.entries.length !== right.entries.length) {
    return left.entries.length > right.entries.length ? -1 : 1;
  }
  return left.minKey < right.minKey ? -1 : left.minKey > right.minKey ? 1 : 0;
}

export function selectBoxToSplit(
  boxes: readonly QuantizationBox[],
): number | undefined {
  let selectedIndex: number | undefined;
  for (let index = 0; index < boxes.length; index += 1) {
    if (boxes[index]!.entries.length < 2) {
      continue;
    }
    if (
      selectedIndex === undefined ||
      compareBoxPriority(boxes[index]!, boxes[selectedIndex]!) < 0
    ) {
      selectedIndex = index;
    }
  }
  return selectedIndex;
}

function compareEntriesByAxis(
  left: HistogramEntry,
  right: HistogramEntry,
  axis: LabAxis,
): number {
  const secondaryAxes = AXIS_PRIORITY.filter((candidate) => candidate !== axis);
  return (
    left.lab[axis] - right.lab[axis] ||
    left.lab[secondaryAxes[0]!] - right.lab[secondaryAxes[0]!] ||
    left.lab[secondaryAxes[1]!] - right.lab[secondaryAxes[1]!] ||
    left.key - right.key
  );
}

export function splitQuantizationBox(
  box: QuantizationBox,
): readonly [QuantizationBox, QuantizationBox] {
  if (box.entries.length < 2) {
    throw new QuantizationError(
      "UNSPLITTABLE_QUANTIZATION_BOX",
      "The selected quantization box cannot be split.",
    );
  }

  const axis = selectSplitAxis(box);
  const sorted = [...box.entries].sort((left, right) =>
    compareEntriesByAxis(left, right, axis),
  );
  const halfWeight = box.totalWeight / 2;
  let cumulativeWeight = 0;
  let splitAfter = 0;
  let bestDistance = Infinity;

  for (let index = 0; index < sorted.length - 1; index += 1) {
    cumulativeWeight += sorted[index]!.count;
    const distance = Math.abs(cumulativeWeight - halfWeight);
    if (distance < bestDistance) {
      bestDistance = distance;
      splitAfter = index;
    }
  }

  return Object.freeze([
    createQuantizationBox(sorted.slice(0, splitAfter + 1)),
    createQuantizationBox(sorted.slice(splitAfter + 1)),
  ] as const);
}

export function weightedMedianCut(
  entries: readonly HistogramEntry[],
  maxColors: number,
): readonly QuantizationBox[] {
  if (
    !Number.isInteger(maxColors) ||
    maxColors < 1 ||
    maxColors > MAX_QUANTIZATION_COLORS
  ) {
    throw new QuantizationError(
      "INVALID_MAX_COLORS",
      "The maximum color count is invalid.",
    );
  }

  const keys = new Set<number>();
  for (const entry of entries) {
    validateHistogramEntry(entry);
    if (keys.has(entry.key)) {
      throw new QuantizationError(
        "INVALID_HISTOGRAM_ENTRY",
        "Histogram RGB keys must be unique.",
      );
    }
    keys.add(entry.key);
  }

  const boxes: QuantizationBox[] = [createQuantizationBox(entries)];
  while (boxes.length < maxColors) {
    const selectedIndex = selectBoxToSplit(boxes);
    if (selectedIndex === undefined) {
      break;
    }
    const [left, right] = splitQuantizationBox(boxes[selectedIndex]!);
    boxes.splice(selectedIndex, 1, left, right);
  }

  return Object.freeze(
    [...boxes].sort((left, right) => left.minKey - right.minKey),
  );
}
