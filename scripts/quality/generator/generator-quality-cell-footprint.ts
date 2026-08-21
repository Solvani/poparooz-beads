import type { RgbaImage } from "../../../src/domain/image/image.types.ts";

export interface WeightedObservedRgb {
  readonly key: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly contribution: number;
}

export function collectObservedRgbContributions(
  source: RgbaImage,
  sourceLeft: number,
  sourceRight: number,
  sourceTop: number,
  sourceBottom: number,
): readonly WeightedObservedRgb[] {
  const contributions = new Map<number, Omit<WeightedObservedRgb, "key">>();
  for (
    let sourceY = Math.floor(sourceTop);
    sourceY < Math.ceil(sourceBottom);
    sourceY += 1
  ) {
    const overlapY = overlap(sourceTop, sourceBottom, sourceY, sourceY + 1);
    if (overlapY <= 0) continue;
    for (
      let sourceX = Math.floor(sourceLeft);
      sourceX < Math.ceil(sourceRight);
      sourceX += 1
    ) {
      const overlapX = overlap(sourceLeft, sourceRight, sourceX, sourceX + 1);
      if (overlapX <= 0) continue;
      const index = (sourceY * source.width + sourceX) * 4;
      const alpha = source.data[index + 3]! / 255;
      if (alpha === 0) continue;
      const r = source.data[index]!;
      const g = source.data[index + 1]!;
      const b = source.data[index + 2]!;
      const key = (r << 16) | (g << 8) | b;
      const contribution = overlapX * overlapY * alpha;
      const existing = contributions.get(key);
      if (existing === undefined) {
        contributions.set(key, { r, g, b, contribution });
      } else {
        contributions.set(key, {
          ...existing,
          contribution: existing.contribution + contribution,
        });
      }
    }
  }
  return Object.freeze(
    [...contributions].map(([key, value]) => Object.freeze({ key, ...value })),
  );
}

function overlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): number {
  return Math.max(
    0,
    Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart),
  );
}
